# Storage Bucket Security Documentation

## Overview

Print Power Purpose uses 4 Supabase storage buckets. This document details the security policies for each bucket.

---

## Bucket: `avatars`

**Purpose**: User profile pictures  
**Public**: Yes (publicly accessible URLs)

### Policies

| Operation | Policy Name | Access Control |
|-----------|-------------|----------------|
| SELECT | Avatar images are publicly accessible | Anyone can view (`bucket_id = 'avatars'`) |
| INSERT | Users can upload their own avatar | Authenticated users only, folder must match user ID |
| UPDATE | Users can update their own avatar | Authenticated users only, folder must match user ID |
| DELETE | Users can delete their own avatar | Authenticated users only, folder must match user ID |

### Security Analysis
✅ **SECURE**: Users can only upload/modify/delete files in their own folder (enforced by `auth.uid()::text = storage.foldername(name)[1]`). Public read access is appropriate for profile images.

---

## Bucket: `customer-artwork`

**Purpose**: Customer-uploaded artwork for print orders  
**Public**: Yes

### Policies

| Operation | Policy Name | Access Control |
|-----------|-------------|----------------|
| SELECT | Public can view artwork | Anyone can view |
| INSERT | Anyone can upload artwork | Anyone (no auth required) |
| DELETE | Users can delete their own artwork | Anyone (currently no ownership check) |

### Security Analysis
⚠️ **POTENTIAL RISK**: 
- Upload policy allows anonymous uploads which is needed for guest checkout
- Delete policy has weak ownership check (should be improved)

### Recommendations
1. Consider adding file size limits to prevent abuse
2. Add rate limiting on uploads (via edge function)
3. Implement periodic cleanup of orphaned artwork files

---

## Bucket: `videos`

**Purpose**: Marketing and promotional videos  
**Public**: Yes

### Policies

| Operation | Policy Name | Access Control |
|-----------|-------------|----------------|
| SELECT | Allow video viewing | Anyone can view |
| INSERT | Allow video uploads | Anyone can upload |
| DELETE | Allow video deletions | Anyone can delete |

### Security Analysis
⚠️ **NEEDS REVIEW**: 
- Currently allows anonymous uploads and deletions
- Should be restricted to admin users only

### Recommendations
1. Add admin-only restrictions for INSERT and DELETE operations
2. Current policy is too permissive for production

---

## Bucket: `video-thumbnails`

**Purpose**: Thumbnail images for videos  
**Public**: Yes (for display)

### Policies

| Operation | Policy Name | Access Control |
|-----------|-------------|----------------|
| SELECT | Public can view thumbnails | Anyone can view |
| INSERT | Admins can upload thumbnails | Admin users only |
| DELETE | Admins can delete thumbnails | Admin users only |

### Security Analysis
✅ **SECURE**: Properly restricted to admin users for write operations while allowing public read access.

---

## Summary

| Bucket | Read | Write | Delete | Status |
|--------|------|-------|--------|--------|
| avatars | Public | User-owned | User-owned | ✅ Secure |
| customer-artwork | Public | Anyone | Weak | ⚠️ Acceptable for guest checkout |
| videos | Public | Anyone | Anyone | ⚠️ Needs admin restriction |
| video-thumbnails | Public | Admins | Admins | ✅ Secure |

---

## Recommended SQL Fixes

### Fix videos bucket policies (restrict to admins)

```sql
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Allow video uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow video deletions" ON storage.objects;

-- Add admin-only upload policy
CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add admin-only delete policy
CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'videos'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
```

---

*Last updated: 2025-12-05*
