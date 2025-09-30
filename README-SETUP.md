# Print Power Purpose - Setup Guide

## Overview
Print Power Purpose is a cause-driven e-commerce platform where customers choose a cause before purchasing print products. Every order contributes to the selected cause.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Lovable Cloud (Supabase)
- **Payments**: Stripe Checkout
- **Mascot**: 🐾 Kenzie guides users through cause selection

## Prerequisites
1. **Lovable Cloud** (already enabled)
2. **Stripe Account**: Get your test API keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)

## Environment Setup

### Required Secrets (Add in Lovable Cloud → Settings)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  (after webhook setup)
PUBLIC_SITE_URL=https://your-app.lovable.app  (or localhost:8080 for dev)
```

## Database Tables
Already created via migration:
- **causes**: Fundraising causes with goals and progress
- **products**: Print products with base costs
- **orders**: Order records linked to products and causes

Sample data is seeded automatically.

## Features

### User Flow
1. **Home** (`/`) - Welcome page with Kenzie mascot
2. **Kenzie Flow** (`/kenzie`) - Guided cause selection
   - Choose intent (School, Nonprofit, Personal)
   - Browse causes with funding progress bars
   - Select cause and proceed to products
3. **Causes** (`/causes`) - Direct cause browsing
4. **Products** (`/products`) - Print product catalog
5. **Product Detail** (`/products/:id`) - Configure quantity and checkout
6. **Stripe Checkout** - Secure payment flow
7. **Success/Cancel** pages - Post-payment handling

### Backend API (Edge Functions)

#### `/api/checkout/session` (POST)
Creates Stripe Checkout Session
- Validates product and cause
- Calculates pricing server-side (base_cost × 1.6)
- Creates order record
- Returns Stripe checkout URL

#### `/api/stripe-webhook` (POST)
Handles Stripe webhook events
- Verifies webhook signature
- Updates order status to 'paid'
- Increments cause's raised_cents

## Stripe Integration

### Test Card
Use `4242 4242 4242 4242` with any future expiry and CVC for testing.

### Webhook Setup
1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Add endpoint: `https://your-app.lovable.app/api/stripe-webhook`
3. Select event: `checkout.session.completed`
4. Copy webhook secret and add to environment

## Pricing Logic
Products have a `base_cost_cents` (wholesale price).
Customer price = `base_cost_cents × 1.6` (calculated server-side for security).

## Security Features
- All pricing calculated server-side
- Stripe handles payment data (no raw card info)
- Input validation on all API endpoints
- RLS policies on database tables
- Webhook signature verification
- Environment secrets management

## Development

### Local Testing
```bash
npm install
npm run dev
# Visit http://localhost:8080
```

### API Testing
- Use Stripe test mode
- Check edge function logs in Lovable Cloud
- Monitor webhook events in Stripe Dashboard

## Design System
- **Background**: Warm beige (#f5f0e6)
- **Theme**: Cozy, purpose-driven aesthetic
- **Colors**: Defined in `src/index.css` using HSL values
- **Components**: Semantic tokens from design system

## Next Steps
1. Add Stripe API keys to environment
2. Test full checkout flow with test card
3. Set up webhook endpoint
4. Deploy to production
5. Switch to live Stripe keys

## Support
- Lovable Docs: https://docs.lovable.dev
- Stripe Docs: https://stripe.com/docs
