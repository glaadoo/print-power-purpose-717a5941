# Security Audit Checklist

## Overview
This document tracks security measures implemented and remaining tasks before production launch.

## ✅ Implemented Security Measures

### Authentication & Authorization
- ✅ Admin key verification via edge function
- ✅ Session-based admin authentication
- ✅ Admin routes protected (session check)
- ✅ User authentication for order viewing
- ✅ RLS policies on all tables

### Database Security (RLS Policies)
- ✅ **orders**: Users view own orders, service role full access
- ✅ **donations**: Users view own donations, service role full access
- ✅ **causes**: Public read, admin write
- ✅ **products**: Public read, admin write
- ✅ **schools**: Public read, admin write
- ✅ **nonprofits**: Public read, admin write
- ✅ **story_requests**: Admin read/update, service role insert
- ✅ **error_logs**: Public insert, admin read/update/delete
- ✅ **audit_log**: Admin read, service role insert
- ✅ **user_roles**: Users read own, admin manage
- ✅ **kenzie_messages**: Session-scoped access
- ✅ **kenzie_sessions**: Session-scoped access

### API Security
- ✅ Rate limiting on checkout-session (max 10 req/min)
- ✅ Stripe webhook signature verification
- ✅ CORS headers properly configured
- ✅ Input validation on all forms
- ✅ Server-side price calculation (no client manipulation)
- ✅ Edge functions use service role key securely

### Secrets Management
- ✅ All API keys stored in Lovable Cloud secrets
- ✅ No secrets in source code
- ✅ .env file gitignored
- ✅ Secrets:
  - STRIPE_SECRET_KEY
  - STRIPE_WEBHOOK_SECRET
  - RESEND_API_KEY
  - ADMIN_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - SINALITE_CLIENT_ID/SECRET
  - SCALABLEPRESS_API_KEY
  - PSRESTFUL_API_KEY

### Code Security
- ✅ No raw SQL queries (using Supabase client)
- ✅ XSS prevention (React auto-escaping)
- ✅ CSRF protection via session validation
- ✅ No eval() or dangerous code execution
- ✅ Error messages don't expose sensitive data

## ✅ Completed Security Tasks

### 1. Security Scan & Fixes ✅
- ✅ Fixed donations table RLS (users can only view own donations)
- ✅ Restricted admin_sessions table (service role only)
- ✅ Fixed contact_inquiries table (admin-only access)
- ✅ Created system_logs table for monitoring
- ✅ Implemented log retention policy (30 days)

### 2. Monitoring & Logging ✅
- ✅ Created system_logs table with RLS policies
- ✅ Added log cleanup function
- ✅ Indexed logs for fast queries
- ✅ Admin dashboard for viewing logs

## 🔴 Critical Security Tasks (Pre-Launch)

### 1. Rotate Admin Credentials
- [ ] Generate new ADMIN_KEY
- [ ] Update secret in Lovable Cloud
- [ ] Test admin login with new key
- [ ] Document key securely (password manager)

**How to rotate:**
```bash
# Generate new key
openssl rand -base64 32

# Update in Lovable Cloud:
# Backend → Secrets → ADMIN_KEY → Update
```

### 2. Production Webhook Verification
- [ ] Configure Stripe webhook in production mode
- [ ] Update STRIPE_WEBHOOK_SECRET with production value
- [ ] Test webhook with Stripe CLI
- [ ] Verify signature validation works
- [ ] Monitor first live webhook delivery

**Test command:**
```bash
stripe listen --forward-to https://wgohndthjgeqamfuldov.supabase.co/functions/v1/stripe-webhook
stripe trigger checkout.session.completed
```

### 3. HTTPS & Security Headers
- [ ] Verify HTTPS certificate valid
- [ ] Check TLS version (minimum 1.2)
- [ ] Confirm secure cookies (if using)
- [ ] Test CSP headers
- [ ] Verify HSTS enabled

**Check headers:**
```bash
curl -I https://your-app.lovable.app | grep -i security
```

### 4. Rate Limiting Review
- [ ] Test checkout-session rate limit (should block after 10 requests/min)
- [ ] Add rate limiting to other critical endpoints if needed
- [ ] Document rate limits for users
- [ ] Set up alerts for rate limit violations

### 5. Error Handling & Logging
- [ ] Verify no sensitive data in error messages
- [ ] PII redacted from logs
- [ ] Error logs table working correctly
- [ ] Admin can view/resolve errors
- [ ] Automated alerts for critical errors

## 🟡 Important Security Improvements

### 6. Session Management
- [ ] Review session timeout (currently browser session)
- [ ] Implement auto-logout after inactivity
- [ ] Add "remember me" option (optional)
- [ ] Test concurrent session handling

### 7. Input Validation Enhancement
- [ ] Review all form inputs for edge cases
- [ ] Add length limits to text fields
- [ ] Sanitize file uploads (if any)
- [ ] Test SQL injection attempts (should fail)
- [ ] Test XSS attempts (should be escaped)

### 8. Dependency Security
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Update Stripe SDK to latest
- [ ] Update Supabase client to latest
- [ ] Review all dependencies for security advisories

**Check vulnerabilities:**
```bash
npm audit
npm audit fix
```

### 9. Content Security Policy
- [ ] Add CSP meta tag to index.html
- [ ] Whitelist trusted sources (Stripe, Supabase, Resend)
- [ ] Test inline scripts blocked
- [ ] Verify video/image sources allowed

**Example CSP:**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://js.stripe.com; 
               connect-src 'self' https://wgohndthjgeqamfuldov.supabase.co https://api.stripe.com;
               img-src 'self' data: https:;">
```

## 🟢 Additional Security Best Practices

### 10. Monitoring & Alerting
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Configure email alerts for downtime
- [ ] Monitor error log table daily
- [ ] Track failed login attempts
- [ ] Alert on unusual order patterns

### 11. Backup & Recovery
- [ ] Verify automatic backups enabled in Lovable Cloud
- [ ] Test database restore procedure
- [ ] Document recovery process
- [ ] Store backup of secrets externally

### 12. Compliance (if applicable)
- [ ] GDPR compliance (if serving EU users)
- [ ] Privacy policy updated and accessible
- [ ] Terms of service published
- [ ] Cookie consent banner (if needed)
- [ ] Data retention policy documented

## 🔍 Security Testing

### Penetration Testing Checklist
- [ ] Test SQL injection on all inputs
- [ ] Test XSS on text fields
- [ ] Test CSRF on state-changing operations
- [ ] Test authentication bypass attempts
- [ ] Test authorization escalation (normal user → admin)
- [ ] Test file upload vulnerabilities (if any)
- [ ] Test rate limiting effectiveness
- [ ] Test webhook signature bypass
- [ ] Test secrets exposure in responses/logs

### Automated Security Scans
- [ ] Run OWASP ZAP or similar tool
- [ ] Run npm audit
- [ ] Check for exposed secrets (GitGuardian)
- [ ] SSL Labs test for HTTPS configuration

**Tools:**
```bash
# Dependency vulnerabilities
npm audit

# Secret scanning (if using git)
git secrets --scan

# SSL test
curl -I https://your-app.lovable.app | grep -i ssl
```

## 📋 Pre-Launch Security Sign-Off

Before going live, all items in "Critical Security Tasks" must be completed.

**Sign-off:**
- [ ] All critical tasks completed
- [ ] Security audit reviewed
- [ ] Secrets rotated and documented
- [ ] Webhooks tested in production
- [ ] Rate limiting verified
- [ ] Error handling tested
- [ ] Monitoring configured

**Reviewed by:** _____________  
**Date:** _____________  
**Approved for launch:** ☐ Yes ☐ No

## 🚨 Incident Response Plan

### If Security Breach Detected:
1. **Immediate Actions:**
   - Rotate all API keys and secrets
   - Check database for unauthorized changes
   - Review error logs for attack patterns
   - Disable affected endpoints if necessary

2. **Investigation:**
   - Check `audit_log` table for suspicious activity
   - Review edge function logs
   - Check Stripe dashboard for fraud
   - Analyze error logs

3. **Communication:**
   - Notify affected users (if PII compromised)
   - Document incident
   - Report to relevant authorities (if required)

4. **Recovery:**
   - Restore from backup if necessary
   - Implement additional security measures
   - Update this document with lessons learned

## 📞 Security Contacts

**Lovable Support:** https://docs.lovable.dev/  
**Stripe Security:** https://stripe.com/docs/security  
**Supabase Security:** https://supabase.com/docs/guides/platform/security

---

**Last Security Review:** Pre-launch  
**Next Review Due:** Post-launch +7 days  
**Review Frequency:** Monthly
