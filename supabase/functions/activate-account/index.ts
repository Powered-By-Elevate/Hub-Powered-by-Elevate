import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, password, employeeId, tokenId } = body;

    if (!email || !password || !employeeId || !tokenId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify token
    const { data: tokenData, error: tokenErr } = await supabase
      .from("setup_tokens")
      .select("id, employee_id, expires_at, used")
      .eq("id", tokenId)
      .eq("used", false)
      .maybeSingle();

    if (tokenErr || !tokenData) {
      return new Response(
        JSON.stringify({ error: "Token is invalid or already used." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Token has expired. Please ask HR to send a new invite." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to create auth user
    let userId: string;
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (!createErr && newUser?.user) {
      userId = newUser.user.id;
    } else if (createErr?.message?.includes("already been registered")) {
      // User exists - find by email and update password
      const { data: userData } = await supabase.auth.admin.listUsers();
      const existing = userData?.users?.find(
        (u: { email?: string }) => u.email === email
      );
      if (!existing) {
        return new Response(
          JSON.stringify({ error: "Could not locate existing account." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = existing.id;
      const { error: upErr } = await supabase.auth.admin.updateUser(userId, {
        password,
        email_confirm: true,
      });
      if (upErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update password: " + upErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: createErr?.message || "Failed to create account." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link employee to auth user
    await supabase.from("employees").update({ user_id: userId }).eq("id", employeeId);

    // Upsert public.users record for role lookup
    await supabase.from("users").upsert(
      { id: userId, email, role: "employee", employee_id: employeeId },
      { onConflict: "id" }
    );

    // Mark token used
    await supabase.from("setup_tokens").update({ used: true }).eq("id", tokenId);

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "Server error: " + msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
