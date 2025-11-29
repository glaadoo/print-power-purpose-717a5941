# Vendor Fulfillment System Documentation

## Overview

The Print Power Purpose (PPP) vendor fulfillment system is a **vendor-agnostic order fulfillment framework** that automatically processes orders after successful Stripe payments. It supports multiple print-on-demand vendors through a pluggable adapter pattern and offers three fulfillment modes.

---

## Architecture

### Core Components

1. **Stripe Webhook Handler** (`supabase/functions/stripe-webhook/index.ts`)
   - Receives `checkout.session.completed` events
   - Creates/updates order records
   - Calls `handleVendorFulfillment()` after order creation

2. **Vendor Fulfillment System** (`supabase/functions/_shared/vendor-fulfillment.ts`)
   - Routes orders to appropriate fulfillment method based on mode
   - Manages vendor status updates
   - Error handling with non-blocking failures

3. **Vendor Adapters** (Pluggable pattern)
   - `vendor-sinalite-adapter.ts` - SinaLite API integration
   - `vendor-scalablepress-adapter.ts` - Scalable Press API integration
   - `vendor-psrestful-adapter.ts` - PSRestful API integration

4. **Vendor Configuration** (`supabase/functions/_shared/vendor-config.ts`)
   - Centralizes vendor settings
   - Manages fulfillment mode
   - Provides vendor lookup utilities

5. **Admin Dashboard** (`src/pages/AdminVendorFulfillment.tsx`)
   - View orders by vendor/status
   - Download CSV exports
   - Mark orders as exported manually

---

## Three Fulfillment Options

### Option 1: AUTO_API (Automatic API Ordering - Preferred Default)

**How it works:**
- On successful payment, automatically calls vendor API
- Submits order with shipping address and line items
- Stores vendor's order ID in database
- Updates status to `submitted`

**Environment variable:**
```bash
VENDOR_FULFILLMENT_MODE="AUTO_API"
```

**When to use:**
- You have API credentials for all vendors
- You want fully automated fulfillment
- Vendors support programmatic order submission

---

### Option 2: EMAIL_VENDOR (Email-Based Notification)

**How it works:**
- On successful payment, sends formatted email to vendor
- Email includes all order details, shipping address, line items
- Updates status to `emailed_vendor`
- Uses Resend for email delivery

**Environment variable:**
```bash
VENDOR_FULFILLMENT_MODE="EMAIL_VENDOR"
```

**When to use:**
- Vendor doesn't have an API
- You want manual vendor review before fulfillment
- Transitioning from manual to automated fulfillment

---

### Option 3: MANUAL_EXPORT (CSV Export + Admin Action)

**How it works:**
- On successful payment, marks order as `pending_manual`
- Admin can filter and export orders as CSV from dashboard
- Admin manually marks orders as `exported_manual` after sending to vendor
- CSV includes all necessary order details

**Environment variable:**
```bash
VENDOR_FULFILLMENT_MODE="MANUAL_EXPORT"
```

**When to use:**
- You need to batch orders before sending
- You want full manual control over fulfillment timing
- You're integrating with vendor systems that require manual uploads

---

## Environment Variables

### Core Configuration

```bash
# Required: Fulfillment mode selection
VENDOR_FULFILLMENT_MODE="AUTO_API"  # or "EMAIL_VENDOR" or "MANUAL_EXPORT"

# Optional: Default vendor notification email (fallback)
VENDOR_NOTIFICATION_EMAIL="orders@printpowerpurpose.com"
```

### SinaLite (Already configured)

```bash
# Test Mode
SINALITE_CLIENT_ID_TEST="your-test-client-id"
SINALITE_CLIENT_SECRET_TEST="your-test-client-secret"
SINALITE_AUTH_URL_TEST="https://api.sinaliteuppy.com/auth/token"
SINALITE_AUDIENCE_TEST="https://apiconnect.sinalite.com"

# Live Mode
SINALITE_CLIENT_ID_LIVE="your-live-client-id"
SINALITE_CLIENT_SECRET_LIVE="your-live-client-secret"
SINALITE_AUTH_URL_LIVE="https://liveapi.sinalite.com/auth/token"
SINALITE_AUDIENCE_LIVE="https://apiconnect.sinalite.com"

# API Base URL
SINALITE_API_URL="https://api.sinaliteuppy.com"

# Optional: Vendor notification email
SINALITE_VENDOR_EMAIL="orders@sinalite.com"
```

### Scalable Press

```bash
# API credentials
SCALABLEPRESS_API_KEY="your-api-key"
SCALABLEPRESS_API_BASE_URL="https://api.scalablepress.com/v2"

# Optional: Vendor notification email
SCALABLEPRESS_VENDOR_EMAIL="orders@scalablepress.com"
```

### PSRestful

```bash
# API credentials
PSRESTFUL_API_KEY="your-api-key"
PSRESTFUL_API_BASE_URL="https://api.psrestful.com"

# Optional: Vendor notification email
PSRESTFUL_VENDOR_EMAIL="orders@psrestful.com"
```

---

## Database Schema

### Orders Table - New Vendor Fields

```sql
-- Vendor tracking fields
vendor_key TEXT                 -- Vendor identifier: 'sinalite', 'scalablepress', 'psrestful'
vendor_name TEXT                -- Human-friendly vendor name
vendor_order_id TEXT            -- Order ID returned by vendor API
vendor_status TEXT DEFAULT 'pending'  -- Status: pending, submitted, emailed_vendor, pending_manual, exported_manual, error
vendor_exported_at TIMESTAMPTZ  -- When order was exported/sent to vendor
vendor_error_message TEXT       -- Error details if submission failed
```

### Vendor Status Values

- `pending` - Order created, awaiting fulfillment
- `submitted` - Successfully sent to vendor API (Option 1)
- `emailed_vendor` - Email sent to vendor (Option 2)
- `pending_manual` - Queued for manual export (Option 3)
- `exported_manual` - Admin marked as exported (Option 3)
- `error` - Fulfillment failed (check `vendor_error_message`)

---

## Adding New Vendors

To add a new vendor (e.g., "printify"), follow these steps:

### 1. Create Vendor Adapter

Create `supabase/functions/_shared/vendor-printify-adapter.ts`:

```typescript
import type { VendorAdapter, OrderRecord } from './vendor-fulfillment.ts';

export const printifyAdapter: VendorAdapter = {
  async submitOrder(order: OrderRecord) {
    console.log(`[PRINTIFY-ADAPTER] Submitting order ${order.order_number}`);

    const apiKey = Deno.env.get('PRINTIFY_API_KEY');
    const apiBaseUrl = Deno.env.get('PRINTIFY_API_BASE_URL');

    // Build order payload based on Printify API documentation
    const orderPayload = {
      // Map your order fields to Printify's format
      external_id: order.order_number,
      line_items: order.items.map(item => ({
        product_id: item.vendor_product_id,
        quantity: item.quantity,
        variant_id: item.variant_id,
      })),
      shipping_address: {
        first_name: order.shipping_address?.first_name,
        last_name: order.shipping_address?.last_name,
        // ... map other fields
      },
    };

    const response = await fetch(`${apiBaseUrl}/orders.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      throw new Error(`Printify order failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      vendorOrderId: data.id,
      status: 'submitted',
      rawResponse: data,
    };
  }
};
```

### 2. Register Adapter

In `vendor-fulfillment.ts`, add:

```typescript
import { printifyAdapter } from './vendor-printify-adapter.ts';

const vendorAdapters: Record<string, VendorAdapter> = {
  sinalite: sinaliteAdapter,
  scalablepress: scalablePressAdapter,
  psrestful: psRestfulAdapter,
  printify: printifyAdapter,  // ← Add here
};
```

### 3. Add to Vendor Config

In `vendor-config.ts`, add:

```typescript
const configs: Record<string, VendorConfig> = {
  // ... existing vendors
  printify: {
    key: 'printify',
    name: 'Printify',
    email: Deno.env.get('PRINTIFY_VENDOR_EMAIL') || Deno.env.get('VENDOR_NOTIFICATION_EMAIL'),
    apiBaseUrl: Deno.env.get('PRINTIFY_API_BASE_URL'),
    apiKey: Deno.env.get('PRINTIFY_API_KEY'),
  },
};
```

### 4. Add Environment Variables

```bash
PRINTIFY_API_KEY="your-api-key"
PRINTIFY_API_BASE_URL="https://api.printify.com/v1"
PRINTIFY_VENDOR_EMAIL="orders@printify.com"
```

### 5. Update Admin UI

In `AdminVendorFulfillment.tsx`, add to vendor filter:

```typescript
<SelectItem value="printify">Printify</SelectItem>
```

That's it! The system will automatically route orders with `vendor_key: 'printify'` to your new adapter.

---

## Usage

### For Developers

**Switching fulfillment modes:**

Update the `VENDOR_FULFILLMENT_MODE` environment variable in your Supabase project secrets:
```bash
VENDOR_FULFILLMENT_MODE="AUTO_API"     # Automatic API submission
VENDOR_FULFILLMENT_MODE="EMAIL_VENDOR" # Email to vendor
VENDOR_FULFILLMENT_MODE="MANUAL_EXPORT" # CSV export workflow
```

**Determining vendor per order:**

The system determines vendor using this priority:
1. `order.vendor_key` (explicit vendor assignment)
2. `order.items[0].vendor` (vendor from first item)
3. Default: `sinalite` (backwards compatibility)

---

### For Admins

**Access the Vendor Fulfillment Dashboard:**
1. Navigate to `/admin/vendor-fulfillment`
2. Filter orders by status or vendor
3. Download CSV exports for manual processing
4. Mark orders as exported after sending to vendor

**CSV Export Workflow (Option 3):**
1. Set `VENDOR_FULFILLMENT_MODE="MANUAL_EXPORT"`
2. Orders will show status `pending_manual` after payment
3. Go to Admin → Vendor Fulfillment
4. Filter by "Pending Manual" status
5. Click "Download CSV" to export orders
6. Send CSV to vendor manually
7. Click "Mark Exported" on each order row

---

## Error Handling

### Non-Blocking Failures

Vendor fulfillment errors **never block** the Stripe webhook from returning 200. This ensures:
- Payment confirmation always succeeds
- Customer sees success page
- Order record is always created
- Fulfillment can be retried manually

### Error Tracking

Failed fulfillments are tracked with:
- `vendor_status: 'error'`
- `vendor_error_message` contains failure details
- Admins can filter by error status to review failures

---

## Customer-Facing Status Mapping

Map internal statuses to friendly customer messages:

```typescript
const friendlyStatus = {
  'pending': 'Your order is being processed',
  'submitted': 'Your order has been submitted to production',
  'emailed_vendor': 'Your order is being processed by our team',
  'pending_manual': 'Your order is being processed by our team',
  'exported_manual': 'Your order has been submitted to production',
  'error': 'Your order is being processed by our team', // Don't alarm customers
};
```

---

## Testing

### Test AUTO_API Mode

1. Set `VENDOR_FULFILLMENT_MODE="AUTO_API"`
2. Complete a checkout with a test payment
3. Check Stripe webhook logs for `[VENDOR-FULFILLMENT]` entries
4. Verify order has `vendor_status: 'submitted'` and `vendor_order_id`
5. Check vendor's API/dashboard for the order

### Test EMAIL_VENDOR Mode

1. Set `VENDOR_FULFILLMENT_MODE="EMAIL_VENDOR"`
2. Ensure `RESEND_API_KEY` is configured
3. Set vendor email addresses
4. Complete a test checkout
5. Check vendor email inbox for notification
6. Verify order has `vendor_status: 'emailed_vendor'`

### Test MANUAL_EXPORT Mode

1. Set `VENDOR_FULFILLMENT_MODE="MANUAL_EXPORT"`
2. Complete test checkouts
3. Navigate to `/admin/vendor-fulfillment`
4. Filter by "Pending Manual"
5. Download CSV
6. Verify CSV contains correct order data
7. Mark orders as exported

---

## Security Notes

- All vendor API keys are stored in Supabase secrets (never in frontend code)
- Stripe webhook signature verification is always enforced
- Admin routes are protected by passcode
- Customer PII is only sent to vendors, never exposed in frontend

---

## Maintenance

### Monitoring

Monitor fulfillment health by checking:
- Count of orders with `vendor_status: 'error'`
- Average time between order creation and `vendor_exported_at`
- Webhook processing logs for failures

### Retrying Failed Orders

For orders with `vendor_status: 'error'`:
1. Review `vendor_error_message` to diagnose issue
2. Fix underlying problem (credentials, API payload, etc.)
3. Manually retry by calling vendor adapter with order ID
4. Or: Use CSV export to manually submit to vendor

---

## Future Enhancements

- **Webhook for vendor status updates**: Listen to vendor webhooks to update order status (shipped, delivered, etc.)
- **Retry mechanism**: Automatic retry with exponential backoff for failed submissions
- **Batch API submissions**: Group multiple orders into single API call where vendors support it
- **Fulfillment analytics**: Dashboard showing fulfillment success rates per vendor

---

## Support

For issues or questions:
- Check webhook logs: `/admin` → "System Logs"
- Review vendor fulfillment page: `/admin/vendor-fulfillment`
- Check Stripe dashboard for webhook delivery attempts
- Review vendor API documentation for payload requirements
