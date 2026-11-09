"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AuditProgressStepper from "@/components/AuditProgressStepper";
import "../../../Dashboard.css";

export default function AuditeeAuditView() {
  const supabase = createClient();
  const params = useParams();
  const auditId = params?.auditId;
  const router = useRouter();

  const [audit, setAudit] = useState(null);
  const [plan, setPlan] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [resources, setResources] = useState([]);
  const [risks, setRisks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [scope, setScope] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const summaryRef = useRef(null);

  useEffect(() => {
    if (!auditId) return;

    async function fetchAuditDetails() {
      setLoading(true);

      const { data: auditData, error: auditError } = await supabase
        .from("audits")
        .select("*")
        .eq("id", auditId)
        .single();
      if (auditError) {
        console.error("Error fetching audit:", auditError);
        setLoading(false);
        return;
      }
      setAudit(auditData);

      const { data: plansData, error: plansError } = await supabase
        .from("audit_plans")
        .select("*")
        .eq("audit_id", auditId);

      if (plansError || !plansData.length) {
        console.error(
          "Error fetching audit plans or no plans found",
          plansError
        );
        setLoading(false);
        return;
      }

      const firstPlan = plansData[0];
      setPlan(firstPlan);
      const planId = firstPlan.id;

      const [
        { data: criteriaData, error: criteriaError },
        { data: objectivesData, error: objectivesError },
        { data: resourcesData, error: resourcesError },
        { data: risksData, error: risksError },
        { data: scheduleData, error: scheduleError },
        { data: scopeData, error: scopeError },
        { data: tasksData, error: tasksError },
      ] = await Promise.all([
        supabase.from("audit_criteria").select("*").eq("plan_id", planId),
        supabase.from("audit_objectives").select("*").eq("plan_id", planId),
        supabase.from("audit_resources").select("*").eq("plan_id", planId),
        supabase.from("audit_risks").select("*").eq("plan_id", planId),
        supabase.from("audit_schedule").select("*").eq("plan_id", planId),
        supabase.from("audit_scope").select("*").eq("plan_id", planId),
        supabase.from("audit_tasks").select("*").eq("plan_id", planId),
      ]);

      setCriteria(criteriaData || []);
      setObjectives(objectivesData || []);
      setResources(resourcesData || []);
      setRisks(risksData || []);
      setSchedule(scheduleData || []);
      setScope(scopeData || []);
      setTasks(tasksData || []);

      setLoading(false);
    }

    fetchAuditDetails();
  }, [auditId, supabase]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{audit?.title || "Audit"}</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Audit Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div>Category: {audit?.category}</div>
            <div>Date: {audit?.date}</div>
            <div>Auditor: {audit?.auditor}</div>
            <div>Status: {audit?.status}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>Objectives: {objectives.length}</div>
              <div>Criteria: {criteria.length}</div>
              <div>Resources: {resources.length}</div>
              <div>Risks: {risks.length}</div>
              <div>Schedule items: {schedule.length}</div>
              <div>Scope items: {scope.length}</div>
              <div>Tasks: {tasks.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="p-2 border rounded">
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-sm text-slate-500">{t.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
