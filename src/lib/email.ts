import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderEmailData {
    orderId: string;
    customerName: string;
    customerEmail: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    shippingAddress: {
        full_name: string;
        address_line1: string;
        address_line2?: string;
        city: string;
        state: string;
        postal_code: string;
        phone: string;
    };
}

function generateOrderConfirmationHtml(data: OrderEmailData): string {
    const itemRows = data.items
        .map(
            (item) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E2E0DA; font-size: 14px; color: #1A1A1A;">
        ${item.name}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E2E0DA; font-size: 14px; color: #6B7280; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E2E0DA; font-size: 14px; color: #1A1A1A; text-align: right; font-weight: 600;">
        ₹${(item.price * item.quantity).toLocaleString("en-IN")}
      </td>
    </tr>
  `
        )
        .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background-color: #F5F4EF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2D5A27 0%, #4CAF50 100%); padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Order Confirmed! ✓</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Thank you for your order, ${data.customerName}</p>
    </div>

    <!-- Order ID -->
    <div style="padding: 24px; background-color: #F0EFE8; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px;">Order ID</p>
      <p style="margin: 4px 0 0; font-size: 16px; color: #1A1A1A; font-weight: 700; font-family: monospace;">${data.orderId}</p>
    </div>

    <!-- Items -->
    <div style="padding: 24px;">
      <h2 style="margin: 0 0 16px; font-size: 16px; color: #1A1A1A; font-weight: 700;">Order Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 8px 16px; text-align: left; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E2E0DA;">Item</th>
            <th style="padding: 8px 16px; text-align: center; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E2E0DA;">Qty</th>
            <th style="padding: 8px 16px; text-align: right; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E2E0DA;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #E2E0DA;">
        <div style="display: flex; justify-content: space-between; padding: 4px 16px; font-size: 14px;">
          <span style="color: #6B7280;">Subtotal</span>
          <span style="color: #1A1A1A;">₹${data.subtotal.toLocaleString("en-IN")}</span>
        </div>
        ${data.discount > 0
            ? `<div style="display: flex; justify-content: space-between; padding: 4px 16px; font-size: 14px;">
                <span style="color: #2D5A27;">Discount</span>
                <span style="color: #2D5A27; font-weight: 600;">-₹${data.discount.toLocaleString("en-IN")}</span>
              </div>`
            : ""
        }
        <div style="display: flex; justify-content: space-between; padding: 8px 16px; font-size: 18px; font-weight: 700;">
          <span style="color: #1A1A1A;">Total</span>
          <span style="color: #2D5A27;">₹${data.total.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>

    <!-- Shipping Address -->
    <div style="padding: 0 24px 24px;">
      <h2 style="margin: 0 0 12px; font-size: 16px; color: #1A1A1A; font-weight: 700;">Shipping Address</h2>
      <div style="padding: 16px; background-color: #F0EFE8; border-radius: 12px;">
        <p style="margin: 0; font-size: 14px; color: #1A1A1A; font-weight: 600;">${data.shippingAddress.full_name}</p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #6B7280;">${data.shippingAddress.address_line1}</p>
        ${data.shippingAddress.address_line2 ? `<p style="margin: 2px 0 0; font-size: 14px; color: #6B7280;">${data.shippingAddress.address_line2}</p>` : ""}
        <p style="margin: 2px 0 0; font-size: 14px; color: #6B7280;">${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postal_code}</p>
        <p style="margin: 8px 0 0; font-size: 14px; color: #6B7280;">📞 ${data.shippingAddress.phone}</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px; background-color: #F0EFE8; text-align: center; border-top: 1px solid #E2E0DA;">
      <p style="margin: 0; font-size: 14px; color: #1A1A1A; font-weight: 600;">Royal Trading Company</p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #6B7280;">Thank you for shopping with us!</p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
    // Skip if no API key configured
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY not set — skipping order confirmation email");
        return false;
    }

    try {
        const { error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "Royal Trading <onboarding@resend.dev>",
            to: data.customerEmail,
            subject: `Order Confirmed #${data.orderId} — Royal Trading Company`,
            html: generateOrderConfirmationHtml(data),
        });

        if (error) {
            console.error("Email send error:", error);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Failed to send order confirmation email:", error);
        return false;
    }
}
