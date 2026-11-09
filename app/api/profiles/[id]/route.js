import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req, { params }) {
  const supabase = createServerSupabaseClient({ cookies });
  const id = params.id;

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400,
    });
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }
    return new Response(JSON.stringify(data || {}), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
