# Kadak Chai Co. — #MyChaiBreak

A full-stack campaign app with a public story submission form, AI-assisted moderation, privacy-safe shareable story posters, and a protected admin dashboard.

## Features

- Responsive campaign site with English/Hindi toggle.
- Shared client/server validation, at least one email or phone required (both accepted), duplicate contact prevention, honeypot, and request throttling.
- NestJS API with MongoDB persistence and development-only in-memory fallback.
- Asynchronous BullMQ story moderation with Redis, exponential retries, bounded job retention, and mock AI mode.
- MongoDB-first submissions remain `pending_review` if Redis is unavailable or full, for admin review.
- Admin review, filters, search, date range, pagination, CSV export, and optimistic conflict checks.
- Public approved-story posters with Open Graph images; private contact details are not public.
- Docker Compose services for MongoDB, API, and frontend.

## Requirements

- Node.js 22+
- npm
- MongoDB (or Docker Desktop)
- Redis for background moderation (optional at runtime; without it, submissions remain pending review)

## Configure

Copy `.env.example` to `.env` in the project root and set unique values for `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`, and `IP_HASH_SALT`. The JWT secret and IP hash salt must each be at least 32 characters. Do not commit `.env`.

The default AI provider is `mock`, which works without provider credentials. For a real provider, set `AI_PROVIDER` and the matching provider variables in `.env`. Groq is used as the fallback when Sarvam is primary and its Groq settings are complete; Sarvam is used as the fallback when Groq is primary and its Sarvam settings are complete. A complete `AI_FALLBACK_BASE_URL`, `AI_FALLBACK_API_KEY`, and `AI_FALLBACK_MODEL` set takes precedence.

Set `REDIS_URL` to use a Redis endpoint, or leave it blank and configure `REDIS_HOST` / `REDIS_PORT` (defaults: `127.0.0.1:6379`). `MODERATION_CONCURRENCY` and `MODERATION_RATE_LIMIT_MAX` / `MODERATION_RATE_LIMIT_DURATION_MS` control worker parallelism and throughput. The producer saves each story to MongoDB as `pending_review` before trying to enqueue it. If Redis is unreachable, rejects writes because of `maxmemory`/OOM, enqueue times out, or the Node.js heap is under pressure, the HTTP request still succeeds with a pending-review response; no Redis or memory error is exposed to the submitter. The story remains available in the admin dashboard. No inline AI fallback is run.

Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin before building for production. The frontend uses it for canonical metadata, sitemap URLs, and social-sharing previews; it defaults to `http://localhost:3000` for local development.

Moderation jobs use four attempts with exponential backoff and retain at most 250 completed and 250 failed jobs. The worker skips entries already finalized in MongoDB, so redelivery is safe. Transient AI failures (including provider rate limits) are retried; after retries are exhausted, the entry remains `pending_review` for admin review. Redis queue storage uses `noeviction` with a 128 MB cap in Compose: writes can fail cleanly at the cap rather than silently evicting queue keys.

## Run locally

Install dependencies in each app:

```bash
cd frontend
npm ci
cd ../backend
npm ci
```

Start MongoDB and Redis separately for local development. Set `MONGODB_URI` (for example `mongodb://localhost:27017/kadak-chai`) and `REDIS_URL=redis://127.0.0.1:6379` in `.env`. In development only, leaving `MONGODB_URI` blank enables a temporary in-memory database; data in that mode is lost on shutdown. If Redis is not running, the API still accepts and stores stories, but they will remain pending review until an administrator handles them.

In separate terminals:

```bash
cd backend
npm run start:dev
```

```bash
cd frontend
npm run dev
```

The site runs at `http://localhost:3000`, the API at `http://localhost:4000`, and API documentation at `http://localhost:4000/docs`.

## Demo submissions

With MongoDB configured and the root `.env` in place, run:

```bash
cd backend
npm run seed
```

The seed command adds three clearly labeled demo submissions only when the collection is empty. It does not create or change admin credentials.

## Docker Compose

After configuring `.env`, build and start MongoDB, Redis, the backend, and frontend:

```bash
docker compose up --build -d
```

Open `http://localhost:3000`. Redis is capped at 128 MB with `noeviction`; if it reaches its memory limit, new moderation jobs stay in MongoDB as pending review. The backend does not depend on Redis health to start. To add the demo submissions, run `docker compose exec backend npm run seed`. The frontend API and site URLs are build-time settings; rebuild the frontend if they change. MongoDB and Redis are available only on the Compose network by default.

## Checks

```bash
cd frontend
npm run lint
npm run build
```

```bash
cd backend
npm run build
npm test -- --runInBand
```

## Security and operations

- Use strong, unique secrets and HTTPS in production; configure `FRONTEND_URL` to the exact trusted origin.
- Set `NODE_ENV=production` and a durable `MONGODB_URI`; the API refuses the development memory fallback in production.
- `TRUST_PROXY=true` should only be used behind a trusted single proxy hop.
- Public responses expose only approved story details, never contact data.
- CSV exports are limited to 10,000 rows per request.
