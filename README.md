## Reports

All report endpoints require `Authorization: Bearer <token>`:

- `POST /api/reports` registers report metadata using `{ "reportName", "calculationId", "storageKey" }`; `calculationId` and `storageKey` are optional. The API does not receive or store a PDF file.
- `GET /api/reports` lists the authenticated user's reports newest first.
- `GET /api/reports/:id` returns metadata for one report owned by the authenticated user.
- `DELETE /api/reports/:id` deletes only the report record.

Optional storage keys are constrained to relative, user-prefixed object keys such as `users/<user-id>/reports/<key>` in preparation for future object storage. Filesystem paths are rejected. If a calculation is linked, it must belong to the authenticated user.

## User profile

Both profile endpoints require `Authorization: Bearer <token>`:

- `GET /api/users/profile` returns the authenticated user's ID, name, email, and account creation date.
- `PUT /api/users/profile` accepts only `{ "name": "Updated Name" }`. Names are trimmed and limited to 100 characters; email and all other fields are read-only.

# Simple Interest Calculator API

Standalone Express API for the Simple Interest Calculator project. The API includes health checks and bearer-token authentication; it is not wired to the React frontend.

## Requirements

- Node.js 18 or newer
- npm

## Setup

```bash
npm install
```

The local `.env` file sets the API port, MySQL connection variables, and authentication secret. Fill in `DB_USER` and `DB_PASSWORD` for your local MySQL account and set `JWT_SECRET` to a unique random value of at least 32 bytes. See `.env.example` for the variable template. Do not commit `.env` or expose its values.

## Local MySQL setup

Create the database and tables using the SQL initialization file:

```bash
mysql -u <DB_USER> -p < src/config/schema.sql
```

The schema creates the `simple_interest_calculator` database and the `users`, `calculations`, and `reports` tables. It does not insert sample records. The API checks the database connection when it starts and remains available if MySQL is not configured or running.

The existing `users` table must have `id`, `name`, `email`, `password_hash`, and `created_at` columns, with a unique key on `email`. The checked-in schema already defines these columns; no migration is required.

## Run

Development with automatic restarts:

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

## Health check

`GET http://localhost:5000/api/health`

Successful response:

```json
{
  "success": true,
  "message": "Simple Interest Calculator API is running"
}
```

Database connectivity check: `GET http://localhost:5000/api/health/db`. It returns HTTP 200 when MySQL is reachable, or HTTP 503 with a JSON error response when it is unavailable.

## Authentication

- `POST /api/auth/signup` accepts `{ "name", "email", "password" }`; email is normalized, and passwords are stored as bcrypt hashes.
- `POST /api/auth/login` accepts `{ "email", "password" }` and returns a signed JWT with a one-hour expiration.
- `GET /api/auth/me` requires `Authorization: Bearer <token>` and returns the authenticated user's safe profile.
- `POST /api/auth/logout` requires a bearer token. This API uses stateless JWTs and does not revoke them; the client must discard its token. A token remains valid until its one-hour expiration.

Run backend integration tests with `npm test`. The tests use the configured MySQL database and remove their uniquely named temporary user afterward.

## Calculations

All calculation endpoints require `Authorization: Bearer <token>`:

- `POST /api/calculations` creates a saved calculation. The request uses `mode` (`calculate-interest`, `find-principal`, `find-rate`, or `find-time`), `timeUnit` (`years` or `months`), and the numeric inputs required by that mode. The `unit` alias is also accepted.
- `GET /api/calculations` returns the authenticated user's history newest first.
- `GET /api/calculations/:id` returns one calculation owned by the authenticated user.
- `DELETE /api/calculations/:id` deletes one calculation owned by the authenticated user.

Interest and total amounts are recalculated on the server and rounded to cents to match the database's decimal columns. Month durations are converted to years for simple-interest calculations and remain stored/displayed in the requested unit.
