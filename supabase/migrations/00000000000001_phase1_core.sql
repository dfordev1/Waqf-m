-- Waqf-M Phase 1: core registry, assets, governance roles, append-only audit log
create extension if not exists postgis;
create extension if not exists "uuid-ossp";

-- ---------- Enums ----------
create type waqf_type as enum ('khayri', 'ahli', 'mushtarak', 'cash', 'corporate');
create type waqf_tenure as enum ('perpetual', 'temporary');
create type madhab as enum ('hanafi', 'maliki', 'shafii', 'hanbali', 'jaafari', 'other');
create type asset_kind as enum ('land', 'building', 'movable', 'cash', 'shares', 'ip', 'other');
create type asset_status as enum ('active', 'leased', 'idle', 'encroached', 'under_litigation', 'under_istibdal', 'substituted');
create type org_role as enum ('owner', 'admin', 'mutawalli', 'staff', 'auditor', 'viewer');

-- ---------- Organizations (multi-tenant: a waqf board or nazir org) ----------
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  jurisdiction text not null default 'generic', -- rule pack key, e.g. 'in-umeed', 'my-selangor', 'id-bwi'
  created_at timestamptz not null default now()
);

create table org_members (
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- helper: current user's role in an org
create function member_role(p_org uuid) returns org_role
language sql stable security definer set search_path = public as $$
  select role from org_members where org_id = p_org and user_id = auth.uid()
$$;

-- ---------- Waqfs ----------
create table waqfs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  waqf_type waqf_type not null,
  tenure waqf_tenure not null default 'perpetual',
  expires_on date, -- required when tenure = temporary
  madhab madhab not null default 'hanafi',
  waqif_name text not null,
  declaration_date date,
  shurut jsonb not null default '[]'::jsonb, -- structured founder's conditions (trust engine input)
  is_public boolean not null default true,   -- listed on the public transparency portal
  created_at timestamptz not null default now(),
  constraint temporary_needs_expiry check (tenure <> 'temporary' or expires_on is not null)
);

-- ---------- Deeds (waqfiyya documents) ----------
create table deeds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete cascade,
  title text not null,
  storage_path text, -- Supabase Storage object path
  language text,
  executed_on date,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Assets (mawquf) ----------
create table assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete cascade,
  name text not null,
  kind asset_kind not null,
  status asset_status not null default 'active',
  address text,
  boundary geography(MultiPolygon, 4326), -- parcel boundary for GIS/encroachment work
  location geography(Point, 4326),
  area_sqm numeric,
  current_valuation numeric,
  valuation_currency text default 'USD',
  valuation_date date,
  title_reference text, -- land registry / title deed reference
  created_at timestamptz not null default now()
);
create index assets_boundary_gix on assets using gist (boundary);
create index assets_org_idx on assets (org_id);

-- ---------- Mutawallis ----------
create table mutawallis (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete cascade,
  full_name text not null,
  user_id uuid references auth.users(id), -- linked account, if any
  appointed_by text, -- waqif | court | board
  appointed_on date,
  ended_on date,
  is_board boolean not null default false, -- GS 13: board of nazirs
  created_at timestamptz not null default now()
);

-- ---------- Append-only audit log (the ledger of record) ----------
create table audit_events (
  id bigint generated always as identity primary key,
  org_id uuid not null,
  actor uuid, -- auth.uid() of the actor, null for system
  table_name text not null,
  row_id text not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  at timestamptz not null default now()
);
alter table audit_events enable row level security;
-- No update/delete policies ever: append-only. Reads for org members.
create policy audit_read on audit_events for select
  using (member_role(org_id) is not null);
-- Block mutations even for table owner via triggers
create function forbid_change() returns trigger language plpgsql as $$
begin
  raise exception 'audit_events is append-only';
end $$;
create trigger audit_events_no_update before update or delete on audit_events
  for each row execute function forbid_change();

create function log_audit() returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  v_org := coalesce(new.org_id, old.org_id);
  insert into audit_events (org_id, actor, table_name, row_id, action, old_data, new_data)
  values (v_org, auth.uid(), tg_table_name, coalesce(new.id::text, old.id::text), tg_op,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create trigger waqfs_audit after insert or update or delete on waqfs for each row execute function log_audit();
create trigger deeds_audit after insert or update or delete on deeds for each row execute function log_audit();
create trigger assets_audit after insert or update or delete on assets for each row execute function log_audit();
create trigger mutawallis_audit after insert or update or delete on mutawallis for each row execute function log_audit();

-- ---------- RLS ----------
alter table orgs enable row level security;
alter table org_members enable row level security;
alter table waqfs enable row level security;
alter table deeds enable row level security;
alter table assets enable row level security;
alter table mutawallis enable row level security;

create policy orgs_member_read on orgs for select using (member_role(id) is not null);
create policy orgs_owner_update on orgs for update using (member_role(id) in ('owner','admin'));
create policy orgs_insert on orgs for insert with check (auth.uid() is not null);

create policy members_read on org_members for select using (member_role(org_id) is not null);
create policy members_manage on org_members for all
  using (member_role(org_id) in ('owner','admin'))
  with check (member_role(org_id) in ('owner','admin'));
-- bootstrap: creator becomes owner
create function bootstrap_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into org_members (org_id, user_id, role) values (new.id, auth.uid(), 'owner');
  return new;
end $$;
create trigger orgs_bootstrap after insert on orgs for each row execute function bootstrap_owner();

-- generic per-table policies: org members read; admin/mutawalli/staff write
create policy waqfs_read on waqfs for select
  using (member_role(org_id) is not null or is_public);
create policy waqfs_write on waqfs for all
  using (member_role(org_id) in ('owner','admin','mutawalli','staff'))
  with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));

create policy deeds_read on deeds for select using (member_role(org_id) is not null);
create policy deeds_write on deeds for all
  using (member_role(org_id) in ('owner','admin','mutawalli','staff'))
  with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));

create policy assets_read on assets for select using (member_role(org_id) is not null);
create policy assets_write on assets for all
  using (member_role(org_id) in ('owner','admin','mutawalli','staff'))
  with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));

create policy mutawallis_read on mutawallis for select using (member_role(org_id) is not null);
create policy mutawallis_write on mutawallis for all
  using (member_role(org_id) in ('owner','admin'))
  with check (member_role(org_id) in ('owner','admin'));

-- ---------- Trust-engine invariant: corpus immutability ----------
-- An asset row may change status/valuation, but once substituted it is frozen,
-- and assets can never be hard-deleted while their waqf exists (istibdal only).
create function protect_corpus() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Waqf assets cannot be deleted; use istibdal (status=substituted)';
  end if;
  if old.status = 'substituted' and new.status <> 'substituted' then
    raise exception 'A substituted asset is frozen and cannot be reactivated';
  end if;
  return new;
end $$;
create trigger assets_protect before update or delete on assets
  for each row execute function protect_corpus();
