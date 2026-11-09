import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const body = await request.json();
    const { user_id, otp } = body || {};

    if (!user_id || !otp) {
      return NextResponse.json(
        { success: false, message: "Missing user_id or otp" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      key,
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
              // ignore
            }
          },
        },
      }
    );

    // Look up OTP record
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("otps")
      .select("*")
      .eq("user_id", user_id)
      .eq("otp_code", otp)
      .eq("used", false)
      .gt("expires_at", now)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Mark OTP used
    const { error: updateError } = await supabase
      .from("otps")
      .update({ used: true })
      .eq("id", data.id);
    if (updateError) {
      console.error("Failed to mark otp used", updateError);
    }

    // Optionally, you could create a session here. We just return success for the client to continue.
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in verify-otp API:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
