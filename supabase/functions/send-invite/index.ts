import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Microsoft Graph helper ─────────────────────────────────────────────────
// Prereqs (set in Supabase secrets):
//   MICROSOFT_TENANT_ID      — Azure AD tenant ID
//   MICROSOFT_CLIENT_ID      — App registration client ID
//   MICROSOFT_CLIENT_SECRET  — App registration client secret
//   MICROSOFT_SENDER_EMAIL   — e.g. mknowles@true-north-companies.com
//
// App registration needs: Mail.Send (Application permission) + admin consent
//
async function sendViaGraph(to: string, subject: string, htmlBody: string): Promise<void> {
  const tenantId = Deno.env.get("MICROSOFT_TENANT_ID");
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");
  const senderEmail = Deno.env.get("MICROSOFT_SENDER_EMAIL");

  if (!tenantId || !clientId || !clientSecret || !senderEmail) {
    throw new Error("Microsoft Graph credentials not configured.");
  }

  // 1. Get access token via client credentials flow
  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token error: ${err}`);
  }

  const { access_token } = await tokenRes.json();

  // 2. Send mail via /users/{sender}/sendMail
  const mailRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: htmlBody },
          toRecipients: [{ emailAddress: { address: to } }],
          from: { emailAddress: { address: senderEmail } },
        },
        saveToSentItems: true,
      }),
    }
  );

  if (!mailRes.ok) {
    const err = await mailRes.text();
    throw new Error(`Mail send error: ${err}`);
  }
}

// ── Edge Function ──────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { employeeId, email, employeeName, setupUrl } = await req.json();

    if (!employeeId || !email || !setupUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = "Set up your TrueNorth Employee Hub account";
    const htmlBody = `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1A1916;">
        <div style="background: #1B3F6E; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">TrueNorth Employee Hub</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 14px;">People Operations Platform</p>
        </div>
        <h2 style="font-size: 20px; margin-bottom: 8px;">Welcome, ${employeeName}!</h2>
        <p style="color: #6B6860; line-height: 1.6;">Your HR team has set up your employee account. Click the button below to create your password and access your onboarding hub.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${setupUrl}" style="background: #1B3F6E; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
            Set Up My Account →
          </a>
        </div>
        <p style="font-size: 12px; color: #9B9890; line-height: 1.6;">This link expires in 7 days. If you did not expect this email, please contact HR immediately.</p>
        <hr style="border: none; border-top: 1px solid #E5E3DC; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9B9890;">True North Companies · People Operations</p>
      </div>
    `;

    // Try Microsoft Graph; fall back to logging if credentials not set
    const hasGraphCreds = !!(
      Deno.env.get("MICROSOFT_TENANT_ID") &&
      Deno.env.get("MICROSOFT_CLIENT_ID") &&
      Deno.env.get("MICROSOFT_CLIENT_SECRET") &&
      Deno.env.get("MICROSOFT_SENDER_EMAIL")
    );

    if (hasGraphCreds) {
      await sendViaGraph(email, subject, htmlBody);
      return new Response(
        JSON.stringify({ success: true, message: "Invite email sent via Microsoft Graph.", setupUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No email provider — log and return the link for manual delivery
    console.log("=== INVITE EMAIL (MS Graph not yet configured) ===");
    console.log("To:", email);
    console.log("Setup URL:", setupUrl);
    console.log("==================================================");

    // Log invite attempt in activity_log
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await supabase.from("activity_log").insert({
      employee_id: employeeId,
      action: `Setup invite generated for ${employeeName} (${email})`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Setup link generated. Configure Microsoft Graph credentials to enable email delivery.",
        setupUrl,
        emailConfigured: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
