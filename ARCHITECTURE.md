# LuxRent architecture

## Applications and shared backend

- **Employee desktop:** React + TypeScript renderer, Vite development/build, Electron desktop host.
- **Future client mobile app:** a separate client that will use the same Supabase project and authenticated APIs.
- **System of record:** one Supabase PostgreSQL database, Supabase Auth and a private Supabase Storage bucket. No mobile-only or desktop-only business databases are planned.

The current UI is a preview, not a connected production system. Rental/payment state is shared in React memory across those screens only. Other demo records remain feature-local. All preview state is lost on reload; none of it should be treated as operational data.

## Shared data model

The migrations establish these agency-scoped records:

- `agencies`, `user_profiles`, and `agency_memberships` for agency ownership and employee roles.
- `clients`, `vehicles`, and `fleet_bookings` for the common business records.
- `payment_transactions` as an append-only rental/deposit/refund ledger.
- `documents` as metadata pointing to private Storage objects.
- `notification_events` as a delivery queue and `activity_logs` as an audit trail.

`fleet_bookings` is the schedule source for reservations, active rentals, completed rentals, cancellations and vehicle maintenance. Its exclusion constraint rejects overlapping time ranges for the same vehicle when a booking is confirmed, active or under maintenance. Pending bookings do not block availability.

Client identities are linked to `auth.users` through `clients.auth_user_id`. Staff and an authenticated client can read only records allowed by their agency membership or client relationship. The client app must use the same schema and RLS policies.

## Security boundaries

- RLS is enabled for every business table in the migrations. Agency membership helpers are `SECURITY DEFINER` functions with a fixed search path in the unexposed `private` schema; authenticated users can invoke them only through policy evaluation, not PostgREST RPC.
- Payment transaction rows are read-only through table policies. `record_payment_transaction` locks the booking row, checks the user's agency role and validates payment/deposit/refund limits before appending a ledger entry.
- Document files use a private bucket, agency-prefixed object paths and MIME/size limits. File reads require a linked document record and either agency membership or ownership by the associated client.
- Audit events store action and record identifiers, not full client or document contents. Logs are readable by owners and managers and are not directly writable by application users.
- `enqueue_six_hour_return_reminders` is an idempotent queue function for a trusted scheduled worker. It does not send WhatsApp messages; a server-side provider integration and scheduler are still required.
- The frontend SDK accepts only the project URL and publishable key. Never expose a service-role key to Vite, Electron renderer code or the mobile app.

## Runtime integration status

`src/backend/supabaseClient.ts` validates local configuration and lazily loads the browser-safe SDK. An email/password sign-in and owner agency setup flow is staged in `src/backend/AuthGate.tsx`, but is intentionally not connected to app navigation yet; the app currently opens in preview mode without an account. Agency creation uses an authenticated database function that assigns ownership from the signed-in user. Client, vehicle, booking and payment screens still use preview data; setting environment variables does not make those business flows persistent. Repositories/API calls, storage uploads, document generation, provider delivery and durable audit logging remain implementation work. The auth and agency setup flow has not yet been verified against a running Supabase instance.

Contract and receipt generation should be a trusted server-side workflow based on persisted, authorized records. Notifications should be queued and sent by trusted functions. Report exports should be generated from authorized database queries, not from demo values.

## Local database

`supabase/config.toml` and `supabase/migrations` support the Supabase CLI local stack. The application migrations are the source of schema and RLS changes; do not make manual production-only table changes.
