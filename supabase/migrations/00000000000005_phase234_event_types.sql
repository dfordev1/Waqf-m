-- New protocol event types for Phases 2-4 (kept separate: enum values must not
-- be used in the same transaction that adds them).
alter type waqf_event_type add value if not exists 'lease_signed';
alter type waqf_event_type add value if not exists 'lease_ended';
alter type waqf_event_type add value if not exists 'case_filed';
alter type waqf_event_type add value if not exists 'case_resolved';
alter type waqf_event_type add value if not exists 'donation_received';
alter type waqf_event_type add value if not exists 'distribution_made';
alter type waqf_event_type add value if not exists 'investment_made';
alter type waqf_event_type add value if not exists 'project_started';
alter type waqf_event_type add value if not exists 'anchored';
