# Production Setup & Launch Checklist

## 🔴 CRITICAL: Pre-Launch Requirements

### 1. Database CRON Job Setup

**Enable Extensions:**
```sql
-- Run in Lovable Cloud backend SQL editor
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Schedule Check-Drop Job:**
```sql
SELECT cron.schedule(
  'daily-checkdrop-evaluation',
  '0 9 * * *', -- Daily at 9 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/checkdrop-evaluate',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2huZHRoamdlcWFtZnVsZG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMDQ1MTYsImV4cCI6MjA3NDc4MDUxNn0.cb9tO9fH93WRlLclJwhhmY03Hck9iyZF6GYXjbYjibw'
      ),
      body := jsonb_build_object('timestamp', now())
    ) AS request_id;
  $$
);
```

**Add Performance Indexes:**
```sql
-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_cause_id ON orders(cause_id);

-- Donations indexes
CREATE INDEX IF NOT EXISTS idx_donations_cause_id ON donations(cause_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_customer_email ON donations(customer_email);

-- Causes indexes
CREATE INDEX IF NOT EXISTS idx_causes_raised_cents ON causes(raised_cents);

-- Story requests indexes
CREATE INDEX IF NOT EXISTS idx_story_requests_cause_id ON story_requests(cause_id);
CREATE INDEX IF NOT EXISTS idx_story_requests_status ON story_requests(status);

-- Error logs indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
```

**Verify CRON Job:**
```sql
-- Check job exists
SELECT * FROM cron.job WHERE jobname = 'daily-checkdrop-evaluation';

-- View execution history
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-checkdrop-evaluation')
ORDER BY start_time DESC
LIMIT 10;
```

### 2. Environment Variables & Secrets

**Required Secrets (Already Configured):**
- ✅ STRIPE_SECRET_KEY
- ✅ STRIPE_WEBHOOK_SECRET
- ✅ RESEND_API_KEY
- ✅ ADMIN_KEY
- ✅ SUPABASE_* keys
- ✅ Vendor API keys (SinaLite, Scalable Press, PsRestful)

**Production Configuration:**
- Set `VENDORS_LIVE=true` when ready for real vendor APIs
- Update Resend "from" email to your verified domain
- Update admin email in checkdrop-evaluate function

### 3. Stripe Production Mode

**Webhook Endpoint:**
- URL: `https://wgohndthjgeqamfuldov.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`
- Get signing secret from Stripe dashboard
- Update `STRIPE_WEBHOOK_SECRET` in Lovable Cloud secrets

**Test Production Webhook:**
```bash
# Use Stripe CLI to forward events
stripe listen --forward-to https://wgohndthjgeqamfuldov.supabase.co/functions/v1/stripe-webhook

# Trigger test event
stripe trigger checkout.session.completed
```

### 4. Security Review

**Admin Access:**
- [ ] Rotate ADMIN_KEY secret
- [ ] Test admin login flow
- [ ] Verify admin route protection works in production
- [ ] Test admin key verification edge function

**Secrets Management:**
- [ ] All secrets stored in Lovable Cloud (not in code)
- [ ] No hardcoded API keys in source
- [ ] .env file not committed to git

**HTTPS & Headers:**
- [ ] Verify HTTPS certificate valid
- [ ] Check CORS headers configured correctly
- [ ] Rate limiting active on checkout endpoints

**Webhook Security:**
- [ ] Stripe webhook signature verification enabled
- [ ] All edge functions have proper CORS

### 5. Performance Optimization

**Images:**
- [ ] Compress all images in `/public/media/`
- [ ] Add lazy loading to VideoBackground components
- [ ] Use WebP format where possible

**Lighthouse Targets:**
- [ ] Performance: ≥ 90
- [ ] Accessibility: ≥ 90
- [ ] Best Practices: ≥ 90
- [ ] SEO: ≥ 90

**Run Lighthouse:**
```bash
# In browser DevTools or
npx lighthouse https://your-production-url.lovable.app --view
```

**Caching:**
- Videos and images served with proper cache headers
- API responses cached where appropriate
- Static assets compressed (gzip/brotli)

### 6. Testing Checklist

**Mobile Testing:**
- [ ] iOS Safari (iPhone)
- [ ] Android Chrome
- [ ] Responsive layouts all breakpoints
- [ ] Touch interactions work
- [ ] Forms validate correctly

**Desktop Testing:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

**Complete User Flows:**
- [ ] Guest checkout (no login)
- [ ] Sign up → select cause → product → checkout → success
- [ ] Donation flow with cause selection
- [ ] Admin login → view orders → export CSV
- [ ] Story request created at $777 milestone

**Edge Functions:**
- [ ] checkout-session creates valid Stripe session
- [ ] stripe-webhook processes payments correctly
- [ ] checkdrop-evaluate triggers story requests
- [ ] kenzie-chat responds to messages
- [ ] verify-admin-key validates admin access

### 7. Monitoring & Logging

**Setup Monitoring:**
- [ ] Lovable Cloud error logs enabled
- [ ] Stripe dashboard webhook monitoring
- [ ] Resend email delivery monitoring
- [ ] CRON job execution tracking

**Key Metrics to Track:**
- Order volume (daily/weekly)
- Donation total (cumulative)
- Cause progress toward goals
- Email delivery rates
- Error log counts
- Checkout abandonment rate

**Log Locations:**
- Edge functions: Lovable Cloud backend → Functions → Logs
- Database errors: Error logs table
- Stripe events: Stripe dashboard → Developers → Webhooks
- CRON jobs: `cron.job_run_details` table

### 8. Final Pre-Launch

**Data Verification:**
- [ ] Test causes seeded with realistic goals
- [ ] Products catalog synced
- [ ] Schools and nonprofits list populated
- [ ] Admin user created

**Email Templates:**
- [ ] Update "from" address to verified domain
- [ ] Test receipt email delivery
- [ ] Test $777 milestone email
- [ ] Verify email styling in major clients

**Documentation:**
- [ ] README.md updated with live URL
- [ ] API documentation complete
- [ ] Runbooks for common tasks
- [ ] Admin user guide

## 🟡 Post-Launch Monitoring (First 48 Hours)

### Hour 1-4: Critical Monitoring
- [ ] Monitor first real Stripe payment
- [ ] Check webhook delivery success
- [ ] Verify email receipts sent
- [ ] Test admin dashboard access
- [ ] Check error logs (should be empty)

### Hour 4-24: Active Monitoring
- [ ] Review all completed orders
- [ ] Verify donation totals match
- [ ] Check cause progress updates
- [ ] Monitor edge function logs
- [ ] Test CRON job execution

### Day 2-7: Regular Monitoring
- [ ] Daily review of error logs
- [ ] Weekly CRON job verification
- [ ] Lighthouse score checks
- [ ] User feedback collection
- [ ] Performance metrics review

## 🚀 Launch Day Procedure

1. **Morning Check (9 AM)**
   - Run CRON job verification query
   - Check all secrets configured
   - Test admin login
   - Verify Stripe webhook

2. **Deploy to Production**
   - Deploy via Lovable publish button
   - Verify live URL accessible
   - Test complete checkout flow
   - Monitor logs in real-time

3. **First Transaction**
   - Use Stripe test card for first order
   - Verify webhook processes
   - Check receipt email arrives
   - Confirm database records created

4. **Go Live**
   - Switch Stripe to live mode
   - Enable VENDORS_LIVE
   - Announce launch
   - Monitor actively for 4 hours

## 📞 Emergency Contacts

**Critical Issues:**
- Database down → Check Lovable Cloud status
- Stripe webhook failing → Verify signing secret
- Emails not sending → Check Resend dashboard
- CRON not running → Verify pg_cron enabled

**Support Resources:**
- Lovable Cloud: https://docs.lovable.dev/features/cloud
- Stripe API: https://stripe.com/docs/api
- Resend: https://resend.com/docs

## 🔄 Maintenance Schedule

**Daily:**
- Check error logs
- Monitor order volume
- Verify email delivery

**Weekly:**
- Review CRON job history
- Export orders/donations CSV
- Lighthouse performance check

**Monthly:**
- Security audit (rotate secrets)
- Database backup verification
- Performance optimization review
- Update dependencies

---

**Last Updated:** Launch preparation
**Next Review:** Post-launch +30 days
