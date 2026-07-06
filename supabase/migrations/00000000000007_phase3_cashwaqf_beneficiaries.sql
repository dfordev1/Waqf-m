-- Phase 3: Cash waqf & campaigns, beneficiaries & distributions.

-- ---------- M7: Cash waqf collection ----------
create type campaign_status as enum ('draft', 'live', 'closed');
create type donation_status as enum ('pending', 'received', 'refunded');

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete restrict,
  title text not null,
  description text,
  status campaign_status not null default 'draft',
  goal_amount numeric check (goal_amount > 0),
  currency text not null default 'USD',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table donations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete restrict,
  waqf_id uuid not null references waqfs(id) on delete restrict,
  donor_name text,            -- null = anonymous
  donor_email text,
  donor_user uuid references auth.users(id),
  amount numeric not null check (amount > 0),
  currency text not null default 'USD',
  status donation_status not null default 'pending',
  payment_ref text,           -- gateway reference
  received_at timestamptz,
  created_at timestamptz not null default now()
);

-- cash waqf principal joins the CORPUS (must be preserved); chain event on receipt
create function donation_chain_event() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.status = 'received')
     or (tg_op = 'UPDATE' and old.status <> 'received' and new.status = 'received') then
    if new.received_at is null then new.received_at := now(); end if;
    insert into waqf_records (org_id, waqf_id, event_type, payload)
    values (new.org_id, new.waqf_id, 'donation_received', jsonb_build_object(
      'donation_id', new.id, 'campaign_id', new.campaign_id,
      'amount', new.amount, 'currency', new.currency,
      'donor', coalesce(new.donor_name, 'anonymous')));
  end if;
  return new;
end $$;
create trigger donations_chain before insert or update on donations
  for each row execute function donation_chain_event();

-- ---------- M8: Beneficiaries & distributions ----------
create type beneficiary_kind as enum ('class', 'person', 'organization');

create table beneficiaries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete restrict,
  kind beneficiary_kind not null default 'class',
  name text not null,            -- e.g. 'the poor of the district', or a person/org
  share_pct numeric check (share_pct > 0 and share_pct <= 100),
  generation int,                -- family waqf succession tracking
  is_fallback boolean not null default false, -- ultimate fallback: the poor
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table distributions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  waqf_id uuid not null references waqfs(id) on delete restrict,
  beneficiary_id uuid not null references beneficiaries(id) on delete restrict,
  amount numeric not null check (amount > 0),
  currency text not null default 'USD',
  distributed_on date not null default current_date,
  memo text,
  created_at timestamptz not null default now()
);

create function distribution_chain_event() returns trigger language plpgsql security definer set search_path = public as $$
declare bname text;
begin
  select name into bname from beneficiaries where id = new.beneficiary_id;
  insert into waqf_records (org_id, waqf_id, event_type, payload)
  values (new.org_id, new.waqf_id, 'distribution_made', jsonb_build_object(
    'distribution_id', new.id, 'beneficiary', bname,
    'amount', new.amount, 'currency', new.currency, 'on', new.distributed_on));
  return new;
end $$;
create trigger distributions_chain after insert on distributions
  for each row execute function distribution_chain_event();

-- distributions are payments of record: append-only
create trigger distributions_no_change before update or delete on distributions
  for each row execute function forbid_change();

-- ---------- RLS ----------
alter table campaigns enable row level security;
alter table donations enable row level security;
alter table beneficiaries enable row level security;
alter table distributions enable row level security;

-- campaigns: public can browse live public campaigns (donor experience)
create policy campaigns_read on campaigns for select
  using (member_role(org_id) is not null or (is_public and status = 'live'));
create policy campaigns_write on campaigns for all using (member_role(org_id) in ('owner','admin','mutawalli','staff')) with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));

create policy donations_read on donations for select
  using (member_role(org_id) is not null or donor_user = auth.uid());
create policy donations_write on donations for all using (member_role(org_id) in ('owner','admin','mutawalli','staff')) with check (member_role(org_id) in ('owner','admin','mutawalli','staff'));

create policy beneficiaries_read on beneficiaries for select using (member_role(org_id) is not null);
create policy beneficiaries_write on beneficiaries for all using (member_role(org_id) in ('owner','admin','mutawalli')) with check (member_role(org_id) in ('owner','admin','mutawalli'));
create policy distributions_read on distributions for select using (member_role(org_id) is not null);
create policy distributions_write on distributions for insert with check (member_role(org_id) in ('owner','admin','mutawalli'));

create trigger campaigns_audit after insert or update or delete on campaigns for each row execute function log_audit();
create trigger donations_audit after insert or update or delete on donations for each row execute function log_audit();
create trigger beneficiaries_audit after insert or update or delete on beneficiaries for each row execute function log_audit();
create trigger distributions_audit after insert or delete on distributions for each row execute function log_audit();
