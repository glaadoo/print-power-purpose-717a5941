# CRON Job Setup for Cause Milestone Evaluation

## Overview
This project includes a CRON job that runs daily to check if any causes have reached the $777 donation milestone. When reached, it creates a story request and sends an email notification to the admin.

## Security
The `checkdrop-evaluate` edge function is protected with a secret header (`x-cron-secret`) that must match the `CRON_SECRET` environment variable. This prevents unauthorized triggering of the function and email spam.

## Manual Setup Required

Due to database permission requirements for `pg_cron` and `pg_net` extensions, you'll need to run the following SQL manually in your backend SQL editor:

<lov-actions>
<lov-open-backend>Open Backend SQL Editor</lov-open-backend>
</lov-actions>

```sql
-- Enable extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the daily job at 9 AM UTC
SELECT cron.schedule(
  'daily-checkdrop-evaluation',
  '0 9 * * *', -- Every day at 9 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/checkdrop-evaluate',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', current_setting('app.settings.cron_secret', true)
      ),
      body := jsonb_build_object('timestamp', now()::text)
    ) as request_id;
  $$
);
```

**Important**: You'll need to configure the `app.settings.cron_secret` setting in your database to match the `CRON_SECRET` environment variable that you've already set.

## Verify the Cron Job

Check that the cron job was created successfully:

```sql
SELECT * FROM cron.job WHERE jobname = 'daily-checkdrop-evaluation';
```

## View Cron Job History

Monitor execution history:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-checkdrop-evaluation')
ORDER BY start_time DESC
LIMIT 10;
```

## Manual Testing

To manually trigger the check-drop evaluation (requires the CRON_SECRET):

```bash
curl -X POST https://wgohndthjgeqamfuldov.supabase.co/functions/v1/checkdrop-evaluate \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET_VALUE" \
  -d '{"timestamp": "2025-01-01T09:00:00Z"}'
```

## Modifying the Cron Job

To update the schedule:

```sql
-- First, unschedule the old job
SELECT cron.unschedule('daily-checkdrop-evaluation');

-- Then create a new one with updated schedule
-- (use the CREATE statement from above with new cron pattern)
```

## Cron Schedule Options

- **Every hour**: `0 * * * *`
- **Every 6 hours**: `0 */6 * * *`
- **Daily at 9 AM**: `0 9 * * *` (current)
- **Weekly on Monday at 9 AM**: `0 9 * * 1`

## What Happens During Check-Drop?

1. CRON job triggers the `checkdrop-evaluate` edge function with secret header
2. Function validates the `x-cron-secret` header (security check)
3. Fetches all causes from the database
4. For each cause that has raised >= $777:
   - Checks if a story request already exists
   - If not, creates a new story request record
   - Sends an email notification to admin@printpowerpurpose.com
5. Returns a summary of evaluated and triggered causes

## Monitoring

- Check edge function logs in backend
- Review story_requests table for new entries
- Monitor admin email for milestone notifications
- Check cron.job_run_details for execution history

## Troubleshooting

**Cron job returns 401 Unauthorized:**
- Verify `CRON_SECRET` environment variable is set correctly
- Ensure the secret matches in both the edge function environment and the cron job configuration

**Function not creating story requests:**
- Manually test the edge function using curl with correct secret
- Check edge function logs for errors
- Verify RESEND_API_KEY secret is set
- Ensure causes table has valid data

**Emails not sending:**
- Verify RESEND_API_KEY in secrets
- Check Resend dashboard for delivery status
- Update "from" email to match your verified domain
