import { redirect } from "next/navigation";
import { demoMode } from "@/lib/demo-mode";

export default function Home() {
  redirect(demoMode ? "/dashboard" : "/sign-in");
}
