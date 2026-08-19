-- Run this once against the hosted Supabase database after the API is deployed.
-- Replace both values before executing. They are stored encrypted in Supabase Vault,
-- not in the cron job definition or application source.
select vault.create_secret(
  'https://your-api-domain.example/api/maintenance/expired-uploads',
  'upload_cleanup_url'
);
select vault.create_secret(
  'replace-with-the-same-UPLOAD_CLEANUP_SECRET-value',
  'upload_cleanup_secret'
);

-- Runs every five minutes. pg_net makes the HTTP request without
-- granting the database access to the private storage bucket; the API uses the
-- Storage API to remove an object and deletes its UploadSession only afterwards.
select cron.schedule(
  'cleanup-expired-uploads',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'upload_cleanup_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-maintenance-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'upload_cleanup_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $job$
);
