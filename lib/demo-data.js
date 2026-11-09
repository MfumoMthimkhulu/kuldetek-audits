export const demoUser = {
  id: "demo-auditor",
  email: "auditor@example.test",
  user_metadata: { full_name: "Alex Morgan" },
};

export function seedDemo() {
  const date = new Date().toISOString().slice(0, 10);
  const created_at = `${date}T09:00:00Z`;
  const profile = (id, full_name, email, role, department) => ({
    id, full_name, email, role, department, created_at, country: "South Africa",
  });
  const profiles = [
    profile(demoUser.id, "Alex Morgan", demoUser.email, "admin", "Internal Audit"),
    profile("demo-manager", "Sam Rivera", "sam@example.test", "manager", "Internal Audit"),
    profile("demo-auditee", "Jamie Patel", "jamie@example.test", "auditee", "IT Operations"),
  ];
  const audits = [
    ["access", "Identity & Access Review", "Security", "In Progress"],
    ["cloud", "Cloud Configuration Audit", "Compliance", "Completed"],
    ["incident", "Incident Response Readiness", "Security", "Not Started"],
  ].map(([id, title, category, status]) => ({
    id, title, category, status, date, created_at,
    auditor: profiles[0].full_name, auditor_id: demoUser.id,
    auditee: profiles[2].full_name, auditee_id: profiles[2].id,
    last_page: id === "incident"
      ? `/dashboard/audit-plan?audit_id=${id}`
      : `/dashboard/audit-fieldwork?id=${id}&plan_id=plan-${id}`,
  }));
  const audit_plans = audits.slice(0, 2).map(audit => ({
    id: `plan-${audit.id}`, audit_id: audit.id, title: audit.title, created_at, updated_at: created_at,
    executive_summary: "Fictional audit of operational controls and supporting evidence.",
  }));
  const audit_tasks = [
    { id: "access-mfa", plan_id: "plan-access", task: "Verify administrator MFA", goal: "Confirm MFA is enforced for privileged accounts", control: "Privileged access management", date, task_type: "control_testing", status: "completed", notes: "Reviewed the fictional privileged account inventory.", findings: "One sampled administrator account is missing enforced MFA.", severity: "high", recommendation: "Require MFA on all administrator accounts.", evidence: [] },
    { id: "access-offboarding", plan_id: "plan-access", task: "Sample employee offboarding records", goal: "Verify access is revoked on time", control: "Account lifecycle", date, task_type: "document_review", status: "in_progress", notes: "", findings: "", evidence: [] },
    { id: "cloud-logging", plan_id: "plan-cloud", task: "Review cloud log retention", goal: "Verify at least 90 days of activity logs", control: "Logging and monitoring", date, task_type: "control_testing", status: "completed", notes: "Reviewed the sample activity log configuration.", findings: "Activity logs are retained for 30 days.", severity: "medium", recommendation: "Increase log retention to 90 days.", evidence: [] },
  ];
  const planRows = fields => audit_plans.map(plan => ({
    id: `${plan.id}-${Object.keys(fields)[0]}`, plan_id: plan.id, ...fields,
  }));
  const results = [{ metric: "Key finding", value: "One sampled administrator account is missing enforced MFA.", color: "warning" }];
  return {
    profiles, audits, audit_plans, audit_tasks,
    audit_plan_templates: [{
      id: 1, name: "Access control review", category: "Security", title: "Access Control Review",
      summary: "Assess access provisioning and periodic review.", objectives: ["Verify privileged access controls."],
      systems: [], audit_criteria: ["Internal control baseline"], risk_summary: [],
      roles: [], schedule: [], activities: [{ activity: "Review the privileged account inventory" }],
    }],
    audit_criteria: planRows({ criteria: "Internal cybersecurity control baseline" }),
    audit_objectives: planRows({ description: "Assess control design and operating effectiveness." }),
    audit_resources: planRows({ role: "Auditor", name: profiles[0].full_name, responsibility: "Review evidence and document findings." }),
    audit_risks: planRows({ area: "Control coverage", rating: "High", justification: "A missing control can expose sensitive systems." }),
    audit_schedule: planRows({ activity: "Evidence review", start_date: date, end_date: date }),
    audit_scope: planRows({ system: "Corporate IT", rating: "High", justification: "Systems in scope support internal operations." }),
    auditor_todos: [{ id: "demo-todo", auditor_id: demoUser.id, user_id: demoUser.id, title: "Review access evidence", description: "Confirm the privileged account sample.", priority: "high", status: "pending", completed: false, created_at }],
    system_alerts: [{ id: "demo-alert", title: "Privileged access exception", description: "A sample administrator account needs MFA.", severity: "high", category: "security", source: "Access review", status: "active", created_at }],
    messages: [{ id: "demo-message", audit_id: "access", sender_id: profiles[2].id, receiver_id: demoUser.id, message: "The sample account inventory is ready for review.", attachments: [], is_read: false, created_at }],
    audit_analysis: [{ id: "demo-analysis", audit_id: "access", user_id: demoUser.id, created_by: demoUser.id, analysis_type: "summary", results, approval_status: "pending", created_at }],
    audit_reports: [{
      id: "demo-report", plan_id: "plan-cloud", title: "Cloud Configuration Audit",
      audit_scope: "Cloud activity logging", summary: "Reviewed the fictional cloud activity log configuration.",
      findings: [{ id: "F-1", title: "Log retention", severity: "medium", description: "Activity logs are retained for 30 days.", evidence: "Sample configuration review." }],
      recommendations: [{ findingId: "F-1", recommendation: "Increase retention to 90 days." }],
      conclusion: "Track remediation and retest retention.", generated_by: demoUser.id,
      generated_at: created_at, created_at, approval_status: "pending",
    }],
    audit_report_shares: [{ id: "demo-report-share", report_id: "demo-report", shared_by: demoUser.id, shared_with: profiles[1].id, status: "pending", shared_at: created_at }],
    analysis_notifications: [{ id: "demo-notification", user_id: demoUser.id, analysis_id: "demo-analysis", type: "analysis_shared", title: "Access review ready", message: "Sample findings are available to review.", is_read: false, created_at }],
  };
}
