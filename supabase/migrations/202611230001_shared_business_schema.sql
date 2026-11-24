create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.agency_role as enum ('owner', 'manager', 'employee');
create type public.vehicle_status as enum ('available', 'reserved', 'rented', 'maintenance');
create type public.booking_status as enum ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'maintenance');
create type public.payment_transaction_kind as enum ('rental_payment', 'deposit_received', 'rental_refund', 'deposit_refund');
create type public.payment_method as enum ('cash', 'bank_transfer', 'card');
create type public.document_kind as enum ('identity', 'license', 'insurance', 'registration', 'inspection', 'contract', 'receipt', 'return_inspection', 'vehicle_photo');
create type public.notification_channel as enum ('email', 'whatsapp');
create type public.notification_status as enum ('pending', 'sent', 'failed', 'cancelled');

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  preferred_language text not null default 'fr' check (preferred_language in ('fr', 'ar', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  owner_user_id uuid not null references auth.users(id),
  currency text not null default 'MAD' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Africa/Casablanca',
  default_language text not null default 'fr' check (default_language in ('fr', 'ar', 'en')),
  return_reminder_hours smallint not null default 6 check (return_reminder_hours between 1 and 48),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_user_id)
);

create table public.agency_memberships (
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role public.agency_role not null,
  invited_by uuid references public.user_profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);

create unique index agency_single_owner_idx
  on public.agency_memberships (agency_id)
  where role = 'owner';

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null check (length(trim(full_name)) between 2 and 160),
  email text,
  phone text not null,
  city text,
  archived_at timestamptz,
  created_by uuid references public.user_profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, id),
  unique (agency_id, auth_user_id)
);

create index clients_agency_name_idx on public.clients (agency_id, lower(full_name));

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  brand text not null,
  model text not null,
  model_year smallint not null check (model_year between 1950 and 2100),
  registration_number text not null,
  daily_price numeric(12, 2) not null check (daily_price > 0),
  seats smallint not null check (seats between 1 and 100),
  transmission text not null,
  fuel_type text not null,
  mileage_km integer not null default 0 check (mileage_km >= 0),
  status public.vehicle_status not null default 'available',
  insurance_expires_on date,
  inspection_expires_on date,
  archived_at timestamptz,
  created_by uuid references public.user_profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, id),
  unique (agency_id, registration_number)
);

create index vehicles_agency_status_idx on public.vehicles (agency_id, status) where archived_at is null;

create table public.fleet_bookings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  vehicle_id uuid not null,
  client_id uuid,
  status public.booking_status not null default 'pending',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  deposit_amount numeric(12, 2) not null default 0 check (deposit_amount >= 0),
  additional_charges numeric(12, 2) not null default 0 check (additional_charges >= 0),
  extension_charges numeric(12, 2) not null default 0 check (extension_charges >= 0),
  destination text,
  destination_review_required boolean not null default false,
  notes text,
  created_by uuid references public.user_profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (status = 'maintenance' or client_id is not null),
  unique (agency_id, id),
  foreign key (agency_id, vehicle_id) references public.vehicles(agency_id, id) on delete restrict,
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  exclude using gist (
    agency_id with =,
    vehicle_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('confirmed', 'active', 'maintenance'))
);

create index fleet_bookings_agency_period_idx on public.fleet_bookings (agency_id, starts_at, ends_at);
create index fleet_bookings_client_idx on public.fleet_bookings (agency_id, client_id, starts_at desc);
create index fleet_bookings_active_returns_idx on public.fleet_bookings (ends_at) where status = 'active';

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  booking_id uuid not null,
  kind public.payment_transaction_kind not null,
  amount numeric(12, 2) not null check (amount > 0),
  method public.payment_method not null,
  note text,
  created_by uuid references public.user_profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (agency_id, booking_id) references public.fleet_bookings(agency_id, id) on delete restrict
);

create index payment_transactions_agency_date_idx on public.payment_transactions (agency_id, created_at desc);
create index payment_transactions_booking_idx on public.payment_transactions (booking_id, created_at);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  client_id uuid,
  vehicle_id uuid,
  booking_id uuid,
  kind public.document_kind not null,
  object_path text not null unique,
  expires_on date,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references public.user_profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (client_id is not null or vehicle_id is not null or booking_id is not null),
  check (split_part(object_path, '/', 1) = agency_id::text),
  check (position('..' in object_path) = 0),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  foreign key (agency_id, vehicle_id) references public.vehicles(agency_id, id) on delete restrict,
  foreign key (agency_id, booking_id) references public.fleet_bookings(agency_id, id) on delete restrict
);

create index documents_agency_expiry_idx on public.documents (agency_id, expires_on) where expires_on is not null;
create index documents_booking_idx on public.documents (booking_id) where booking_id is not null;

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  client_id uuid,
  booking_id uuid,
  event_type text not null check (event_type in ('return_due_6h', 'payment_due', 'document_expiry')),
  channel public.notification_channel not null,
  status public.notification_status not null default 'pending',
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  read_at timestamptz,
  provider_message_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  foreign key (agency_id, booking_id) references public.fleet_bookings(agency_id, id) on delete restrict
);

create unique index notification_booking_event_channel_idx
  on public.notification_events (booking_id, event_type, channel)
  where booking_id is not null;
create index notification_events_agency_schedule_idx on public.notification_events (agency_id, scheduled_at, status);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  actor_id uuid references public.user_profiles(id),
  entity_type text not null,
  entity_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  created_at timestamptz not null default now()
);

create index activity_logs_agency_date_idx on public.activity_logs (agency_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_profiles_set_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();
create trigger agencies_set_updated_at before update on public.agencies
for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients
for each row execute function public.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles
for each row execute function public.set_updated_at();
create trigger fleet_bookings_set_updated_at before update on public.fleet_bookings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_profiles (id, display_name, email)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.user_profiles (id, display_name, email)
select
  id,
  nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
  email
from auth.users
on conflict (id) do nothing;

create or replace function public.add_agency_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.agency_memberships (agency_id, user_id, role, invited_by)
  values (new.id, new.owner_user_id, 'owner', new.owner_user_id);
  return new;
end;
$$;

create trigger agency_owner_membership_created
after insert on public.agencies
for each row execute function public.add_agency_owner_membership();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.add_agency_owner_membership() from public, anon, authenticated;
