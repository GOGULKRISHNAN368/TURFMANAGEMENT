# Production deployment notes

1. Build separate deploy targets for `turf` and `admin`, or serve both static folders from a CDN. Keep the API on a private origin and set `PUBLIC_APP_URL`, `ADMIN_APP_URL`, and `BACKEND_URL` to HTTPS URLs.
2. Replace `backend/data/store.js` with MongoDB/Mongoose models matching the resource boundaries in `backend/models/README.md`.
3. Use a secrets manager for MongoDB, JWT, and Google service-account keys. Never commit `.env` or Drive file URLs containing private access tokens.
4. Put Socket.IO or a managed realtime provider behind the same auth and origin allow-list. The included SSE stream is a lightweight local fallback.
5. Add an object store adapter for screenshots with private ACLs and expiring signed URLs.
6. Configure rate limits on auth, sync, and scoring mutation routes; enable Helmet, request size limits, strict validation, and structured logs.
7. Run the test suite plus browser smoke tests for registration review, verified approval, live event entry, and undo before a release.
