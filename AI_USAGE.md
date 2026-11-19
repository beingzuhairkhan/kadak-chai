# AI usage

## Tools and models

- **Development:** GitHub Copilot in VS Code was used for code exploration, implementation, and debugging across the frontend, backend, and project documentation. The session UI showed **Copilot Fusion, Standard**; it did not display a distinct underlying model/version.
- **Application runtime:** The app supports mock mode and configurable real providers. Story moderation now runs through BullMQ with Redis; the local configuration used Groq as primary and Sarvam as fallback. The exact model identifiers are not recorded here, and live provider/key validity was not verified. Do not copy values from the private `.env` into submission files.

## Prompts that materially affected the work

These are copied from the project conversation:

1. > please check it u not created admin frontend dashboard please create only frontend in minimum token just create frontend and dont write any test etc just create frontend because i have only 2% cursor token left so do it in 2% token do it fast
2. > so remove this condtion add both email and phone number and also add this if both filed empty then show anyone filed is required either email or phone
3. > primary: bad_output; primary: bad_output; secondary: bad_output; secondary: bad_output check why ai isnot working and also check .env also api_key is correct for both groq and sarvam
4. > and also hindi english toggle hindi toggle is complete not working and also in ecultify documetation ai logs , ai usage , ai session do what mentioned in document related to this three file
5. > I have already completed the core Kadak Chai Co. (#MyChaiBreak) submission flow, where entries are saved to MongoDB with status ("approved" | "rejected" | "pending_review") and moderated via an AI provider abstraction that returns { decision, reason, category, caption } validated against a schema. Now I want to add a BullMQ background job queue backed by Redis so incoming story submissions are enqueued and processed asynchronously with exponential backoff. The application must remain resilient even if Redis is down or Redis/process memory is full.

## Mistakes caught and corrections

- The contact form originally treated email and phone as mutually exclusive, so entering one cleared the other. The user noticed the behavior; the form and validation were changed to preserve both and require at least one.
- An early frontend implementation used `Date.now()` during rendering, which failed the production prerender/build check. It was moved to client-side state initialization.
- An Open Graph route used an edge runtime incompatible with the project's `cacheComponents` setting, and a dynamic route needed a Suspense boundary. The Next.js build exposed these issues; the route configuration and boundary were corrected.
- The AI integration repeatedly produced `bad_output`. Investigation identified provider endpoint/structured-output configuration problems; the Sarvam base URL and response handling were corrected. `bad_output` alone did not establish that either API key was invalid, and key validity was not tested against a live provider.
- The backend Docker health check initially probed the authenticated `/api/v1/auth/me` route and treated an expected `401` as healthy. Review found the existing public `/api/v1/health` route, and Compose now probes that endpoint instead.
- A submission response initially included the submitter's first name, city, and story. The POST response was narrowed to `publicId`, `status`, and `resultPath`; rejected public lookups now return only `publicId` and `status`, allowing the moderation poll to detect rejection without returning rejected story content.
- The approved confirmation initially exposed story details and a text URL; it now shows only the exact approval message and icon-only copy/open actions. Rejected submissions show only the rejection message, with no card or share controls. Submission and polling errors continue to use friendly messages instead of raw backend/queue details.
- The story textarea initially truncated input at 300 characters, and validation checked the normalized value. Truncation was removed and both client/server schemas now reject raw input over 300 Unicode code points before normalization; backend submission validation returns HTTP 400.

## Queue and failure handling

Entries are written to MongoDB as `pending_review` before the producer checks Redis readiness and heap pressure. Redis downtime, enqueue timeout, Redis OOM, or high heap usage leaves the entry pending and returns the ordinary safe submission response. Moderation retries transient provider failures with BullMQ exponential backoff; the worker skips missing, changed, or already-finalized entries. Exhausted retries leave the story for admin review. Compose configures Redis with a 128 MB `noeviction` cap, while the app remains able to start when Redis is unavailable.

API routing uses NestJS URI versioning with global prefix `api` and explicit controller version `1`. Existing endpoints remain under `/api/v1`, allowing a v2 controller to be introduced alongside v1 when needed.

The local 1,000-request mock submission check admitted 30 requests and rate-limited 970 from the same IP, matching the configured submission limit. A separate local check with Redis pointed at an unavailable port confirmed the API still started, returned the pending-review response, and persisted the synthetic entry as pending in MongoDB. These checks do not establish capacity for distributed traffic or real AI providers. Successful live Redis job processing and Redis OOM behavior have not been exercised.

The later submission/status changes were checked with the backend unit suite (6 suites / 26 tests), e2e test, backend build, frontend lint/build, and an `AI_PROVIDER=mock` moderation smoke test. These checks do not replace a live Redis/LLM integration test.

## Work written mostly by hand

The candidate reported no files written or substantially rewritten by hand without AI assistance. The candidate should update this section and `AI_SESSIONS.json` if that changes.

## Session export status

The required VS Code chat export is not yet in `ai-logs/`; therefore, the AI session log requirement is **not complete**. Export the complete project chat with **Command Palette → Chat: Export Chat...** and save it as `ai-logs/S1-copilot-vscode.json`. Before submission, scan the export for credentials and replace only secrets with `[REDACTED]`; do not otherwise edit or trim it. Until that file is added, `AI_SESSIONS.json` leaves the session's `log` as `null` rather than pointing to a nonexistent file. The candidate previously reported five hours before the queue work and subsequent UI/API follow-ups. `AI_SESSIONS.json` retains that reported figure; the candidate should update it to the final actual effort before submission.
