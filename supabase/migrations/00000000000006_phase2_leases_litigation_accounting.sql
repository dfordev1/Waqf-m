-- Phase 2: Leases & rent, litigation, FAS 37 fund accounting.

-- ---------- M3: Leases & tenants ----------
create type lease_status as enum ('draft', 'active', 'expired', 'terminated');
create type rent_frequency as enum ('monthly', 'quarterly', 'yearly');

create table leases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete restrict,
  asset_id uuid not null references assets(id) on delete restrict,
  tenant_name text not null,
  tenant_contact text,
  status lease_status not null default 'draft',
  starts_on date not null,
  ends_on date not null,
  rent_amount numeric not null check (rent_amount >= 0),
  rent_currency text not null default 'USD',
  frequency rent_frequency not null default 'monthly',
  market_rent_benchmark numeric, -- for under-renting detection
  notes text,
  created_at timestamptz not null default now(),
  constraint lease_dates check (ends_on > starts_on)
);

create table rent_invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete restrict,
  due_on date not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'USD',
  paid_at timestamptz,
  payment_ref text,
  created_at timestamptz not null default now()
);

-- chain event: activating a lease is a protocol event
create function lease_chain_event() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.status = 'active')
     or (tg_op = 'UPDATE' and old.status <> 'active' and new.status = 'active') then
    insert into waqf_records (org_id, waqf_id, event_type, payload)
    values (new.org_id, new.waqf_id, 'lease_signed', jsonb_build_object(
      'lease_id', new.id, 'asset_id', new.asset_id, 'tenant', new.tenant_name,
      'rent', new.rent_amount, 'currency', new.rent_currency,
      'frequency', new.frequency, 'from', new.starts_on, 'to', new.ends_on));
  elsif tg_op = 'UPDATE' and old.status = 'active' and new.status in ('expired','terminated') then
    insert into waqf_records (org_id, waqf_id, event_type, payload)
    values (new.org_id, new.waqf_id, 'lease_ended', jsonb_build_object(
      'lease_id', new.id, 'reason', new.status));
  end if;
  return new;
end $$;
create trigger leases_chain after insert or update on leases
  for each row execute function lease_chain_event();

-- ---------- M5: Litigation & encroachment ----------
create type case_status as enum ('open', 'hearing_scheduled', 'stayed', 'won', 'lost', 'settled', 'withdrawn');
create type case_kind as enum ('encroachment', 'title_dispute', 'tenancy', 'succession', 'regulatory', 'other');

create table cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete restrict,
  asset_id uuid references assets(id) on delete set null,
  kind case_kind not null default 'other',
  status case_status not null default 'open',
  title text not null,
  case_number text,
  court text,
  counsel text,
  filed_on date,
  limitation_deadline date, -- alerting target
  notes text,
  created_at timestamptz not null default now()
);

create table hearings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  hearing_on date not null,
  outcome text,
  created_at timestamptz not null default now()
);

create function case_chain_event() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into waqf_records (org_id, waqf_id, event_type, payload)
    values (new.org_id, new.waqf_id, 'case_filed', jsonb_build_object(
      'case_id', new.id, 'kind', new.kind, 'title', new.title,
      'case_number', new.case_number, 'court', new.court));
  elsif tg_op = 'UPDATE' and old.status not in ('won','lost','settled','withdrawn')
        and new.status in ('won','lost','settled','withdrawn') then
    insert into waqf_records (org_id, waqf_id, event_type, payload)
    values (new.org_id, new.waqf_id, 'case_resolved', jsonb_build_object(
      'case_id', new.id, 'outcome', new.status));
  end if;
  return new;
end $$;
create trigger cases_chain after insert or update on cases
  for each row execute function case_chain_event();

-- flag asset as encroached when an encroachment case opens
create function mark_encroached() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'encroachment' and new.asset_id is not null then
    update assets set status = 'encroached' where id = new.asset_id and status = 'active';
  end if;
  return new;
end $$;
create trigger cases_mark_encroached after insert on cases
  for each row execute function mark_encroached();

-- ---------- M4: FAS 37 fund accounting ----------
-- Corpus vs income separation: every waqf gets exactly two funds.
create type fund_kind as enum ('corpus', 'income');

create table funds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete restrict,
  kind fund_kind not null,
  currency text not null default 'USD',
  unique (waqf_id, kind)
);

create function waqf_funds_bootstrap() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into funds (org_id, waqf_id, kind) values (new.org_id, new.id, 'corpus'), (new.org_id, new.id, 'income');
  return new;
end $$;
create trigger waqfs_funds after insert on waqfs
  for each row execute function waqf_funds_bootstrap();

-- backfill funds for waqfs created before this migration
insert into funds (org_id, waqf_id, kind)
select w.org_id, w.id, k.kind
from waqfs w cross join (values ('corpus'::fund_kind), ('income'::fund_kind)) k(kind)
on conflict do nothing;

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete restrict,
  entry_date date not null default current_date,
  memo text not null,
  -- FAS 37: track shariah non-compliant income separately for purification
  non_compliant boolean not null default false,
  created_at timestamptz not null default now()
);

create table journal_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  entry_id uuid not null references journal_entries(id) on delete cascade,
  fund_id uuid not null references funds(id) on delete restrict,
  account text not null, -- e.g. 'cash', 'rent_income', 'maintenance_expense', 'corpus_asset'
  amount numeric not null check (amount <> 0) -- signed: debit +, credit -
);

-- double-entry invariant: each entry must net to zero (deferred to commit)
create function check_entry_balanced() returns trigger language plpgsql as $$
declare s numeric;
begin
  select coalesce(sum(amount), 0) into s from journal_lines where entry_id = coalesce(new.entry_id, old.entry_id);
  if s <> 0 then
    raise exception 'Journal entry % is unbalanced (net %)', coalesce(new.entry_id, old.entry_id), s;
  end if;
  return null;
end $$;
create constraint trigger journal_balanced
  after insert or update or delete on journal_lines
  deferrable initially deferred
  for each row execute function check_entry_balanced();

-- trial balance per fund
create view fund_balances as
  select f.waqf_id, f.kind as fund, l.account, sum(l.amount) as balance
  from journal_lines l join funds f on f.id = l.fund_id
  group by f.waqf_id, f.kind, l.account;

-- ---------- RLS (uniform: members read, staff+ write) ----------
alter table leases enable row level security;
alter table rent_invoices enable row level security;
alter table cases enable row level security;
alter table hearings enable row level security;
alter table funds enable row level security;
alter table journal_entries enable row level security;
alter table journal_lines enable row level security;

create policy leases_read on leases for select using (member_role(org_id) is not null);
create policy leases_write on leases for all using (member_role(org_id) in ('owner','admin','mutawalli','staff')) with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));
create policy rent_invoices_read on rent_invoices for select using (member_role(org_id) is not null);
create policy rent_invoices_write on rent_invoices for all using (member_role(org_id) in ('owner','admin','mutawalli','staff')) with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));
create policy cases_read on cases for select using (member_role(org_id) is not null);
create policy cases_write on cases for all using (member_role(org_id) in ('owner','admin','mutawalli','staff')) with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));
create policy hearings_read on hearings for select using (member_role(org_id) is not null);
create policy hearings_write on hearings for all using (member_role(org_id) in ('owner','admin','mutawalli','staff')) with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));
create policy funds_read on funds for select using (member_role(org_id) is not null);
create policy journal_entries_read on journal_entries for select using (member_role(org_id) is not null);
create policy journal_entries_write on journal_entries for all using (member_role(org_id) in ('owner','admin','mutawalli','staff')) with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));
create policy journal_lines_read on journal_lines for select using (member_role(org_id) is not null);
create policy journal_lines_write on journal_lines for all using (member_role(org_id) in ('owner','admin','mutawalli','staff')) with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));

-- audit triggers
create trigger leases_audit after insert or update or delete on leases for each row execute function log_audit();
create trigger cases_audit after insert or update or delete on cases for each row execute function log_audit();
create trigger journal_entries_audit after insert or update or delete on journal_entries for each row execute function log_audit();
