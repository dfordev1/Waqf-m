-- Waqf Core protocol v0: hash-chained, signed, append-only event records per waqf.
-- Every waqf becomes a verifiable chain: seq 1..n, each record hashing its
-- predecessor (Git-style). Tampering with any historical record breaks every
-- hash after it, and anyone can re-verify the chain independently.
create extension if not exists pgcrypto;

-- ---------- Standardized event types (feature #20) ----------
create type waqf_event_type as enum (
  'creation', 'deed_registered', 'asset_added', 'asset_disposed',
  'trustee_appointed', 'trustee_removed', 'audit', 'inspection',
  'court_ruling', 'restoration', 'annual_report', 'amendment', 'verification'
);

-- ---------- The chain (features #1, #2, #6) ----------
create table waqf_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete restrict,
  waqf_id uuid not null references waqfs(id) on delete restrict,
  seq integer not null,
  event_type waqf_event_type not null,
  payload jsonb not null default '{}'::jsonb, -- jsonb key order is canonical in Postgres
  actor uuid,
  prev_hash text not null,               -- hex sha256 of previous record ('' genesis)
  hash text not null,                    -- sha256(waqf_id|seq|event_type|payload|prev_hash|recorded_at)
  recorded_at timestamptz not null default now(),
  unique (waqf_id, seq),
  unique (waqf_id, hash)
);
create index waqf_records_waqf_idx on waqf_records (waqf_id, seq);

-- deterministic hash computation, reusable by verifiers
create function record_hash(p_waqf uuid, p_seq int, p_type waqf_event_type,
                            p_payload jsonb, p_prev text, p_at timestamptz)
returns text language sql immutable as $$
  select encode(digest(
    p_waqf::text || '|' || p_seq || '|' || p_type || '|' ||
    p_payload::text || '|' || p_prev || '|' ||
    to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'sha256'), 'hex')
$$;

-- chain maintenance: assign seq + prev_hash + hash atomically
create function chain_record() returns trigger language plpgsql security definer set search_path = public as $$
declare last record;
begin
  select seq, hash into last from waqf_records
    where waqf_id = new.waqf_id order by seq desc limit 1 for update;
  new.seq := coalesce(last.seq, 0) + 1;
  new.prev_hash := coalesce(last.hash, '');
  new.recorded_at := now();
  new.actor := coalesce(new.actor, auth.uid());
  new.hash := record_hash(new.waqf_id, new.seq, new.event_type, new.payload, new.prev_hash, new.recorded_at);
  return new;
end $$;
create trigger waqf_records_chain before insert on waqf_records
  for each row execute function chain_record();

-- append-only, forever
create trigger waqf_records_no_change before update or delete on waqf_records
  for each row execute function forbid_change();

-- anyone (even anon) can verify a waqf's chain (feature #8/#15 groundwork)
create function verify_waqf_chain(p_waqf uuid)
returns table (seq int, hash text, valid boolean)
language sql stable security definer set search_path = public as $$
  select r.seq, r.hash,
    r.hash = record_hash(r.waqf_id, r.seq, r.event_type, r.payload, r.prev_hash, r.recorded_at)
    and r.prev_hash = coalesce(lag(r.hash) over (order by r.seq), '')
  from waqf_records r where r.waqf_id = p_waqf order by r.seq
$$;
grant execute on function verify_waqf_chain(uuid) to anon, authenticated;

-- ---------- Signatures (features #4, #5) ----------
create type signer_role as enum ('founder', 'witness', 'trustee', 'court', 'auditor', 'regulator');
create table record_signatures (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references waqf_records(id) on delete restrict,
  org_id uuid not null references orgs(id) on delete restrict,
  signer_role signer_role not null,
  signer_name text not null,
  signer_user uuid references auth.users(id),
  -- v0: attestation = sha256(record hash + signer identity). Real asymmetric
  -- keys (PKI) replace this in protocol v1 without changing the table shape.
  attestation text not null,
  signed_at timestamptz not null default now(),
  unique (record_id, signer_role, signer_name)
);
create trigger record_signatures_no_change before update or delete on record_signatures
  for each row execute function forbid_change();

-- ---------- Auto-genesis: registering a waqf creates record #1 ----------
create function waqf_genesis() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into waqf_records (org_id, waqf_id, event_type, payload)
  values (new.org_id, new.id, 'creation', jsonb_build_object(
    'waqf', jsonb_build_object(
      'name', new.name, 'type', new.waqf_type, 'tenure', new.tenure,
      'madhab', new.madhab, 'waqif', new.waqif_name,
      'declaration_date', new.declaration_date, 'shurut', new.shurut
    )));
  return new;
end $$;
create trigger waqfs_genesis after insert on waqfs
  for each row execute function waqf_genesis();

-- ---------- Transparency tiers (feature #19) ----------
alter table waqf_records enable row level security;
alter table record_signatures enable row level security;

-- org members see full records; write via standard roles
create policy records_member_read on waqf_records for select
  using (member_role(org_id) is not null);
create policy records_write on waqf_records for insert
  with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));
create policy signatures_member_read on record_signatures for select
  using (member_role(org_id) is not null);
create policy signatures_write on record_signatures for insert
  with check (member_role(org_id) in ('owner','admin','mutawalli','staff','auditor'));

-- Public tier: proofs only (id, seq, type, hashes, timestamp) for public waqfs —
-- no payload, no beneficiary data. This is what global explorers consume.
create view waqf_records_public as
  select r.waqf_id, r.seq, r.event_type, r.prev_hash, r.hash, r.recorded_at
  from waqf_records r join waqfs w on w.id = r.waqf_id
  where w.is_public;
grant select on waqf_records_public to anon, authenticated;

-- ---------- Document integrity (feature #8) ----------
alter table deeds add column content_sha256 text;
create function verify_document(p_sha256 text)
returns table (waqf_id uuid, deed_title text, registered_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.waqf_id, d.title, d.created_at
  from deeds d join waqfs w on w.id = d.waqf_id
  where d.content_sha256 = lower(p_sha256) and w.is_public
$$;
grant execute on function verify_document(text) to anon, authenticated;
