# Performance Optimization Guide

## Current Performance Status

### Target Metrics (Lighthouse)
- **Performance:** ≥ 90
- **Accessibility:** ≥ 90  
- **Best Practices:** ≥ 90
- **SEO:** ≥ 90

## 🔴 Critical Optimizations

### 1. Image Optimization

**Current Issues:**
- Large video files in `/public/media/`
- No lazy loading on VideoBackground
- Missing WebP/AVIF formats

**Actions Required:**

```bash
# Compress videos (use HandBrake or ffmpeg)
ffmpeg -i public/media/hero.mp4 -c:v libx264 -crf 28 -preset slow public/media/hero-optimized.mp4
ffmpeg -i public/media/hero.webm -c:v libvpx-vp9 -crf 35 public/media/hero-optimized.webm

# Compress poster image
# Use tools like TinyPNG, Squoosh, or ImageOptim
```

**Update VideoBackground Component:**
```tsx
// Add loading="lazy" and decoding="async" attributes
<video
  loading="lazy"
  preload="metadata" // Changed from "auto"
  // ... other props
/>
```

### 2. Code Splitting & Lazy Loading

**Implement Route-Based Splitting:**
```tsx
// In App.tsx or router config
import { lazy, Suspense } from 'react';

const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminDonations = lazy(() => import('./pages/AdminDonations'));

// Wrap in Suspense
<Suspense fallback={<div>Loading...</div>}>
  <AdminAnalytics />
</Suspense>
```

**Lazy Load Components:**
```tsx
// For heavy components not immediately visible
const KenzieChat = lazy(() => import('./components/KenzieChat'));
const FloatingCartBar = lazy(() => import('./components/FloatingCartBar'));
```

### 3. Database Query Optimization

**Indexes Already Added (via migration):**
- ✅ Orders: customer_email, created_at, cause_id
- ✅ Donations: cause_id, created_at, customer_email  
- ✅ Causes: raised_cents
- ✅ Story requests: cause_id, status
- ✅ Error logs: timestamp, resolved

**Pagination for Admin Tables:**

```tsx
// AdminOrders.tsx - add pagination
const ITEMS_PER_PAGE = 50;
const [page, setPage] = useState(0);

const { data, error } = await supabase
  .from("orders")
  .select("*", { count: 'exact' })
  .order("created_at", { ascending: false })
  .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);
```

### 4. Caching Strategy

**API Response Caching:**
```tsx
// Use React Query for automatic caching
import { useQuery } from '@tanstack/react-query';

const { data: causes } = useQuery({
  queryKey: ['causes'],
  queryFn: async () => {
    const { data } = await supabase.from('causes').select('*');
    return data;
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

**Static Asset Caching (via Vite):**
```ts
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-accordion', '@radix-ui/react-dialog'],
          'chart-vendor': ['recharts'],
        },
      },
    },
  },
});
```

### 5. Font Optimization

**Preload Critical Fonts:**
```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
```

**Use font-display: swap:**
```css
/* index.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
```

## 🟡 Important Optimizations

### 6. Bundle Size Reduction

**Analyze Bundle:**
```bash
npm run build
npx vite-bundle-visualizer
```

**Remove Unused Imports:**
```tsx
// Bad
import { Button, Card, Dialog, ... } from '@/components/ui';

// Good - tree-shakeable
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

### 7. Reduce JavaScript Execution Time

**Debounce Search Inputs:**
```tsx
import { useDebounce } from '@/hooks/useDebounce';

const [searchTerm, setSearchTerm] = useState("");
const debouncedSearch = useDebounce(searchTerm, 300);

// Use debouncedSearch for filtering
```

**Memoize Expensive Calculations:**
```tsx
import { useMemo } from 'react';

const filteredOrders = useMemo(() => {
  return orders.filter(order => 
    order.customer_email?.includes(searchTerm)
  );
}, [orders, searchTerm]);
```

### 8. Network Optimization

**Enable Compression:**
Already handled by Lovable/Vite, but verify:
```bash
curl -H "Accept-Encoding: gzip, deflate, br" -I https://your-app.lovable.app
```

**Reduce HTTP Requests:**
- Combine multiple API calls with `.select('*')` joins
- Use Supabase batch operations where possible

**Example Optimization:**
```tsx
// Before: 3 requests
const { data: causes } = await supabase.from('causes').select('*');
const { data: donations } = await supabase.from('donations').select('*');
const { data: orders } = await supabase.from('orders').select('*');

// After: 1 request with joins (if related)
const { data } = await supabase
  .from('donations')
  .select(`
    *,
    cause:causes(*),
    order:orders(*)
  `);
```

### 9. Critical Rendering Path

**Defer Non-Critical CSS:**
```html
<!-- index.html -->
<link rel="stylesheet" href="/styles/critical.css">
<link rel="preload" href="/styles/non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

**Inline Critical CSS:**
Extract above-the-fold styles and inline them in `<head>`.

### 10. Third-Party Scripts

**Async/Defer Stripe:**
```tsx
// Load Stripe asynchronously
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://js.stripe.com/v3/';
  script.async = true;
  document.body.appendChild(script);
}, []);
```

## 🟢 Additional Performance Improvements

### 11. Service Worker (Progressive Web App)

**Add Service Worker for Caching:**
```ts
// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.css',
        '/media/hero-poster.jpg',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### 12. Prefetching & Preloading

**Prefetch Likely Next Pages:**
```tsx
import { Link } from 'react-router-dom';

// Prefetch on hover
<Link 
  to="/products" 
  onMouseEnter={() => {
    // Prefetch product data
    queryClient.prefetchQuery(['products'], fetchProducts);
  }}
>
  Products
</Link>
```

### 13. Image Formats

**Use Modern Formats:**
```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Hero image" loading="lazy">
</picture>
```

### 14. Virtualization for Long Lists

**For Admin Tables with 1000+ Items:**
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: orders.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});
```

## 📊 Performance Monitoring

### Lighthouse CI (Automated)

**Setup GitHub Action:**
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://your-app.lovable.app
            https://your-app.lovable.app/products
          uploadArtifacts: true
```

### Real User Monitoring (RUM)

**Add Performance API Tracking:**
```tsx
// Track page load times
useEffect(() => {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('Navigation timing:', entry.toJSON());
        // Send to analytics
      }
    });
    observer.observe({ entryTypes: ['navigation'] });
  }
}, []);
```

### Core Web Vitals

**Monitor in Production:**
```tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 🎯 Performance Targets

### Lighthouse Scores
- **Desktop:**
  - Performance: 95+
  - Accessibility: 95+
  - Best Practices: 95+
  - SEO: 100

- **Mobile:**
  - Performance: 90+
  - Accessibility: 95+
  - Best Practices: 95+
  - SEO: 100

### Core Web Vitals
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1
- **FCP (First Contentful Paint):** < 1.8s
- **TTFB (Time to First Byte):** < 600ms

### Custom Metrics
- **Time to Interactive (TTI):** < 3.8s
- **Total Bundle Size:** < 300KB (gzipped)
- **API Response Time:** < 200ms (95th percentile)
- **Database Query Time:** < 100ms average

## ✅ Pre-Launch Performance Checklist

### Images & Media
- [ ] Videos compressed (< 5MB each)
- [ ] Poster images optimized (< 100KB)
- [ ] Lazy loading enabled
- [ ] WebP/AVIF formats provided

### Code Optimization
- [ ] Route-based code splitting
- [ ] Heavy components lazy loaded
- [ ] Debouncing on search inputs
- [ ] Memoization for expensive calculations

### Database
- [ ] All indexes created
- [ ] Pagination implemented on admin tables
- [ ] Query optimization reviewed
- [ ] No N+1 query problems

### Caching
- [ ] React Query configured
- [ ] Static assets cached (1 year)
- [ ] API responses cached appropriately
- [ ] Service worker enabled (optional)

### Monitoring
- [ ] Lighthouse CI configured
- [ ] Core Web Vitals tracked
- [ ] Performance budgets set
- [ ] Alerts for regressions

### Testing
- [ ] Lighthouse audit run (desktop & mobile)
- [ ] Network throttling tested (Slow 3G)
- [ ] Large dataset performance verified
- [ ] Mobile device testing completed

## 🔧 Quick Fixes for Common Issues

### Slow Page Load
1. Check bundle size with visualizer
2. Enable code splitting
3. Lazy load routes
4. Optimize images

### High Time to Interactive
1. Reduce JavaScript execution
2. Defer non-critical scripts
3. Remove unused dependencies
4. Enable tree shaking

### Poor Mobile Performance
1. Reduce image sizes
2. Enable responsive images
3. Test on real devices
4. Optimize touch interactions

### Slow Database Queries
1. Add missing indexes
2. Use pagination
3. Optimize joins
4. Cache frequent queries

---

**Last Performance Audit:** Pre-launch  
**Next Audit Due:** Weekly  
**Target Achievement Date:** Launch day
