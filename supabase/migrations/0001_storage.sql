-- Run after `pnpm db:migrate`. The API uses the service-role key to authorize
-- storage operations; browser clients never receive this key.
insert into storage.buckets (id, name, public)
values ('data-room-files', 'data-room-files', false)
on conflict (id) do nothing;

-- No direct browser policy is intentionally added. The Nest API authorizes each
-- operation and issues short-lived signed URLs for upload, viewing, or download.
