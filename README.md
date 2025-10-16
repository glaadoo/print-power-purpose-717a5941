# Print Power Purpose

> A print-on-demand platform where every purchase supports charitable causes

## Project info

**URL**: https://lovable.dev/projects/4349d921-1a7d-4b2d-a5a2-95f4e7b77e4d

## Overview

Print Power Purpose connects customers with professional printing services while supporting charitable causes. Each order includes an optional donation that goes directly to the customer's chosen cause.

### Key Features

- **Multi-Vendor Product Catalog**: Integrated with SinaLite (print materials), Scalable Press (apparel), and PsRestful (promotional products)
- **Stripe Checkout Integration**: Secure payment processing with webhook support
- **Donation Tracking**: Real-time cause progress tracking and donation history
- **Automated Email Notifications**: Welcome emails sent to new users via Resend
- **AI Chat Assistant**: Kenzie, our mascot, helps guide users through product selection

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4349d921-1a7d-4b2d-a5a2-95f4e7b77e4d) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4349d921-1a7d-4b2d-a5a2-95f4e7b77e4d) and click on Share -> Publish.

## Stripe Integration Setup

### Prerequisites
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Obtain your Stripe Secret Key from the Stripe Dashboard
3. Set up a webhook endpoint in Stripe

### Configuration Steps

1. **Add Stripe Secret Key**
   - The `STRIPE_SECRET_KEY` is already configured in Lovable Cloud secrets
   - If you need to update it, use the Lovable Cloud backend interface

2. **Configure Stripe Webhook**
   - In your Stripe Dashboard, go to Developers → Webhooks
   - Click "Add endpoint"
   - Enter the URL: `https://wgohndthjgeqamfuldov.supabase.co/functions/v1/stripe-webhook`
   - Select events to listen for: `checkout.session.completed`
   - Copy the webhook signing secret
   - Store it as `STRIPE_WEBHOOK_SECRET` in Lovable Cloud secrets

3. **Test the Integration**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date and any 3-digit CVC
   - Verify order creation in the database
   - Check that donation amounts update the cause barometer

### Webhook Functionality

The webhook (`supabase/functions/stripe-webhook/index.ts`) handles:
- Creating order records with payment details
- Recording individual donations in the `donations` table
- Incrementing cause `raised_cents` amounts
- Logging all transactions for audit purposes

## Vendor API Integration

### SinaLite API (Print Products)
- **Endpoint**: Print materials including posters, flyers, business cards
- **Sync Function**: `supabase/functions/sync-sinalite/index.ts`
- **Credentials**: `SINALITE_CLIENT_ID` and `SINALITE_CLIENT_SECRET` stored in secrets

### Scalable Press API (Apparel)
- **Endpoint**: Custom apparel including t-shirts, hoodies
- **Sync Function**: `supabase/functions/sync-scalablepress/index.ts`
- **Credentials**: `SCALABLEPRESS_API_KEY` stored in secrets

### PsRestful API (Promotional Products)
- **Endpoint**: Promotional items including mugs, pens, stationery
- **Sync Function**: `supabase/functions/sync-psrestful/index.ts`
- **Credentials**: `PSRESTFUL_API_KEY` stored in secrets

### Product Sync
Run the sync functions to populate the `products` table:
```bash
# Via Lovable Cloud backend or trigger manually
# Products are automatically synced and merged into one catalog
```

## Email Setup (Resend)

### Welcome Emails
New users automatically receive a welcome email via `supabase/functions/send-welcome-email/index.ts`

**Requirements**:
1. Create a Resend account at [resend.com](https://resend.com)
2. Validate your email domain at [resend.com/domains](https://resend.com/domains)
3. Generate an API key at [resend.com/api-keys](https://resend.com/api-keys)
4. Store as `RESEND_API_KEY` in Lovable Cloud secrets

## Database Schema

### Main Tables

**products**
- Stores synced products from all vendors
- Fields: `id`, `name`, `base_cost_cents`, `vendor`, `vendor_id`, `category`, `image_url`

**causes**
- Charitable causes that users can support
- Fields: `id`, `name`, `summary`, `goal_cents`, `raised_cents`, `image_url`

**orders**
- Completed purchase records
- Fields: `id`, `order_number`, `session_id`, `customer_email`, `amount_total_cents`, `donation_cents`, `product_name`, `cause_id`

**donations**
- Individual donation transaction records
- Fields: `id`, `order_id`, `cause_id`, `amount_cents`, `customer_email`, `created_at`

**profiles**
- User profile information
- Fields: `id`, `first_name`, `last_name`, `email`, `phone`, `address fields`

## Testing Workflow

### End-to-End Checkout Test
1. Navigate to `/causes` and select a cause
2. Browse `/products` and choose a product
3. Add optional donation amount on checkout page
4. Complete payment with Stripe test card: `4242 4242 4242 4242`
5. Verify redirect to `/success` page
6. Check database:
   - New order in `orders` table with status "completed"
   - New donation record in `donations` table (if donation > 0)
   - Updated `raised_cents` in `causes` table

### Cancel Flow Test
1. Start checkout process
2. Click "Cancel" or back button in Stripe Checkout
3. Verify redirect to `/cancel` page
4. Confirm no order created in database

## Security Checklist

- ✅ All API secrets stored in Lovable Cloud secrets (never in code)
- ✅ Stripe webhook signature verification enabled
- ✅ Input validation with length limits on all forms
- ✅ Server-side price recalculation before Stripe session creation
- ✅ Row-Level Security (RLS) policies on all database tables
- ✅ Rate limiting on Edge Functions (configured in Supabase)

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
