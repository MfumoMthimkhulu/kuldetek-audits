# Kuldetek Auditing — Business Overview (For Business Analysts)

This document explains what the Kuldetek Auditing platform does, who it serves, its core features, and how it supports business goals — written for non-technical stakeholders.

## One-line summary

Kuldetek Auditing is a web platform that helps organizations run, track, and report security audits and compliance activities, centralizing findings, alerts, and audit evidence so teams can manage risk more efficiently.

## Who this serves (Primary users)

- Security Managers: Plan and oversee audits, measure compliance, and assign work.
- Auditors / Field Inspectors: Execute audits, capture findings, attach evidence, and update statuses.
- Analysts: Run analyses on audit data to identify trends, root causes, and remediation priorities.
- IT / Security Operations: Receive and act on system alerts and high-severity findings.
- Executives / Compliance Officers: View high-level dashboards and reports to understand risk posture and compliance scores.
- Admins: Manage user access, roles, and organizational settings.

## Business problems it solves

- Reduces fragmentation by providing one place to manage audit plans, tasks, and results.
- Speeds up evidence collection and reporting with PDF export and saved analysis sharing.
- Improves visibility into risk via dashboards and alerting (critical/high severity items surfaced quickly).
- Standardizes audit workflows using multi-step audit wizards and status tracking.
- Enables role-based access so teams see only the data relevant to them.

## Core capabilities (high-level)

1. Audit Lifecycle Management

   - Create, schedule, and track audits from planning to closure.
   - Multi-step audit wizard to guide auditors through a consistent process.
   - Task-level tracking for fieldwork and evidence collection.

2. Dashboard & Visual Insights

   - Executive dashboard showing total audits, completion rate, and compliance score.
   - Visualization of alert severities and audit progress to prioritize actions.

3. Alerts & Notifications

   - System alerts can be created for critical findings and assigned to teams.
   - Notifications list and history so teams can follow up on issues.

4. Analysis & Reporting

   - Save and share analysis results with stakeholders.
   - Export audit reports to PDF for distribution or record-keeping.

5. User & Role Management

   - Users have roles (Admin, Auditor, Analyst, etc.) to control access.
   - Admins manage users and permissions.

6. Secure Access
   - Login and session management ensure only authorized users can access protected areas.

## Typical user journeys (scenarios)

1. Security Manager scheduling an audit

   - Manager creates an audit plan, assigns auditors, sets dates and categories.
   - The plan appears on the team dashboard and in the auditors' task lists.

2. Auditor performing fieldwork

   - Auditor opens a task, records findings, attaches photos or evidence, and marks the task complete.
   - Critical findings automatically generate alerts for security operations.

3. Analyst investigating trends

   - Analyst runs saved analyses or ad-hoc queries on audit data to identify recurring gaps.
   - Analyst shares an analysis with stakeholders or exports a report for the quarterly review.

4. Executive reviewing compliance
   - Executive views the dashboard: compliance score, critical alert counts, and recent audit completion rates.
   - Downloads a summary PDF for board reporting.

## Data handled (simple view)

- User profiles: names, roles, contact info.
- Audits: title, category, date, assigned auditor, status, findings.
- Findings/alerts: title, description, severity (critical/high/medium/low), status (active/resolved), timestamps.
- Saved analyses and shared items: references to audits and findings, metadata for sharing.

Note: Sensitive data (e.g., evidence attachments) should be protected; access is role-based.

## Security & compliance considerations

- Role-based access control ensures separation of duties (Admins vs. Auditors vs. Analysts).
- Sessions and authentication are enforced — users must sign in before accessing dashboards or audit data.
- For production, ensure encryption-in-transit (HTTPS) and encryption-at-rest for any stored evidence.
- Audit logs of who viewed or changed critical findings are recommended for compliance.

## Business metrics & KPIs to track

- Number of audits created per month
- Audit completion rate (completed / total) per period
- Mean time to remediate critical findings
- Number of active critical/high alerts
- Percentage of audits with evidence attached
- Time from audit creation to first fieldwork activity

## Limitations & known gaps (current)

- Some admin functions are handled client-side and may need server-side hardening for strict auditing and security.
- Role permissions should be validated against a formal policy (who can delete data, who can reassign audits, etc.).
- Integrations to ticketing or SIEM tools are not present by default — consider building connectors for escalation workflows.

## Suggested roadmap for business value

1. Near term (0–3 months)

   - Harden admin workflows and add audit logs for changes to critical findings.
   - Create connectors to common ticketing systems (Jira, ServiceNow) for automated escalation.
   - Add a `.env.example` and deployment checklist for production readiness.

2. Mid term (3–9 months)

   - Add scheduled reporting and automated weekly executive summaries by email.
   - Enable multi-organization support (tenancy) if the product will be used by multiple customers.
   - Implement role and permission management UI for granular control.

3. Long term (9+ months)
   - Integrate with SIEM tools for real-time alert ingestion.
   - Add ML-assisted grouping of similar findings to reduce analyst workload.
   - Provide a customer-facing portal for external auditors or regulators to submit evidence.

## Where this lives in the product (practical)

- The product is a web application accessible in browsers.
- Dashboards and reports are available to authorized users after sign-in.
- PDF export provides an easy way to generate static reports for audits and compliance reviews.

## Callouts for stakeholders

- Decision: Do we want automated ticketing integration (Jira/ServiceNow) for every critical alert? This drives product complexity and integrations.
- Decision: Are we required to maintain long-term archival of evidence (attachments) for audit/compliance retention policies?
- Decision: Do we need multi-tenant isolation vs. role-based access for a single tenant?

---

If you'd like, I can:

- Tailor this to include flow diagrams or sample screen-by-screen journeys for a particular persona,
- Create an executive one-pager for board meetings, or
- Generate a product requirements document (PRD) for one of the roadmap items (for example, ticketing integration).

Which of these would help next?
