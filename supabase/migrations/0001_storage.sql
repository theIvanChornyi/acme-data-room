-- Run after `pnpm db:migrate`. The API uses the service-role key for storage
-- operations; browser clients never receive this key.
insert into storage.buckets (id, name, public)
values ('data-room-files', 'data-room-files', false)
on conflict (id) do nothing;

-- No direct browser policy is intentionally added. Upload/download endpoints on
-- the Nest API will authorize each request and issue short-lived signed URLs.
