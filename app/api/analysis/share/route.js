import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
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
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { analysisId, sharedWithUsers, permissionLevel, expiresAt } = body;

    if (
      !analysisId ||
      !sharedWithUsers ||
      !Array.isArray(sharedWithUsers) ||
      sharedWithUsers.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields: analysisId and sharedWithUsers",
        },
        { status: 400 }
      );
    }

    // Verify the user owns the analysis
    const { data: analysis, error: analysisError } = await supabase
      .from("audit_analysis")
      .select("id, created_by")
      .eq("id", analysisId)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    if (analysis.created_by !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized to share this analysis" },
        { status: 403 }
      );
    }

    // Create shares for each user
    const shares = sharedWithUsers.map((userId) => ({
      analysis_id: analysisId,
      shared_with_user_id: userId,
      shared_by_user_id: user.id,
      permission_level: permissionLevel || "view",
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    }));

    const { error: shareError } = await supabase
      .from("analysis_shares")
      .insert(shares);

    if (shareError) {
      console.error("Error creating shares:", shareError);
      return NextResponse.json(
        { error: "Failed to share analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Analysis shared with ${sharedWithUsers.length} user(s)`,
    });
  } catch (error) {
    console.error("Error in share API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
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
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get("analysisId");

    if (!analysisId) {
      return NextResponse.json(
        { error: "Missing analysisId parameter" },
        { status: 400 }
      );
    }

    // Get shares for the analysis
    const { data: shares, error: sharesError } = await supabase
      .from("analysis_shares")
      .select(
        `
        id,
        shared_with_user_id,
        permission_level,
        shared_at,
        expires_at,
        is_active,
        profiles!analysis_shares_shared_with_user_id_fkey (
          full_name,
          email
        )
      `
      )
      .eq("analysis_id", analysisId)
      .eq("shared_by_user_id", user.id);

    if (sharesError) {
      console.error("Error fetching shares:", sharesError);
      return NextResponse.json(
        { error: "Failed to fetch shares" },
        { status: 500 }
      );
    }

    return NextResponse.json({ shares: shares || [] });
  } catch (error) {
    console.error("Error in get shares API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
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
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("shareId");

    if (!shareId) {
      return NextResponse.json(
        { error: "Missing shareId parameter" },
        { status: 400 }
      );
    }

    // Delete the share (only if user created it)
    const { error: deleteError } = await supabase
      .from("analysis_shares")
      .delete()
      .eq("id", shareId)
      .eq("shared_by_user_id", user.id);

    if (deleteError) {
      console.error("Error deleting share:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete share" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Share deleted successfully",
    });
  } catch (error) {
    console.error("Error in delete share API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}





