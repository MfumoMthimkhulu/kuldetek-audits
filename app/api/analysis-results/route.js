import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const auditId = searchParams.get("auditId");
    const analysisType = searchParams.get("analysisType");

    if (!auditId || !analysisType) {
      return NextResponse.json(
        { error: "Missing auditId or analysisType" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    // Get current user for RLS compliance
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User authentication error:", userError);
      return NextResponse.json(
        { error: "User authentication required" },
        { status: 401 }
      );
    }

    console.log("Fetching analysis results for:", {
      auditId,
      analysisType,
      userId: user.id,
    });

    const { data, error } = await supabase
      .from("audit_analysis")
      .select("results, created_by, created_at, updated_at")
      .eq("audit_id", auditId)
      .eq("analysis_type", analysisType)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Database query error:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch analysis results",
          details: error.message,
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log("No analysis results found");
      return NextResponse.json(
        { error: "No analysis results found" },
        { status: 404 }
      );
    }

    const latestResult = data[0];

    console.log("Successfully fetched analysis results");
    return NextResponse.json({
      results: latestResult.results,
      created_by: latestResult.created_by,
      created_at: latestResult.created_at,
      updated_at: latestResult.updated_at,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
