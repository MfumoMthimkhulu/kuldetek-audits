"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdChat } from "react-icons/md";

export default function AuditeeDashboard() {
  const supabase = createClient();
  const [audits, setAudits] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (!user) return;

        const { data } = await supabase
          .from("audits")
          .select("id,title,category,status,date,auditor,auditor_id")
          .eq("auditee_id", user.id)
          .order("date", { ascending: false });

        setAudits(data || []);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [supabase]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">My Audits</h1>
      <div className="space-y-4">
        {audits.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle>{a.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">
                    {a.category} • {a.status}
                  </div>
                  <div className="text-xs text-slate-400">
                    Auditor: {a.auditor}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/auditee/audits/${a.id}`)}
                  >
                    View Audit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() =>
                      router.push(`/auditee/audits/${a.id}/chat`)
                    }
                    aria-label={`Open chat for ${a.title}`}
                  >
                    <MdChat className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
