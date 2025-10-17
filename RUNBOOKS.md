# Operational Runbooks - Print Power Purpose

## Table of Contents
1. [Daily Operations](#daily-operations)
2. [How to Re-run Check-Drop](#how-to-re-run-check-drop)
3. [How to Re-send Receipts](#how-to-re-send-receipts)
4. [Managing Story Requests](#managing-story-requests)
5. [Troubleshooting Common Issues](#troubleshooting-common-issues)
6. [Emergency Procedures](#emergency-procedures)

---

## Daily Operations

### Morning Checklist (9:30 AM UTC - after cron runs)

1. **Check Story Requests**
   - Navigate to `/admin/story-requests`
   - Review any new requests created overnight
   - Note causes that hit $777 milestone

2. **Review Analytics**
   - Go to `/admin/analytics`
   - Check yesterday's orders and donations
   - Identify top-performing causes

3. **Monitor Error Logs**
   - Open Admin Menu → Error Logs
   - Address any unresolved errors
   - Mark resolved issues as complete

### Weekly Tasks

**Every Monday:**
- Export orders CSV for the previous week
- Export donations CSV for the previous week
- Review cause progress toward goals
- Identify causes approaching $777 threshold

**Every Friday:**
- Review all pending story requests
- Follow up on in-progress story requests
- Archive completed story requests

---

## How to Re-run Check-Drop

### When to Re-run
- After manually updating cause donation amounts
- If cron job fails
- To test $777 trigger for a specific cause
- After fixing bugs in the evaluation logic

### Method 1: Manual Trigger via Supabase SQL Editor

1. **Open Supabase SQL Editor**
   - Log into Supabase Dashboard
   - Navigate to SQL Editor

2. **Run this SQL:**
   ```sql
   SELECT net.http_post(
     url := 'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/checkdrop-evaluate',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
     ),
     body := jsonb_build_object('manual_trigger', true, 'triggered_by', 'admin')
   );
   ```

3. **Verify Results**
   - Check edge function logs: `/admin` → Open Backend → Edge Functions → checkdrop-evaluate
   - Go to `/admin/story-requests` to see any new requests
   - Verify email was sent to admin if threshold reached

### Method 2: Temporary Cron for Immediate Run

```sql
-- Create a one-time job that runs in the next minute
SELECT cron.schedule(
  'immediate-checkdrop',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/checkdrop-evaluate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('scheduled', true)
  );
  $$
);

-- Wait 1-2 minutes for execution

-- Remove the temporary job
SELECT cron.unschedule('immediate-checkdrop');
```

### Verify Check-Drop Execution

**Check Edge Function Logs:**
```
Expected output:
{
  "success": true,
  "evaluatedCauses": 25,
  "triggeredCauses": 2,
  "causes": [
    {"id": "...", "name": "Lincoln Elementary", "raised": 812.50},
    {"id": "...", "name": "Hope Foundation", "raised": 1024.00}
  ]
}
```

**Check Database:**
```sql
-- View all story requests
SELECT 
  sr.id,
  c.name as cause_name,
  c.raised_cents / 100 as raised_dollars,
  sr.status,
  sr.reached_at
FROM story_requests sr
JOIN causes c ON c.id = sr.cause_id
ORDER BY sr.reached_at DESC;
```

---

## How to Re-send Receipts

### When to Re-send
- Customer reports not receiving receipt
- Email delivery failed
- Testing email templates

### Prerequisites
- Order ID or customer email
- Access to Supabase

### Steps

1. **Find the Order**
   ```sql
   SELECT 
     id,
     order_number,
     customer_email,
     amount_total_cents,
     donation_cents,
     cause_name,
     product_name,
     created_at
   FROM orders
   WHERE customer_email = 'customer@example.com'
   OR order_number = 'ORD-12345'
   ORDER BY created_at DESC;
   ```

2. **Trigger Receipt Manually via Edge Function**

   Create a new edge function or use direct Resend call:

   ```typescript
   // In Supabase Edge Functions dashboard or create temporary function
   import { Resend } from 'npm:resend@4.0.0';
   
   const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
   
   await resend.emails.send({
     from: 'Print Power Purpose <onboarding@resend.dev>',
     to: ['customer@example.com'],
     subject: `Receipt for Order #ORD-12345`,
     html: `
       <!DOCTYPE html>
       <html>
         <body style="font-family: Arial, sans-serif;">
           <h1>Thank you for your order!</h1>
           <p><strong>Order #:</strong> ORD-12345</p>
           <p><strong>Product:</strong> T-Shirt</p>
           <p><strong>Total:</strong> $50.00</p>
           <p><strong>Donation:</strong> $10.00</p>
           <p><strong>Cause:</strong> Lincoln Elementary</p>
           <p>Your donation is making a difference!</p>
         </body>
       </html>
     `
   });
   ```

3. **Verify Email Sent**
   - Check Resend dashboard for send status
   - Ask customer to check spam folder
   - Provide manual receipt if email continues to fail

### Bulk Re-send (for system issues)

If multiple receipts failed:

```sql
-- Get all orders from a specific date without receipts sent
SELECT 
  order_number,
  customer_email,
  amount_total_cents,
  donation_cents,
  product_name,
  cause_name
FROM orders
WHERE 
  DATE(created_at) = '2025-10-17'
  AND status = 'completed'
ORDER BY created_at;
```

Then batch process through edge function.

---

## Managing Story Requests

### Workflow

1. **New Request Created (Automated)**
   - Cause hits $777
   - Check-drop creates story_request with status "pending"
   - Admin receives email notification

2. **Start Working on Request**
   - Navigate to `/admin/story-requests`
   - Find the pending request
   - Click "Start" to change status to "in_progress"

3. **Gather Story Content**
   - Contact nonprofit/school via `contact_email`
   - Request:
     - Photos of impact (high resolution)
     - Testimonials from beneficiaries
     - Key metrics (students helped, meals provided, etc.)
     - Story of a specific individual if possible

4. **Prepare for Pressmaster.ai**
   - Draft story content (300-500 words)
   - Include compelling headline
   - Add call-to-action
   - Attach photos

5. **Publish Story**
   - (Future: Use Pressmaster.ai integration)
   - For now: Manual publication
   - Update story request to "completed"

6. **Complete Request**
   - Click "Complete" in `/admin/story-requests`
   - Verify story is live
   - Notify nonprofit/school of publication

### Story Request Template Email

```
Subject: 🎉 Congratulations! [Cause Name] reached $777!

Hi [Contact Name],

Great news! Your cause has reached the $777 milestone on Print Power Purpose!

We'd love to share your story with our community. Could you provide:

1. **Photos** (3-5 high-resolution images showing your impact)
2. **Testimonials** (quotes from people you've helped)
3. **Impact metrics** (specific numbers: students helped, meals served, etc.)
4. **Personal story** (1-2 paragraphs about someone your organization has helped)

Please send these materials by [date] to [email].

Your story will inspire others to support important causes!

Best regards,
Print Power Purpose Team
```

---

## Troubleshooting Common Issues

### Issue: Orders Not Appearing in Admin

**Symptoms:**
- Customer completed purchase
- Order not in `/admin/orders`

**Diagnosis:**
1. Check Stripe webhook logs
2. Verify `stripe-webhook` edge function ran
3. Check database directly:
   ```sql
   SELECT * FROM orders 
   WHERE customer_email = 'customer@example.com'
   ORDER BY created_at DESC LIMIT 5;
   ```

**Resolution:**
- If order exists but not showing: Clear browser cache, refresh admin page
- If order missing: Check Stripe webhook configuration
- Manually create order if needed:
  ```sql
  INSERT INTO orders (
    order_number, 
    customer_email, 
    product_name, 
    amount_total_cents, 
    donation_cents,
    cause_id,
    cause_name,
    status
  ) VALUES (
    'ORD-MANUAL-001',
    'customer@example.com',
    'T-Shirt',
    5000,
    1000,
    'cause-uuid-here',
    'Lincoln Elementary',
    'completed'
  );
  ```

### Issue: Donation Not Incrementing Cause

**Symptoms:**
- Donation created
- Cause `raised_cents` not updated

**Diagnosis:**
```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'increment_cause_raised';

-- Manually check current value
SELECT id, name, raised_cents FROM causes WHERE id = 'cause-uuid';
```

**Resolution:**
```sql
-- Manually increment
UPDATE causes 
SET raised_cents = raised_cents + 1000 -- amount in cents
WHERE id = 'cause-uuid';
```

Then investigate why `increment_cause_raised` wasn't called.

### Issue: Cron Job Not Running

**Symptoms:**
- No new story requests despite causes exceeding $777
- No recent edge function logs for checkdrop-evaluate

**Diagnosis:**
```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- Check job run history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

**Resolution:**
1. Verify job exists and is active
2. Check schedule syntax is correct
3. Manually trigger to test:
   ```sql
   SELECT cron.schedule(
     'test-trigger',
     '* * * * *',
     $$ [your job SQL here] $$
   );
   ```
4. Check edge function logs for errors
5. If necessary, unschedule and reschedule:
   ```sql
   SELECT cron.unschedule('daily-checkdrop-evaluation');
   -- Then run the original schedule command
   ```

### Issue: Analytics Showing Zero

**Symptoms:**
- Dashboard shows 0 orders, 0 donations

**Diagnosis:**
- Check if test data exists in database
- Verify RLS policies allow admin to read data
- Check browser console for errors

**Resolution:**
1. Verify admin authentication
2. Check database:
   ```sql
   SELECT COUNT(*) FROM orders;
   SELECT COUNT(*) FROM donations;
   SELECT COUNT(*) FROM causes WHERE raised_cents > 0;
   ```
3. If data exists but not displaying, check RLS policies
4. Clear browser cache and reload

---

## Emergency Procedures

### System Down / Critical Error

1. **Immediate Actions**
   - Check error logs in `/admin`
   - Review recent edge function deployments
   - Check Supabase dashboard for service issues

2. **Communication**
   - Post status update on status page (if available)
   - Email active customers if checkout is affected

3. **Rollback**
   - Revert recent code changes via Git
   - Restore previous database migration if needed

### Data Loss / Corruption

1. **Stop All Writes**
   - Temporarily disable Stripe webhook
   - Disable admin modifications

2. **Assess Damage**
   - Run data integrity checks:
     ```sql
     -- Check for orphaned donations
     SELECT d.* FROM donations d
     LEFT JOIN causes c ON c.id = d.cause_id
     WHERE c.id IS NULL;
     
     -- Check for negative amounts
     SELECT * FROM causes WHERE raised_cents < 0;
     SELECT * FROM orders WHERE amount_total_cents < 0;
     ```

3. **Restore from Backup**
   - Use Supabase point-in-time recovery
   - Document what was lost

4. **Verify Restoration**
   - Run test transactions
   - Verify recent orders present

### Unauthorized Access Detected

1. **Immediate**
   - Rotate admin key immediately
   - Check audit logs for suspicious activity
   - Review user_roles table for unauthorized admins

2. **Investigation**
   - Review all recent admin actions
   - Check for unauthorized data exports
   - Review edge function logs for unusual calls

3. **Remediation**
   - Force re-authentication for all admins
   - Review and strengthen RLS policies
   - Enable additional logging if needed

---

## Maintenance Schedule

### Daily
- ✅ Check story requests
- ✅ Review error logs
- ✅ Monitor order volume

### Weekly
- ✅ Export orders and donations CSVs
- ✅ Review analytics trends
- ✅ Check cron job execution

### Monthly
- ✅ Review and archive completed story requests
- ✅ Audit admin access logs
- ✅ Database performance review
- ✅ Review and update runbooks

### Quarterly
- ✅ Security audit
- ✅ RLS policy review
- ✅ Backup restoration test
- ✅ Disaster recovery drill

---

## Contact Information

**Technical Issues:**
- Lovable Support: https://docs.lovable.dev
- Supabase Support: https://supabase.com/support

**Service Dependencies:**
- Stripe: https://stripe.com/support
- Resend: https://resend.com/support
