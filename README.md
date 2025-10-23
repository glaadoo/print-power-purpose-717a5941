# Print Power Purpose

> A print-on-demand platform where every purchase supports charitable causes

## Project Info

**URL**: https://lovable.dev/projects/4349d921-1a7d-4b2d-a5a2-95f4e7b77e4d

## Overview

Print Power Purpose connects customers with professional printing services while supporting charitable causes. Each order includes an optional donation that goes directly to the customer's chosen cause.

### Key Features

- **Multi-Vendor Product Catalog**: Integrated with SinaLite (print materials), Scalable Press (apparel), and PsRestful (promotional products)
- **Stripe Checkout Integration**: Secure payment processing with webhook support
- **Donation Tracking**: Real-time cause progress tracking and donation barometer
- **Automated Email Notifications**: Welcome emails and receipts sent via Resend
- **AI Chat Assistant (Kenzie)**: Mascot-guided user experience with AI-powered support
- **Check-Drop Automation**: Auto-triggers story requests when causes reach $777 milestone
- **Admin Dashboard**: Analytics, order management, and donation tracking
- **CRM Integration**: Jotform webhooks for data collection

---

## Quick Start

### Prerequisites
- Node.js v18+ and npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Lovable Cloud account (provides Supabase backend automatically)

### Local Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn-ui components
- **Backend**: Lovable Cloud (Supabase)
  - PostgreSQL database with Row-Level Security (RLS)
  - Edge Functions (Deno runtime)
  - Real-time subscriptions
- **Payments**: Stripe Checkout + Webhooks
- **Email**: Resend
- **AI**: Lovable AI (Google Gemini models)

---

## Database Schema

### Core Tables

#### `causes`
Charitable organizations and campaigns users can support.
- `id` (uuid): Primary key
- `name` (text): Cause display name
- `summary` (text): Brief description
- `goal_cents` (integer): Fundraising goal in cents
- `raised_cents` (integer): Current amount raised in cents
- `image_url` (text): Optional cause image

#### `products`
Multi-vendor product catalog.
- `id` (uuid): Primary key
- `name` (text): Product name
- `base_cost_cents` (integer): Base price in cents
- `vendor` (text): Source vendor (sinalite, scalablepress, psrestful)
- `vendor_id` (text): External product ID
- `category` (text): Product category
- `image_url` (text): Product image

#### `orders`
Completed purchase records.
- `id` (uuid): Primary key
- `order_number` (text): Human-readable order ID
- `session_id` (text): Stripe checkout session ID
- `customer_email` (text): Purchaser email
- `amount_total_cents` (integer): Total order amount
- `donation_cents` (integer): Donation portion
- `product_name` (text): Product purchased
- `cause_id` (text): Associated cause ID
- `cause_name` (text): Cause display name
- `status` (text): Order status (default: 'completed')
- `receipt_url` (text): Stripe receipt URL

#### `donations`
Individual donation transaction records.
- `id` (uuid): Primary key
- `order_id` (uuid): Related order
- `cause_id` (uuid): Receiving cause
- `amount_cents` (integer): Donation amount in cents
- `customer_email` (text): Donor email

#### `story_requests`
Auto-generated requests for cause stories when $777 threshold is reached.
- `id` (uuid): Primary key
- `cause_id` (uuid): Related cause
- `reached_at` (timestamp): When milestone was reached
- `contact_email` (text): Recipient email
- `status` (text): pending, sent, completed
- `notes` (text): Admin notes

#### `profiles`
User profile data synced from auth.users.
- `id` (uuid): References auth.users(id)
- `first_name`, `last_name` (text)
- `phone`, `street_address`, `city`, `state`, `zip_code`, `country` (text)

#### `kenzie_sessions` & `kenzie_messages`
AI chat session management.
- Sessions track conversation context
- Messages store user/assistant exchanges

### Database Functions

- `increment_cause_raised(cause_uuid, amount)`: Atomically updates cause totals
- `has_role(user_id, role)`: Checks user permissions
- `handle_new_user()`: Trigger to create profile on signup

### Row-Level Security (RLS)

All tables have RLS enabled with policies:
- **Public read**: `causes`, `products`, `schools`, `nonprofits`
- **User-scoped**: Users can only view/edit their own `profiles`, `orders`, `donations`
- **Admin-only**: Full CRUD on `causes`, `products`, `story_requests`
- **Service role**: Webhooks and cron jobs use service role key

---

## Stripe Integration

### Setup

1. **Create Stripe Account**
   - Sign up at [stripe.com](https://stripe.com)
   - Obtain your Secret Key from Dashboard → Developers → API keys

2. **Configure Stripe Secret Key**
   - Already set in Lovable Cloud secrets as `STRIPE_SECRET_KEY`
   - Update via Lovable Cloud backend if needed

3. **Set Up Webhook Endpoint**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://wgohndthjgeqamfuldov.supabase.co/functions/v1/stripe-webhook`
   - Events to listen for: `checkout.session.completed`
   - Copy the webhook signing secret
   - Store as `STRIPE_WEBHOOK_SECRET` in Lovable Cloud secrets

### Testing Stripe Checkout

Use Stripe test card:
- Card number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

### Checkout Flow

1. User selects a cause (`/causes`)
2. User browses products (`/products`)
3. User adds product to cart and proceeds to checkout
4. Optional donation added on checkout page
5. Edge function `checkout-session` creates Stripe checkout session
6. User completes payment in Stripe-hosted checkout
7. Stripe webhook fires on success → creates order + donation records
8. User redirected to `/success` page

### Webhook Processing (`stripe-webhook`)

On `checkout.session.completed` event:
- Creates `orders` record with full payment details
- Creates `donations` record (if donation > 0)
- Updates `causes.raised_cents` via `increment_cause_raised()` function
- Sends receipt email to customer
- Logs all actions for audit trail

---

## Vendor API Integrations

### SinaLite (Print Products)
- **Products**: Posters, flyers, business cards, brochures
- **Sync Function**: `supabase/functions/sync-sinalite/index.ts`
- **Credentials**: `SINALITE_CLIENT_ID`, `SINALITE_CLIENT_SECRET`
- **Admin Action**: Run sync from `/admin/sync`

### Scalable Press (Apparel)
- **Products**: T-shirts, hoodies, hats
- **Sync Function**: `supabase/functions/sync-scalablepress/index.ts`
- **Credentials**: `SCALABLEPRESS_API_KEY`
- **Admin Action**: Run sync from `/admin/sync`

### PsRestful (Promotional Products)
- **Products**: Mugs, pens, keychains, stationery
- **Sync Function**: `supabase/functions/sync-psrestful/index.ts`
- **Credentials**: `PSRESTFUL_API_KEY`
- **Admin Action**: Run sync from `/admin/sync`

### Product Sync Process

Each sync function:
1. Authenticates with vendor API
2. Fetches product catalog
3. Transforms to common schema
4. Inserts/updates records in `products` table
5. Returns count of synced products

Run syncs manually via Admin Dashboard or schedule with cron.

---

## Email Integration (Resend)

### Setup

1. **Create Resend Account**
   - Sign up at [resend.com](https://resend.com)

2. **Validate Domain**
   - Go to [resend.com/domains](https://resend.com/domains)
   - Add your domain and verify DNS records

3. **Generate API Key**
   - Navigate to [resend.com/api-keys](https://resend.com/api-keys)
   - Create new API key
   - Store as `RESEND_API_KEY` in Lovable Cloud secrets

### Email Types

#### Welcome Email (`send-welcome-email`)
- Triggered automatically on new user signup
- Database trigger: `trigger_welcome_email()` on `profiles` insert
- Personalizes with user's first/last name

#### Receipt Email (built into `stripe-webhook`)
- Sent after successful payment
- Includes order summary, donation amount, cause details
- Links to Stripe receipt

---

## CRM & Automation

### Check-Drop Automation (`checkdrop-evaluate`)

Monitors all causes and triggers actions when $777 milestone is reached:
1. Checks all causes for `raised_cents >= 77700`
2. Creates `story_requests` record if none exists
3. Emails admin and nonprofit contact
4. Prevents duplicate requests

**Schedule**: Run nightly via cron or manually from admin dashboard

### Jotform Integration (Planned)

**Status**: Not yet implemented

Will support:
- Form webhooks for order/donation submission
- CRM data sync with database
- Auto-receipt emails on form submission

---

## AI Chat (Kenzie)

### Overview

Kenzie is the AI mascot assistant powered by Lovable AI (Google Gemini models).

### Features

- **Context-aware conversations**: Remembers session history
- **Multi-topic support**:
  - Product questions and recommendations
  - Donation and cause information
  - Order status lookup
  - Platform navigation help
- **Session persistence**: Conversations stored in `kenzie_sessions` and `kenzie_messages` tables

### Implementation

- **Frontend**: `src/components/KenzieChat.tsx`
- **Backend**: `supabase/functions/kenzie-chat/index.ts`
- **Model**: `google/gemini-2.5-flash` (balanced speed + accuracy)
- **Auth**: Requires valid JWT (logged-in users only)

### System Prompt

Configured to:
- Be concise and conversational
- Avoid repetitive greetings
- Provide direct answers or ask targeted follow-up questions
- Stay on-topic (printing, donations, orders)

---

## Admin Dashboard

### Authentication

Admin access requires:
- User account with `admin` role in `user_roles` table
- Admin key verification via `verify-admin-key` edge function

### Features

#### Analytics (`/admin/analytics`)
- Total orders, revenue, donations
- Active causes count
- Orders/revenue by week (bar chart)
- Donations by cause (pie chart)
- Cause progress tracking

#### Orders Management (`/admin/orders`)
- View all orders with filters
- Search by customer email or order number
- Export to CSV

#### Donations Management (`/admin/donations`)
- View all donations
- Filter by cause or date range
- Summary totals

#### Story Requests (`/admin/story-requests`)
- View $777 milestone triggers
- Update status (pending → sent → completed)
- Contact information for outreach

#### Product Sync (`/admin/sync`)
- Manually trigger vendor API syncs
- View sync results and status

---

## Security

### Implementation Checklist

- ✅ All API secrets stored in Lovable Cloud secrets (never in code)
- ✅ Stripe webhook signature verification enabled
- ✅ Input validation with Zod schemas on all forms
- ✅ Input length limits and character restrictions
- ✅ Server-side price recalculation (never trust client)
- ✅ Row-Level Security (RLS) policies on all tables
- ✅ Rate limiting on POST routes (via Supabase Edge Function limits)
- ✅ No logging of PII or sensitive data
- ✅ HTTPS enforced on all endpoints
- ✅ JWT verification on protected edge functions

### Rate Limiting

Edge functions have built-in rate limiting via Supabase:
- **Default**: 100 requests/minute per IP
- **Adjustable**: Via Supabase project settings
- **Protected routes**: `/checkout-session`, `/stripe-webhook`, `/kenzie-chat`

### Secrets Management

**Never commit secrets to code!** All sensitive credentials stored in Lovable Cloud:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `SINALITE_CLIENT_ID` / `SINALITE_CLIENT_SECRET`
- `SCALABLEPRESS_API_KEY`
- `PSRESTFUL_API_KEY`
- `ADMIN_KEY`
- `LOVABLE_API_KEY`

---

## Testing

### End-to-End Checkout Test

1. Navigate to `/causes` and select a cause
2. Browse `/products` and add to cart
3. Go to `/cart` or `/checkout`
4. Add optional donation amount
5. Complete payment with Stripe test card: `4242 4242 4242 4242`
6. Verify redirect to `/success` page
7. **Database verification**:
   - New order in `orders` table with status `completed`
   - New donation record in `donations` table (if donation > 0)
   - Updated `raised_cents` in `causes` table
8. Check email inbox for receipt

### Cancel Flow Test

1. Start checkout process
2. Click "Cancel" or browser back in Stripe Checkout
3. Verify redirect to `/cancel` page
4. Confirm no order created in database

### Webhook Test

1. Use Stripe CLI to forward webhooks: `stripe listen --forward-to https://wgohndthjgeqamfuldov.supabase.co/functions/v1/stripe-webhook`
2. Trigger test events: `stripe trigger checkout.session.completed`
3. Verify order creation in database
4. Check Supabase Edge Function logs for webhook processing

### Check-Drop Test

1. Manually set a cause's `raised_cents` to 77700 or higher
2. Run `checkdrop-evaluate` edge function
3. Verify `story_requests` record created
4. Check admin email for notification

---

## Deployment

### Via Lovable

1. Open project in [Lovable](https://lovable.dev/projects/4349d921-1a7d-4b2d-a5a2-95f4e7b77e4d)
2. Click **Share** → **Publish**
3. Lovable handles:
   - Frontend build and CDN deployment
   - Edge function deployment
   - Database migrations
   - Environment variable configuration

### Custom Domain

1. Navigate to **Project > Settings > Domains**
2. Click **Connect Domain**
3. Follow DNS configuration instructions
4. [Read more](https://docs.lovable.dev/features/custom-domain)

---

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- Feature branches: `feature/<name>`, `fix/<name>`

### Commit Conventions

Use clear, descriptive commit messages:
```
feat: Add donation barometer animation
fix: Resolve Stripe webhook signature verification
docs: Update README with Jotform integration steps
refactor: Extract checkout logic to separate component
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes and commit
3. Push to GitHub
4. Open PR against `develop`
5. Request review (if team collaboration)
6. Merge after approval
7. Delete feature branch

### Code Quality

- ✅ TypeScript strict mode enabled
- ✅ ESLint configured for React + TypeScript
- ✅ All components use semantic HTML
- ✅ Tailwind design system (no inline styles)
- ✅ Accessibility: ARIA labels, semantic elements

---

## Troubleshooting

### Stripe Webhook Not Firing

1. Verify webhook endpoint URL in Stripe Dashboard
2. Check `STRIPE_WEBHOOK_SECRET` matches Stripe value
3. Review Supabase Edge Function logs: `supabase functions logs stripe-webhook`
4. Test with Stripe CLI: `stripe listen --forward-to <your-webhook-url>`

### Email Not Sending

1. Verify `RESEND_API_KEY` is set correctly
2. Confirm domain is validated in Resend dashboard
3. Check Edge Function logs: `supabase functions logs send-welcome-email`
4. Ensure sender email matches verified domain

### Products Not Syncing

1. Verify vendor API credentials in secrets
2. Check network connectivity to vendor APIs
3. Review sync function logs in Supabase
4. Confirm vendor API endpoints are accessible

### Kenzie Chat Not Responding

1. Verify user is authenticated (JWT required)
2. Check `LOVABLE_API_KEY` is set
3. Review function logs: `supabase functions logs kenzie-chat`
4. Ensure session ID is being passed correctly

---

## Support & Resources

- **Lovable Docs**: [docs.lovable.dev](https://docs.lovable.dev)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Stripe Docs**: [stripe.com/docs](https://stripe.com/docs)
- **Resend Docs**: [resend.com/docs](https://resend.com/docs)
- **Project URL**: [lovable.dev/projects/4349d921-1a7d-4b2d-a5a2-95f4e7b77e4d](https://lovable.dev/projects/4349d921-1a7d-4b2d-a5a2-95f4e7b77e4d)

---

## License

[Add your license here]

## Contributors

[Add contributors here]
