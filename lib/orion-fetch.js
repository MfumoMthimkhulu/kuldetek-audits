import { demoClient, demoId } from "./demo-client.js";
import { demoMode } from "./demo-mode.js";

const from = demoClient.from;
const json = (data, status = 200) => Response.json(data, { status });

function reportFrom({ findings = [], scope = [], planInfo = [] } = {}) {
  const plan = Array.isArray(planInfo) ? planInfo[0] : planInfo;
  const entries = findings.filter(item => item.findings);
  return {
    reportTitle: `${plan?.title || "Audit"} — Fieldwork report`,
    auditScope: scope.map(item => item.system).filter(Boolean).join(", ") || "Controls covered by the selected audit plan.",
    summary: `Local demo report. Reviewed ${findings.length} fieldwork records and documented ${entries.length} findings.`,
    findings: entries.map((item, index) => ({
      id: `F-${index + 1}`,
      title: item.task || "Fieldwork finding",
      severity: item.severity || "low",
      description: item.findings,
      evidence: item.notes || "See the associated fieldwork record.",
    })),
    recommendations: entries.map((item, index) => ({
      findingId: `F-${index + 1}`,
      recommendation: item.recommendation || "Assign an owner and review corrective actions.",
    })),
    conclusion: "Review the findings with the audit owner and track remediation through closure.",
  };
}

function analyze(type, entries) {
  const findings = entries.filter(item => item.findings);
  const severity = new Map();
  for (const item of findings) {
    const rating = (item.severity || "Unrated").toLowerCase();
    severity.set(rating, (severity.get(rating) || 0) + 1);
  }
  return [
    { metric: "Status", value: "Completed", progress: 100 },
    { metric: "Fieldwork records", value: String(entries.length), color: "info" },
    { metric: "Documented findings", value: String(findings.length), color: "warning" },
    ...Array.from(severity, ([rating, count]) => ({
      metric: `${rating} severity`, value: String(count), color: "warning",
    })),
    ...findings.map(item => ({
      metric: item.task || "Finding", value: item.findings, observation: item.recommendation || "", color: "info",
    })),
    { metric: "Method", value: `Local ${type} summary based on the selected audit's fieldwork.`, color: "info" },
  ];
}

async function chats(method, query, body, user) {
  const auditId = body.audit_id || query.get("audit_id");
  const { data: audit } = await from("audits").select().eq("id", auditId).maybeSingle();
  if (!audit) return json({ error: "Audit not found" }, 404);
  const receiver = user.id === audit.auditee_id ? audit.auditor_id : audit.auditee_id;
  if (method === "GET") {
    await from("messages").update({ is_read: true }).eq("audit_id", auditId).eq("receiver_id", user.id).eq("is_read", false);
    const { data: messages } = await from("messages").select().eq("audit_id", auditId).order("created_at");
    return json({ messages });
  }
  if (!body.message && !body.attachments?.length) return json({ error: "Enter a message or attach a file." }, 400);
  const { data: message } = await from("messages").insert({
    audit_id: audit.id, sender_id: user.id, receiver_id: receiver,
    message: body.message, attachments: body.attachments || [], is_read: false,
  }).select().single();
  if (receiver) await from("analysis_notifications").insert({
    user_id: receiver, type: "chat", title: `New message for ${audit.title}`,
    message: body.message || "Attachment", data: { audit_id: audit.id }, is_read: false,
  });
  return json({ message });
}

async function notifications(method, query, body, user) {
  if (method === "POST") {
    const { data: notification } = await from("analysis_notifications").insert({
      user_id: body.userId, type: body.type, title: body.title,
      message: body.message, data: body.data || null, analysis_id: body.data?.analysisId, is_read: false,
    }).select().single();
    return json({ notification });
  }
  if (method === "PUT") {
    const update = from("analysis_notifications").update({ is_read: true }).eq("user_id", user.id);
    if (!body.markAllAsRead) update.eq("id", body.notificationId);
    await update;
    return json({ success: true });
  }
  const { data: notifications } = await from("analysis_notifications").select().eq("user_id", user.id).order("created_at", { ascending: false });
  const unread = notifications.filter(item => !item.is_read);
  return json({ notifications: query.get("unreadOnly") === "true" ? unread : notifications, unreadCount: unread.length });
}

export async function orionFetch(input, options = {}) {
  if (!demoMode) return fetch(input, options);
  const { pathname, searchParams } = new URL(input, "http://orion.local");
  const method = options.method || "GET";
  try {
    const body = options.body ? JSON.parse(options.body) : {};
    const { data: { user } } = await demoClient.auth.getUser();
    if (!user) return json({ error: "Sign in to a demo account first." }, 401);
    switch (pathname) {
      case "/api/chats":
        return await chats(method, searchParams, body, user);
      case "/api/chats/upload":
        return json({ uploaded: (body.files || []).map(file => ({
          name: file.name, path: demoId(), mimeType: file.mimeType,
          url: `data:${file.mimeType || "application/octet-stream"};base64,${file.base64}`,
        })) });
      case "/api/notifications":
        return await notifications(method, searchParams, body, user);
      case "/api/users": {
        const { data: users } = await from("profiles").select().neq("id", user.id).order("full_name");
        return json({ users });
      }
      case "/api/report":
        return json({ result: reportFrom(body.data) });
      case "/api/analyze": {
        if (method === "GET") return json({ status: "ready" });
        const results = analyze(body.analysisType, body.data || []);
        await from("demo_analysis_runs").upsert({
          id: `${body.auditId}/${body.analysisType}`, results,
        });
        return json({ status: "started" }, 202);
      }
      case "/api/analysis-results": {
        const id = `${searchParams.get("auditId")}/${searchParams.get("analysisType")}`;
        const { data } = await from("demo_analysis_runs").select().eq("id", id).maybeSingle();
        return data ? json(data) : json({ error: "Analysis not found" }, 404);
      }
      default:
        return json({ error: "This service is unavailable in local mode." }, 503);
    }
  } catch (error) {
    return json({ error: error.message || "Local request failed" }, 500);
  }
}
