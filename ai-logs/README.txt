AI session log and runtime logs
==============================

Session S1
----------
Tool: GitHub Copilot in VS Code
Date: 2026-11-18
Goal: Build and refine the Kadak Chai Co. campaign app.
Model: The VS Code session UI showed Copilot Fusion, Standard mode, but no
distinct underlying model/version.

The required project chat export has not yet been added, so the session-log
requirement is not complete. In VS Code, use Command Palette ->
Chat: Export Chat... and save the complete export as
S1-copilot-vscode.json in this directory. Before submission, scan the export
for credentials and replace only secrets with [REDACTED]. Do not otherwise
edit or trim it. Until that file exists, the S1 `log` field in
AI_SESSIONS.json is null rather than pointing to a nonexistent file.

Work in this session covered the campaign frontend and admin dashboard,
client/server entry validation, AI-provider integration and failure handling,
shareable story pages, Docker setup, and project documentation. Build checks
caught prerender and route-configuration mistakes; user feedback caught the
mutually exclusive contact-field behavior and incomplete Hindi translation.
Review also caught the backend Docker health check probing the authenticated
/api/v1/auth/me route; it now checks the public /api/v1/health endpoint.
The API's former single api/v1 global prefix was also replaced with NestJS URI
versioning: the global prefix is api and current controllers explicitly use
version 1, preserving existing /api/v1 URLs while allowing v2 routes alongside.
Story moderation was moved to a MongoDB-first BullMQ queue. The producer
leaves new entries pending review if Redis is unavailable/full or Node.js heap
pressure is high. The worker retries transient AI failures with exponential
backoff, skips finalized entries, and leaves exhausted jobs pending for admin
review. Redis reconnect/event logs are throttled and shutdown closes queue
connections with timeouts.

The 2026-11-19 submission follow-up narrowed the POST response to
publicId/status/resultPath. Rejected public lookups return only publicId and
status so moderation polling can show a polite rejection without exposing the
rejected name, city, or story. The rejection UI has no card or share controls;
approved confirmations retain icon-only copy/open actions. Client and server
now reject raw stories longer than 300 Unicode code points instead of
truncating them; server-side validation returns HTTP 400. Backend unit/e2e
tests, frontend lint/build, and the mock-provider smoke check passed.

A local 1,000-request mock submission check admitted 30 requests and returned
429 for 970 requests from the same IP. This confirms the configured per-IP
throttle only. With Redis pointed at an unavailable local port, the backend
still started, accepted a synthetic submission, and persisted it as
pending_review in a separate local MongoDB database. Successful live Redis
job processing, distributed load, and Redis maxmemory OOM have not been tested.

Runtime AI logs
---------------
The NestJS backend emits structured AI attempt metadata through its normal
logger (stdout): provider, attempt number, outcome, HTTP status when
available, latency, and a safe parser error code. Raw story text, prompts,
model output, and API keys are intentionally excluded.

To view live Docker logs, run: docker compose logs -f backend
For local development, view the output from: npm run start:dev
