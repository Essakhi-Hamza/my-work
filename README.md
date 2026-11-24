# LuxRent employee desktop application

LuxRent is being built as the employee-facing application for a Moroccan car-rental agency. The React/Vite interface can run in a browser during development and is hosted by Electron for the desktop target. A future client mobile app is intended to use the same Supabase project, PostgreSQL records, authentication and APIs.

## Run the application

```powershell
npm install
npm run dev:web
```

Open the Vite URL printed in the terminal. `npm run dev` starts the Electron desktop shell with Vite; the web build is the validated development path.

## Current modules

The employee navigation includes Dashboard, Clients, Vehicles, Reservations & Calendar, Active Rentals, Documents & Contracts, Payments & Finance, Notifications, Reports and Settings.

Most screens currently use clearly labelled preview data. Client, vehicle, reservation, document and rental/payment preview records persist in browser-local storage. These previews are not shared with a backend and reset only when browser storage is cleared.

The app currently opens directly in preview mode without requiring an account. A Supabase sign-in and owner-agency setup flow is staged in the codebase but is intentionally not required or connected to the navigation yet. Business screens use labelled preview data and are not connected to persistent records. Private uploads, contract/receipt PDF output, email, WhatsApp, scheduled reminders, and PDF/Excel report exports remain unavailable. Disabled controls are labelled with the reason. Preview transactions do not move money.

## Supabase setup

The shared PostgreSQL schema, row-level security policies, private document bucket policies and workflow functions are in `supabase/migrations`. The UI does not yet read or write client, vehicle, booking or payment records through Supabase.

1. Install the Supabase CLI and Docker Desktop, then start the local Supabase stack:

   ```powershell
   supabase start
   supabase db reset
   ```

2. Copy `.env.example` to `.env.local` and set the local project URL and publishable key printed by `supabase status`. For a hosted project, use its project URL and publishable key from the Supabase dashboard.

3. Start the interface with `npm run dev:web`. The current preview remains accessible without an account; backend sign-in is not enabled in the app flow yet.

Never put a Supabase `service_role` key in a `VITE_` variable or in desktop renderer code. The frontend must use only the publishable key and rely on PostgreSQL row-level security. Service-role operations belong in trusted server functions.

The migration uses a single `fleet_bookings` table for pending/confirmed reservations, active rentals, completed bookings, cancellations and maintenance intervals. A PostgreSQL exclusion constraint prevents overlapping confirmed, active and maintenance intervals for the same vehicle, including concurrent requests.

## Validate

```powershell
npm run build
npm run lint
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the application boundaries and [PROJECT_DECISIONS.md](./PROJECT_DECISIONS.md) for the recorded design choices.

## Prototype status

Working in preview mode:
- Browser-local clients, vehicles, reservations, documents and rentals/payments.
- Reservation conflict checks and reservation-to-active-rental creation.
- Rental payment, extension, return and rental-history workflows.
- Browser-persisted notification read state.
- Browser-generated Excel-compatible report downloads and print/Save-as-PDF document and report previews.
- English, French and Arabic RTL interfaces.

Not yet connected to a real backend:
- Supabase authentication and agency employee accounts.
- Shared cross-device client/vehicle/booking/payment records.
- Secure identity-document and vehicle-document uploads.
- Production PDF/receipt generation and document signatures.
- Email, WhatsApp and scheduled reminder delivery.
- Server-side Excel/PDF exports and operational audit logs.
