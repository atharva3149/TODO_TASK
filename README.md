# Daymark Task Manager

A full-stack task manager built for the PHP/MySQL/React practical assessment. The implementation uses a polyglot backend deliberately: Node.js owns authentication, while an object-oriented PHP service owns task data and authorization.

## Architecture

```text
Browser
   |
   | same-origin HTTP: /api/auth/*, /api/tasks/*, /
   v
nginx :8080
   |------------------------------|
   | /api/auth/*                  | /api/tasks/*
   v                              v
Node.js + Express :3000       PHP 8.2 + PDO :8080
   |                              |
   | mysql2                       | firebase/php-jwt
   '--------------+---------------'
                  v
             MySQL 8 :3306
       users, refresh_tokens, tasks
```

The browser has one origin and does not need to know which backend handles a request. nginx strips the public `/api/auth/` or `/api/tasks/` prefix before proxying to the internal service.

### Why split authentication and tasks?

- Node.js is a small, focused authentication boundary that handles password hashing, access tokens, refresh-token rotation, and logout invalidation.
- PHP demonstrates the assessment's primary backend skills: OOP, Composer, PSR-4 autoloading, PDO, REST routing, validation, and authorization.
- Both services use the same MySQL database because the assessment explicitly asks for a shared `taskmanager` store.
- The split is not a claim that two services are always necessary. For a smaller production system, one PHP application would reduce operational complexity. Here it demonstrates a controlled polyglot boundary without duplicating business data.

## Shared JWT Contract

Node issues an HS256 access token with this shape:

```json
{
  "sub": "2",
  "userId": 2,
  "role": "user",
  "type": "access",
  "exp": 1730000000
}
```

PHP verifies the signature with the same `JWT_SECRET`, restricts the accepted algorithm to HS256, checks the `exp` claim through `firebase/php-jwt`, requires `type=access`, and validates the user ID and role before the task controller runs.

This is a pragmatic shared-secret design for trusted services inside one Compose network. Its trade-off is that every service that can verify tokens also has signing-equivalent secret material. In a larger deployment, I would prefer asymmetric signing: Node keeps an RSA/ECDSA private key and PHP verifies with a public key or JWKS endpoint. The shared-secret choice is kept here because it is easy to explain and matches the assessment requirement.

Refresh tokens are different from access tokens:

- The raw refresh token is returned only to the client.
- MySQL stores only its SHA-256 hash.
- Refresh tokens expire after `JWT_REFRESH_EXPIRY_DAYS`.
- Refresh consumes the old row and creates a new token in one transaction with `FOR UPDATE`, preventing normal replay/race reuse.
- Logout deletes the stored hash.

## Directory Structure

```text
database/
  schema.sql       MySQL DDL, constraints, and indexes
  seed.sql         local admin/user accounts and sample tasks
  queries.sql      EXPLAIN-ready assessment queries and rationale
backend-node/
  src/             Express app, controllers, middleware, DB pool
backend-php/
  src/             Config, router, controller, model, middleware, HTTP helpers
  public/index.php PHP entry point
frontend/
  src/             React routes, context, API client, pages, components
nginx/
  default.conf     public routing to the three internal services
docker-compose.yml
```

## Run Locally

Prerequisite: Docker Engine with the Compose plugin.

1. Prepare the environment file:

  - Edit the repository root `.env` file with your local secrets. This workspace uses a single root `.env` (there is no `.env.example` to copy).

2. Replace `JWT_SECRET`, `MYSQL_PASSWORD`, and `MYSQL_ROOT_PASSWORD` with strong local values if this is more than a disposable demo.

3. Build and start all services:

  ```bash
  docker compose up --build
  ```

4. Open the app in your browser (the host port may be `9090` if the default `8080` was moved to avoid a host conflict):

  ```
  http://localhost:9090
  ```

The MySQL initialization scripts run only when the `mysql_data` volume is created. To recreate the local database after changing DDL or seed data:

```bash
docker compose down -v
docker compose up --build
```

The `-v` option deletes the local database volume; never use it casually in a real environment.

### Seed accounts

Both seed accounts use `password` as their development password:

| Email | Role |
| --- | --- |
| `admin@example.com` | admin |
| `user@example.com` | user |

The seed is for the assessment environment only and should not be used unchanged in a deployed system.

Password policy (enforced by the auth service):

- Minimum length: 8 characters
- Must contain at least one uppercase letter, one lowercase letter, and one digit

Email validation: the auth service requires a syntactically valid email address and normalizes it before storage.

### Useful commands

```bash
docker compose ps
docker compose logs -f backend-node backend-php nginx
docker compose down
```

Quick smoke tests

1. Check nginx is serving the frontend:

```bash
curl -i http://localhost:9090/
```

2. Attempt login (returns JSON with `accessToken` and `refreshToken`):

```bash
curl -X POST http://localhost:9090/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password"}'
```

3. Use the access token to list tasks (replace ACCESS with the returned token):

```bash
curl -H "Authorization: Bearer ACCESS" http://localhost:9090/api/tasks
```

## API Summary

All public paths below are reached through nginx.

| Method | Path | Purpose | Response |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Create a user account | `201` |
| POST | `/api/auth/login` | Verify credentials and issue access/refresh tokens | `200` |
| POST | `/api/auth/refresh` | Rotate a refresh token and issue a new access token | `200` |
| POST | `/api/auth/logout` | Invalidate a refresh token | `204` |
| GET | `/api/auth/me` | Return the current user | `200` |
| GET | `/api/tasks` | List own tasks or all tasks for admin; supports `status`, `page`, `per_page` | `200` |
| POST | `/api/tasks` | Create a task for the authenticated user | `201` |
| PUT | `/api/tasks/:id` | Update an owned task or any task as admin | `200` |
| DELETE | `/api/tasks/:id` | Delete an owned task or any task as admin | `204` |

Task input is validated in PHP and on the client. `title` is required and capped at 200 characters; status is `todo`, `in-progress`, or `done`; priority is `low`, `medium`, or `high`; and `due_date` must be a real `YYYY-MM-DD` date.

## Database Design

- `users.email` is unique and passwords are stored as bcrypt hashes.
- `refresh_tokens.user_id` and `tasks.owner_id` use foreign keys with cascade deletion.
- MySQL enums enforce the finite status, priority, and role values at the storage boundary.
- `tasks.owner_id` supports a user's unfiltered list and ownership lookups.
- `tasks.status` supports status-oriented reporting.
- `tasks(owner_id, status)` matches the common filtered user list predicate.
- `refresh_tokens.token_hash` is unique, while `user_id` and `expires_at` have supporting indexes.

The user task query is written as two forms in `database/queries.sql`: the filtered form uses `(owner_id, status)`, and the unfiltered form uses `owner_id`. This avoids the common `(? IS NULL OR status = ?)` shape, which can make a predicate less sargable and weaken index selection. The query file uses placeholders intentionally; substitute values or run the same SQL through a prepared statement when collecting actual MySQL `EXPLAIN` output.

The admin list joins `tasks.owner_id` to the `users` primary key and returns `owner_email`. The grouped count query groups by the same columns in the composite index. In a production dataset, I would verify these assumptions with `EXPLAIN ANALYZE` against representative row counts, because an index is a hypothesis until the query plan and workload confirm it.

## Frontend Decisions

- `AuthContext` owns the current user and session bootstrap.
- `apiFetch` attaches the access token and retries a single `401` through `/api/auth/refresh`.
- Access and refresh tokens are persisted in `localStorage` so a browser refresh does not immediately log the user out. A higher-risk application could keep access tokens in memory and use an HttpOnly, Secure, SameSite refresh cookie to reduce XSS exposure.
- `ProtectedRoute` redirects unauthenticated users to `/login`.
- Regular users only receive their own tasks from the server; admin users receive owner email data and an all-task view. The UI never treats hidden controls as authorization: PHP remains the enforcement point.
- The UI has explicit loading, empty, validation, API-error, pagination, and save states and is responsive for narrow screens.

## Build Stages and Interview Notes

1. **Schema and Compose skeleton**: established the database contract first. Defend the composite index by connecting it directly to `WHERE owner_id = ? AND status = ?` and explain that indexes have write/storage cost.
2. **Node authentication**: used bcrypt, generic login errors, a dummy bcrypt comparison for unknown emails, short-lived access tokens, hashed refresh tokens, rotation, and database-backed logout. Explain why JWT logout is not automatic: access tokens remain valid until expiry, while refresh-token invalidation controls new sessions.
3. **PHP task service**: kept routing, controllers, models, middleware, and configuration separate. Prepared statements prevent SQL injection; authorization is repeated at the mutation boundary so a client cannot bypass UI rules.
4. **React client**: kept API/session behavior in small modules and used a context only for authentication state. The client improves experience but is not trusted for authorization.
5. **nginx and Compose wiring**: health checks order startup, internal service names avoid host-specific configuration, and nginx gives the browser one origin. Healthchecks were adjusted to use the container IPv4 loopback (`127.0.0.1`) to avoid BusyBox `wget` resolving `localhost` to IPv6 when services listen only on IPv4.
6. **Documentation**: included the query rationale, assumptions, and trade-offs instead of claiming an index plan without measuring it.

## Assessment Coverage

### Completed

- Task 1: PHP/MySQL/React task CRUD with status filtering, pagination, validation, loading/error states.
- Task 2: registration, bcrypt password hashing, JWT access tokens, refresh-token rotation, logout, role-based authorization, protected React routes.
- Task 3: DDL, relationships, constraints, indexes, and three assessment query families with EXPLAIN guidance.
- Task 4: Dockerfiles, MySQL initialization, Docker Compose, environment-based configuration, and nginx reverse proxy.
- The requested Node.js service is used for authentication and shares MySQL/JWT infrastructure with PHP.

### Not attempted

- Task 5 PostgreSQL reimplementation: not needed because Node.js is used for the required auth service rather than a separate PostgreSQL variant.
- Task 6 cloud deployment: not attempted; the Compose topology is the local deployment artifact.
- Task 7 AI feature: not attempted; no external AI key is required for the core assessment.

## Assumptions and Time

- A task is owned by the authenticated user on creation. The requested assessment does not require an admin to reassign ownership, so `owner_id` is not accepted from the client.
- Admins can read, update, and delete all tasks; regular users can only read and mutate their own tasks.
- The local seed password is intentionally weak and must be replaced outside the assessment.
- Time spent: approximately one focused implementation session, including architecture, code, documentation, and static verification.

## Verification Note

The implementation has been run and validated in this workspace using Docker Compose. After starting the stack with `docker compose up --build` you can run the quick smoke tests above to confirm the main flows (auth, task listing, create/update/delete).
