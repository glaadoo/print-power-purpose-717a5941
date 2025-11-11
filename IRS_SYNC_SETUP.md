# IRS Nonprofit Data Sync Setup

## Overview
The `sync-irs-nonprofits` Edge Function downloads and processes the IRS Tax-Exempt Organizations Business Master File (EO BMF) containing 500k+ nonprofit records. It runs nightly to keep the database current.

## Data Source
- **URL**: https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads
- **Direct CSV**: https://www.irs.gov/pub/irs-soi/eo_info.csv
- **Format**: CSV with comma-separated values
- **Update Frequency**: Monthly by IRS
- **Record Count**: 500,000+ active nonprofits

## How It Works

1. **Download**: Fetches the latest IRS CSV file
2. **Parse**: Processes each record, extracting EIN, name, city, state, status
3. **Normalize**: Creates `indexed_name` for case-insensitive search, maps status to active/revoked/unknown
4. **Upsert**: Batch inserts/updates nonprofits table by EIN (idempotent)
5. **Log**: Records sync results in system_logs table

## Setup Instructions

### 1. Manual Test (Quick Seed - 5,000 records)
```bash
curl -X POST \
  'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/sync-irs-nonprofits' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"quickSeed": true}'
```

Expected output:
```json
{
  "success": true,
  "quickSeed": true,
  "rowsAdded": 5000,
  "rowsSkipped": 234,
  "totalProcessed": 5234,
  "timestamp": "2025-01-15T03:00:00.000Z"
}
```

### 2. Full Sync (500k+ records - takes ~10-15 minutes)
```bash
curl -X POST \
  'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/sync-irs-nonprofits' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3. Setup Nightly Cron Job

#### Option A: Using Supabase pg_cron (Recommended)

Run this SQL in your Supabase SQL editor:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule nightly sync at 3:00 AM ET
SELECT cron.schedule(
  'irs-nonprofit-sync-nightly',
  '0 3 * * *', -- 3:00 AM daily
  $$
  SELECT
    net.http_post(
      url := 'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/sync-irs-nonprofits',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('quickSeed', false)
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'irs-nonprofit-sync-nightly';
```

To remove the cron job:
```sql
SELECT cron.unschedule('irs-nonprofit-sync-nightly');
```

#### Option B: Using External Cron (GitHub Actions, etc.)

Create `.github/workflows/irs-sync.yml`:
```yaml
name: Nightly IRS Sync
on:
  schedule:
    - cron: '0 8 * * *'  # 3 AM ET = 8 AM UTC
  workflow_dispatch: # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call IRS Sync Function
        run: |
          curl -X POST \
            '${{ secrets.SUPABASE_URL }}/functions/v1/sync-irs-nonprofits' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"quickSeed": false}'
```

## Monitoring

### Check Sync Logs
```sql
SELECT 
  timestamp,
  message,
  metadata->>'rowsAdded' as rows_added,
  metadata->>'rowsSkipped' as rows_skipped,
  metadata->>'totalProcessed' as total_processed
FROM system_logs
WHERE category = 'irs_sync'
ORDER BY timestamp DESC
LIMIT 10;
```

### Check Nonprofit Count
```sql
SELECT 
  source,
  COUNT(*) as count,
  COUNT(DISTINCT state) as states_covered
FROM nonprofits
GROUP BY source;
```

Expected output:
```
source    | count   | states_covered
----------|---------|---------------
curated   | 25      | 10
irs       | 500000+ | 56
```

## Troubleshooting

### Error: "Failed to download IRS data"
- IRS server may be temporarily down
- Check https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads
- Try again in 1 hour

### Error: "Batch upsert error"
- Database may be under load
- Check Supabase dashboard for connection limits
- Consider upgrading instance size in Settings → Cloud → Advanced

### Slow Performance
- First sync takes 10-15 minutes (500k+ records)
- Subsequent syncs are faster (only updates changed records)
- Use `quickSeed: true` for testing (5k records in ~30 seconds)

## Data Schema Mapping

| IRS Field      | DB Column      | Notes                          |
|----------------|----------------|--------------------------------|
| EIN            | ein            | 9 digits, unique key           |
| NAME/LEGAL_NAME| name           | Organization legal name        |
| CITY           | city           | City location                  |
| STATE          | state          | 2-letter state code            |
| STATUS         | irs_status     | Mapped to active/revoked/unknown|
| (computed)     | indexed_name   | Lowercase, searchable          |
| (fixed)        | source         | Always 'irs'                   |
| (fixed)        | country        | Always 'US'                    |
| (fixed)        | approved       | Auto-approved (true)           |

## Security Notes

- Function uses `SUPABASE_SERVICE_ROLE_KEY` for write access
- Optional `CRON_SECRET` environment variable for cron authentication
- All IRS records auto-approved (`approved: true`)
- Users can search IRS nonprofits immediately after sync
- Donations to IRS nonprofits are processed instantly (no manual approval)

## Costs

- **Edge Function**: ~$0.01 per sync (15 minutes compute time)
- **Database**: ~100MB storage for 500k records
- **Bandwidth**: ~50MB download from IRS per sync
- **Monthly Total**: ~$1-2 for nightly syncs

## Next Steps

1. Run quick seed test to verify setup
2. Schedule nightly cron job
3. Monitor first full sync
4. Set up alerts for failed syncs (optional)
5. Update search UI to show IRS results
