-- Development-only seed data.
-- Both accounts use the password: password
-- Change or remove these records before deploying outside a local assessment.

USE taskmanager;

INSERT INTO users (email, password_hash, role)
VALUES
    ('admin@example.com', '$2a$10$rT7YC/oEyT94M83Kk/9oSOs1IWHYvzdXagutvYqmfPRLGRoiNkz1u', 'admin'),
    ('user@example.com', '$2a$10$rT7YC/oEyT94M83Kk/9oSOs1IWHYvzdXagutvYqmfPRLGRoiNkz1u', 'user')
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    role = VALUES(role);

INSERT INTO tasks (title, description, status, priority, due_date, owner_id)
SELECT 'Review assessment requirements',
       'Walk through the architecture and explain the security trade-offs.',
       'in-progress',
       'high',
       DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY),
       id
FROM users
WHERE email = 'user@example.com'
  AND NOT EXISTS (
      SELECT 1 FROM tasks WHERE title = 'Review assessment requirements'
  );

INSERT INTO tasks (title, description, status, priority, due_date, owner_id)
SELECT 'Inspect query plans',
       'Use EXPLAIN to confirm the owner/status composite index is used.',
       'todo',
       'medium',
       DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY),
       id
FROM users
WHERE email = 'admin@example.com'
  AND NOT EXISTS (
      SELECT 1 FROM tasks WHERE title = 'Inspect query plans'
  );
