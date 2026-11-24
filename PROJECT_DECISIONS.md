# Project decisions

## Confirmed foundation

- Build the employee desktop application first; keep the future client mobile app on the same backend, database, authentication and business APIs.
- Use React, TypeScript, Vite, Tailwind and the existing Lucide/i18next setup. Electron is the desktop host; the browser target remains useful for development.
- Use Supabase Auth, PostgreSQL, Row Level Security and private Storage for the shared backend.
- Support English, French and Arabic, including RTL for Arabic.

## Data and workflow boundaries

- `fleet_bookings` is the shared source for reservations, rentals and maintenance intervals. PostgreSQL—not a UI-only availability check—must enforce no overlapping confirmed/active/maintenance bookings.
- Payments, deposits and refunds are append-only transactions. A database function checks limits while locking the booking row; frontend-only amount validation is not sufficient for concurrent employees.
- Client identity files and vehicle/rental documents belong in private Storage, not plain text columns or public buckets.
- Email, WhatsApp, six-hour return reminders, printable contracts/receipts and report exports must only be described as active after server-side providers and workflows are configured.
- The application labels preview data. Client, vehicle, reservation and rental/payment previews persist in browser-local storage only. This is not a substitute for shared database persistence.

## Current implementation limits

- The Supabase SDK configuration and schema foundation exist. Email/password Auth and owner agency setup are staged but intentionally not required by the app yet; they have not been verified against a running Supabase project, and business queries are not connected.
- Rental and payment screens share only in-memory preview state. Clients, vehicles, reservations and document records are still separate previews.
- Employee invitations, permission enforcement in the UI, persistent audit log viewing, file upload/download, PDFs, notifications delivery and PDF/Excel export remain unavailable until their backend workflows are implemented and tested.
