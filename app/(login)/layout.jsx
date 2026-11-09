import { redirect } from "next/navigation";
import { demoMode } from "@/lib/demo-mode";

export default function LoginLayout({ children }) {
  if (demoMode) redirect("/dashboard");
  return children;
}
