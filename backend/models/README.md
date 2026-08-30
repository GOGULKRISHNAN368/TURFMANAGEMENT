# Resource boundaries

The local JSON store mirrors these MongoDB collections:

`admins`, `tournaments`, `sportSettings`, `registrations`, `paymentVerifications`, `teams`, `players`, `groups`, `fixtures`, `matches`, `footballEvents`, `cricketDeliveries`, `standings`, `announcements`, `sponsors`, and `auditLogs`.

Every record keeps a stable ID and timestamps. Public serializers in `backend/server.js` intentionally omit captain contact details, UTRs, payment screenshots, raw Google payloads, and admin notes.
