-- Phase 4: Investments, development pipeline, Merkle batch anchoring.

-- ---------- M9: Investments (cash waqf deployment, sukuk/CWLS) ----------
create type investment_kind as enum ('sukuk', 'cwls', 'equity', 'islamic_deposit', 'real_estate', 'business', 'other');
create type investment_status as enum ('proposed', 'active', 'matured', 'exited');

create table investments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete restrict,
  kind investment_kind not null,
  status investment_status not null default 'proposed',
  name text not null,
  principal numeric not null check (principal > 0),
  currency text not null default 'USD',
  expected_yield_pct numeric,
  shariah_screened boolean not null default false,
  screening_notes text,
  starts_on date,
  matures_on date,
  created_at timestamptz not null default now()
);

create function investment_chain_event() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.status = 'active')
     or (tg_op = 'UPDATE' and old.status <> 'active' and new.status = 'active') then
    insert into waqf_records (org_id, waqf_id, event_type, payload)
    values (new.org_id, new.waqf_id, 'investment_made', jsonb_build_object(
      'investment_id', new.id, 'kind', new.kind, 'name', new.name,
      'principal', new.principal, 'currency', new.currency,
      'shariah_screened', new.shariah_screened));
  end if;
  return new;
end $$;
create trigger investments_chain after insert or update on investments
  for each row execute function investment_chain_event();

-- Shariah guard: an investment cannot go active unscreened
create function require_screening() returns trigger language plpgsql as $$
begin
  if new.status = 'active' and not new.shariah_screened then
    raise exception 'Investment must be Shariah-screened before activation';
  end if;
  return new;
end $$;
create trigger investments_screening before insert or update on investments
  for each row execute function require_screening();

-- ---------- M9b: Idle-land development pipeline ----------
create type project_phase as enum ('feasibility', 'financing', 'approval', 'construction', 'operational', 'cancelled');

create table dev_projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete restrict,
  asset_id uuid not null references assets(id) on delete restrict,
  title text not null,
  phase project_phase not null default 'feasibility',
  budget numeric,
  currency text not null default 'USD',
  financing_model text, -- e.g. 'BOT', 'sukuk', 'internal', 'CWLS'
  expected_annual_income numeric,
  notes text,
  created_at timestamptz not null default now()
);

create function project_chain_event() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into waqf_records (org_id, waqf_id, event_type, payload)
    values (new.org_id, new.waqf_id, 'project_started', jsonb_build_object(
      'project_id', new.id, 'asset_id', new.asset_id, 'title', new.title,
      'phase', new.phase, 'financing', new.financing_model));
  end if;
  return new;
end $$;
create trigger dev_projects_chain after insert on dev_projects
  for each row execute function project_chain_event();

-- ---------- M10/#15: Merkle batch anchoring ----------
-- Batches merkle-ize record hashes; the root is what gets anchored externally
-- (OpenTimestamps -> Bitcoin). Proofs let anyone verify inclusion offline.
create table anchor_batches (
  id uuid primary key default gen_random_uuid(),
  merkle_root text not null,
  record_count int not null,
  first_record_id uuid not null,
  last_record_id uuid not null,
  method text not null default 'merkle_sha256',
  external_anchor jsonb, -- {type:'opentimestamps', proof:'...'} when anchored
  anchored_at timestamptz,
  created_at timestamptz not null default now()
);
create trigger anchor_batches_no_change before update or delete on anchor_batches
  for each row execute function forbid_change();
-- exception: allow setting external_anchor exactly once via dedicated function
create function attach_external_anchor(p_batch uuid, p_anchor jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from anchor_batches where id = p_batch and external_anchor is not null) then
    raise exception 'Batch already anchored';
  end if;
  alter table anchor_batches disable trigger anchor_batches_no_change;
  update anchor_batches set external_anchor = p_anchor, anchored_at = now() where id = p_batch;
  alter table anchor_batches enable trigger anchor_batches_no_change;
end $$;

-- mark which batch each record belongs to
alter table waqf_records add column batch_id uuid references anchor_batches(id);

-- build a batch over all unbatched records (call from cron/admin)
create function create_anchor_batch()
returns table (batch_id uuid, merkle_root text, record_count int)
language plpgsql security definer set search_path = public as $$
declare
  hashes text[];
  ids uuid[];
  level bytea[];
  nxt bytea[];
  i int;
  root text;
  b_id uuid;
begin
  select array_agg(hash order by recorded_at, id), array_agg(id order by recorded_at, id)
    into hashes, ids
  from waqf_records where waqf_records.batch_id is null;
  if hashes is null or array_length(hashes, 1) = 0 then
    return;
  end if;
  -- merkle: pairwise sha256, duplicate odd leaf
  select array_agg(decode(h, 'hex')) into level from unnest(hashes) h;
  while array_length(level, 1) > 1 loop
    if array_length(level, 1) % 2 = 1 then
      level := level || level[array_length(level, 1)];
    end if;
    nxt := '{}';
    i := 1;
    while i < array_length(level, 1) loop
      nxt := nxt || extensions.digest(level[i] || level[i+1], 'sha256');
      i := i + 2;
    end loop;
    level := nxt;
  end loop;
  root := encode(level[1], 'hex');
  insert into anchor_batches (merkle_root, record_count, first_record_id, last_record_id)
  values (root, array_length(hashes, 1), ids[1], ids[array_length(ids, 1)])
  returning id into b_id;
  update waqf_records set batch_id = b_id where id = any(ids);
  return query select b_id, root, array_length(hashes, 1);
end $$;

-- allow batch_id to be set on otherwise-immutable records (only null -> value)
create or replace function forbid_change() returns trigger language plpgsql as $$
begin
  if tg_table_name = 'waqf_records' and tg_op = 'UPDATE'
     and old.batch_id is null and new.batch_id is not null
     and new.hash = old.hash and new.payload = old.payload and new.seq = old.seq
     and new.prev_hash = old.prev_hash and new.event_type = old.event_type
     and new.recorded_at = old.recorded_at and new.waqf_id = old.waqf_id then
    return new; -- batching stamp only
  end if;
  raise exception '% is append-only', tg_table_name;
end $$;

-- public: anyone can list batches (transparency) and verify inclusion
create view anchor_batches_public as
  select id, merkle_root, record_count, method, external_anchor, anchored_at, created_at
  from anchor_batches;
grant select on anchor_batches_public to anon, authenticated;

-- ---------- RLS ----------
alter table investments enable row level security;
alter table dev_projects enable row level security;
alter table anchor_batches enable row level security;

create policy investments_read on investments for select using (member_role(org_id) is not null);
create policy investments_write on investments for all using (member_role(org_id) in ('owner','admin','mutawalli')) with check (member_role(org_id) in ('owner','admin','mutawalli'));
create policy dev_projects_read on dev_projects for select using (member_role(org_id) is not null);
create policy dev_projects_write on dev_projects for all using (member_role(org_id) in ('owner','admin','mutawalli','staff')) with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));
create policy anchor_batches_read on anchor_batches for select using (true);

create trigger investments_audit after insert or update or delete on investments for each row execute function log_audit();
create trigger dev_projects_audit after insert or update or delete on dev_projects for each row execute function log_audit();
