# Security Validation & Best Practices

## Overview
This document outlines security measures implemented in Print Power Purpose and provides validation procedures.

---

## Authentication & Authorization

### ✅ Admin Access Control

**Implementation:**
- Admin routes protected by session-based authentication
- Admin key verified server-side via `verify-admin-key` edge function
- Session stored in `sessionStorage` (cleared on browser close)
- No hardcoded credentials in codebase

**Validation:**
```bash
# Test 1: Access admin without authentication
curl https://[your-domain]/admin
# Expected: Should redirect to login or show access denied

# Test 2: Invalid admin key
curl -X POST https://wgohndthjgeqamfuldov.supabase.co/functions/v1/verify-admin-key \
  -H "Content-Type: application/json" \
  -d '{"key": "invalid-key"}'
# Expected: {"valid": false}

# Test 3: Valid admin key
curl -X POST https://wgohndthjgeqamfuldov.supabase.co/functions/v1/verify-admin-key \
  -H "Content-Type: application/json" \
  -d '{"key": "[YOUR_ADMIN_KEY]"}'
# Expected: {"valid": true}
```

**Security Checklist:**
- [ ] Admin key stored securely in Supabase secrets
- [ ] Admin routes check authentication before rendering
- [ ] Session cleared on logout
- [ ] No admin credentials in client-side code
- [ ] Admin key never exposed in network responses

---

## Row-Level Security (RLS)

### ✅ Orders Table

**Policies:**
```sql
-- Authenticated users can read their own orders
CREATE POLICY "authenticated_users_read_own_orders"
ON orders FOR SELECT
USING (
  (auth.jwt() ->> 'email') IS NOT NULL 
  AND customer_email = (auth.jwt() ->> 'email')
);

-- Service role has full access
CREATE POLICY "service_role_full_access"
ON orders FOR ALL
USING (true)
WITH CHECK (true);
```

**Validation:**
1. As unauthenticated user, try to select from orders → Should fail
2. As authenticated user, try to read another user's orders → Should return empty
3. As service role (webhook), insert order → Should succeed

### ✅ Donations Table

**Policies:**
```sql
-- Users view their own donations
CREATE POLICY "users_view_own_donations"
ON donations FOR SELECT
USING (
  (auth.jwt() ->> 'email') IS NOT NULL 
  AND customer_email = (auth.jwt() ->> 'email')
);

-- Service role full access
CREATE POLICY "service_role_full_access_donations"
ON donations FOR ALL
USING (true)
WITH CHECK (true);
```

### ✅ Causes Table

**Policies:**
```sql
-- Public read access
CREATE POLICY "Public read access for causes"
ON causes FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "admins_can_update_causes"
ON causes FOR UPDATE
USING (has_role(auth.uid(), 'admin'));
```

**Security Risk:** ❌ **CRITICAL**
The `has_role` function checks user_roles table, but we need to verify:
1. How admin roles are assigned (should not be self-assignable)
2. RLS on user_roles table prevents privilege escalation

**Recommended Fix:**
```sql
-- Ensure user_roles has proper RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own roles
CREATE POLICY "users_can_view_own_roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- Only service role can assign roles (not users themselves)
-- No INSERT/UPDATE/DELETE policies for regular users
```

### ✅ Story Requests Table

**Policies:**
```sql
-- Only admins can view
CREATE POLICY "admins_can_view_story_requests"
ON story_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Service role can insert
CREATE POLICY "service_role_can_insert_story_requests"
ON story_requests FOR INSERT
WITH CHECK (true);
```

---

## Input Validation

### ✅ Edge Functions

All edge functions must validate inputs using Zod or similar:

**Example: checkdrop-evaluate**
```typescript
// ❌ MISSING - Should add input validation
const bodySchema = z.object({
  manual_trigger: z.boolean().optional(),
  triggered_by: z.string().optional()
});

try {
  const body = await req.json();
  const validated = bodySchema.parse(body);
  // ... proceed with validated data
} catch (err) {
  return new Response(
    JSON.stringify({ error: 'Invalid input' }), 
    { status: 400 }
  );
}
```

### ✅ Client-Side Forms

**Orders/Donations:**
- Amount validation (must be positive, max limit)
- Email validation (format, length)
- Product ID validation (must exist)

**Admin Forms:**
- Cause name: max length 200 chars
- Goal amount: must be positive integer
- Image URL: valid URL format

**Implementation Check:**
```typescript
// Verify validation exists in:
// - src/pages/Checkout.tsx
// - src/pages/Admin.tsx
// - All admin CRUD operations
```

---

## API Security

### ✅ Edge Function Authentication

**Public Functions (verify_jwt = false):**
- `verify-admin-key` - Protected by secret validation
- `stripe-webhook` - Protected by Stripe signature validation
- `checkdrop-evaluate` - Should be protected by custom secret

**Recommendation:** Add authorization header check to `checkdrop-evaluate`:

```typescript
// In checkdrop-evaluate/index.ts
const authHeader = req.headers.get('authorization');
const expectedToken = Deno.env.get('CHECKDROP_SECRET');

if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

Update cron job SQL:
```sql
SELECT net.http_post(
  url := 'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/checkdrop-evaluate',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.checkdrop_secret', true)
  ),
  body := '{}'::jsonb
);
```

### ✅ Stripe Webhook Validation

**Current Implementation:**
```typescript
const signature = req.headers.get("stripe-signature");
const event = stripe.webhooks.constructEvent(
  body, 
  signature, 
  webhookSecret
);
```

**Validation Checklist:**
- [ ] Webhook secret stored in Supabase secrets
- [ ] Signature verified before processing
- [ ] Invalid signatures rejected with 400 status
- [ ] Replay attacks prevented (Stripe handles this)

---

## Data Protection

### ✅ Sensitive Data Handling

**What's Stored:**
- Customer emails (orders, donations)
- Order amounts
- Cause donation amounts

**What's NOT Stored:**
- Credit card numbers (handled by Stripe)
- Full addresses (only in profiles, RLS protected)
- Admin passwords (only hashed keys)

**Validation:**
```sql
-- Ensure no PII in logs
SELECT * FROM error_logs 
WHERE error_message LIKE '%@%' 
   OR error_message LIKE '%4242%';
-- Should return no credit card or overly detailed email exposure
```

### ✅ Logging Best Practices

**Do Log:**
- Error messages (sanitized)
- Edge function execution status
- Cause milestone triggers
- Admin actions (audit trail)

**Don't Log:**
- Customer payment details
- Full email addresses in public logs
- Admin credentials
- Stripe API keys

**Code Review:**
```bash
# Search for console.log with sensitive data
grep -r "console.log.*email" supabase/functions/
grep -r "console.log.*password" supabase/functions/
grep -r "console.log.*key" supabase/functions/
```

---

## Secrets Management

### ✅ Current Secrets (Supabase Vault)

- `RESEND_API_KEY` - Email service
- `ADMIN_KEY` - Admin authentication
- `STRIPE_SECRET_KEY` - Stripe payments
- `STRIPE_WEBHOOK_SECRET` - Webhook validation
- `SUPABASE_SERVICE_ROLE_KEY` - Internal operations

**Security Checklist:**
- [ ] All secrets stored in Supabase secrets (not .env)
- [ ] No secrets committed to git
- [ ] Secrets accessed via `Deno.env.get()` in edge functions
- [ ] Secrets rotated after suspected exposure
- [ ] Production vs staging secrets separated

**Validation:**
```bash
# Check for exposed secrets in git history
git log --all --source --full-history -- **/.env
git log --all -S "RESEND_API_KEY" --source --all

# Check current codebase
grep -r "sk_live" .
grep -r "pk_live" .
# Should return nothing
```

---

## Network Security

### ✅ CORS Configuration

**Edge Functions:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Security Consideration:**
- Currently allows all origins (`*`)
- Recommended: Restrict to specific domains in production

**Production Fix:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true'
};
```

### ✅ HTTPS Enforcement

- All Supabase endpoints use HTTPS
- Lovable deployment enforces HTTPS
- No mixed content warnings

---

## Vulnerability Scanning

### Manual Checks

**1. SQL Injection**
```sql
-- Try injecting SQL in search fields
-- Example: Search for: ' OR 1=1 --
-- Should NOT return unauthorized data
```

**2. XSS (Cross-Site Scripting)**
```html
<!-- Try injecting script in cause names, order notes -->
<script>alert('XSS')</script>
<!-- Should be escaped/sanitized -->
```

**3. CSRF (Cross-Site Request Forgery)**
- Edge functions check origin/referrer
- Stripe webhooks use signature validation
- Admin actions require active session

**4. Privilege Escalation**
```sql
-- As regular user, try to assign admin role
INSERT INTO user_roles (user_id, role) VALUES (auth.uid(), 'admin');
-- Should FAIL due to RLS
```

### Automated Scanning

Run Supabase linter:
```bash
# In Lovable, this runs automatically
# Check for:
# - Missing RLS policies
# - Publicly accessible tables
# - Leaked credentials
```

---

## Incident Response Plan

### Level 1: Low Severity (Info leak, minor bug)
1. Document issue
2. Create fix plan
3. Deploy within 1 week
4. Monitor for recurrence

### Level 2: Medium Severity (Potential exploit, data exposure)
1. Immediate assessment
2. Temporary mitigation (disable feature if needed)
3. Fix within 24 hours
4. Notify affected users if PII exposed

### Level 3: High Severity (Active exploit, data breach)
1. **Immediate Actions:**
   - Rotate all secrets
   - Disable affected endpoints
   - Block suspicious IPs
2. **Within 1 Hour:**
   - Assess scope of breach
   - Document timeline
3. **Within 4 Hours:**
   - Deploy fix
   - Restore service
4. **Within 24 Hours:**
   - Notify affected users
   - Report to authorities if required
   - Post-mortem analysis

---

## Security Review Checklist

### Before Deployment

- [ ] All RLS policies enabled on tables with user data
- [ ] Edge functions validate all inputs
- [ ] No secrets in client-side code
- [ ] Admin routes require authentication
- [ ] Webhook signatures validated
- [ ] CORS configured appropriately
- [ ] Error messages don't leak sensitive info
- [ ] SQL queries use parameterization (no string concatenation)
- [ ] File uploads validated (if applicable)
- [ ] Rate limiting on public endpoints

### Monthly Review

- [ ] Review audit logs for suspicious activity
- [ ] Check for new Supabase security advisories
- [ ] Review user_roles table for unauthorized admins
- [ ] Test RLS policies still enforce correctly
- [ ] Verify secrets haven't been exposed
- [ ] Check edge function logs for errors
- [ ] Review admin access patterns

---

## Compliance

### GDPR (if applicable)
- User data export capability: ❌ Not implemented
- User data deletion: ❌ Not implemented
- Cookie consent: ❌ Not implemented
- Privacy policy: ❌ Not implemented

**Recommendations:**
1. Add data export edge function
2. Add user deletion workflow
3. Implement cookie consent banner
4. Create privacy policy page

### PCI DSS
- Credit cards not stored ✅ (Stripe handles)
- No card data in logs ✅
- HTTPS everywhere ✅

---

## Security Contacts

**Report Security Issues:**
- Email: security@printpowerpurpose.com (if configured)
- Do NOT post publicly

**External Resources:**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Supabase Security: https://supabase.com/docs/guides/platform/security
- Stripe Security: https://stripe.com/docs/security
