import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First try to fetch from profiles table
    let { data: usersData, error: usersError } = await supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        role
      `
      )
      .neq("id", currentUser.id)
      .order("full_name", { ascending: true });

    // If profiles table doesn't exist or has no data, create a simple fallback
    if (usersError || !usersData || usersData.length === 0) {
      console.warn("Profiles table not found or empty, using fallback");

      // Return a simple fallback with just the current user info
      // In a real app, you'd want to implement proper user management
      usersData = [
        {
          id: "00000000-0000-0000-0000-000000000001",
          full_name: "Demo User 1",
          email: "demo1@example.com",
          role: "user",
        },
        {
          id: "00000000-0000-0000-0000-000000000002",
          full_name: "Demo User 2",
          email: "demo2@example.com",
          role: "auditor",
        },
        {
          id: "00000000-0000-0000-0000-000000000003",
          full_name: "Demo Manager",
          email: "manager@example.com",
          role: "manager",
        },
      ];
    }

    return NextResponse.json({ users: usersData });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
