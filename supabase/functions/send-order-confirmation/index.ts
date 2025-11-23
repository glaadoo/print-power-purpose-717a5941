import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderConfirmationRequest {
  orderNumber: string;
  customerEmail: string;
  orderDetails: {
    items: Array<{
      name: string;
      quantity: number;
      priceCents: number;
    }>;
    subtotalCents: number;
    taxCents: number;
    totalAmount: number;
    donationAmount: number;
    causeName?: string;
    nonprofitName?: string;
    nonprofitEin?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SEND-ORDER-CONFIRMATION] Processing order confirmation email");
    
    const { orderNumber, customerEmail, orderDetails }: OrderConfirmationRequest = await req.json();

    if (!orderNumber || !customerEmail || !orderDetails) {
      throw new Error("Missing required fields: orderNumber, customerEmail, or orderDetails");
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    console.log("[SEND-ORDER-CONFIRMATION] Sending to:", customerEmail);

    const totalFormatted = (orderDetails.totalAmount / 100).toFixed(2);
    const donationFormatted = (orderDetails.donationAmount / 100).toFixed(2);
    const subtotalFormatted = (orderDetails.subtotalCents / 100).toFixed(2);
    const taxFormatted = (orderDetails.taxCents / 100).toFixed(2);

    // Generate items HTML
    const itemsHtml = orderDetails.items.map((item, idx) => `
      <div class="detail-row">
        <div style="flex: 1;">
          <div class="detail-value">${item.name}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Qty: ${item.quantity} × $${(item.priceCents / 100).toFixed(2)}</div>
        </div>
        <span class="detail-value">$${((item.priceCents * item.quantity) / 100).toFixed(2)}</span>
      </div>
    `).join('');

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #f0f0f0;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 0.2em;
              color: #000;
              margin-bottom: 10px;
            }
            .success-icon {
              width: 60px;
              height: 60px;
              margin: 0 auto 20px;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 30px;
            }
            h1 {
              color: #000;
              font-size: 28px;
              margin: 0 0 10px 0;
            }
            .order-number {
              font-size: 18px;
              color: #666;
              margin-bottom: 30px;
            }
            .order-details {
              background-color: #f9fafb;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 500;
              color: #6b7280;
            }
            .detail-value {
              font-weight: 600;
              color: #111827;
            }
            .total-row {
              margin-top: 15px;
              padding-top: 15px;
              border-top: 2px solid #e5e7eb;
            }
            .donation-highlight {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
            }
            .donation-highlight h2 {
              margin: 0 0 10px 0;
              font-size: 20px;
            }
            .donation-amount {
              font-size: 32px;
              font-weight: bold;
              margin: 10px 0;
            }
            .next-steps {
              background-color: #f0f9ff;
              border-left: 4px solid #3b82f6;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .next-steps h3 {
              margin-top: 0;
              color: #1e40af;
            }
            .next-steps ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .next-steps li {
              margin: 8px 0;
            }
            .cta-button {
              display: inline-block;
              background: #000;
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .footer a {
              color: #3b82f6;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">PRINT POWER PURPOSE</div>
              <div class="success-icon">✓</div>
              <h1>Order Confirmed!</h1>
              <p class="order-number">Order #${orderNumber}</p>
            </div>

            <p>Thank you for your order! Your purchase helps make a difference.</p>

            <div class="order-details">
              <h3 style="margin-top: 0;">Order Details</h3>
              ${itemsHtml}
              ${orderDetails.taxCents > 0 ? `
              <div class="detail-row">
                <span class="detail-label">Tax</span>
                <span class="detail-value">$${taxFormatted}</span>
              </div>
              ` : ''}
              ${orderDetails.donationAmount > 0 ? `
              <div class="detail-row">
                <span class="detail-label">💚 Donation</span>
                <span class="detail-value">$${donationFormatted}</span>
              </div>
              ` : ''}
              <div class="detail-row total-row">
                <span class="detail-label" style="font-size: 18px;">Total</span>
                <span class="detail-value" style="font-size: 18px;">$${totalFormatted}</span>
              </div>
            </div>

            ${orderDetails.donationAmount > 0 && (orderDetails.causeName || orderDetails.nonprofitName) ? `
            <div class="donation-highlight">
              <h2>🎉 Thank You for Your Impact!</h2>
              <div class="donation-amount">$${donationFormatted}</div>
              <p style="margin: 10px 0 0 0; opacity: 0.95;">
                ${orderDetails.causeName ? `Supporting: <strong>${orderDetails.causeName}</strong>` : ''}
                ${orderDetails.nonprofitName ? `<br>Through: <strong>${orderDetails.nonprofitName}</strong>` : ''}
              </p>
            </div>
            ` : ''}

            <div class="next-steps">
              <h3>What's Next?</h3>
              <ul>
                <li><strong>Order Processing:</strong> Your order #${orderNumber} is being prepared</li>
                <li><strong>Production:</strong> Your custom prints will be created with care</li>
                <li><strong>Shipping:</strong> You'll receive tracking information via email once shipped</li>
                <li><strong>Delivery:</strong> Estimated 5-7 business days after shipping</li>
                ${orderDetails.donationAmount > 0 ? `<li><strong>Tax Receipt:</strong> Your donation receipt will be sent separately for tax purposes</li>` : ''}
                <li><strong>Questions?</strong> Contact us anytime - we're here to help!</li>
              </ul>
            </div>

            <center>
              <a href="${Deno.env.get("SITE_URL") || "https://printpowerpurpose.org"}" class="cta-button">
                Continue Shopping
              </a>
            </center>

            <div class="footer">
              <p>
                Questions about your order?<br>
                <a href="${Deno.env.get("SITE_URL") || "https://printpowerpurpose.org"}/contact">Contact Support</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px;">
                © ${new Date().getFullYear()} Print Power Purpose. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Print Power Purpose <orders@printpowerpurpose.org>",
        to: [customerEmail],
        subject: `Order Confirmation #${orderNumber} - Thank You!`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(emailResult)}`);
    }

    console.log("[SEND-ORDER-CONFIRMATION] Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResult.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[SEND-ORDER-CONFIRMATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
