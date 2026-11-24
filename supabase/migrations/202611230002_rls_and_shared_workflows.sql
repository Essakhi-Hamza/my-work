create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_agency_member(p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.agency_memberships m
    where m.agency_id = p_agency_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function private.has_agency_role(p_agency_id uuid, p_roles public.agency_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.agency_memberships m
    where m.agency_id = p_agency_id
      and m.user_id = auth.uid()
      and m.role = any (p_roles)
  );
$$;

create or replace function private.is_current_client(p_agency_id uuid, p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.clients c
    where c.agency_id = p_agency_id
      and c.id = p_client_id
      and c.auth_user_id = auth.uid()
  );
$$;

create or replace function private.is_current_client_booking(p_agency_id uuid, p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.fleet_bookings b
    join public.clients c
      on c.agency_id = b.agency_id
     and c.id = b.client_id
    where b.agency_id = p_agency_id
      and b.id = p_booking_id
      and c.auth_user_id = auth.uid()
  );
$$;

create or replace function private.can_read_document_object(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.documents d
    where d.object_path = p_object_path
      and (
        private.is_agency_member(d.agency_id)
        or (d.client_id is not null and private.is_current_client(d.agency_id, d.client_id))
        or (d.booking_id is not null and private.is_current_client_booking(d.agency_id, d.booking_id))
      )
  );
$$;

create or replace function private.can_upload_document_object(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.documents d
    where d.object_path = p_object_path
      and d.agency_id::text = (storage.foldername(p_object_path))[1]
      and private.has_agency_role(
        d.agency_id,
        array['owner', 'manager', 'employee']::public.agency_role[]
      )
  );
$$;

revoke all on function private.is_agency_member(uuid) from public, anon;
revoke all on function private.has_agency_role(uuid, public.agency_role[]) from public, anon;
revoke all on function private.is_current_client(uuid, uuid) from public, anon;
revoke all on function private.is_current_client_booking(uuid, uuid) from public, anon;
revoke all on function private.can_read_document_object(text) from public, anon;
revoke all on function private.can_upload_document_object(text) from public, anon;
grant execute on function private.is_agency_member(uuid) to authenticated;
grant execute on function private.has_agency_role(uuid, public.agency_role[]) to authenticated;
grant execute on function private.is_current_client(uuid, uuid) to authenticated;
grant execute on function private.is_current_client_booking(uuid, uuid) to authenticated;
grant execute on function private.can_read_document_object(text) to authenticated;
grant execute on function private.can_upload_document_object(text) to authenticated;

alter table public.user_profiles enable row level security;
alter table public.agencies enable row level security;
alter table public.agency_memberships enable row level security;
alter table public.clients enable row level security;
alter table public.vehicles enable row level security;
alter table public.fleet_bookings enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.documents enable row level security;
alter table public.notification_events enable row level security;
alter table public.activity_logs enable row level security;

create policy "users read own or agency colleague profiles"
on public.user_profiles for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.agency_memberships colleague
    where colleague.user_id = user_profiles.id
      and private.is_agency_member(colleague.agency_id)
  )
);

create policy "users update own profile"
on public.user_profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "agency members read their agencies"
on public.agencies for select to authenticated
using (private.is_agency_member(id));

create policy "authenticated users create an agency as its owner"
on public.agencies for insert to authenticated
with check (owner_user_id = auth.uid());

create policy "agency owners update agency settings"
on public.agencies for update to authenticated
using (private.has_agency_role(id, array['owner']::public.agency_role[]))
with check (private.has_agency_role(id, array['owner']::public.agency_role[]));

create policy "agency members read memberships"
on public.agency_memberships for select to authenticated
using (private.is_agency_member(agency_id));

create policy "owners and managers invite permitted roles"
on public.agency_memberships for insert to authenticated
with check (
  (role <> 'owner' and private.has_agency_role(agency_id, array['owner']::public.agency_role[]))
  or (role = 'employee' and private.has_agency_role(agency_id, array['manager']::public.agency_role[]))
);

create policy "owners and managers update permitted memberships"
on public.agency_memberships for update to authenticated
using (
  private.has_agency_role(agency_id, array['owner']::public.agency_role[])
  or (role = 'employee' and private.has_agency_role(agency_id, array['manager']::public.agency_role[]))
)
with check (
  (role <> 'owner' and private.has_agency_role(agency_id, array['owner']::public.agency_role[]))
  or (role = 'employee' and private.has_agency_role(agency_id, array['manager']::public.agency_role[]))
);

create policy "owners and managers remove permitted memberships"
on public.agency_memberships for delete to authenticated
using (
  (role <> 'owner' and private.has_agency_role(agency_id, array['owner']::public.agency_role[]))
  or (role = 'employee' and private.has_agency_role(agency_id, array['manager']::public.agency_role[]))
);

create policy "agency staff read clients"
on public.clients for select to authenticated
using (private.is_agency_member(agency_id) or auth_user_id = auth.uid());

create policy "agency staff create clients"
on public.clients for insert to authenticated
with check (
  private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[])
  and (auth_user_id is null or private.has_agency_role(agency_id, array['owner', 'manager']::public.agency_role[]))
);

create policy "agency staff update clients"
on public.clients for update to authenticated
using (private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[]))
with check (
  private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[])
  and (auth_user_id is null or private.has_agency_role(agency_id, array['owner', 'manager']::public.agency_role[]))
);

create policy "agency staff read vehicles"
on public.vehicles for select to authenticated
using (private.is_agency_member(agency_id));

create policy "agency staff create vehicles"
on public.vehicles for insert to authenticated
with check (private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[]));

create policy "agency staff update vehicles"
on public.vehicles for update to authenticated
using (private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[]))
with check (private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[]));

create policy "staff and owning clients read fleet bookings"
on public.fleet_bookings for select to authenticated
using (
  private.is_agency_member(agency_id)
  or (client_id is not null and private.is_current_client(agency_id, client_id))
);

create policy "agency staff create fleet bookings"
on public.fleet_bookings for insert to authenticated
with check (private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[]));

create policy "agency staff update fleet bookings"
on public.fleet_bookings for update to authenticated
using (private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[]))
with check (private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[]));

create policy "staff and owning clients read linked documents"
on public.documents for select to authenticated
using (
  private.is_agency_member(agency_id)
  or (client_id is not null and private.is_current_client(agency_id, client_id))
  or (booking_id is not null and private.is_current_client_booking(agency_id, booking_id))
);

create policy "agency staff create document metadata"
on public.documents for insert to authenticated
with check (private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[]));

create policy "agency staff update document metadata"
on public.documents for update to authenticated
using (private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[]))
with check (private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[]));

create policy "staff and owning clients read payment transactions"
on public.payment_transactions for select to authenticated
using (
  private.is_agency_member(agency_id)
  or private.is_current_client_booking(agency_id, booking_id)
);

create policy "staff and owning clients read notification events"
on public.notification_events for select to authenticated
using (
  private.is_agency_member(agency_id)
  or (client_id is not null and private.is_current_client(agency_id, client_id))
  or (booking_id is not null and private.is_current_client_booking(agency_id, booking_id))
);

create policy "staff and owning clients update notification read state"
on public.notification_events for update to authenticated
using (
  private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[])
  or (client_id is not null and private.is_current_client(agency_id, client_id))
  or (booking_id is not null and private.is_current_client_booking(agency_id, booking_id))
)
with check (
  private.has_agency_role(agency_id, array['owner', 'manager', 'employee']::public.agency_role[])
  or (client_id is not null and private.is_current_client(agency_id, client_id))
  or (booking_id is not null and private.is_current_client_booking(agency_id, booking_id))
);

create policy "agency owners and managers read activity logs"
on public.activity_logs for select to authenticated
using (private.has_agency_role(agency_id, array['owner', 'manager']::public.agency_role[]));

grant usage on schema public to authenticated, service_role;
grant usage on type
  public.agency_role,
  public.vehicle_status,
  public.booking_status,
  public.payment_transaction_kind,
  public.payment_method,
  public.document_kind,
  public.notification_channel,
  public.notification_status
to authenticated, service_role;

revoke all on
  public.user_profiles,
  public.agencies,
  public.agency_memberships,
  public.clients,
  public.vehicles,
  public.fleet_bookings,
  public.payment_transactions,
  public.documents,
  public.notification_events,
  public.activity_logs
from anon, authenticated;
grant select on public.user_profiles to authenticated;
grant update (display_name, preferred_language) on public.user_profiles to authenticated;
grant select on public.agencies to authenticated;
grant insert (name, owner_user_id, currency, timezone, default_language, return_reminder_hours) on public.agencies to authenticated;
grant update (name, currency, timezone, default_language, return_reminder_hours) on public.agencies to authenticated;
grant select, delete on public.agency_memberships to authenticated;
grant insert (agency_id, user_id, role) on public.agency_memberships to authenticated;
grant update (role) on public.agency_memberships to authenticated;
grant select on public.clients to authenticated;
grant insert (agency_id, full_name, email, phone, city) on public.clients to authenticated;
grant update (full_name, email, phone, city, archived_at) on public.clients to authenticated;
grant select on public.vehicles to authenticated;
grant insert (agency_id, brand, model, model_year, registration_number, daily_price, seats, transmission, fuel_type, mileage_km, insurance_expires_on, inspection_expires_on) on public.vehicles to authenticated;
grant update (brand, model, model_year, registration_number, daily_price, seats, transmission, fuel_type, mileage_km, insurance_expires_on, inspection_expires_on, archived_at) on public.vehicles to authenticated;
grant select on public.fleet_bookings to authenticated;
grant insert (agency_id, vehicle_id, client_id, status, starts_at, ends_at, total_amount, deposit_amount, additional_charges, extension_charges, destination, destination_review_required, notes) on public.fleet_bookings to authenticated;
grant update (vehicle_id, client_id, status, starts_at, ends_at, total_amount, deposit_amount, additional_charges, extension_charges, destination, destination_review_required, notes) on public.fleet_bookings to authenticated;
grant select on public.payment_transactions to authenticated;
grant select on public.documents to authenticated;
grant insert (agency_id, client_id, vehicle_id, booking_id, kind, object_path, expires_on, metadata) on public.documents to authenticated;
grant update (client_id, vehicle_id, booking_id, kind, expires_on, metadata) on public.documents to authenticated;
grant select, update (read_at) on public.notification_events to authenticated;
grant select on public.activity_logs to authenticated;
grant all on
  public.user_profiles,
  public.agencies,
  public.agency_memberships,
  public.clients,
  public.vehicles,
  public.fleet_bookings,
  public.payment_transactions,
  public.documents,
  public.notification_events,
  public.activity_logs
to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'luxrent-documents',
  'luxrent-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "authorized users read linked private documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'luxrent-documents'
  and private.can_read_document_object(name)
);

create policy "agency staff upload linked private documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'luxrent-documents'
  and private.can_upload_document_object(name)
);

create or replace function public.log_business_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_agency_id uuid;
  v_entity_id uuid;
begin
  if tg_op = 'DELETE' then
    v_agency_id := old.agency_id;
    v_entity_id := old.id;
  else
    v_agency_id := new.agency_id;
    v_entity_id := new.id;
  end if;

  insert into public.activity_logs (agency_id, actor_id, entity_type, entity_id, action)
  values (v_agency_id, auth.uid(), tg_table_name, v_entity_id, lower(tg_op));

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger clients_activity_log
after insert or update or delete on public.clients
for each row execute function public.log_business_activity();
create trigger vehicles_activity_log
after insert or update or delete on public.vehicles
for each row execute function public.log_business_activity();
create trigger fleet_bookings_activity_log
after insert or update or delete on public.fleet_bookings
for each row execute function public.log_business_activity();
create trigger documents_activity_log
after insert or update or delete on public.documents
for each row execute function public.log_business_activity();
create trigger payment_transactions_activity_log
after insert on public.payment_transactions
for each row execute function public.log_business_activity();

revoke all on function public.log_business_activity() from public, anon, authenticated;

create or replace function public.create_agency(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_agency_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) not between 2 and 120 then
    raise exception 'Agency name must be between 2 and 120 characters' using errcode = '22023';
  end if;

  insert into public.agencies (name, owner_user_id)
  values (trim(p_name), auth.uid())
  returning id into v_agency_id;

  return v_agency_id;
end;
$$;

revoke all on function public.create_agency(text) from public, anon;
grant execute on function public.create_agency(text) to authenticated;

create or replace function public.record_payment_transaction(
  p_booking_id uuid,
  p_kind public.payment_transaction_kind,
  p_amount numeric,
  p_method public.payment_method,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking record;
  v_rental_received numeric(12, 2);
  v_rental_refunded numeric(12, 2);
  v_deposit_received numeric(12, 2);
  v_deposit_refunded numeric(12, 2);
  v_available numeric(12, 2);
  v_transaction_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_kind is null or p_method is null then
    raise exception 'A positive amount, transaction kind and payment method are required' using errcode = '22023';
  end if;

  select b.agency_id, b.status, b.total_amount, b.deposit_amount, b.additional_charges, b.extension_charges
    into v_booking
  from public.fleet_bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if not private.has_agency_role(
    v_booking.agency_id,
    array['owner', 'manager', 'employee']::public.agency_role[]
  ) then
    raise exception 'Agency staff access required' using errcode = '42501';
  end if;

  select
    coalesce(sum(amount) filter (where kind = 'rental_payment'), 0),
    coalesce(sum(amount) filter (where kind = 'rental_refund'), 0),
    coalesce(sum(amount) filter (where kind = 'deposit_received'), 0),
    coalesce(sum(amount) filter (where kind = 'deposit_refund'), 0)
    into v_rental_received, v_rental_refunded, v_deposit_received, v_deposit_refunded
  from public.payment_transactions
  where agency_id = v_booking.agency_id
    and booking_id = p_booking_id;

  case p_kind
    when 'rental_payment' then
      if v_booking.status in ('completed', 'cancelled', 'maintenance') then
        raise exception 'A completed or cancelled booking cannot receive a rental payment' using errcode = '23514';
      end if;
      v_available := greatest(0, v_booking.total_amount + v_booking.additional_charges + v_booking.extension_charges - v_rental_received + v_rental_refunded);
    when 'deposit_received' then
      if v_booking.status in ('completed', 'cancelled', 'maintenance') then
        raise exception 'A completed or cancelled booking cannot receive a deposit' using errcode = '23514';
      end if;
      v_available := greatest(0, v_booking.deposit_amount - v_deposit_received);
    when 'rental_refund' then
      v_available := greatest(0, v_rental_received - v_rental_refunded);
    when 'deposit_refund' then
      v_available := greatest(0, v_deposit_received - v_deposit_refunded);
    else
      raise exception 'Unsupported transaction kind' using errcode = '22023';
  end case;

  if p_amount > v_available then
    raise exception 'Amount exceeds the available transaction balance' using errcode = '23514';
  end if;

  insert into public.payment_transactions (
    agency_id, booking_id, kind, amount, method, note, created_by
  )
  values (
    v_booking.agency_id, p_booking_id, p_kind, p_amount, p_method,
    nullif(left(trim(coalesce(p_note, '')), 500), ''),
    auth.uid()
  )
  returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

revoke all on function public.record_payment_transaction(uuid, public.payment_transaction_kind, numeric, public.payment_method, text) from public, anon;
grant execute on function public.record_payment_transaction(uuid, public.payment_transaction_kind, numeric, public.payment_method, text) to authenticated;

create or replace function public.enqueue_six_hour_return_reminders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted integer;
begin
  insert into public.notification_events (
    agency_id, client_id, booking_id, event_type, channel, status, scheduled_at
  )
  select
    b.agency_id,
    b.client_id,
    b.id,
    'return_due_6h',
    'whatsapp',
    'pending',
    b.ends_at - make_interval(hours => a.return_reminder_hours)
  from public.fleet_bookings b
  join public.agencies a on a.id = b.agency_id
  where b.status = 'active'
    and b.client_id is not null
    and b.ends_at > now()
    and b.ends_at - make_interval(hours => a.return_reminder_hours) <= now()
  on conflict (booking_id, event_type, channel) where booking_id is not null do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.enqueue_six_hour_return_reminders() from public, anon, authenticated;
grant execute on function public.enqueue_six_hour_return_reminders() to service_role;
