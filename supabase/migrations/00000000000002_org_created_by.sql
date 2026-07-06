-- Fix: RETURNING after org insert couldn't see the row because the owner
-- membership is created by an AFTER trigger (not yet visible to the SELECT
-- policy in the same statement). Track the creator and let them read their org.
alter table orgs add column created_by uuid default auth.uid();
update orgs o set created_by = m.user_id
  from org_members m where m.org_id = o.id and m.role = 'owner' and o.created_by is null;

drop policy orgs_member_read on orgs;
create policy orgs_member_read on orgs for select
  using (member_role(id) is not null or created_by = auth.uid());

-- also drop the temporary debug helper if present
drop function if exists public.whoami();
