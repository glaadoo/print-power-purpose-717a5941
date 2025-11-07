# Weekly Story Post Cron Job

## Overview

This document outlines the weekly automated story posting system that publishes completed milestone stories every Monday at 9 AM UTC.

## Edge Function: `weekly-story-post`

**Location**: `supabase/functions/weekly-story-post/index.ts`

**Purpose**: Automatically posts completed story requests that have reached the $777 milestone and have been approved with video content.

### Process Flow

1. **Cron Trigger** (Every Monday 9 AM UTC)
2. **Validation**: Checks for valid `CRON_SECRET`
3. **Fetch Stories**: Retrieves all `story_requests` where:
   - `status = 'completed'`
   - `video_url IS NOT NULL`
   - Ordered by creation date (oldest first)
4. **Process Each Story**:
   - Update status to `'posted'`
   - Add posting timestamp to notes
   - Log successful posting
5. **Return Results**: Summary of processed stories

## Cron Schedule

```sql
-- Runs every Monday at 9:00 AM UTC
-- Cron expression: '0 9 * * 1'
--   ┬ ┬ ┬ ┬ ┬
--   │ │ │ │ └─── Day of week (1 = Monday)
--   │ │ │ └───── Month (*)
--   │ │ └─────── Day of month (*)
--   │ └───────── Hour (9 = 9 AM)
--   └─────────── Minute (0)
```

## Manual Testing

You can manually trigger the story posting function for testing:

```bash
curl -X POST \
  'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/weekly-story-post' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'x-cron-secret: YOUR_CRON_SECRET'
```

## Verification

### Check if the cron job is scheduled:
```sql
SELECT * FROM cron.job WHERE jobname = 'weekly-story-post';
```

### View execution history:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'weekly-story-post')
ORDER BY start_time DESC 
LIMIT 10;
```

### Check processed stories:
```sql
SELECT id, cause_id, status, created_at, updated_at, notes
FROM story_requests
WHERE status = 'posted'
ORDER BY updated_at DESC;
```

## Modifying the Schedule

To change the cron schedule:

```sql
-- Unschedule the existing job
SELECT cron.unschedule('weekly-story-post');

-- Create new schedule (example: Every Wednesday at 10 AM)
SELECT cron.schedule(
  'weekly-story-post',
  '0 10 * * 3',
  $$
  SELECT net.http_post(
    url:='https://wgohndthjgeqamfuldov.supabase.co/functions/v1/weekly-story-post',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY", "x-cron-secret": "' || current_setting('app.settings.cron_secret') || '"}'::jsonb
  ) as request_id;
  $$
);
```

## Integration Points

The function currently marks stories as 'posted'. To extend functionality, you can add:

### Social Media Integration
```typescript
// Example: Post to Twitter/X
const tweetText = `🎉 Milestone achieved! ${story.causes?.name} reached $${story.milestone_amount / 100}! Watch their story: ${story.video_url}`;
// Call Twitter API

// Example: Post to Facebook
// Call Facebook Graph API

// Example: Post to Instagram
// Use Instagram Graph API
```

### Email Notifications
```typescript
// Send to all supporters of the cause
const { data: supporters } = await supabase
  .from('donations')
  .select('customer_email')
  .eq('cause_id', story.cause_id);

// Use Resend to send emails
```

### Blog/Website Updates
```typescript
// Create blog post entry
await supabase.from('blog_posts').insert({
  title: `${story.causes?.name} Reaches Milestone!`,
  video_url: story.video_url,
  status: 'published'
});
```

## Troubleshooting

### 401 Unauthorized Error
- Verify `CRON_SECRET` is set in Supabase secrets
- Check that `app.settings.cron_secret` matches the secret

### No Stories Being Posted
- Verify stories have `status = 'completed'`
- Check that `video_url` is not null
- Look at edge function logs for details

### Stories Not Updating
- Check RLS policies on `story_requests` table
- Verify service role key permissions
- Review edge function logs

## Monitoring

Monitor the cron job execution:

```sql
-- Check recent executions
SELECT 
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'weekly-story-post')
ORDER BY start_time DESC 
LIMIT 20;
```

Check edge function logs in Supabase dashboard under:
**Edge Functions → weekly-story-post → Logs**

## Performance Considerations

- Function processes all completed stories in a single run
- For high volumes (>100 stories), consider adding pagination
- Story posting happens sequentially to avoid rate limits
- Add delays between posts if integrating with social media APIs

## Security

- Function requires valid `CRON_SECRET` header
- Uses service role key for database access
- Only processes stories with `status = 'completed'`
- Logs all operations for audit trail

## Future Enhancements

1. **Social Media Integration**: Auto-post to Facebook, Instagram, Twitter
2. **Email Campaigns**: Notify all cause supporters
3. **Analytics Tracking**: Track engagement metrics
4. **Content Scheduling**: Allow delayed posting with approval workflow
5. **Media Optimization**: Compress videos before posting
6. **Hashtag Management**: Auto-generate relevant hashtags
7. **Cross-Platform Publishing**: Simultaneous multi-platform posting
