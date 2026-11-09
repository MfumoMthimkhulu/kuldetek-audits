import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Centralized helper to update the user's last visited audit page.
// Use on page mount or key navigation points to persist resume location.
export async function updateAuditLastPage(
  supabase: any,
  auditId: string | null | undefined,
  url: string
): Promise<void> {
  if (!auditId) return;
  try {
    const { error } = await supabase
      .from("audits")
      .update({ last_page: url })
      .eq("id", auditId);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to update last_page:", error);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error updating last_page:", err);
  }
}
