# End-to-End Testing Guide - Print Power Purpose

## Overview
This document provides step-by-step instructions for testing the CRM and automation features of Print Power Purpose.

## Pre-Test Setup

### 1. Admin Access
- Navigate to `/admin`
- Enter your admin key
- Verify you can access the admin dashboard

### 2. Test Data Preparation
Ensure you have:
- At least 2-3 causes in the database
- At least 2-3 products in the database
- Test Stripe account in test mode

---

## Test Case 1: Complete Purchase Flow

### Objective
Verify that orders, donations, and receipts work end-to-end.

### Steps
1. **Select a Cause**
   - Go to `/select/school` or `/select/nonprofit`
   - Select a school/nonprofit and cause
   - Verify cause is shown in banner

2. **Add Product to Cart**
   - Navigate to `/products`
   - Click on a product
   - Click "Add to Cart"
   - Verify cart icon updates

3. **Checkout**
   - Go to `/cart`
   - Enter donation amount (e.g., $10)
   - Click "Proceed to Checkout"
   - Complete Stripe test payment using card: `4242 4242 4242 4242`

4. **Verify Success**
   - Should redirect to `/success`
   - Check email for receipt

5. **Verify Database**
   - Go to `/admin/orders`
   - Verify new order appears with correct:
     - Product name
     - Total amount
     - Donation amount
     - Cause name
   - Go to `/admin/donations`
   - Verify donation record created with correct amount

**Expected Results:**
- ✅ Order created with status "completed"
- ✅ Donation record created
- ✅ Cause `raised_cents` incremented
- ✅ Receipt email sent to customer

---

## Test Case 2: $777 Milestone Trigger

### Objective
Verify that reaching $777 creates a story request and sends notification.

### Setup
1. Find or create a cause with `raised_cents` < 77700
2. Note the current `raised_cents` value

### Steps
1. **Manually Trigger Check-Drop**
   - Use Supabase SQL Editor or backend tool
   - Run: `SELECT net.http_post(url := 'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/checkdrop-evaluate', headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb, body := '{}'::jsonb);`
   
2. **Update Cause Manually (for testing)**
   ```sql
   UPDATE causes 
   SET raised_cents = 77800 
   WHERE id = 'YOUR_CAUSE_ID';
   ```

3. **Run Check-Drop Again**
   - Execute the same SQL as step 1

4. **Verify Story Request Created**
   - Go to `/admin/story-requests`
   - Verify new request appears for the cause
   - Status should be "pending"
   - Contact email should be `admin@printpowerpurpose.com`

5. **Check Admin Email**
   - Admin should receive milestone notification email
   - Email should include:
     - Cause name
     - Amount raised
     - Next steps instructions

6. **Test Status Updates**
   - Click "Start" to change status to "in_progress"
   - Click "Complete" to change status to "completed"

**Expected Results:**
- ✅ Story request created when `raised_cents` >= 77700
- ✅ No duplicate requests for same cause
- ✅ Admin notification email sent
- ✅ Status transitions work correctly

---

## Test Case 3: Admin Analytics Dashboard

### Objective
Verify analytics display accurate data.

### Steps
1. **Navigate to Analytics**
   - Go to `/admin/analytics`

2. **Verify Summary Cards**
   - Total Orders count matches database
   - Total Revenue matches sum of `amount_total_cents`
   - Total Donations matches sum of donation `amount_cents`
   - Active Causes count is correct

3. **Verify Charts**
   - Orders & Revenue chart shows data
   - Top Causes pie chart displays causes with donations
   - Cause Progress bars show correct percentages

4. **Check $777 Badges**
   - Causes with `raised_cents` >= 77700 show "🎉 $777 Reached" badge

**Expected Results:**
- ✅ All metrics accurate
- ✅ Charts render correctly
- ✅ Progress bars calculate properly
- ✅ Milestone badges appear for qualifying causes

---

## Test Case 4: CSV Exports

### Objective
Verify CSV export functionality.

### Steps
1. **Export Orders**
   - Go to `/admin/orders`
   - Click "Export CSV"
   - Open downloaded file
   - Verify headers: Order Number, Customer Email, Product, Amount, Donation, Cause, Status, Date
   - Verify data is formatted correctly

2. **Export Donations**
   - Go to `/admin/donations`
   - Click "Export CSV"
   - Open downloaded file
   - Verify headers: Customer Email, Amount, Cause ID, Date
   - Verify dollar amounts formatted as `$X.XX`

**Expected Results:**
- ✅ CSV files download successfully
- ✅ Headers present and correct
- ✅ Data matches admin table view
- ✅ UTF-8 encoding (special characters display correctly)

---

## Test Case 5: Search and Filtering

### Objective
Verify admin filters work correctly.

### Steps
1. **Orders Filters**
   - Go to `/admin/orders`
   - Search by customer email - verify results filter
   - Search by order number - verify results filter
   - Filter by status (All/Completed/Pending) - verify results

2. **Donations Filters**
   - Go to `/admin/donations`
   - Search by customer email - verify results
   - Filter by cause - verify results show only that cause

**Expected Results:**
- ✅ Search filters results in real-time
- ✅ Status filters show correct subset
- ✅ Cause filter shows only relevant donations
- ✅ No results message displays when appropriate

---

## Test Case 6: Cron Job (Scheduled Check-Drop)

### Objective
Verify automated check-drop runs correctly.

### Setup
Cron is scheduled to run daily at 9 AM UTC.

### Manual Test (without waiting)
```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- Manually trigger the job
SELECT cron.schedule(
  'test-checkdrop',
  '* * * * *',  -- Every minute for testing
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

-- Wait 1 minute, then check edge function logs
-- Remove test job when done
SELECT cron.unschedule('test-checkdrop');
```

### Verify
- Check edge function logs for `checkdrop-evaluate`
- Verify it ran successfully
- Check `story_requests` table for new entries

**Expected Results:**
- ✅ Cron job executes at scheduled time
- ✅ Check-drop function processes all causes
- ✅ Story requests created for qualifying causes
- ✅ No errors in edge function logs

---

## Regression Testing Checklist

Run after any database changes:

- [ ] Order creation still works
- [ ] Donations still increment cause totals
- [ ] Receipt emails still send
- [ ] Admin pages load without errors
- [ ] Analytics displays correct data
- [ ] CSV exports work
- [ ] Filters function properly
- [ ] Story requests trigger at $777
- [ ] Cron job executes successfully

---

## Common Issues & Solutions

### Issue: Receipt email not sent
**Solution:** Check edge function logs for `stripe-webhook`. Verify `RESEND_API_KEY` is set.

### Issue: Donation not incrementing cause
**Solution:** Verify `increment_cause_raised` function exists and webhook calls it.

### Issue: Story request not created
**Solution:** 
- Verify `raised_cents` >= 77700
- Check for existing story request (no duplicates)
- Review `checkdrop-evaluate` edge function logs

### Issue: Analytics showing zero
**Solution:** Ensure test data exists in orders/donations tables.

### Issue: CSV export empty
**Solution:** Check that filters aren't excluding all records.

---

## Performance Benchmarks

- Order creation: < 3 seconds
- Admin page load: < 2 seconds
- CSV export (100 records): < 1 second
- Analytics calculation: < 2 seconds
- Check-drop evaluation (50 causes): < 5 seconds

---

## Security Validation Points

During testing, verify:
- [ ] Non-admin users cannot access `/admin/*` routes
- [ ] Session storage doesn't persist across browser restarts
- [ ] Admin key is never exposed in network requests
- [ ] RLS policies prevent unauthorized data access
- [ ] Edge functions validate inputs
- [ ] No sensitive data in console logs
