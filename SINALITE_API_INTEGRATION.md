# Sinalite API Integration Documentation

**Last Updated:** 2025-01-20  
**Status:** ✅ Stable Implementation

## Overview

This document describes the complete Sinalite API integration for product configuration, pricing, and ordering. This implementation is stable and should be preserved across sync operations and product updates.

---

## API Endpoints

### Base URLs
- **Test Mode:** `https://api.sinaliteuppy.com`
- **Live Mode:** `https://api.sinaliteuppy.com`

### Authentication
- Uses OAuth2 client credentials flow
- Token cached for 50 minutes
- Credentials: `SINALITE_CLIENT_ID`, `SINALITE_CLIENT_SECRET`, `SINALITE_AUDIENCE`
- Auth URL varies by mode (test/live)

---

## Core Endpoints

### 1. GET /product/{id}/{storeCode}
**Purpose:** Fetch product configuration options

**Returns:** `[options[], combinations[], metadata[]]`

**Response Structure:**
```json
[
  [ // options array
    {
      "id": 140,
      "group": "size",
      "name": "8.5 x 11"
    },
    {
      "id": 141,
      "group": "size",
      "name": "11 x 17"
    }
  ],
  [], // combinations (not currently used)
  []  // metadata (not currently used)
]
```

**Implementation Location:**
- Edge Function: `supabase/functions/sinalite-price/index.ts` (GET method)
- Frontend Loader: `src/components/ProductConfiguratorLoader.tsx`

**Key Details:**
- First array element contains all selectable options
- Options are grouped by `group` field (e.g., "size", "color", "quantity")
- Each option has unique `id` used for variant key generation

---

### 2. POST /price/{id}/{storeCode}
**Purpose:** Calculate price for selected configuration

**Request Body:**
```json
{
  "productOptions": [140, 447, 448]
}
```

**Response Structure:**
```json
{
  "price": "22.51",
  "packageInfo": {
    "total weight": "5.2 lbs",
    "weight per box": "5.2 lbs",
    "Units Per Box": "100",
    "box size": "12x12x6",
    "number of boxes": "1"
  }
}
```

**Implementation Location:**
- Edge Function: `supabase/functions/sinalite-price/index.ts` (POST method)
- Used as fallback when PRICEBYKEY is not available

---

### 3. GET /pricebykey/{id}/{key}
**Purpose:** Fast price lookup using pre-calculated variant key

**Variant Key Format:** `{optionId1}-{optionId2}-{optionId3}` (sorted ascending)

**Example:** `140-447-448`

**Response Structure:**
```json
[
  {
    "price": "22.51"
  }
]
```

**Implementation Location:**
- Edge Function: `supabase/functions/sinalite-price/index.ts` (PRICEBYKEY method)
- Frontend: `src/components/ProductConfigurator.tsx` (primary pricing method)

**Key Details:**
- Fastest pricing method (no calculation required)
- Option IDs must be sorted ascending before joining
- Returns price only (no packageInfo)

---

### 4. GET /variants/{id}/{offset}
**Purpose:** Fetch all pre-calculated variant prices (1000 at a time)

**Response Structure:**
```json
[
  {
    "price": 65.59,
    "key": "5-140-447-448"
  },
  {
    "price": 32.8,
    "key": "105-140-447-448"
  }
]
```

**Implementation Status:** Not currently used, available for caching

---

## Integration Flow

### 1. Product Configuration Setup

```
User clicks "Configure Options"
        ↓
ProductConfiguratorLoader fetches options
        ↓
Check product.pricing_data for cached options
        ↓
If not cached: Call GET /product/{id}/{storeCode}
        ↓
Parse options array and group by "group" field
        ↓
Display grouped dropdowns in ProductConfigurator
```

**Files Involved:**
- `src/components/ProductConfiguratorLoader.tsx` (lines 24-119)
- `src/components/ProductConfigurator.tsx` (lines 64-93)

### 2. Price Calculation

```
User selects options from dropdowns
        ↓
Generate variant key from option IDs (sorted)
        ↓
Call GET /pricebykey/{id}/{key}
        ↓
Parse price response (data[0].price)
        ↓
Convert to cents (price * 100)
        ↓
Update UI with new price
```

**Files Involved:**
- `src/components/ProductConfigurator.tsx` (lines 114-185)
- `supabase/functions/sinalite-price/index.ts` (lines 158-169)

---

## Data Structures

### Product Table Schema
```typescript
{
  id: string,
  vendor_product_id: string,  // Sinalite product ID
  vendor: string,              // 'sinalite'
  pricing_data: Json | null    // Cached options/combinations/metadata
}
```

### Option Structure
```typescript
type ProductOption = {
  id: number;      // Unique option ID
  group: string;   // Group name (size, color, quantity, etc.)
  name: string;    // Display name
}
```

### Option Groups
```typescript
type OptionGroup = {
  group: string;           // Group name
  options: ProductOption[]; // All options in this group
}
```

---

## Implementation Files

### 1. ProductConfiguratorLoader.tsx
**Purpose:** Fetch and cache product options

**Key Functions:**
- `fetchPricingOptions()` - Gets options from pricing_data or API
- Handles retry logic with `withRetry()`
- Caches options in state to avoid redundant API calls

**Method Flow:**
```javascript
if (pricing_data includes options) {
  use cached options
} else {
  invoke('sinalite-price', { method: 'GET' })
}
```

### 2. ProductConfigurator.tsx
**Purpose:** Render configuration UI and handle pricing

**Key Functions:**
- `useMemo()` - Parse and group options
- `useEffect()` - Initialize default selections
- `useEffect()` - Fetch price on selection change
- `handleOptionChange()` - Update selections and notify parent

**Pricing Logic:**
```javascript
const variantKey = optionIds.sort((a, b) => a - b).join('-');
invoke('sinalite-price', { 
  method: 'PRICEBYKEY',
  variantKey 
})
```

### 3. sinalite-price/index.ts (Edge Function)
**Purpose:** Secure API proxy with authentication and mode switching

**Supported Methods:**
- `GET` - Fetch product options
- `POST` - Calculate price from option array
- `PRICEBYKEY` - Fast price lookup from variant key

**Key Features:**
- Token caching (50 minute expiration)
- Test/Live mode switching based on app_settings
- Proper error handling and logging
- CORS headers for web app access

---

## Critical Implementation Notes

### ⚠️ DO NOT MODIFY

1. **Variant Key Generation:**
   - MUST sort option IDs ascending before joining
   - Format: `{id1}-{id2}-{id3}`
   - Example: `[448, 140, 447]` → `"140-447-448"`

2. **Price Response Parsing:**
   - PRICEBYKEY returns: `[{ price: "22.51" }]` (array)
   - POST returns: `{ price: "22.51", packageInfo: {...} }` (object)
   - Always check response structure before accessing price

3. **Option Grouping:**
   - Options MUST be grouped by `group` field
   - Display one dropdown per group
   - Initialize with first option in each group

4. **Pricing Data Cache:**
   - Check `product.pricing_data` before API call
   - Expected format: `[options[], {}, {}]`
   - Fallback to API if not present or invalid

### ✅ Safe to Modify

1. **UI Styling:**
   - Button colors, spacing, typography
   - Dropdown appearance
   - Loading states

2. **Display Logic:**
   - Group name formatting
   - Option name display
   - Error messages

3. **Additional Features:**
   - Add quantity selector
   - Add preview images
   - Add variant availability indicators

---

## Testing Checklist

When validating this implementation:

- [ ] Options load correctly (check console logs)
- [ ] All option groups display as dropdowns
- [ ] Default selections are made on load
- [ ] Price updates when options change
- [ ] Variant key is properly formatted (sorted IDs)
- [ ] Price displays in correct currency format
- [ ] Loading state shows during price fetch
- [ ] Error states handled gracefully
- [ ] Works in both test and live mode

---

## Future Enhancements (Optional)

1. **Variant Caching:**
   - Fetch all variants using GET /variants/{id}/{offset}
   - Store in product.pricing_data
   - Enable instant client-side price lookup

2. **Package Information:**
   - Display shipping weight/dimensions
   - Use POST /price endpoint to get packageInfo
   - Show after configuration complete

3. **Availability Checking:**
   - Validate variant availability before checkout
   - Disable out-of-stock combinations
   - Show estimated ship times

4. **Configuration Presets:**
   - Save popular configurations
   - Quick-select common options
   - Remember user preferences

---

## Sync Operations

### Product Sync Behavior
When syncing products from Sinalite:

1. **Preserved Fields:**
   - `vendor_product_id` - Sinalite product ID mapping
   - `pricing_data` - Cached configuration options
   - This configurator logic and implementation

2. **Updated Fields:**
   - `base_cost_cents` - Current vendor pricing
   - `name`, `description` - Product metadata
   - `image_url` - Product images

3. **What NOT to Touch:**
   - ProductConfiguratorLoader.tsx
   - ProductConfigurator.tsx
   - sinalite-price/index.ts
   - This documentation file

### Maintaining Stability

To ensure this implementation remains stable:

1. **Never modify these mappings:**
   - Option structure: `{id, group, name}`
   - Variant key format: `id1-id2-id3` (sorted)
   - Response parsing logic

2. **Always preserve:**
   - Edge function methods (GET, POST, PRICEBYKEY)
   - Token caching logic
   - Error handling patterns

3. **Safe to update:**
   - UI components and styling
   - Additional feature layers on top
   - Logging and analytics

---

## Contact & Support

**Implementation Owner:** Lovable Development Team  
**Last Reviewed:** 2025-01-20  
**API Documentation:** Sinalite API Docs (contact vendor)  

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-20 | Initial stable implementation |
| | | - GET /product endpoint |
| | | - PRICEBYKEY lookup |
| | | - Option grouping logic |
| | | - Complete integration flow |

---

**🔒 This implementation is production-ready and stable. Preserve this logic across all future updates.**
