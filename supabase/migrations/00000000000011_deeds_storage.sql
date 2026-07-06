-- Private bucket for waqfiyya deed documents. Objects are stored under
-- <org_id>/<uuid>-<filename>; RLS mirrors org membership.
insert into storage.buckets (id, name, public)
values ('deeds', 'deeds', false)
on conflict (id) do nothing;

create policy deeds_storage_read on storage.objects for select
  using (bucket_id = 'deeds' and member_role((storage.foldername(name))[1]::uuid) is not null);

create policy deeds_storage_write on storage.objects for insert
  with check (bucket_id = 'deeds' and member_role((storage.foldername(name))[1]::uuid) in ('owner','admin','mutawalli','staff'));

create policy deeds_storage_delete on storage.objects for delete
  using (bucket_id = 'deeds' and member_role((storage.foldername(name))[1]::uuid) in ('owner','admin'));
