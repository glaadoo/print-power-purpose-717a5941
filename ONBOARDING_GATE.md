# Onboarding Gate & Secure Admin Access

## Overview

This document explains the onboarding gate system and secure admin access implementation for Print Power Purpose (PPP).

## Part A: Onboarding Gate for Shopping Pages

### How It Works

All shopping, checkout, and mission-related pages require users to complete an onboarding flow before access. This is controlled via a simple client-side flag stored in `localStorage`.

**Storage Key:** `ppp_access`
- `"guest"` - User clicked "Continue as Guest" 
- `"user"` - User successfully signed in or signed up

### Protected Routes

The following routes require `ppp_access` to be set:

**Shop & Donations:**
- `/products`
- `/products/:id`
- `/cart`
- `/checkout`
- `/donate`
- `/success`
- `/cancel`
- `/jotform-payment`

**Causes & Schools:**
- `/causes`
- `/select/nonprofit`
- `/select/school`
- `/schools`
- `/personal-mission`
- `/select/personal`

### Public Routes (Never Gated)

These routes are always accessible without onboarding:
- `/` (Home)
- `/about`
- `/press`
- `/blog`
- `/contact`
- `/help`
- `/help/search`
- `/guides/fundraising`
- `/auth` (Sign In/Sign Up)
- `/forgot-password`
- `/reset-password`
- `/policies/*` (Privacy, Terms, Legal)
- `/who-we-serve/*`

### Entry Points

**1. Sign In / Sign Up**
- After successful authentication via `/auth`, `ppp_access` is set to `"user"`
- User is redirected to `/welcome` to choose their mission

**2. Continue as Guest**
- On the Welcome page, clicking "Continue as Guest" sets `ppp_access` to `"guest"`
- User can then access all protected shopping pages

**3. Home Menu → Donate**
- Special handling: If user clicks "Donate" from the home menu overlay WITHOUT being onboarded:
  - System automatically sets `ppp_access="guest"` 
  - User is taken directly to `/donate`
- If user is already onboarded, navigates directly to `/donate`

### Implementation Details

**ProtectedRoute Component** (`src/components/ProtectedRoute.tsx`)
- Checks for `ppp_access` in localStorage
- If missing, redirects to `/` (Home)
- If present, renders the child component

**Route Wrapping** (`src/App.tsx`)
- All protected routes are wrapped with `<ProtectedRoute>`
- Public routes are NOT wrapped

## Part B: Secure Admin Access

### Access Method

Admin pages are accessible ONLY via a secret passcode URL:

```
/admin?key=ADMIN_PASSCODE
```

Default passcode: `woofkenzie2025`

### Backdoor Route

A convenience route `/dogdoor` automatically redirects to `/admin?key=ADMIN_PASSCODE`

**Usage:**
- Bookmark `/dogdoor` for easy access
- No need to type the passcode in the URL

### Security Features

**1. Passcode Verification**
- Passcode is validated server-side via edge function `verify-admin-passcode`
- Wrong or missing passcode → denied access
- All access attempts are logged

**2. Rate Limiting**
- Maximum 10 attempts per minute per IP address
- Prevents brute force attacks

**3. Access Logging**
- All admin access attempts (success and failure) are logged in `admin_access_logs` table
- Log includes: timestamp, IP, user agent, path, reason, success status

**4. Optional Role-Based Mode**
- Can be enabled via `ADMIN_ROLE_ENABLED=true` environment variable
- When enabled, requires:
  - Correct passcode AND
  - Authenticated user AND
  - User has admin role in `user_roles` table

### Admin Routes Protected

All routes under `/admin/*`:
- `/admin` (main dashboard)
- `/admin/nonprofits`
- `/admin/nonprofits/approvals`
- `/admin/orders`
- `/admin/legal`
- `/admin/products`
- `/admin/system-logs`
- And all other admin subroutes

### SEO & Discoverability

**robots.txt:**
```
Disallow: /admin
Disallow: /dogdoor
```

**Sitemap:**
- Admin routes are NOT included in sitemap
- Only public marketing pages are listed

**Navigation:**
- No public links to admin pages in navbars/footers
- Admin is hidden from normal users

### Access Log Fields

Table: `admin_access_logs`

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| attempt_time | timestamp | When access was attempted |
| path | string | Admin path accessed |
| ip_address | string | Client IP address |
| user_agent | string | Browser user agent |
| success | boolean | Whether access was granted |
| reason | string | Reason for success/failure |
| provided_key | string | First 10 chars of provided key (for failed attempts) |
| user_id | uuid | User ID (if role mode enabled) |
| user_email | string | User email (if role mode enabled) |

**Reason codes:**
- `"success"` - Access granted
- `"missing_key"` - No passcode provided
- `"invalid_passcode"` - Wrong passcode
- `"not_logged_in"` - User not authenticated (role mode)
- `"not_admin_role"` - User lacks admin role (role mode)
- `"valid_session_token"` - Valid session token (legacy)

## Environment Variables

**Admin Passcode:**
```
ADMIN_PASSCODE=woofkenzie2025
```

**Optional Role Mode:**
```
ADMIN_ROLE_ENABLED=false  # Set to "true" to enable role-based access
ADMIN_ROLE_NAME=admin     # Role name required for access
```

## Testing

**Test Onboarding Gate:**
1. Open incognito/private window
2. Try to navigate to `/products` directly → Should redirect to `/`
3. Go to `/` and click "Continue as Guest" 
4. Navigate to `/products` → Should load successfully
5. Close and reopen browser → Should still have access (localStorage persists)

**Test Admin Access:**
1. Try `/admin` without key → Should be denied
2. Try `/admin?key=wrongkey` → Should be denied and logged
3. Try `/admin?key=woofkenzie2025` → Should load admin dashboard
4. Try `/dogdoor` → Should redirect to admin with correct key

**Test Home Menu Donate:**
1. Open fresh browser (no `ppp_access`)
2. Click menu → Donate
3. Should auto-set `ppp_access="guest"` and load `/donate`
4. Check localStorage → Should have `ppp_access="guest"`

## Troubleshooting

**Q: User keeps getting redirected from protected pages**
- Check if `ppp_access` exists in localStorage
- Verify user completed Welcome flow or clicked Continue as Guest
- Check browser console for ProtectedRoute logs

**Q: Admin access not working with correct passcode**
- Verify `ADMIN_PASSCODE` environment variable is set
- Check `admin_access_logs` table for failure reason
- Ensure edge function `verify-admin-passcode` is deployed

**Q: Infinite redirect loop**
- Make sure `/` (Home) and `/auth` are NOT wrapped with ProtectedRoute
- Check that Welcome page sets `ppp_access` before navigating

## Code Locations

- **ProtectedRoute:** `src/components/ProtectedRoute.tsx`
- **Route Definitions:** `src/App.tsx` (lines 200-600)
- **Welcome (sets ppp_access):** `src/pages/Welcome.tsx` (line 103)
- **Auth (sets ppp_access):** `src/pages/Auth.tsx` (lines 126, 177)
- **Menu Donate Handler:** `src/components/MenuOverlay.tsx` (lines 42-65, 190-210)
- **Admin Guard:** `src/pages/Admin.tsx` (lines 88-140)
- **DogDoor Route:** `src/pages/DogDoor.tsx`
- **Verify Passcode Edge Function:** `supabase/functions/verify-admin-passcode/index.ts`
- **Robots.txt:** `public/robots.txt`
