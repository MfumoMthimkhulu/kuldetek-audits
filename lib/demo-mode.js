export const demoMode =
  process.env.NEXT_PUBLIC_ORION_DEMO === "true" ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
