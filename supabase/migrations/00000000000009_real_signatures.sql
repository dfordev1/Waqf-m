-- Replace v0 placeholder attestation with real Ed25519 signature fields.
-- Verification itself happens in the app layer (src/lib/waqfcore/crypto.ts);
-- Postgres has no native ed25519, so we store the signature material and let
-- API routes verify against record_hash — same design as the Python prototype.
alter table record_signatures add column public_key text;
alter table record_signatures add column signature text;
alter table record_signatures add column algorithm text not null default 'ed25519';

-- attestation becomes optional legacy/free-text (kept for backward compat)
alter table record_signatures alter column attestation drop not null;

-- a signature must carry real key material going forward
alter table record_signatures add constraint signature_has_keys
  check (public_key is not null and signature is not null);
