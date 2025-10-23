# Cron Job Setup for Check-Drop Automation

## Overview
The `checkdrop-evaluate` edge function monitors all causes and automatically triggers story requests when a cause reaches the $777 milestone.

## Setting Up the Cron Job

### 1. Enable Required Extensions
First, enable the necessary PostgreSQL extensions in your Lovable Cloud backend:

```sql
-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 2. Create the Cron Job
Run this SQL to schedule the check-drop evaluation to run daily at 9 AM UTC:

```sql
SELECT cron.schedule(
  'daily-checkdrop-evaluation',
  '0 9 * * *', -- Every day at 9:00 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/checkdrop-evaluate',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2huZHRoamdlcWFtZnVsZG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMDQ1MTYsImV4cCI6MjA3NDc4MDUxNn0.cb9tO9fH93WRlLclJwhhmY03Hck9iyZF6GYXjbYjibw'
      ),
      body := jsonb_build_object(
        'timestamp', now()
      )
    ) AS request_id;
  $$
);
```

### 3. Verify the Cron Job
Check that the cron job was created successfully:

```sql
SELECT * FROM cron.job WHERE jobname = 'daily-checkdrop-evaluation';
```

### 4. View Cron Job History
Monitor execution history:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-checkdrop-evaluation')
ORDER BY start_time DESC
LIMIT 10;
```

## Manual Testing

To manually trigger the check-drop evaluation without waiting for the cron schedule:

```bash
curl -X POST https://wgohndthjgeqamfuldov.supabase.co/functions/v1/checkdrop-evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2huZHRoamdlcWFtZnVsZG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMDQ1MTYsImV4cCI6MjA3NDc4MDUxNn0.cb9tO9fH93WRlLclJwhhmY03Hck9iyZF6GYXjbYjibw" \
  -d '{"timestamp": "2025-01-01T09:00:00Z"}'
```

## Cron Schedule Options

If you want to change the frequency, here are common cron patterns:

- **Every hour**: `0 * * * *`
- **Every 6 hours**: `0 */6 * * *`
- **Daily at 9 AM**: `0 9 * * *` (current)
- **Weekly on Monday at 9 AM**: `0 9 * * 1`
- **Every 15 minutes**: `*/15 * * * *`

## Modifying the Cron Job

To update the schedule:

```sql
-- First, unschedule the old job
SELECT cron.unschedule('daily-checkdrop-evaluation');

-- Then create a new one with updated schedule
-- (use the CREATE statement from step 2 with new cron pattern)
```

## Deleting the Cron Job

To remove the cron job completely:

```sql
SELECT cron.unschedule('daily-checkdrop-evaluation');
```

## What Happens During Check-Drop?

1. The cron job triggers the `checkdrop-evaluate` edge function
2. The function fetches all causes from the database
3. For each cause that has raised >= $777:
   - Checks if a story request already exists
   - If not, creates a new story request record
   - Sends an email notification to admin@printpowerpurpose.com
4. Returns a summary of how many causes were evaluated and how many triggered

## Monitoring

- Check edge function logs in Lovable Cloud backend
- Review story_requests table for new entries
- Monitor admin email for milestone notifications
- Check cron.job_run_details for execution history

## Troubleshooting

**Cron job not running:**
- Verify extensions are enabled (`\dx` in SQL editor)
- Check cron.job table for the job entry
- Review cron.job_run_details for error messages

**Function not creating story requests:**
- Manually test the edge function using curl
- Check edge function logs for errors
- Verify RESEND_API_KEY secret is set
- Ensure causes table has valid data

**Emails not sending:**
- Verify RESEND_API_KEY in secrets
- Check Resend dashboard for delivery status
- Update "from" email to match your verified domain
