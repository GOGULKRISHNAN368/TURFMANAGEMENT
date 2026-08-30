# Nightleague tournament platform

Nightleague is a production-shaped MVP for running football and cricket tournaments. It includes a public tournament site, a role-aware admin workspace, registration review, manual payment verification, team approval, fixture management, live scoring, a score broadcast stream, and calculation tests.

The repository runs as one standalone Node.js application. The public site, admin site, API, and realtime event stream are served from the same process. MongoDB Atlas is used when `MONGODB_URI` is configured; the JSON store is a local fallback.

## Run this by yourself

### 1. Install prerequisites

- Node.js 18 or newer: https://nodejs.org/
- A MongoDB Atlas account and connection string for persistent storage.
- Google Cloud credentials only if you want Google Sheets synchronization.

Check your installation:

```bash
node --version
npm --version
```

### 2. Download and install

```bash
git clone https://github.com/GOGULKRISHNAN368/TURFMANAGEMENT.git
cd TURFMANAGEMENT
npm install
```

### 3. Configure MongoDB Atlas

Create a local environment file. Do not commit it:

```bash
copy .env.example backend\.env
```

Add your Atlas connection string to `backend/.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nightleague
```

If you have an `atlas-credentials.env` file, copy it to `backend/.env`. The repository ignores this file. In Atlas, allow your IP address in Network Access and give the database user read/write access.

When the server starts successfully, it prints `MongoDB Atlas connected.` Data is stored as separate typed records in the `nightleague_records` collection. If Atlas is unavailable, the app uses `backend/data/db.json` locally.

### 4. Start the application

```bash
npm run dev
```

Then open:

- Public site: http://localhost:4010/
- Admin panel: http://localhost:4010/admin/

The demo admin is `admin@nightleague.in` / `nightleague-demo`. Open the public site at `http://localhost:4010/` and the admin panel at `http://localhost:4010/admin/`.

### 5. Configure the tournament

In the admin panel, open `Tournament setup` and save the tournament name, venue, fees, organizer UPI ID, Football form URL, and Cricket form URL. The public registration buttons use those saved links.

### 6. Create Google Forms and Sheets

Create separate Football and Cricket forms. Each form must collect one complete squad from one captain or manager, the payment amount, UPI Transaction ID / UTR, payment screenshot, and the payment-verification declarations. Use the field checklist in [docs/google-forms.md](docs/google-forms.md).

For each form, open `Responses → Link to Sheets`, use separate response Sheets, create a Google Cloud service account, enable the Google Sheets API, and share both Sheets with the service-account email as `Viewer`.

Add the Sheet values to `backend/.env`:

```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=service-account-email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
GOOGLE_FOOTBALL_SHEET_ID=football-sheet-id
GOOGLE_CRICKET_SHEET_ID=cricket-sheet-id
GOOGLE_FOOTBALL_SHEET_RANGE=Form Responses 1!A:ZZ
GOOGLE_CRICKET_SHEET_RANGE=Form Responses 1!A:ZZ
```

Restart the server. In the admin panel, open `Registrations`, select Football or Cricket, and click `Sync Google Sheets`.

### 7. Approve registrations

Imported registrations always begin as `PENDING` + `PENDING_VERIFICATION`. Compare the UTR and amount with the organizer’s actual bank or UPI account, then use `Verify & approve`. The backend blocks approval until payment is verified; only approved and verified teams appear publicly.

Run tests with:

```bash
npm test
```

Useful commands:

```bash
npm run dev       # start the public site, admin panel, and API
npm test          # run football and cricket calculation tests
npm run seed      # reset local JSON fallback data
```

`npm run seed` resets only local demo data. Do not use it as a production MongoDB reset command.

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

The Google Sheets adapter is already included in `backend/services/googleSheets.js`. It reads by header name, normalizes rows, flags duplicates, and imports idempotently when the Google credentials are configured.

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

For production, put the three apps behind HTTPS, keep MongoDB Atlas and Google credentials in a secrets manager, use HTTP-only JWT refresh cookies, put screenshot files behind signed URLs, configure an allow-list CORS policy, and run the scheduled Sheets sync from a job runner or the backend process.

See [docs/production.md](docs/production.md) for deployment hardening and [docs/google-forms.md](docs/google-forms.md) for the exact form schema.

## Troubleshooting

### Port 4010 is already in use

Stop the previous Node process or choose another port before starting:

```powershell
$env:PORT=4020
npm run dev
```

Then open `http://localhost:4020/`.

### The server uses the JSON fallback

Check that `backend/.env` exists and contains a valid `MONGODB_URI`. In Atlas, allow your current IP address and confirm that the database user has read/write permission. Restart the server after changing `.env`.

### Google Sheets sync returns an error

Check the service-account values, Sheet IDs, and ranges. The service-account email must have Viewer access to both response Sheets. The app intentionally refuses to claim a successful sync when Google Sheets is not configured.
