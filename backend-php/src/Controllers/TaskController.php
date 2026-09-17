<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Models\Task;
use InvalidArgumentException;

final class TaskController
{
    private const STATUSES = ['todo', 'in-progress', 'done'];
    private const PRIORITIES = ['low', 'medium', 'high'];

    public function __construct(private readonly Task $tasks)
    {
    }

    /** @param array{userId: int, role: string} $auth */
    public function index(array $auth): never
    {
        $status = $_GET['status'] ?? null;
        if ($status !== null && (!is_string($status) || !in_array($status, self::STATUSES, true))) {
            JsonResponse::send(['error' => 'Invalid status filter'], 400);
        }

        $page = $this->positiveInt($_GET['page'] ?? 1, 'page');
        $perPage = $this->positiveInt($_GET['per_page'] ?? 10, 'per_page');
        $perPage = min($perPage, 100);
        $result = $this->tasks->paginate($auth['userId'], $auth['role'], $status, $page, $perPage);

        JsonResponse::send([
            'items' => $result['items'],
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $result['total'],
                'total_pages' => $result['total'] === 0 ? 0 : (int) ceil($result['total'] / $perPage),
            ],
        ]);
    }

    /** @param array{userId: int, role: string} $auth */
    public function store(array $auth): never
    {
        try {
            $data = $this->validatedData(Request::json());
            $task = $this->tasks->create($data, $auth['userId']);
            JsonResponse::send(['task' => $this->taskForResponse($task, $auth)], 201);
        } catch (InvalidArgumentException $error) {
            JsonResponse::send(['error' => $error->getMessage()], 400);
        }
    }

    /** @param array{userId: int, role: string} $auth */
    public function update(array $auth, int $id): never
    {
        $task = $this->tasks->findById($id);
        if ($task === null) {
            JsonResponse::send(['error' => 'Task not found'], 404);
        }
        $this->authorizeOwner($auth, $task);

        try {
            $data = $this->validatedData(Request::json());
            $updated = $this->tasks->update($id, $data);
            JsonResponse::send(['task' => $this->taskForResponse($updated, $auth)]);
        } catch (InvalidArgumentException $error) {
            JsonResponse::send(['error' => $error->getMessage()], 400);
        }
    }

    /** @param array{userId: int, role: string} $auth */
    public function destroy(array $auth, int $id): never
    {
        $task = $this->tasks->findById($id);
        if ($task === null) {
            JsonResponse::send(['error' => 'Task not found'], 404);
        }
        $this->authorizeOwner($auth, $task);

        $this->tasks->delete($id);
        JsonResponse::empty();
    }

    /** @param array<string, mixed> $input @return array<string, mixed> */
    private function validatedData(array $input): array
    {
        $title = is_string($input['title'] ?? null) ? trim($input['title']) : '';
        if ($title === '' || mb_strlen($title) > 200) {
            throw new InvalidArgumentException('Title is required and must be at most 200 characters');
        }

        $description = $input['description'] ?? null;
        if ($description !== null && !is_string($description)) {
            throw new InvalidArgumentException('Description must be a string or null');
        }

        $status = $input['status'] ?? 'todo';
        if (!is_string($status) || !in_array($status, self::STATUSES, true)) {
            throw new InvalidArgumentException('Status must be todo, in-progress, or done');
        }

        $priority = $input['priority'] ?? 'medium';
        if (!is_string($priority) || !in_array($priority, self::PRIORITIES, true)) {
            throw new InvalidArgumentException('Priority must be low, medium, or high');
        }

        $dueDate = $input['due_date'] ?? null;
        if ($dueDate !== null) {
            if (!is_string($dueDate) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $dueDate) !== 1) {
                throw new InvalidArgumentException('Due date must use YYYY-MM-DD format');
            }
            [$year, $month, $day] = array_map('intval', explode('-', $dueDate));
            if (!checkdate($month, $day, $year)) {
                throw new InvalidArgumentException('Due date is not a valid calendar date');
            }
        }

        return [
            'title' => $title,
            'description' => $description === null ? null : trim($description),
            'status' => $status,
            'priority' => $priority,
            'due_date' => $dueDate,
        ];
    }

    private function positiveInt(mixed $value, string $name): int
    {
        if (filter_var($value, FILTER_VALIDATE_INT) === false || (int) $value < 1) {
            JsonResponse::send(['error' => "{$name} must be a positive integer"], 400);
        }
        return (int) $value;
    }

    /** @param array{userId: int, role: string} $auth @param array<string, mixed> $task */
    private function authorizeOwner(array $auth, array $task): void
    {
        if ($auth['role'] !== 'admin' && (int) $task['owner_id'] !== $auth['userId']) {
            JsonResponse::send(['error' => 'You are not allowed to modify this task'], 403);
        }
    }

    /** @param array<string, mixed>|null $task @param array{userId: int, role: string} $auth */
    private function taskForResponse(?array $task, array $auth): array
    {
        if ($task === null) {
            JsonResponse::send(['error' => 'Task could not be loaded'], 500);
        }
        if ($auth['role'] !== 'admin') {
            unset($task['owner_email']);
        }
        return $task;
    }
}
