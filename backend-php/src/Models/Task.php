<?php

declare(strict_types=1);

namespace App\Models;

use PDO;

final class Task
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @return array{items: array<int, array<string, mixed>>, total: int} */
    public function paginate(
        int $userId,
        string $role,
        ?string $status,
        int $page,
        int $perPage,
    ): array {
        $offset = ($page - 1) * $perPage;
        $where = [];
        $parameters = [];

        if ($role !== 'admin') {
            $where[] = 't.owner_id = :owner_id';
            $parameters['owner_id'] = $userId;
        }
        if ($status !== null) {
            $where[] = 't.status = :status';
            $parameters['status'] = $status;
        }

        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $fromSql = $role === 'admin'
            ? 'FROM tasks AS t INNER JOIN users AS u ON u.id = t.owner_id'
            : 'FROM tasks AS t';
        $selectSql = $role === 'admin'
            ? 't.*, u.email AS owner_email'
            : 't.*';

        $countStatement = $this->db->prepare("SELECT COUNT(*) {$fromSql} {$whereSql}");
        $countStatement->execute($parameters);
        $total = (int) $countStatement->fetchColumn();

        $statement = $this->db->prepare(
            "SELECT {$selectSql} {$fromSql} {$whereSql}
             ORDER BY t.created_at DESC, t.id DESC
             LIMIT :limit OFFSET :offset",
        );
        foreach ($parameters as $name => $value) {
            $statement->bindValue(':' . $name, $value);
        }
        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return [
            'items' => $statement->fetchAll(),
            'total' => $total,
        ];
    }

    /** @return array<string, mixed>|null */
    public function findById(int $id): ?array
    {
        $statement = $this->db->prepare(
            'SELECT t.*, u.email AS owner_email
             FROM tasks AS t
             INNER JOIN users AS u ON u.id = t.owner_id
             WHERE t.id = :id
             LIMIT 1',
        );
        $statement->execute(['id' => $id]);
        $task = $statement->fetch();
        return $task === false ? null : $task;
    }

    /** @param array<string, mixed> $data */
    public function create(array $data, int $ownerId): array
    {
        $statement = $this->db->prepare(
            'INSERT INTO tasks (title, description, status, priority, due_date, owner_id)
             VALUES (:title, :description, :status, :priority, :due_date, :owner_id)',
        );
        $statement->execute([
            'title' => $data['title'],
            'description' => $data['description'],
            'status' => $data['status'],
            'priority' => $data['priority'],
            'due_date' => $data['due_date'],
            'owner_id' => $ownerId,
        ]);

        return $this->findById((int) $this->db->lastInsertId());
    }

    /** @param array<string, mixed> $data */
    public function update(int $id, array $data): ?array
    {
        $statement = $this->db->prepare(
            'UPDATE tasks
             SET title = :title,
                 description = :description,
                 status = :status,
                 priority = :priority,
                 due_date = :due_date
             WHERE id = :id',
        );
        $statement->execute([
            'id' => $id,
            'title' => $data['title'],
            'description' => $data['description'],
            'status' => $data['status'],
            'priority' => $data['priority'],
            'due_date' => $data['due_date'],
        ]);

        return $this->findById($id);
    }

    public function delete(int $id): bool
    {
        $statement = $this->db->prepare('DELETE FROM tasks WHERE id = :id');
        $statement->execute(['id' => $id]);
        return $statement->rowCount() > 0;
    }
}
