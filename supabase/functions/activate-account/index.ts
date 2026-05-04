import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password, employeeId, tokenId } = await req.json();

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

    // Verify token is valid and unused
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

    let userId: string | undefined;

    // Try to create a new auth user with confirmed email
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (!createErr && newUser?.user) {
      userId = newUser.user.id;
    } else {
      // User already exists — find them and update password
      const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existingUser = listData?.users?.find((u) => u.email === email);

      if (existingUser) {
        userId = existingUser.id;
        const { error: updateErr } = await supabase.auth.admin.updateUser(userId, {
          password,
          email_confirm: true,
        });
        if (updateErr) {
          return new Response(
            JSON.stringify({ error: "Failed to update account: " + updateErr.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: "Could not create or locate account. Please contact HR." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Link employee record to auth user
    await supabase
      .from("employees")
      .update({ user_id: userId })
      .eq("id", employeeId);

    // Upsert into public.users table for role-based access
    await supabase
      .from("users")
      .upsert({ id: userId, email, role: "employee", employee_id: employeeId });

    // Mark setup token as used
    await supabase
      .from("setup_tokens")
      .update({ used: true })
      .eq("id", tokenId);

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error: " + String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
