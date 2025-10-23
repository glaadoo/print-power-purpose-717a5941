# Testing Guide & Production Verification

## Pre-Launch Testing Checklist

### 🔴 Critical Tests (Must Pass)

#### 1. Complete Purchase Flow
**Test:** Guest checkout with donation

**Steps:**
1. Navigate to `/welcome`
2. Select a cause (e.g., Robotics Club)
3. Browse `/products`
4. Select a product
5. Add to cart with donation amount
6. Proceed to Stripe checkout
7. Use test card: `4242 4242 4242 4242`
8. Complete payment
9. Verify redirect to `/success`

**Expected Results:**
- ✅ Order created in `orders` table
- ✅ Donation created in `donations` table
- ✅ Cause `raised_cents` incremented
- ✅ Receipt email sent to customer
- ✅ Success page displays order details

**Verification Queries:**
```sql
-- Check order created
SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;

-- Check donation linked
SELECT * FROM donations WHERE order_id = 'ORDER_ID_FROM_ABOVE';

-- Verify cause updated
SELECT name, raised_cents, goal_cents FROM causes WHERE id = 'CAUSE_ID';
```

#### 2. Admin Authentication
**Test:** Admin login and access

**Steps:**
1. Navigate to `/admin`
2. Enter admin key
3. Verify access granted
4. Check session persists on page refresh
5. Logout
6. Verify access denied after logout

**Expected Results:**
- ✅ Correct key grants access
- ✅ Invalid key shows error
- ✅ Session persists across refreshes
- ✅ Logout clears session

#### 3. $777 Milestone Trigger
**Test:** Story request creation

**Steps:**
1. Manually update a cause to $777+ in database
2. Call `checkdrop-evaluate` function manually
3. Check `story_requests` table
4. Verify admin email sent

**Manual Trigger:**
```bash
curl -X POST https://wgohndthjgeqamfuldov.supabase.co/functions/v1/checkdrop-evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2huZHRoamdlcWFtZnVsZG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMDQ1MTYsImV4cCI6MjA3NDc4MDUxNn0.cb9tO9fH93WRlLclJwhhmY03Hck9iyZF6GYXjbYjibw"
```

**Expected Results:**
- ✅ Story request created in database
- ✅ Email sent to admin@printpowerpurpose.com
- ✅ No duplicate requests for same cause

**Verification:**
```sql
-- Check story request
SELECT * FROM story_requests WHERE cause_id = 'CAUSE_ID';

-- Verify no duplicates
SELECT cause_id, COUNT(*) as count 
FROM story_requests 
GROUP BY cause_id 
HAVING COUNT(*) > 1;
```

#### 4. Stripe Webhook Processing
**Test:** Webhook signature verification and order processing

**Setup:**
```bash
# Install Stripe CLI
stripe listen --forward-to https://wgohndthjgeqamfuldov.supabase.co/functions/v1/stripe-webhook

# In another terminal
stripe trigger checkout.session.completed
```

**Expected Results:**
- ✅ Webhook signature validated
- ✅ Order status updated to "completed"
- ✅ Receipt email sent
- ✅ No errors in edge function logs

**Check Logs:**
```bash
# View stripe-webhook logs in Lovable Cloud backend
# Look for:
# - "Webhook event type: checkout.session.completed"
# - "Order {number} created successfully"
# - "Receipt email sent to {email}"
```

#### 5. CRON Job Execution
**Test:** Scheduled check-drop runs daily

**Verification:**
```sql
-- Check CRON job configured
SELECT * FROM cron.job WHERE jobname = 'daily-checkdrop-evaluation';

-- View recent executions
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-checkdrop-evaluation')
ORDER BY start_time DESC 
LIMIT 10;

-- Check for errors
SELECT * FROM cron.job_run_details 
WHERE status = 'failed'
ORDER BY start_time DESC;
```

**Expected Results:**
- ✅ Job exists in cron.job table
- ✅ Job runs daily at 9 AM UTC
- ✅ No failed executions
- ✅ Function logs show successful runs

### 🟡 Important Tests

#### 6. Mobile Responsiveness
**Test:** UI works on mobile devices

**Devices to Test:**
- iPhone (iOS Safari)
- Android (Chrome)
- iPad (tablet view)

**Key Pages:**
- `/` - Home page
- `/products` - Product grid
- `/checkout` - Stripe checkout
- `/admin` - Admin dashboard

**Expected Results:**
- ✅ All layouts responsive
- ✅ Touch interactions work
- ✅ Forms usable on small screens
- ✅ Videos/images load correctly
- ✅ No horizontal scroll

#### 7. CSV Export Functionality
**Test:** Admin can export data

**Steps:**
1. Login to `/admin`
2. Navigate to `/admin/orders`
3. Click "Export CSV" button
4. Verify CSV downloads
5. Open CSV and check data
6. Repeat for `/admin/donations`

**Expected Results:**
- ✅ CSV file downloads
- ✅ Data matches database
- ✅ All columns present
- ✅ Proper formatting (dates, currency)

#### 8. Search and Filtering
**Test:** Admin can filter orders/donations

**Steps:**
1. Navigate to `/admin/orders`
2. Enter email in search box
3. Verify results filter
4. Select status filter (completed/pending)
5. Verify results update
6. Repeat for `/admin/donations` cause filter

**Expected Results:**
- ✅ Search filters results in real-time
- ✅ Status/cause filters work
- ✅ Filters can be combined
- ✅ No results shows appropriate message

#### 9. Error Logging
**Test:** Errors captured in database

**Steps:**
1. Trigger a frontend error (e.g., invalid API call)
2. Check `error_logs` table
3. Verify error details captured
4. Test admin can mark as resolved

**Expected Results:**
- ✅ Error logged in database
- ✅ Stack trace captured
- ✅ Page URL recorded
- ✅ Admin can resolve errors

**Verification:**
```sql
SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 10;
```

#### 10. Kenzie Chat
**Test:** AI chat functionality

**Steps:**
1. Click Kenzie chat button
2. Send a message
3. Verify response received
4. Check session persists across pages
5. Test multiple messages in conversation

**Expected Results:**
- ✅ Chat UI opens/closes
- ✅ Messages sent successfully
- ✅ AI responses received
- ✅ Session persists
- ✅ Message history loads

### 🟢 Additional Tests

#### 11. Performance (Lighthouse)
**Test:** Page load speed

**Run Lighthouse:**
```bash
npx lighthouse https://your-app.lovable.app --view
```

**Target Scores:**
- Performance: ≥ 90
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- SEO: ≥ 90

**Check:**
- ✅ First Contentful Paint < 1.8s
- ✅ Largest Contentful Paint < 2.5s
- ✅ Cumulative Layout Shift < 0.1
- ✅ Time to Interactive < 3.8s

#### 12. Rate Limiting
**Test:** Checkout rate limit prevents abuse

**Steps:**
1. Create script to call `/checkout-session` rapidly
2. Send 15 requests in 1 minute
3. Verify 11th+ requests blocked

**Expected Results:**
- ✅ First 10 requests succeed
- ✅ 11th request returns 429 (Too Many Requests)
- ✅ Rate limit resets after 1 minute

**Test Script:**
```bash
for i in {1..15}; do
  curl -X POST https://wgohndthjgeqamfuldov.supabase.co/functions/v1/checkout-session
  sleep 1
done
```

#### 13. Security Headers
**Test:** HTTPS and security headers present

**Check Headers:**
```bash
curl -I https://your-app.lovable.app
```

**Expected Results:**
- ✅ HTTPS enabled (no HTTP)
- ✅ Strict-Transport-Security header
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY or SAMEORIGIN

#### 14. Cross-Browser Compatibility
**Test:** App works in all major browsers

**Browsers:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Test:**
- Homepage renders correctly
- Forms submit successfully
- Stripe checkout works
- Admin dashboard functional

## Production Testing Schedule

### Day 1 (Launch Day)
- [ ] Complete purchase flow (3 test transactions)
- [ ] Admin login
- [ ] CSV exports
- [ ] Mobile testing (iOS + Android)
- [ ] Lighthouse audit
- [ ] Monitor edge function logs for errors

### Week 1
- [ ] $777 milestone trigger test
- [ ] CRON job execution verification
- [ ] Performance monitoring
- [ ] Real user feedback collection
- [ ] Error log review

### Monthly
- [ ] Full regression testing
- [ ] Security audit
- [ ] Performance benchmarks
- [ ] Dependency updates
- [ ] Backup verification

## Test Data

### Test Stripe Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Auth Required: 4000 0027 6000 3184
```

### Test Emails
Use `+test` aliases for receipt testing:
```
yourname+order1@gmail.com
yourname+order2@gmail.com
```

### Test Causes
Ensure database has causes with various progress levels:
- 0% funded
- 50% funded
- 99% funded
- >$777 (for story request testing)

## Automated Testing (Future)

### E2E Tests (Playwright)
```typescript
// tests/checkout.spec.ts
test('complete purchase flow', async ({ page }) => {
  await page.goto('/welcome');
  await page.click('text=Robotics Club');
  await page.goto('/products');
  await page.click('text=T-Shirt');
  await page.fill('[name=donation]', '10');
  await page.click('text=Checkout');
  // ... continue flow
});
```

### API Tests (Jest)
```typescript
// tests/api/checkout.test.ts
describe('Checkout API', () => {
  it('creates valid Stripe session', async () => {
    const response = await supabase.functions.invoke('checkout-session', {
      body: { productId: 'test-id', donation: 1000 }
    });
    expect(response.data.url).toContain('stripe.com');
  });
});
```

## Bug Reporting Template

```markdown
**Title:** Brief description

**Environment:** 
- URL: https://your-app.lovable.app
- Browser: Chrome 120
- Device: iPhone 14 / Desktop

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. See error

**Expected:** What should happen
**Actual:** What actually happened

**Screenshots:** [Attach if applicable]

**Console Errors:** 
\`\`\`
Paste error from browser console
\`\`\`

**Priority:** Critical / High / Medium / Low
```

---

**Last Test Run:** Pre-launch  
**Next Test:** Daily (first week), weekly (ongoing)  
**Test Coverage Goal:** 80%+ critical paths
