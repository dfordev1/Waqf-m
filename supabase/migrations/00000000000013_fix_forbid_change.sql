-- Bug fix: forbid_change() is a shared trigger function used to enforce
-- append-only-ness on audit_events, waqf_records, record_signatures,
-- distributions, and anchor_batches. Migration 8 added a batch_id-stamping
-- exemption for waqf_records as one flat `AND` expression — but PL/pgSQL
-- resolves field access on the RECORD-typed `old`/`new` for the whole
-- expression regardless of short-circuiting, so any table WITHOUT a
-- batch_id column (all the others) threw "record has no field batch_id"
-- instead of the intended "<table> is append-only" on every UPDATE/DELETE.
-- Nesting the batch_id check inside its own IF, gated by tg_table_name,
-- means that expression is only ever compiled/evaluated for waqf_records.
create or replace function forbid_change() returns trigger language plpgsql as $$
begin
  if tg_table_name = 'waqf_records' and tg_op = 'UPDATE' then
    if old.batch_id is null and new.batch_id is not null
       and new.hash = old.hash and new.payload = old.payload and new.seq = old.seq
       and new.prev_hash = old.prev_hash and new.event_type = old.event_type
       and new.recorded_at = old.recorded_at and new.waqf_id = old.waqf_id then
      return new; -- batching stamp only
    end if;
  end if;
  raise exception '% is append-only', tg_table_name;
end $$;
