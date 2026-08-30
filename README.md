# Nightleague tournament platform

Nightleague is a production-shaped MVP for running football and cricket tournaments. It includes a public tournament site, a role-aware admin workspace, registration review, manual payment verification, team approval, fixture management, live scoring, a score broadcast stream, and calculation tests.

The repository is intentionally dependency-light so it runs immediately on Node 18+ without a build step. The `backend` is a small HTTP API with a JSON development store; the storage seams and API contracts are ready to swap for MongoDB/Mongoose in production. The public site lives in `turf`, and the admin app lives in `admin`.

## Run locally

```bash
npm run dev
```

Then open:

- Public site: http://localhost:4010/
- Admin panel: http://localhost:4010/admin/

The demo admin is `admin@nightleague.in` / `nightleague-demo`. The seeded workspace is intentionally safe demo data. Runtime changes are written to `backend/data/db.json` and can be reset by deleting that file.

Run tests with:

```bash
npm test
```

## Product rules implemented

- A Google Form response imports as `PENDING` + `PENDING_VERIFICATION`.
- Payment screenshots and UTRs are evidence only; they never auto-verify a payment.
- Only an authorized admin can mark a payment verified.
- Backend approval rejects unverified registrations, even if a frontend is bypassed.
- Only `APPROVED` + `VERIFIED` teams are public.
- Duplicate UTR, team, phone, email, screenshot, amount, and player-quality issues are flagged for review.
- Team IDs are allocated from a sport-specific sequence.
- Football and cricket scoring state is event/delivery based and supports undo.
- Public live state is broadcast over Server-Sent Events and polled as a reconnect fallback.

## Google Forms + Sheets setup

1. Create one Football form and one Cricket form using the field lists in `docs/google-forms.md`.
2. Connect each form to its own response sheet.
3. Create a Google Cloud service account, enable the Sheets API, and share both sheets with the service-account email as Viewer.
4. Copy the IDs, ranges, and service-account values into a private `.env` file using `.env.example`.
5. Store the public form URLs under tournament settings. The registration cards already expose the configured values through the public settings endpoint.
6. Keep file-upload screenshots in Drive with restricted access. Only authenticated admins should receive signed/private URLs in a production adapter.

The current local adapter returns a clear “Google credentials not configured” response rather than silently claiming a sync succeeded. Replace `backend/services/googleSheets.js` with the Google Sheets API adapter when credentials are available.

## Architecture

```text
turf/  ───────┐
              ├── backend/server.js ─── development JSON store
admin/ ───────┘          │
                         ├── registration workflow
                         ├── payment verification + audit log
                         ├── football scoring engine
                         ├── cricket delivery engine
                         └── live SSE broadcast
```

For production, put the three apps behind HTTPS, replace the JSON store with MongoDB Atlas, use HTTP-only JWT refresh cookies, put screenshot files behind signed URLs, configure an allow-list CORS policy, and run the scheduled Sheets sync from a job runner or the backend process.

See [docs/production.md](docs/production.md) for deployment hardening and [docs/google-forms.md](docs/google-forms.md) for the exact form schema.
