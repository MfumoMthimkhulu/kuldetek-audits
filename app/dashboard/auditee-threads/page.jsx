"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AuditeeThreadsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [threads, setThreads] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (!user) {
          toast.error("Unauthorized");
          return;
        }

        // Only load audits where current user is auditor
        const { data: auditorAudits, error: auditsErr } = await supabase
          .from("audits")
          .select("id,title,auditee_id,auditee")
          .eq("auditor_id", user.id)
          .order("date", { ascending: false });

        if (auditsErr) throw auditsErr;

        const detailed = await Promise.all(
          (auditorAudits || []).map(async (a) => {
            const { data: lastMsg } = await supabase
              .from("messages")
              .select("id,message,created_at,is_read")
              .eq("audit_id", a.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            const { data: unread } = await supabase
              .from("messages")
              .select("id", { count: "exact" })
              .eq("audit_id", a.id)
              .eq("is_read", false)
              .eq("receiver_id", user.id);

            let audProfile = null;
            if (a.auditee_id) {
              const { data: p } = await supabase
                .from("profiles")
                .select("full_name,email,country")
                .eq("id", a.auditee_id)
                .single();
              audProfile = p;
            }

            return {
              auditId: a.id,
              title: a.title,
              auditee: a.auditee || audProfile?.full_name || null,
              auditeeEmail: audProfile?.email || null,
              auditeeCountry: audProfile?.country || null,
              lastMessage: lastMsg ? lastMsg.message : null,
              lastAt: lastMsg ? lastMsg.created_at : null,
              unreadCount: unread ? unread.length : 0,
            };
          })
        );

        setThreads(detailed);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load threads");
      }
    }
    load();
  }, [supabase]);

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Auditee Threads</h1>

          <div className="space-y-3">
            {threads.length === 0 ? (
              <div className="text-slate-500">No threads found.</div>
            ) : (
              threads.map((t) => (
                <div
                  key={t.auditId}
                  className="bg-white dark:bg-slate-800 border rounded p-4 flex justify-between items-center hover:shadow cursor-pointer"
                  onClick={() =>
                    router.push(`/dashboard/audits/${t.auditId}/chat`)
                  }
                >
                  <div className="max-w-2xl">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t.auditee || "Unknown Auditee"}
                    </div>
                    <div className="text-sm text-slate-500">
                      {t.auditeeEmail || ""} • {t.auditeeCountry || ""}
                    </div>
                    <div className="text-sm text-slate-400 truncate mt-1">
                      {t.lastMessage || "No messages yet"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">{t.title}</div>
                    {t.unreadCount > 0 && (
                      <div className="mt-2 inline-block bg-red-500 text-white text-xs px-2 py-1 rounded">
                        {t.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
