import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

export async function POST(request) {
  try {
    const supabase = await getSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Expect JSON body: { audit_id, files: [{ name, base64, mimeType }] }
    const body = await request.json();
    const { audit_id, files } = body;
    if (!audit_id || !files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "Missing files or audit_id" },
        { status: 400 }
      );
    }

    // Simple storage path: evidence/{audit_id}/{timestamp}_{filename}
    const uploaded = [];
    for (const file of files) {
      const buffer = Buffer.from(file.base64, "base64");
      const timestamp = Date.now();
      const key = `evidence/${audit_id}/${timestamp}_${file.name}`;

      const { data: uploadData, error } = await supabase.storage
        .from("evidence")
        .upload(key, buffer, { contentType: file.mimeType, upsert: false });

      if (error) {
        console.error("Upload error:", error);
        continue;
      }

      const { data: publicURLData } = supabase.storage
        .from("evidence")
        .getPublicUrl(uploadData.path || key);

      uploaded.push({
        name: file.name,
        path: uploadData.path || key,
        url: publicURLData?.publicUrl || null,
        mimeType: file.mimeType,
      });
    }

    return NextResponse.json({ uploaded });
  } catch (error) {
    console.error("Error in chats/upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
