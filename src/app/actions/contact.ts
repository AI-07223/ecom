"use server";

import { Resend } from "resend";

interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

function generateContactEmailHtml(data: ContactInput): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background-color: #F5F4EF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #2D5A27 0%, #4CAF50 100%); padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">New Contact Message</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">From ${data.name}</p>
    </div>

    <div style="padding: 24px;">
      <div style="margin-bottom: 16px; padding: 16px; background-color: #F0EFE8; border-radius: 12px;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">From</p>
        <p style="margin: 0; font-size: 14px; color: #1A1A1A; font-weight: 600;">${data.name}</p>
        <p style="margin: 2px 0 0; font-size: 14px; color: #6B7280;">${data.email}</p>
      </div>

      <div style="margin-bottom: 16px;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Subject</p>
        <p style="margin: 0; font-size: 16px; color: #1A1A1A; font-weight: 600;">${data.subject}</p>
      </div>

      <div style="margin-bottom: 16px;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
        <div style="padding: 16px; background-color: #FAFAF5; border: 1px solid #E2E0DA; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #1A1A1A; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
        </div>
      </div>
    </div>

    <div style="padding: 24px; background-color: #F0EFE8; text-align: center; border-top: 1px solid #E2E0DA;">
      <p style="margin: 0; font-size: 12px; color: #6B7280;">Reply directly to this email to respond to ${data.name}</p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendContactEmail(
  input: ContactInput,
): Promise<{ success: boolean; error?: string }> {
  // Validate inputs
  if (!input.name?.trim() || !input.email?.trim() || !input.subject?.trim() || !input.message?.trim()) {
    return { success: false, error: "All fields are required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    return { success: false, error: "Please enter a valid email address" };
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — cannot send contact email");
    return { success: false, error: "Email service is not configured. Please try again later." };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Royal Trading <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: fromEmail, // Store owner receives the contact message
      replyTo: input.email,
      subject: `Contact: ${input.subject} — from ${input.name}`,
      html: generateContactEmailHtml(input),
    });

    if (error) {
      console.error("Contact email send error:", error);
      return { success: false, error: "Failed to send message. Please try again." };
    }

    return { success: true };
  } catch (error) {
    console.error("Contact email error:", error);
    return { success: false, error: "Failed to send message. Please try again." };
  }
}
