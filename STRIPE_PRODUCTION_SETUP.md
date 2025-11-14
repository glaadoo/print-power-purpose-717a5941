# Stripe Production Setup Guide

## ✅ Current Implementation Status

Your Stripe integration is already configured with:
- ✓ Webhook signature verification (`STRIPE_WEBHOOK_SECRET`)
- ✓ Secure checkout session creation
- ✓ Order and donation tracking
- ✓ Email notifications via Resend
- ✓ Latest Stripe API (2025-08-27.basil)

## 🔐 Step 1: Switch to Production Keys

### Get Your Production Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. **Toggle from "Test mode" to "Live mode"** (top right)
3. Navigate to **Developers → API Keys**
4. Copy your **Secret key** (starts with `sk_live_`)

### Update in Lovable Cloud

1. Open Lovable Cloud Backend
2. Go to **Secrets** section
3. Update `STRIPE_SECRET_KEY` with your live key

```
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
```

## 🔔 Step 2: Configure Production Webhook

### Create Webhook Endpoint

1. In Stripe Dashboard (Live mode), go to **Developers → Webhooks**
2. Click **"+ Add endpoint"**
3. Set Endpoint URL:
   ```
   https://wgohndthjgeqamfuldov.supabase.co/functions/v1/stripe-webhook
   ```

### Select Events to Listen To

Add these events:
- ✓ `checkout.session.completed` (required)
- ✓ `payment_intent.succeeded` (optional, for additional tracking)
- ✓ `payment_intent.payment_failed` (optional, for error handling)

### Get Webhook Secret

1. After creating the endpoint, click on it
2. Click **"Reveal"** under **Signing secret**
3. Copy the secret (starts with `whsec_`)

### Update in Lovable Cloud

1. Go to **Secrets** section in Cloud Backend
2. Update `STRIPE_WEBHOOK_SECRET` with your live webhook secret

```
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
```

## 🧪 Step 3: Test Production Checkout

### Test Checkout Flow

1. Make a test purchase on your live site
2. Use a real payment method (will be charged)
3. **Stripe Test Cards DO NOT work in production mode**

### Monitor Webhook Delivery

1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Click on your endpoint
3. View the **Attempts** tab to see webhook delivery logs
4. Check for:
   - ✓ 200 response codes (success)
   - ✗ 400/500 errors (need investigation)

### Check Application Logs

1. Open Lovable Cloud Backend
2. Go to **Edge Functions** → `stripe-webhook`
3. View logs for:
   - Webhook verification success
   - Order creation confirmations
   - Any error messages

## 📊 Step 4: Verify Data Flow

### Check Database Records

1. After test purchase, verify in Lovable Cloud:
   - **orders table**: New order with `status='completed'`
   - **donations table**: Donation record if applicable
   - **causes table**: `raised_cents` incremented

### Verify Email Delivery

1. Check if customer received confirmation email
2. Monitor Resend dashboard for delivery status
3. If emails not sending, verify `RESEND_API_KEY` is set

## 🔍 Troubleshooting

### Webhook Not Receiving Events

**Problem**: Stripe shows 404 or timeout errors

**Solution**:
1. Verify webhook URL is exactly:
   ```
   https://wgohndthjgeqamfuldov.supabase.co/functions/v1/stripe-webhook
   ```
2. Ensure edge function is deployed (happens automatically)
3. Check if `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard

### Invalid Signature Errors

**Problem**: Logs show "Invalid signature" or 400 errors

**Solution**:
1. Ensure `STRIPE_WEBHOOK_SECRET` in Cloud matches **live mode** secret from Stripe
2. **Do not mix test and live secrets**
3. Re-copy the secret carefully (no extra spaces)

### Orders Not Created

**Problem**: Payment succeeds but no order in database

**Solution**:
1. Check webhook logs for errors
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
3. Ensure RLS policies allow webhook to insert orders
4. Check that `checkout.session.completed` event is enabled

### Emails Not Sending

**Problem**: Orders created but no confirmation emails

**Solution**:
1. Verify `RESEND_API_KEY` is configured
2. Check Resend dashboard for delivery errors
3. Ensure sender domain is verified in Resend
4. Check spam folder

## 🎯 Production Checklist

Before going live, ensure:

- [ ] Live Stripe Secret Key configured
- [ ] Live Webhook endpoint created with correct URL
- [ ] Webhook secret updated in Cloud
- [ ] Test purchase completed successfully
- [ ] Order appears in database with correct data
- [ ] Donation amount tracked correctly
- [ ] Customer received confirmation email
- [ ] Webhook shows 200 responses in Stripe Dashboard
- [ ] All error logs reviewed and resolved

## 🚨 Security Notes

1. **Never expose** `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` in frontend code
2. **Always verify** webhook signatures (already implemented)
3. **Monitor** failed webhook attempts for suspicious activity
4. **Rotate keys** if compromised
5. **Use test mode** for development and staging environments

## 📞 Support Resources

- [Stripe Webhook Documentation](https://docs.stripe.com/webhooks)
- [Stripe Test Cards](https://docs.stripe.com/testing#cards) (test mode only)
- [Lovable Cloud Documentation](https://docs.lovable.dev/features/cloud)

---

**✨ Your Stripe integration is production-ready!** Follow the steps above to switch from test to live mode.
