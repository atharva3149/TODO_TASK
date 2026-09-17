-- Query 1: a user's tasks filtered by status and paginated.
-- The application emits the status predicate only when a filter is selected;
-- this form lets MySQL use the (owner_id, status) composite index directly.
EXPLAIN
SELECT id, title, description, status, priority, due_date,
       owner_id, created_at, updated_at
FROM tasks
WHERE owner_id = ?
  AND status = ?
ORDER BY created_at DESC, id DESC
LIMIT ? OFFSET ?;

-- The unfiltered user view uses the owner_id index instead:
EXPLAIN
SELECT id, title, description, status, priority, due_date,
       owner_id, created_at, updated_at
FROM tasks
WHERE owner_id = ?
ORDER BY created_at DESC, id DESC
LIMIT ? OFFSET ?;

-- Query 2: an administrator's task view with owner information.
-- The primary key lookup on users is efficient for each task row. No owner
-- filter is applied because this is intentionally an all-owner report.
EXPLAIN
SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date,
       t.owner_id, u.email AS owner_email, t.created_at, t.updated_at
FROM tasks AS t
INNER JOIN users AS u ON u.id = t.owner_id
ORDER BY t.created_at DESC, t.id DESC
LIMIT ? OFFSET ?;

-- Query 3: task counts per user grouped by status.
-- The owner/status index supplies both the grouping/filtering columns and
-- keeps this aggregation cheaper as the task table grows.
EXPLAIN
SELECT owner_id, status, COUNT(*) AS task_count
FROM tasks
GROUP BY owner_id, status
ORDER BY owner_id, status;
