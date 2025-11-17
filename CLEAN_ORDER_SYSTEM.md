# Clean Order ID & Pricing System - Implementation Guide

## Overview

This document describes the new clean order ID system (PPP-YYYY-NNNNNN format) and unified pricing structure implemented for Print Power Purpose.

## Order ID Format

### Format: `PPP-YYYY-NNNNNN`

Examples:
- `PPP-2025-000001`
- `PPP-2025-000002`
- `PPP-2026-000001`

### Components
- **Prefix**: Always "PPP"
- **Year**: 4-digit year (current year when order created)
- **Sequence**: 6-digit zero-padded number (unique per year)

### Implementation

The order number generation uses a PostgreSQL function:

```sql
SELECT generate_order_number();
-- Returns: PPP-2025-000001
```

The sequence counter is stored in the `order_sequences` table and automatically increments per year.

## Database Schema

### New Tables

#### `order_sequences`
Tracks sequence numbers per year for order ID generation.

```sql
year: INTEGER (PK)
last_sequence: INTEGER
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### `product_variants`
Stores variant-specific pricing and SinaLite references.

```sql
id: UUID (PK)
product_id: UUID (FK)
vendor_variant_id: TEXT
label: TEXT
base_price_cents: INTEGER
markup_fixed_cents: INTEGER (nullable)
markup_percent: NUMERIC(5,2) (nullable)
currency: TEXT
is_active: BOOLEAN
```

### Extended Tables

#### `orders` (new fields)
```sql
stripe_payment_intent_id: TEXT
sinalite_order_id: TEXT
subtotal_cents: INTEGER
tax_cents: INTEGER
paid_at: TIMESTAMP
items: JSONB (array of item details with pricing breakdown)
```

#### `products` (new fields)
```sql
markup_fixed_cents: INTEGER
markup_percent: NUMERIC(5,2)
is_active: BOOLEAN
```

### Orders.items Structure

Each item in the `items` JSONB array contains:

```json
{
  "product_id": "uuid",
  "product_name": "Product Name",
  "quantity": 5,
  "base_price_per_unit": 500,
  "markup_fixed_per_unit": 50,
  "markup_percent": 20,
  "final_price_per_unit": 650,
  "line_subtotal": 3250
}
```

## Pricing System

### Unified Pricing Function

Location: `src/lib/pricing-utils.ts`

```typescript
computeFinalPrice(
  base_price_cents: number,
  markup_fixed_cents?: number | null,
  markup_percent?: number | null
): number
```

**Algorithm:**
1. Apply percentage markup: `price += base * (percent / 100)`
2. Add fixed markup: `price += fixed`
3. Round to eliminate floating point errors

**Example:**
```typescript
// Base: $5.00, Markup: 20%, Fixed: $0.50
computeFinalPrice(500, 50, 20)
// Returns: 650 cents ($6.50)
// Calculation: 500 + (500 * 0.20) + 50 = 650
```

### Variant vs Product Markups

Variants can override product-level markups:

```typescript
getEffectiveMarkups(variant, product)
```

Returns the effective markup values with variant overrides taking precedence.

## Checkout Flow

### 1. Create Order First

The new checkout flow creates the order BEFORE the Stripe session:

```typescript
// 1. Compute pricing for all cart items
const orderItems = cart.items.map(item => {
  const finalPrice = computeFinalPrice(
    product.base_cost_cents,
    product.markup_fixed_cents,
    product.markup_percent
  );
  return { ...item, final_price_per_unit: finalPrice };
});

// 2. Generate clean order number
const orderNumber = await supabase.rpc('generate_order_number');

// 3. Create order with status='created'
const { data: order } = await supabase
  .from('orders')
  .insert({
    order_number,
    status: 'created',
    items: orderItems,
    subtotal_cents,
    tax_cents,
    amount_total_cents
  });

// 4. Create Stripe session with order reference
const session = await stripe.checkout.sessions.create({
  // ... line items with computed prices
  success_url: `${origin}/success?orderId=${order.id}`,
  metadata: {
    order_id: order.id,
    order_number: orderNumber
  }
});

// 5. Update order with Stripe session ID
await supabase
  .from('orders')
  .update({ session_id: session.id })
  .eq('id', order.id);
```

## Webhook Processing

When Stripe sends `checkout.session.completed`:

```typescript
// 1. Extract order_id from metadata
const orderId = session.metadata.order_id;

// 2. Update order status and payment info
await supabase
  .from('orders')
  .update({
    status: 'paid',
    paid_at: now(),
    stripe_payment_intent_id: session.payment_intent,
    customer_email: session.customer_details.email
  })
  .eq('id', orderId);

// 3. (Optional) Place SinaLite order and update
const sinaliteOrderId = await placeSinaLiteOrder(order);
await supabase
  .from('orders')
  .update({ sinalite_order_id: sinaliteOrderId })
  .eq('id', orderId);
```

## Success Page

Route: `/success?orderId={uuid}`

The success page:
1. Reads `orderId` from query params
2. Fetches order by ID
3. Displays the clean `order_number` (PPP-YYYY-NNNNNN)
4. Shows three action buttons:
   - "Back to Home" → `/`
   - "Continue Shopping" → `/products`
   - "Choose Another Cause" → `/select/nonprofit`
5. Hides the global navigation buttons (Home/Find Causes)

## Admin Views

### Orders Dashboard

Location: `src/pages/AdminOrders.tsx`

Features:
- List of recent orders with order_number, status, totals
- Order detail modal showing:
  - Full pricing breakdown per item
  - Base price, markups, final prices
  - Subtotal, tax, donation, total
  - Admin references (Stripe IDs, SinaLite order ID)

### Products/Variants Management

Shows for each product/variant:
- Base price (SinaLite)
- Markup fixed
- Markup percent
- Computed final price (using same pricing function)

## Edge Functions

### `checkout-session-v2`
New checkout function that:
- Generates clean order IDs
- Creates order record first
- Computes unified pricing
- Creates Stripe session with order reference

### `stripe-webhook`
Updated to:
- Find order by `metadata.order_id`
- Update status to 'paid'
- Store payment_intent_id
- Optionally update sinalite_order_id

## Migration Path

### Existing Orders
Old orders with random or timestamp-based order numbers remain as-is. The system is backwards compatible.

### New Orders
All new orders created through the `checkout-session-v2` function will use the PPP-YYYY-NNNNNN format.

### SinaLite Integration
Products synced from SinaLite should:
1. Store base prices in `product_variants.base_price_cents`
2. NOT include any markup in base_price
3. Use `vendor='sinalite'` and populate `vendor_variant_id`

## Testing

### Test Mode vs Live Mode
The system respects the `stripe_mode` setting:
- Uses appropriate Stripe keys (TEST vs LIVE)
- Uses appropriate SinaLite credentials
- Orders tagged with `payment_mode` field

### Order Number Testing
```sql
-- Seed test sequences
INSERT INTO order_sequences (year, last_sequence) 
VALUES (2025, 0);

-- Generate test order numbers
SELECT generate_order_number();
-- Returns: PPP-2025-000001

SELECT generate_order_number();
-- Returns: PPP-2025-000002
```

## Security Notes

### RLS Policies
- `order_sequences`: Service role only access
- `product_variants`: Public read for active variants, admin write
- `orders`: Customer can view own orders, admin can view all

### Order ID Visibility
- Customer-facing order number: `PPP-YYYY-NNNNNN` (safe to share)
- Admin-only references: 
  - Internal order UUID
  - Stripe session/payment_intent IDs
  - SinaLite order IDs

## Summary

The new system provides:
1. ✅ Clean, professional order IDs
2. ✅ Unified pricing with transparent markup structure
3. ✅ Complete audit trail (base → markups → final price)
4. ✅ Order-first checkout flow
5. ✅ Improved success page UX
6. ✅ Admin visibility into pricing and vendor references
7. ✅ Backwards compatibility with existing orders
