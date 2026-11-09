"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Download,
  FileText,
  Calendar,
  User,
  Tag,
  Target,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import AuditProgressStepper from "@/components/AuditProgressStepper";
import "../../Dashboard.css";
import { useRouter } from "next/navigation";

export default function AuditSummary() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const auditId = searchParams.get("id");
  const planId = searchParams.get("plan_id");
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

      const { error: updateError } = await supabase
        .from("audits")
        .update({ last_page: `/dashboard/audit-summary?id=${auditId}` })
        .eq("id", auditId);

      if (updateError) {
        console.error("Failed to update last_page:", updateError);
      }

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

      if (criteriaError)
        console.error("Error fetching criteria:", criteriaError);
      if (objectivesError)
        console.error("Error fetching objectives:", objectivesError);
      if (resourcesError)
        console.error("Error fetching resources:", resourcesError);
      if (risksError) console.error("Error fetching risks:", risksError);
      if (scheduleError)
        console.error("Error fetching schedule:", scheduleError);
      if (scopeError) console.error("Error fetching scope:", scopeError);
      if (tasksError) console.error("Error fetching tasks:", tasksError);

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

  const [generatingPDF, setGeneratingPDF] = useState(false);

  function generatePDF() {
    if (!summaryRef.current) return;

    setGeneratingPDF(true);

    // Create a completely isolated container for PDF generation
    const tempContainer = document.createElement("div");
    tempContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 800px;
      background: white;
      color: black;
      font-family: Arial, sans-serif;
      padding: 20px;
      font-size: 14px;
      line-height: 1.5;
    `;

    // Create PDF content manually to avoid any CSS inheritance
    const createPDFContent = () => {
      const content = document.createElement("div");

      // Header
      const header = document.createElement("div");
      header.style.cssText =
        "margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;";

      const title = document.createElement("h1");
      title.textContent = audit?.title || "Audit Summary";
      title.style.cssText =
        "font-size: 24px; font-weight: bold; color: #111827; margin: 0 0 5px 0;";

      const subtitle = document.createElement("p");
      subtitle.textContent = "Complete overview of your audit plan and tasks";
      subtitle.style.cssText = "font-size: 14px; color: #6b7280; margin: 0;";

      header.appendChild(title);
      header.appendChild(subtitle);
      content.appendChild(header);

      // Audit Info
      if (audit) {
        const auditInfo = document.createElement("div");
        auditInfo.style.cssText =
          "background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;";

        const auditTitle = document.createElement("h2");
        auditTitle.textContent = "Audit Information";
        auditTitle.style.cssText =
          "font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 12px 0;";
        auditInfo.appendChild(auditTitle);

        const infoGrid = document.createElement("div");
        infoGrid.style.cssText =
          "display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;";

        const createInfoItem = (label, value, color = "#3b82f6") => {
          const item = document.createElement("div");
          item.style.cssText = "display: flex; align-items: center; gap: 8px;";

          const dot = document.createElement("div");
          dot.style.cssText = `width: 8px; height: 8px; background: ${color}; border-radius: 50%;`;

          const text = document.createElement("span");
          text.innerHTML = `<strong style="color: #6b7280;">${label}:</strong> ${value}`;
          text.style.cssText = "font-size: 13px; color: #374151;";

          item.appendChild(dot);
          item.appendChild(text);
          return item;
        };

        infoGrid.appendChild(
          createInfoItem("Category", audit.category, "#3b82f6")
        );
        infoGrid.appendChild(
          createInfoItem("Auditor", audit.auditor, "#10b981")
        );
        infoGrid.appendChild(createInfoItem("Date", audit.date, "#8b5cf6"));

        auditInfo.appendChild(infoGrid);
        content.appendChild(auditInfo);
      }

      // Executive Summary
      if (plan?.executive_summary) {
        const summarySection = document.createElement("div");
        summarySection.style.cssText =
          "background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 20px;";

        const summaryTitle = document.createElement("h2");
        summaryTitle.textContent = "Executive Summary";
        summaryTitle.style.cssText =
          "font-size: 18px; font-weight: 600; color: #1e40af; margin: 0 0 12px 0;";

        const summaryText = document.createElement("p");
        summaryText.textContent = plan.executive_summary;
        summaryText.style.cssText =
          "font-size: 14px; color: #1d4ed8; line-height: 1.6; margin: 0;";

        summarySection.appendChild(summaryTitle);
        summarySection.appendChild(summaryText);
        content.appendChild(summarySection);
      }

      // Objectives
      if (objectives.length > 0) {
        const objectivesSection = document.createElement("div");
        objectivesSection.style.cssText =
          "background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;";

        const objectivesTitle = document.createElement("h2");
        objectivesTitle.textContent = "Objectives";
        objectivesTitle.style.cssText =
          "font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 12px 0;";
        objectivesSection.appendChild(objectivesTitle);

        objectives.forEach((obj, index) => {
          const item = document.createElement("div");
          item.style.cssText =
            "display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; padding: 12px; background: #f9fafb; border-radius: 6px;";

          const number = document.createElement("div");
          number.textContent = (index + 1).toString();
          number.style.cssText =
            "width: 24px; height: 24px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0;";

          const text = document.createElement("p");
          text.textContent = obj.description;
          text.style.cssText =
            "font-size: 14px; color: #374151; margin: 0; line-height: 1.5;";

          item.appendChild(number);
          item.appendChild(text);
          objectivesSection.appendChild(item);
        });

        content.appendChild(objectivesSection);
      }

      // Criteria
      if (criteria.length > 0) {
        const criteriaSection = document.createElement("div");
        criteriaSection.style.cssText =
          "background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;";

        const criteriaTitle = document.createElement("h2");
        criteriaTitle.textContent = "Audit Criteria";
        criteriaTitle.style.cssText =
          "font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 12px 0;";
        criteriaSection.appendChild(criteriaTitle);

        criteria.forEach((c, index) => {
          const item = document.createElement("div");
          item.style.cssText =
            "display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; padding: 12px; background: #f9fafb; border-radius: 6px;";

          const number = document.createElement("div");
          number.textContent = (index + 1).toString();
          number.style.cssText =
            "width: 24px; height: 24px; background: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0;";

          const text = document.createElement("p");
          text.textContent = c.criteria;
          text.style.cssText =
            "font-size: 14px; color: #374151; margin: 0; line-height: 1.5;";

          item.appendChild(number);
          item.appendChild(text);
          criteriaSection.appendChild(item);
        });

        content.appendChild(criteriaSection);
      }

      // Resources
      if (resources.length > 0) {
        const resourcesSection = document.createElement("div");
        resourcesSection.style.cssText =
          "background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;";

        const resourcesTitle = document.createElement("h2");
        resourcesTitle.textContent = "Resources & Responsibilities";
        resourcesTitle.style.cssText =
          "font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 12px 0;";
        resourcesSection.appendChild(resourcesTitle);

        const resourcesGrid = document.createElement("div");
        resourcesGrid.style.cssText =
          "display: grid; grid-template-columns: 1fr 1fr; gap: 12px;";

        resources.forEach((r) => {
          const item = document.createElement("div");
          item.style.cssText =
            "padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;";

          const role = document.createElement("div");
          role.textContent = r.role;
          role.style.cssText =
            "font-weight: 600; color: #9333ea; margin-bottom: 8px; font-size: 14px;";

          const name = document.createElement("p");
          name.innerHTML = `<strong style="color: #6b7280;">Name:</strong> ${r.name}`;
          name.style.cssText =
            "font-size: 13px; color: #374151; margin: 0 0 4px 0;";

          const responsibility = document.createElement("p");
          responsibility.innerHTML = `<strong style="color: #6b7280;">Responsibility:</strong> ${r.responsibility}`;
          responsibility.style.cssText =
            "font-size: 13px; color: #374151; margin: 0;";

          item.appendChild(role);
          item.appendChild(name);
          item.appendChild(responsibility);
          resourcesGrid.appendChild(item);
        });

        resourcesSection.appendChild(resourcesGrid);
        content.appendChild(resourcesSection);
      }

      // Risks
      if (risks.length > 0) {
        const risksSection = document.createElement("div");
        risksSection.style.cssText =
          "background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;";

        const risksTitle = document.createElement("h2");
        risksTitle.textContent = "Risk Assessment";
        risksTitle.style.cssText =
          "font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 12px 0;";
        risksSection.appendChild(risksTitle);

        risks.forEach((r) => {
          const item = document.createElement("div");
          item.style.cssText =
            "padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; margin-bottom: 8px;";

          const header = document.createElement("div");
          header.style.cssText =
            "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;";

          const area = document.createElement("h3");
          area.textContent = r.area;
          area.style.cssText =
            "font-size: 14px; font-weight: 600; color: #991b1b; margin: 0;";

          const rating = document.createElement("span");
          rating.textContent = r.rating;
          rating.style.cssText =
            "padding: 2px 8px; background: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 600; border-radius: 4px;";

          header.appendChild(area);
          header.appendChild(rating);

          const justification = document.createElement("p");
          justification.innerHTML = `<strong style="color: #991b1b;">Justification:</strong> ${r.justification}`;
          justification.style.cssText =
            "font-size: 13px; color: #b91c1c; margin: 0;";

          item.appendChild(header);
          item.appendChild(justification);
          risksSection.appendChild(item);
        });

        content.appendChild(risksSection);
      }

      // Tasks
      if (tasks.length > 0) {
        const tasksSection = document.createElement("div");
        tasksSection.style.cssText =
          "background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;";

        const tasksTitle = document.createElement("h2");
        tasksTitle.textContent = "Audit Tasks";
        tasksTitle.style.cssText =
          "font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 12px 0;";
        tasksSection.appendChild(tasksTitle);

        tasks.forEach((t, index) => {
          const item = document.createElement("div");
          item.style.cssText =
            "padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px;";

          const header = document.createElement("div");
          header.style.cssText =
            "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;";

          const left = document.createElement("div");
          left.style.cssText = "display: flex; align-items: center; gap: 8px;";

          const number = document.createElement("div");
          number.textContent = (index + 1).toString();
          number.style.cssText =
            "width: 24px; height: 24px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;";

          const taskName = document.createElement("h3");
          taskName.textContent = t.task;
          taskName.style.cssText =
            "font-size: 14px; font-weight: 600; color: #111827; margin: 0;";

          left.appendChild(number);
          left.appendChild(taskName);

          const date = document.createElement("span");
          date.textContent = t.date;
          date.style.cssText =
            "padding: 2px 8px; background: #f3f4f6; color: #374151; font-size: 11px; font-weight: 600; border-radius: 4px;";

          header.appendChild(left);
          header.appendChild(date);

          const details = document.createElement("div");
          details.style.cssText =
            "display: grid; grid-template-columns: 1fr 1fr; gap: 12px;";

          const goal = document.createElement("div");
          goal.innerHTML = `<strong style="color: #6b7280;">Goal:</strong><br><span style="color: #374151; font-size: 13px;">${t.goal}</span>`;

          const control = document.createElement("div");
          control.innerHTML = `<strong style="color: #6b7280;">Control:</strong><br><span style="color: #374151; font-size: 13px;">${t.control}</span>`;

          details.appendChild(goal);
          details.appendChild(control);

          item.appendChild(header);
          item.appendChild(details);
          tasksSection.appendChild(item);
        });

        content.appendChild(tasksSection);
      }

      return content;
    };

    const pdfContent = createPDFContent();
    tempContainer.appendChild(pdfContent);
    document.body.appendChild(tempContainer);

    // Function to generate PDF with multiple pages
    const generateMultiPagePDF = async () => {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      // Render the entire tempContainer to a single high-res canvas,
      // then slice that canvas vertically into page-sized images.
      try {
        const scale = 2; // capture at higher resolution for better quality
        const fullCanvas = await html2canvas(tempContainer, {
          scale,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          allowTaint: true,
        });

        const totalHeightPx = fullCanvas.height;
        const totalWidthPx = fullCanvas.width;

        // pixels per mm at scale 1 ~= 3.779527559
        const pixelsPerMm = 3.779527559 * scale;
        const pageHeightPx = Math.floor(contentHeight * pixelsPerMm);

        const pageCount = Math.ceil(totalHeightPx / pageHeightPx);

        for (let page = 0; page < pageCount; page++) {
          if (page > 0) pdf.addPage();

          const y = page * pageHeightPx;
          const sliceHeight = Math.min(pageHeightPx, totalHeightPx - y);

          const canvasPage = document.createElement("canvas");
          canvasPage.width = totalWidthPx;
          canvasPage.height = sliceHeight;
          const ctx = canvasPage.getContext("2d");
          // white background
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvasPage.width, canvasPage.height);
          ctx.drawImage(
            fullCanvas,
            0,
            y,
            totalWidthPx,
            sliceHeight,
            0,
            0,
            totalWidthPx,
            sliceHeight
          );

          const imgData = canvasPage.toDataURL("image/png");
          const imgProps = pdf.getImageProperties(imgData);
          const imgWidthMm = contentWidth;
          const imgHeightMm = (imgProps.height * imgWidthMm) / imgProps.width;

          pdf.addImage(imgData, "PNG", margin, margin, imgWidthMm, imgHeightMm);
        }

        pdf.save(`${audit?.title || "audit-summary"}.pdf`);
      } catch (err) {
        console.error("PDF generation error (full-canvas):", err);
      }
    };

    generateMultiPagePDF()
      .then(() => {
        // Clean up
        document.body.removeChild(tempContainer);
        setGeneratingPDF(false);
      })
      .catch((err) => {
        console.error("PDF generation error:", err);
        // Clean up on error
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
        setGeneratingPDF(false);
      });
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="loading">Loading summary...</div>
        </main>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="text-center">Audit not found.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h2 className="header-title">Audit Summary</h2>
            <p className="header-subtitle">
              Complete overview of your audit plan and tasks
            </p>
          </div>
          <div className="flex items-center gap-4 p-2">
            <Button
              onClick={generatePDF}
              disabled={generatingPDF}
              className="btn-primary"
            >
              {generatingPDF ? (
                "Generating..."
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
            <Button
              onClick={() =>
                router.push(
                  `/dashboard/audit-fieldwork?id=${auditId}&plan_id=${planId}`
                )
              }
              disabled={generatingPDF}
              className="btn-primary"
            >
              Begin Fieldwork
            </Button>
          </div>
        </div>

        <AuditProgressStepper
          currentStep="audit-summary"
          auditId={auditId}
          planId={planId}
        />

        <div ref={summaryRef} className="space-y-6">
          {/* Audit Header */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {audit.title}
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">Category:</span>
                  <span className="font-medium">{audit.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-400">Auditor:</span>
                  <span className="font-medium">{audit.auditor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-400">Date:</span>
                  <span className="font-medium">{audit.date}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          {plan && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-header-title flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Audit Plan: {plan.title}
                </h3>
              </div>
              <div className="p-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Executive Summary
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300">
                    {plan.executive_summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Objectives */}
          {objectives.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-header-title flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Objectives
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {objectives.map((obj, index) => (
                    <div
                      key={obj.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">
                        {obj.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Criteria */}
          {criteria.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-header-title flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Audit Criteria
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {criteria.map((c, index) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">
                        {c.criteria}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Resources */}
          {resources.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-header-title flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Resources & Responsibilities
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resources.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {r.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <strong>Name:</strong> {r.name}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Responsibility:</strong> {r.responsibility}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Risks */}
          {risks.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-header-title flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Risk Assessment
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {risks.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-red-800 dark:text-red-200">
                          {r.area}
                        </h4>
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs font-medium rounded">
                          {r.rating}
                        </span>
                      </div>
                      <p className="text-red-700 dark:text-red-300 text-sm">
                        <strong>Justification:</strong> {r.justification}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scope */}
          {scope.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-header-title flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Audit Scope
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {scope.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                          {s.system}
                        </h4>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                          {s.rating}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        <strong>Justification:</strong> {s.justification}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Schedule */}
          {schedule.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-header-title flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Audit Schedule
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {schedule.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        {s.activity}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>
                          <strong>From:</strong> {s.start_date}
                        </span>
                        <span>
                          <strong>To:</strong> {s.end_date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-header-title flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Audit Tasks
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {tasks.map((t, index) => (
                    <div
                      key={t.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                            {t.task}
                          </h4>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded">
                          {t.date}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <strong className="text-gray-600 dark:text-gray-400">
                            Goal:
                          </strong>
                          <p className="text-gray-700 dark:text-gray-300 mt-1">
                            {t.goal}
                          </p>
                        </div>
                        <div>
                          <strong className="text-gray-600 dark:text-gray-400">
                            Control:
                          </strong>
                          <p className="text-gray-700 dark:text-gray-300 mt-1">
                            {t.control}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
