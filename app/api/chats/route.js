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

// GET: /api/chats?audit_id=... returns messages for an audit (with RBAC)
export async function GET(request) {
  try {
    const supabase = await getSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const audit_id = url.searchParams.get("audit_id");
    if (!audit_id) {
      return NextResponse.json({ error: "Missing audit_id" }, { status: 400 });
    }

    // Verify user is part of the audit (either auditor_id or auditee_id)
    const { data: audit, error: auditErr } = await supabase
      .from("audits")
      .select("id, auditor_id, auditee_id, title")
      .eq("id", audit_id)
      .single();

    if (auditErr || !audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    if (audit.auditor_id !== user.id && audit.auditee_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("audit_id", audit_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // Mark messages as read for the current user where they are receiver
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("audit_id", audit_id)
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error("Error in chats GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: /api/chats to send a message
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

    const body = await request.json();
    const { audit_id, message, attachments } = body;
    if (!audit_id || (!message && !(attachments && attachments.length))) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user belongs to the audit
    const { data: audit, error: auditErr } = await supabase
      .from("audits")
      .select("id, auditor_id, auditee_id")
      .eq("id", audit_id)
      .single();

    if (auditErr || !audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    // Determine receiver: if sender is auditor, receiver is auditee and vice versa
    let receiver_id = null;
    if (audit.auditor_id === user.id) {
      receiver_id = audit.auditee_id;
    } else if (audit.auditee_id === user.id) {
      receiver_id = audit.auditor_id;
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const insertPayload = {
      audit_id,
      sender_id: user.id,
      receiver_id,
      message: message || null,
      attachments: attachments || null,
    };

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error("Error creating message:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Create a simple notification for the receiver
    if (receiver_id) {
      try {
        await supabase.from("notifications").insert({
          user_id: receiver_id,
          type: "chat",
          title: `New message regarding audit ${audit.id}`,
          message: (message || "Attachment").substring(0, 120),
          data: JSON.stringify({ audit_id }),
        });
      } catch (nerr) {
        console.warn("Failed to create notification for message:", nerr);
      }
    }

    return NextResponse.json({ message: inserted });
  } catch (error) {
    console.error("Error in chats POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
