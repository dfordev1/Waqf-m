-- Signature verification needs the exact signed payload to recompute the
-- hash, but our transparency tiers (#19) keep payloads out of the public
-- REST surface. This RPC bridges that: it returns payload+signatures only
-- when the waqf is public OR the caller is an org member — same rule as
-- everywhere else, just enforced for the one case that legitimately needs
-- payload access to do its job (verification), and only ever consumed
-- server-side (never echoed back to API clients).
create function records_for_verification(p_waqf uuid)
returns table (record_id uuid, seq int, event_type waqf_event_type, payload jsonb, hash text)
language sql stable security definer set search_path = public as $$
  select r.id, r.seq, r.event_type, r.payload, r.hash
  from waqf_records r
  join waqfs w on w.id = r.waqf_id
  where r.waqf_id = p_waqf
    and (w.is_public or member_role(w.org_id) is not null)
  order by r.seq
$$;
grant execute on function records_for_verification(uuid) to anon, authenticated;

create function signatures_for_verification(p_record_ids uuid[])
returns table (record_id uuid, signer_role signer_role, signer_name text,
              public_key text, signature text, algorithm text, signed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.record_id, s.signer_role, s.signer_name, s.public_key, s.signature, s.algorithm, s.signed_at
  from record_signatures s
  join waqf_records r on r.id = s.record_id
  join waqfs w on w.id = r.waqf_id
  where s.record_id = any(p_record_ids)
    and (w.is_public or member_role(w.org_id) is not null)
$$;
grant execute on function signatures_for_verification(uuid[]) to anon, authenticated;
