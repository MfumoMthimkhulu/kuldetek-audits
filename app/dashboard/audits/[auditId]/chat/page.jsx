"use client";
import { orionFetch } from "@/lib/orion-fetch";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatThread from "@/components/ChatThread";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export default function ChatPage() {
  const { auditId } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [audit, setAudit] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: session } = await supabase.auth.getUser();
        // Basic check: fetch audit to ensure it exists
        const res = await orionFetch(`/api/chats?audit_id=${auditId}`);
        const json = await res.json();
        if (json.error) {
          toast.error(json.error);
          router.push("/dashboard/audits");
          return;
        }
        setAudit({ id: auditId });
      } catch (err) {
        console.error(err);
        toast.error("Failed to open chat");
        router.push("/dashboard/audits");
      }
    }
    load();
  }, [auditId, router, supabase]);

  if (!audit)
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="p-6">Loading chat...</div>
        </main>
      </div>
    );

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="min-h-[60vh] p-6">
          <h2 className="text-xl font-semibold mb-4">Chat for Audit</h2>
          <ChatThread auditId={auditId} />
        </div>
      </main>
    </div>
  );
}
