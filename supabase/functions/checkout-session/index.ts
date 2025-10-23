
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Rate limiting: Track requests per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

type DirectBody = {
  productName: string;
  productImage?: string;
  unitAmountCents: number;   // integer >= 50
  quantity?: number;         // integer >= 1
  causeId: string;
  donationUsd?: number;      // >= 0
  currency?: string;         // default 'usd'
  successPath?: string;      // '/success' or absolute URL
  cancelPath?: string;       // '/cancel'  or absolute URL
};

type DbBody = {
  productId: string;
  qty: number;
  causeId: string;
  donationCents?: number;    // optional
  currency?: string;         // default 'usd'
  successPath?: string;      // '/success' or absolute URL
  cancelPath?: string;       // '/checkout?payment=cancelled' or absolute URL
};

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const PUBLIC_SITE_URL =
  Deno.env.get("PUBLIC_SITE_URL") ??
  Deno.env.get("VITE_PUBLIC_SITE_URL") ??
  "";

// Support either SUPABASE_URL or VITE_SUPABASE_URL env naming (DB flow only)
const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ??
  Deno.env.get("VITE_SUPABASE_URL") ??
  "";

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const priceFromBase = (base: number) => Math.max(100, Math.round(base * 1.6)); // example markup

function toAbsoluteUrl(base: string, pathOrUrl: string): string {
  // already absolute?
  try {
    const u = new URL(pathOrUrl);
    return u.toString();
  } catch { /* not absolute */ }

  // join with base
  try {
    return new URL(
      pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`,
      base
    ).toString();
  } catch {
    // final fallback
    return `http://localhost:3000${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Rate limiting check
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(clientIp)) {
    console.warn(`[RATE-LIMIT] IP ${clientIp} exceeded rate limit`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), {
        status: 500, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const body = (await req.json()) as Partial<DirectBody & DbBody>;

    // Decide flow
    const wantsDbFlow = !!body.productId && !!body.qty && !!body.causeId;
    const wantsDirectFlow = !!body.productName && !!body.unitAmountCents && !!body.causeId;

    if (!wantsDbFlow && !wantsDirectFlow) {
      return new Response(JSON.stringify({
        error:
          "Invalid request. Provide either { productId, qty, causeId } (DB flow) or { productName, unitAmountCents, causeId } (Direct flow).",
      }), { status: 400, headers: { "Content-Type": "application/json", ...cors } });
    }

    // Determine absolute base for redirect URLs:
    // priority: PUBLIC_SITE_URL env > request Origin header > function URL origin > localhost
    const originHeader = req.headers.get("origin") ?? "";
    let base = PUBLIC_SITE_URL.trim();
    if (!base) {
      if (originHeader) base = originHeader;
      else {
        try { base = new URL(req.url).origin; } catch { /* ignore */ }
      }
    }
    if (!base) base = "http://localhost:3000";

    // Helper to build success/cancel URLs (absolute)
    function buildSuccessCancel(
      successPath?: string,
      cancelPath?: string,
      defaultCancel = "/cancel"
    ) {
      const successAbs = toAbsoluteUrl(base, successPath ?? "/success");
      const cancelAbs  = toAbsoluteUrl(base, cancelPath  ?? defaultCancel);
      // Stripe requires {CHECKOUT_SESSION_ID} in success_url. Append if not present.
      const successWithParam = successAbs.includes("session_id=")
        ? successAbs
        : `${successAbs}${successAbs.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
      return { successAbs: successWithParam, cancelAbs };
    }

    // Build Stripe form payload (REST is compatible with Deno/Edge)
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("payment_method_types[0]", "card");

    // ---------- DB FLOW (optional) ----------
    if (wantsDbFlow) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({
          error: "DB flow requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Use the Direct flow instead.",
        }), { status: 400, headers: { "Content-Type": "application/json", ...cors } });
      }

      const productId = String(body.productId);
      const qty = Math.max(1, Math.floor(Number(body.qty)));
      const causeId = String(body.causeId);
      const donationCents = Math.max(0, Math.floor(Number(body.donationCents || 0)));
      const currency = String(body.currency || "usd").toLowerCase();

      // Build absolute redirect URLs
      const { successAbs, cancelAbs } = buildSuccessCancel(
        body.successPath,
        body.cancelPath ?? "/checkout?payment=cancelled"
      );
      form.set("success_url", successAbs);
      form.set("cancel_url",  cancelAbs);

      const supaHeaders = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      };

      // Fetch product
      const prodResp = await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=*&id=eq.${encodeURIComponent(productId)}&limit=1`,
        { headers: supaHeaders }
      );
      const prodArr = await prodResp.json();
      const product = Array.isArray(prodArr) ? prodArr[0] : null;
      if (!prodResp.ok || !product) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404, headers: { "Content-Type": "application/json", ...cors },
        });
      }

      // Fetch cause
      const causeResp = await fetch(
        `${SUPABASE_URL}/rest/v1/causes?select=id,name&id=eq.${encodeURIComponent(causeId)}&limit=1`,
        { headers: supaHeaders }
      );
      const causeArr = await causeResp.json();
      const cause = Array.isArray(causeArr) ? causeArr[0] : null;
      if (!causeResp.ok || !cause) {
        return new Response(JSON.stringify({ error: "Cause not found" }), {
          status: 404, headers: { "Content-Type": "application/json", ...cors },
        });
      }

      // Compute prices
      const unitPrice = Math.max(50, Math.floor(priceFromBase(Number(product.base_cost_cents || 0))));
      const _totalAmount = unitPrice * qty + donationCents; // (optional to store)

      // Stripe line items
      form.set("line_items[0][quantity]", String(qty));
      form.set("line_items[0][price_data][currency]", currency);
      form.set("line_items[0][price_data][unit_amount]", String(unitPrice));
      form.set("line_items[0][price_data][product_data][name]", String(product.name || "Product"));
      form.set("line_items[0][price_data][product_data][description]", `Supporting: ${cause.name}`);

      if (donationCents > 0) {
        form.set("line_items[1][quantity]", "1");
        form.set("line_items[1][price_data][currency]", currency);
        form.set("line_items[1][price_data][unit_amount]", String(donationCents));
        form.set("line_items[1][price_data][product_data][name]", "Additional Donation");
        form.set("line_items[1][price_data][product_data][description]", `Extra support for ${cause.name}`);
      }

      // Metadata
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      form.set("metadata[order_number]", orderNumber);
      form.set("metadata[product_name]", String(product.name || "Product"));
      form.set("metadata[quantity]", String(qty));
      form.set("metadata[donation_cents]", String(donationCents));
      form.set("metadata[cause_id]", causeId);
      form.set("metadata[cause_name]", String(cause.name || ""));

      // Create Stripe session
      const stripeResp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      });

      const out = await stripeResp.json();
      if (!stripeResp.ok) {
        console.error("[STRIPE_ERROR]", out);
        return new Response(JSON.stringify({ error: out?.error?.message || "Stripe session failed" }), {
          status: 502, headers: { "Content-Type": "application/json", ...cors },
        });
      }

      return new Response(JSON.stringify({ url: out.url }), {
        status: 201, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // ---------- DIRECT (NO-DB) FLOW ----------
    const d = body as DirectBody;

    // Validate & normalize
    const qty = Math.max(1, Math.floor(Number(d.quantity || 1)));
    const unit = Math.max(50, Math.floor(Number(d.unitAmountCents || 0))); // Stripe min 50¢
    const donationUsd = Math.max(0, Number(d.donationUsd || 0));
    const currency = String(d.currency || "usd").toLowerCase();

    if (!d.productName || !d.causeId || !Number.isFinite(unit) || unit < 50) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // Build absolute redirect URLs
    const { successAbs, cancelAbs } = buildSuccessCancel(d.successPath, d.cancelPath);

    form.set("success_url", successAbs);
    form.set("cancel_url",  cancelAbs);

    // Line item 0 — product
    form.set("line_items[0][quantity]", String(qty));
    form.set("line_items[0][price_data][currency]", currency);
    form.set("line_items[0][price_data][unit_amount]", String(unit));
    form.set("line_items[0][price_data][product_data][name]", d.productName);
    if (d.productImage) {
      form.set("line_items[0][price_data][product_data][images][0]", d.productImage);
    }

    // Optional donation
    if (donationUsd > 0) {
      const donationCents = Math.round(donationUsd * 100);
      form.set("line_items[1][quantity]", "1");
      form.set("line_items[1][price_data][currency]", "usd");
      form.set("line_items[1][price_data][unit_amount]", String(donationCents));
      form.set("line_items[1][price_data][product_data][name]", "Donation to cause");
      form.set("line_items[1][price_data][product_data][metadata][causeId]", d.causeId);
    }

    // Metadata
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const donationCents = donationUsd > 0 ? Math.round(donationUsd * 100) : 0;
    form.set("metadata[order_number]", orderNumber);
    form.set("metadata[product_name]", d.productName);
    form.set("metadata[quantity]", String(qty));
    form.set("metadata[donation_cents]", String(donationCents));
    form.set("metadata[cause_id]", d.causeId);

    // Create session via Stripe REST API
    const stripeResp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const out = await stripeResp.json();
    if (!stripeResp.ok) {
      console.error("[STRIPE_ERROR]", out);
      return new Response(JSON.stringify({ error: out?.error?.message || "Stripe session failed" }), {
        status: 502, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    return new Response(JSON.stringify({ url: out.url }), {
      status: 201, headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (err) {
    console.error("[CHECKOUT_SESSION_ERROR]", err);
    return new Response(JSON.stringify({ error: "Checkout session crashed" }), {
      status: 500, headers: { "Content-Type": "application/json", ...cors },
    });
  }
});
