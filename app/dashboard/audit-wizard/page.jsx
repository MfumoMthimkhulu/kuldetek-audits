"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WizardEntry() {
  const router = useRouter();

  useEffect(() => {
    // Perform client-side redirect after mount
    router.replace("/dashboard/audit-wizard/step1");
  }, [router]);

  return <div className="max-w-md mx-auto mt-16">Redirecting…</div>;
}
