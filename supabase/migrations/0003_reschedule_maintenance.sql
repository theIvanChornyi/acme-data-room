-- Run this once on an existing deployment after adding DeletionJob support.
-- It reuses the Vault secrets created by 0002 and only changes the cron schedule.
select cron.unschedule(jobid)
from cron.job
where jobname = 'cleanup-expired-uploads';

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
