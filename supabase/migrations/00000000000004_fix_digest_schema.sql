-- pgcrypto is installed in the `extensions` schema on Supabase; qualify digest().
create or replace function record_hash(p_waqf uuid, p_seq int, p_type waqf_event_type,
                                       p_payload jsonb, p_prev text, p_at timestamptz)
returns text language sql immutable as $$
  select encode(extensions.digest(
    (p_waqf::text || '|' || p_seq || '|' || p_type || '|' ||
     p_payload::text || '|' || p_prev || '|' ||
     to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))::bytea,
    'sha256'), 'hex')
$$;
