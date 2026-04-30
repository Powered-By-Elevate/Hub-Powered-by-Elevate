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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: Record<string, unknown> = {};

    // ── HR admin user ──────────────────────────────────────────────
    const { data: hrAuth, error: hrAuthErr } = await supabase.auth.admin.createUser({
      email: "hr@truenorth.demo",
      password: "HRAdmin2024!",
      email_confirm: true,
    });
    if (hrAuthErr && !hrAuthErr.message.includes("already")) {
      results.hrAuth = { error: hrAuthErr.message };
    } else {
      const hrId = hrAuth?.user?.id ?? (await supabase.from("users").select("id").eq("email","hr@truenorth.demo").maybeSingle()).data?.id;
      if (hrId) {
        await supabase.from("users").upsert({ id: hrId, email: "hr@truenorth.demo", role: "hr" });
      }
      results.hrAuth = "ok";
    }

    // ── Tonia Benas – HR ─────────────────────────────────────────
    const toniaEmail = "tbenas@true-north-companies.com";
    const { data: toniaAuth, error: toniaAuthErr } = await supabase.auth.admin.createUser({
      email: toniaEmail, password: "ToniaBenas2024!", email_confirm: true,
    });
    const toniaAuthId = toniaAuth?.user?.id;
    results.toniaAuth = toniaAuthErr ? { error: toniaAuthErr.message } : toniaAuthId;

    const { data: toniaEmp } = await supabase.from("employees").upsert({
      name: "Tonia Benas",
      email: toniaEmail,
      role: "HR Manager",
      department: "HR",
      manager: "Alex Rivera",
      start_date: "Mar 3, 2025",
      status: "in-progress",
      progress: 60,
      user_id: toniaAuthId ?? null,
    }, { onConflict: "email" }).select("id").maybeSingle();
    const toniaEmpId = toniaEmp?.id;
    results.toniaEmpId = toniaEmpId;

    if (toniaAuthId && toniaEmpId) {
      await supabase.from("users").upsert({ id: toniaAuthId, email: toniaEmail, role: "employee", employee_id: toniaEmpId });
    }

    if (toniaEmpId) {
      await supabase.from("onboarding_tasks").upsert([
        { employee_id: toniaEmpId, title: "Sign offer letter and NDA", category: "document", status: "complete", required: true, due_date: "Mar 4, 2025" },
        { employee_id: toniaEmpId, title: "Complete benefits enrollment", category: "form", status: "complete", required: true, due_date: "Mar 7, 2025" },
        { employee_id: toniaEmpId, title: "HR systems access setup", category: "training", status: "complete", required: true, due_date: "Mar 5, 2025" },
        { employee_id: toniaEmpId, title: "Review HR policy & compliance docs", category: "document", status: "in-progress", required: true, due_date: "Mar 14, 2025" },
        { employee_id: toniaEmpId, title: "HRIS platform training (BambooHR)", category: "training", status: "in-progress", required: true, due_date: "Mar 17, 2025" },
        { employee_id: toniaEmpId, title: "Meet with VP of People Ops", category: "meeting", status: "pending", required: false, due_date: "Mar 21, 2025" },
        { employee_id: toniaEmpId, title: "30-day check-in with manager", category: "meeting", status: "pending", required: false, due_date: "Apr 3, 2025" },
      ], { onConflict: "employee_id,title" });
    }

    // ── Matthew Knowles – Financial Analyst ───────────────────────
    const mattEmail = "mknowles@true-north-companies.com";
    const { data: mattAuth, error: mattAuthErr } = await supabase.auth.admin.createUser({
      email: mattEmail, password: "MattKnowles2024!", email_confirm: true,
    });
    const mattAuthId = mattAuth?.user?.id;
    results.mattAuth = mattAuthErr ? { error: mattAuthErr.message } : mattAuthId;

    const { data: mattEmp } = await supabase.from("employees").upsert({
      name: "Matthew Knowles",
      email: mattEmail,
      role: "Financial Analyst",
      department: "Finance",
      manager: "Sarah Okafor",
      start_date: "Jan 13, 2025",
      status: "in-progress",
      progress: 45,
      user_id: mattAuthId ?? null,
    }, { onConflict: "email" }).select("id").maybeSingle();
    const mattEmpId = mattEmp?.id;
    results.mattEmpId = mattEmpId;

    if (mattAuthId && mattEmpId) {
      await supabase.from("users").upsert({ id: mattAuthId, email: mattEmail, role: "employee", employee_id: mattEmpId });
    }

    if (mattEmpId) {
      await supabase.from("onboarding_tasks").upsert([
        { employee_id: mattEmpId, title: "Sign offer letter and NDA", category: "document", status: "complete", required: true, due_date: "Jan 14, 2025" },
        { employee_id: mattEmpId, title: "Complete benefits enrollment", category: "form", status: "complete", required: true, due_date: "Jan 17, 2025" },
        { employee_id: mattEmpId, title: "Finance systems access (NetSuite, Expensify)", category: "training", status: "complete", required: true, due_date: "Jan 16, 2025" },
        { employee_id: mattEmpId, title: "Review Q4 financial reports", category: "document", status: "in-progress", required: true, due_date: "Jan 24, 2025" },
        { employee_id: mattEmpId, title: "Excel & financial modeling training", category: "training", status: "in-progress", required: true, due_date: "Jan 27, 2025" },
        { employee_id: mattEmpId, title: "Meet with CFO and finance team", category: "meeting", status: "pending", required: false, due_date: "Jan 30, 2025" },
        { employee_id: mattEmpId, title: "Submit first expense report", category: "form", status: "pending", required: false, due_date: "Feb 3, 2025" },
      ], { onConflict: "employee_id,title" });
    }

    // ── Joseph Fawole – COO ───────────────────────────────────────
    const josephEmail = "jfawole@true-north-companies.com";
    const { data: josephAuth, error: josephAuthErr } = await supabase.auth.admin.createUser({
      email: josephEmail, password: "JosephFawole2024!", email_confirm: true,
    });
    const josephAuthId = josephAuth?.user?.id;
    results.josephAuth = josephAuthErr ? { error: josephAuthErr.message } : josephAuthId;

    const { data: josephEmp } = await supabase.from("employees").upsert({
      name: "Joseph Fawole",
      email: josephEmail,
      role: "Chief Operating Officer",
      department: "Operations",
      manager: "CEO",
      start_date: "Nov 4, 2024",
      status: "complete",
      progress: 100,
      user_id: josephAuthId ?? null,
    }, { onConflict: "email" }).select("id").maybeSingle();
    const josephEmpId = josephEmp?.id;
    results.josephEmpId = josephEmpId;

    if (josephAuthId && josephEmpId) {
      await supabase.from("users").upsert({ id: josephAuthId, email: josephEmail, role: "employee", employee_id: josephEmpId });
    }

    if (josephEmpId) {
      await supabase.from("onboarding_tasks").upsert([
        { employee_id: josephEmpId, title: "Sign executive offer letter and NDA", category: "document", status: "complete", required: true, due_date: "Nov 5, 2024" },
        { employee_id: josephEmpId, title: "Complete benefits & equity enrollment", category: "form", status: "complete", required: true, due_date: "Nov 7, 2024" },
        { employee_id: josephEmpId, title: "Executive systems access & SSO setup", category: "training", status: "complete", required: true, due_date: "Nov 6, 2024" },
        { employee_id: josephEmpId, title: "Review company operations overview", category: "document", status: "complete", required: true, due_date: "Nov 12, 2024" },
        { employee_id: josephEmpId, title: "Board introduction & company briefing", category: "meeting", status: "complete", required: true, due_date: "Nov 15, 2024" },
        { employee_id: josephEmpId, title: "Meet all department heads", category: "meeting", status: "complete", required: false, due_date: "Nov 20, 2024" },
        { employee_id: josephEmpId, title: "60-day strategic review with CEO", category: "meeting", status: "complete", required: false, due_date: "Jan 4, 2025" },
      ], { onConflict: "employee_id,title" });
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
