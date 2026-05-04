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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the token is valid and unused
    const { data: tokenData } = await supabase
      .from("setup_tokens")
      .select("id, employee_id, expires_at, used")
      .eq("id", tokenId)
      .eq("used", false)
      .maybeSingle();

    if (!tokenData || new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Token is invalid or expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string | undefined;

    // Try to create user with email pre-confirmed
    const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr) {
      // User may already exist from a previous partial attempt
      if (createErr.message.includes("already") || createErr.message.includes("exists") || createErr.message.includes("unique")) {
        // Find existing user by email and update their password + confirm
        const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
        // listUsers doesn't filter by email, so query auth.users directly
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingUser) {
          userId = existingUser.id;
          await supabase.auth.admin.updateUser(userId, { password, email_confirm: true });
        } else {
          // Try to find in auth schema via admin API with a broader search
          const { data: allUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 50 });
          const found = allUsers?.users?.find((u) => u.email === email);
          if (found) {
            userId = found.id;
            await supabase.auth.admin.updateUser(userId, { password, email_confirm: true });
          } else {
            return new Response(
              JSON.stringify({ error: "Account exists but could not be located. Contact HR." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } else {
        return new Response(
          JSON.stringify({ error: createErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      userId = authData.user.id;
    }

    if (userId) {
      await supabase.from("employees").update({ user_id: userId }).eq("id", employeeId);
      await supabase.from("users").upsert({ id: userId, email, role: "employee", employee_id: employeeId });
      await supabase.from("setup_tokens").update({ used: true }).eq("id", tokenId);
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
