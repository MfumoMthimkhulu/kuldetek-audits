"use client";
import { orionFetch } from "@/lib/orion-fetch";
import React from "react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MdAnalytics, MdDownload } from "react-icons/md";
import { Edit, Save, Database, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";

function Report() {
  const supabase = createClient();
  const router = useRouter();
  const [audits, setAudits] = useState([]);
  const [auditId, setAuditId] = useState("");
  const [findings, setFindings] = useState([]);
  const [criteria, setCriteria] = useState("");
  const [objectives, setObjectives] = useState("");
  const [planInfo, setPlanInfo] = useState("");
  const [resources, setResources] = useState("");
  const [risks, setRisks] = useState();
  const [schedule, setSchedule] = useState("");
  const [scope, setScope] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableReport, setEditableReport] = useState(null);
  const [plan_id, setPlan_id] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [savedReportId, setSavedReportId] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "In Progress":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "scratch":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  useEffect(() => {
    const fetchAudits = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        toast.error("Failed to fetch audits.");
      } else {
        setAudits(data);
      }
    };

    fetchAudits();
  }, []);

  const handleAuditSelect = async (auditId) => {
    setAuditId(auditId);
    setPlan_id(null);
    setFindings([]);
    setReportResult(null);
    setEditableReport(null);
    setReportSaved(false);
    setSavedReportId(null);
    const { data: plan_data, error: plan_error } = await supabase
      .from("audit_plans")
      .select("id")
      .eq("audit_id", auditId);
    if (plan_error) {
      toast.error("Failed to load the audit plan.");
      return;
    }
    if (!plan_data?.length) {
      toast.info("Create an audit plan before generating a report.");
      return;
    }
    setPlan_id(plan_data[0].id);
    const { data, error } = await supabase
      .from("audit_tasks")
      .select("task, task_type, notes, findings, severity, recommendation")
      .eq("plan_id", plan_data[0].id);
    if (error) {
      console.log("error fetching finding info from tasks table", error);
    } else {
      setFindings(data);
      console.log("findings data: ", data);
      console.log(JSON.stringify(data, null, 2));
      console.log("findings state: ", findings);
    }
    const { data: criteria, error: criteria_error } = await supabase
      .from("audit_criteria")
      .select("criteria")
      .eq("plan_id", plan_data[0].id);
    if (criteria_error) {
      console.log("error fetching criteria for report", criteria_error);
    } else {
      setCriteria(criteria);
      console.log("criteria for report", criteria);
    }
    const { data: objectives, error: objectives_error } = await supabase
      .from("audit_objectives")
      .select("description")
      .eq("plan_id", plan_data[0].id);
    if (objectives_error) {
      console.log("error fetching objectives for report", objectives_error);
    } else {
      setObjectives(objectives);
      console.log("objectives for report", objectives);
    }
    const { data: planInfo, error: plan_info_error } = await supabase
      .from("audit_plans")
      .select("title,executive_summary,created_at,updated_at")
      .eq("id", plan_data[0].id);
    if (plan_info_error) {
      console.log("error fetching planInfo for report", plan_info_error);
    } else {
      setPlanInfo(planInfo);
      console.log("planInfo for report", planInfo);
    }
    const { data: resources, error: resource_error } = await supabase
      .from("audit_resources")
      .select("role,name,responsibility")
      .eq("plan_id", plan_data[0].id);
    if (resource_error) {
      console.log("error fetching resources for report", resource_error);
    } else {
      setResources(resources);
      console.log("resources for report", resources);
    }
    const { data: risks, error: risks_error } = await supabase
      .from("audit_risks")
      .select("area,rating,justification")
      .eq("plan_id", plan_data[0].id);
    if (risks_error) {
      console.log("error fetching risks for report", risks_error);
    } else {
      setRisks(risks);
      console.log("risks for report", risks);
    }
    const { data: schedule, error: schedule_error } = await supabase
      .from("audit_schedule")
      .select("activity,start_date,end_date")
      .eq("plan_id", plan_data[0].id);
    if (schedule_error) {
      console.log("error fetching schedule for report", schedule_error);
    } else {
      setSchedule(schedule);
      console.log("schedule for report", schedule);
    }
    const { data: scope, error: scope_error } = await supabase
      .from("audit_scope")
      .select("system,rating,justification")
      .eq("plan_id", plan_data[0].id);
    if (scope_error) {
      console.log("error fetching scope for report", scope_error);
    } else {
      setScope(scope);
      console.log("scope for report", schedule);
    }
  };

  const generateReport = async () => {
    if (!plan_id) return;
    setIsGenerating(true);
    setReportSaved(false); // Reset saved state
    setSavedReportId(null);

    try {
      const response = await orionFetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            findings,
            criteria,
            objectives,
            planInfo,
            resources,
            risks,
            schedule,
            scope,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const result = await response.json();
      setReportResult(result.result);
      setEditableReport(result.result); // Initialize editable state
      if (result?.result?.raw) {
        toast.info("Received unstructured AI response; showing raw preview");
      } else {
        toast.success("Report generated");
      }
    } catch (error) {
      console.error("Error analyzing data:", error);
    }

    setIsGenerating(false);
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      // Enter edit mode - initialize editable report if not already done
      if (!editableReport) {
        setEditableReport({ ...reportResult });
      }
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = () => {
    // Save the edited content back to reportResult
    setReportResult({ ...editableReport });
    setIsEditing(false);
    toast.success("Changes saved successfully");
  };

  const handleEditChange = (field, value) => {
    setEditableReport((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveReportToDatabase = async () => {
    if (!reportResult || !plan_id) {
      toast.error("No report to save or missing plan information");
      return;
    }

    setIsSaving(true);

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("Authentication required to save report");
        return;
      }

      // Prepare the report data
      const reportData = {
        plan_id: plan_id,
        title:
          reportResult.reportTitle ||
          `Audit Report - ${new Date().toLocaleDateString()}`,
        audit_scope: reportResult.auditScope || "Not specified",
        summary: reportResult.summary || "Not specified",
        findings: reportResult.findings || [],
        recommendations: reportResult.recommendations || [],
        conclusion: reportResult.conclusion || "Not specified",
        generated_at: new Date().toISOString(),
        generated_by: user.id,
      };

      // Insert the report into the database
      const { data, error } = await supabase
        .from("audit_reports")
        .insert([reportData])
        .select()
        .single();

      if (error) {
        console.error("Error saving report:", error);
        toast.error("Failed to save report to database");
        return;
      }

      // Update state to reflect successful save
      setReportSaved(true);
      setSavedReportId(data.id);
      toast.success("Report saved successfully to database");
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("An error occurred while saving the report");
    } finally {
      setIsSaving(false);
    }
  };

  // PDF Generation Function
  const generateReportPDF = (report = reportResult) => {
    if (!report) {
      toast.error("No report data to export.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Helper function to add professional header to each page
    const addPageHeader = () => {
      // Professional Header Design
      // Header background
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 45, "F");

      // Accent line
      doc.setFillColor(22, 211, 238); // cyan-500
      doc.rect(0, 40, pageWidth, 5, "F");

      // Company Logo Area
      doc.setTextColor(22, 211, 238); // cyan-500
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("KULDETEK AUDITING", margin, 18);

      // Main Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      const cleanTitle = cleanText(
        report.reportTitle || "Comprehensive Audit Report"
      );
      doc.text(cleanTitle, margin, 32);

      return 60; // Return starting Y position after header
    };

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace = 20) => {
      if (yPosition + requiredSpace > pageHeight - 40) {
        // Account for footer space
        doc.addPage();
        yPosition = addPageHeader(); // Add header to new page
        return true;
      }
      return false;
    };

    // Helper function to clean text and remove problematic characters
    const cleanText = (text) => {
      if (!text) return "";

      return text
        .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // Misc symbols
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Transport symbols
        .replace(/[\u{2600}-\u{26FF}]/gu, "") // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, "") // Dingbats
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, "") // Supplemental symbols
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "") // Flags
        .replace(/[\u00A0-\u9999]/g, (match) => {
          const code = match.charCodeAt(0);
          if (code > 127) return "";
          return match;
        })
        .replace(/[^\x20-\x7E\n\r\t]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Helper function to add text with proper wrapping and cleaning
    const addWrappedText = (
      text,
      x,
      y,
      maxWidth,
      fontSize = 11,
      fontStyle = "normal"
    ) => {
      const cleanedText = cleanText(text);
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      const lines = doc.splitTextToSize(cleanedText, maxWidth);

      let currentY = y;
      lines.forEach((line, index) => {
        if (index > 0) {
          const wasNewPage = checkNewPage();
          if (wasNewPage) {
            currentY = yPosition;
          }
        }
        doc.text(line, x, currentY + index * (fontSize * 0.4));
      });

      return currentY + lines.length * (fontSize * 0.4);
    };

    // Add header to first page and set initial position
    yPosition = addPageHeader();

    // Subtitle and Date Section (only on first page)
    if (doc.getNumberOfPages() === 1) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(0, yPosition, pageWidth, 25, "F");

      // Document Info
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("CONFIDENTIAL AUDIT REPORT", margin, yPosition + 8);

      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFontSize(10);
      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })} | ${new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        margin,
        yPosition + 18
      );

      // Document ID
      doc.text(
        `Document ID: ORN-AUDIT-${new Date().getFullYear()}${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}`,
        pageWidth - margin - 80,
        yPosition + 18
      );

      yPosition += 35;
    }

    // Raw content handling (if available)
    if (report.raw) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(55, 65, 81);
      doc.text("Report Content", margin, yPosition);
      yPosition += 15;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.3);

      const rawLines = doc.splitTextToSize(
        cleanText(report.raw),
        contentWidth - 20
      );
      const rawHeight = Math.max(30, rawLines.length * 5 + 15);

      doc.rect(margin, yPosition, contentWidth, rawHeight, "FD");

      doc.setTextColor(75, 85, 99);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      yPosition = addWrappedText(
        report.raw,
        margin + 10,
        yPosition + 8,
        contentWidth - 20,
        11
      );
      yPosition += 20;
    } else {
      // Structured report content

      // Audit Scope
      if (report.auditScope) {
        checkNewPage(60);

        // Professional Section Header
        doc.setFillColor(71, 85, 105); // slate-600
        doc.rect(margin - 8, yPosition - 8, contentWidth + 16, 25, "F");

        // Section number circle
        doc.setFillColor(22, 211, 238); // cyan-500
        doc.circle(margin + 8, yPosition + 4, 6, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("1", margin + 6, yPosition + 7);

        // Section title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("AUDIT SCOPE", margin + 20, yPosition + 7);
        yPosition += 30;

        // Left accent border
        doc.setFillColor(22, 211, 238); // cyan-500
        doc.rect(margin, yPosition, 3, 40, "F");

        // Main content area
        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);

        // Calculate content height for box
        const scopeLines = doc.splitTextToSize(
          cleanText(report.auditScope),
          contentWidth - 30
        );
        const scopeHeight = Math.max(40, scopeLines.length * 6 + 20);

        doc.rect(margin + 3, yPosition, contentWidth - 3, scopeHeight, "FD");
        yPosition += 12;

        doc.setTextColor(51, 65, 85); // slate-700
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "normal");
        yPosition = addWrappedText(
          report.auditScope,
          margin + 15,
          yPosition,
          contentWidth - 30,
          10.5
        );
        yPosition += 25;
      }

      // Summary
      if (report.summary) {
        checkNewPage(60);

        // Add separator line
        doc.setDrawColor(229, 231, 235); // gray-200
        doc.setLineWidth(0.5);
        doc.line(margin, yPosition - 10, pageWidth - margin, yPosition - 10);
        yPosition += 5;

        // Professional Section Header
        doc.setFillColor(71, 85, 105); // slate-600
        doc.rect(margin - 8, yPosition - 8, contentWidth + 16, 25, "F");

        // Section number circle
        doc.setFillColor(22, 211, 238); // cyan-500
        doc.circle(margin + 8, yPosition + 4, 6, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("2", margin + 6, yPosition + 7);

        // Section title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("EXECUTIVE SUMMARY", margin + 20, yPosition + 7);
        yPosition += 30;

        // Left accent border
        doc.setFillColor(22, 211, 238); // cyan-500
        doc.rect(margin, yPosition, 3, 40, "F");

        // Main content area
        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);

        // Calculate content height for box
        const summaryLines = doc.splitTextToSize(
          cleanText(report.summary),
          contentWidth - 30
        );
        const summaryHeight = Math.max(40, summaryLines.length * 6 + 20);

        doc.rect(margin + 3, yPosition, contentWidth - 3, summaryHeight, "FD");
        yPosition += 12;

        doc.setTextColor(51, 65, 85); // slate-700
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "normal");
        yPosition = addWrappedText(
          report.summary,
          margin + 15,
          yPosition,
          contentWidth - 30,
          10.5
        );
        yPosition += 25;
      }

      // Findings
      if (report.findings && report.findings.length > 0) {
        checkNewPage(60);

        // Add separator line
        doc.setDrawColor(229, 231, 235); // gray-200
        doc.setLineWidth(0.5);
        doc.line(margin, yPosition - 10, pageWidth - margin, yPosition - 10);
        yPosition += 5;

        // Professional Section Header
        doc.setFillColor(71, 85, 105); // slate-600
        doc.rect(margin - 8, yPosition - 8, contentWidth + 16, 25, "F");

        // Section number circle
        doc.setFillColor(22, 211, 238); // cyan-500
        doc.circle(margin + 8, yPosition + 4, 6, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("3", margin + 6, yPosition + 7);

        // Section title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("FINDINGS", margin + 20, yPosition + 7);
        yPosition += 30;

        report.findings.forEach((finding, index) => {
          checkNewPage(60);

          // Add separator line between findings
          if (index > 0) {
            doc.setDrawColor(229, 231, 235); // gray-200
            doc.setLineWidth(0.5);
            doc.line(
              margin,
              yPosition - 10,
              pageWidth - margin,
              yPosition - 10
            );
            yPosition += 5;
          }

          // Professional Finding Header
          doc.setFillColor(71, 85, 105); // slate-600
          doc.rect(margin - 8, yPosition - 8, contentWidth + 16, 25, "F");

          // Finding number circle
          doc.setFillColor(22, 211, 238); // cyan-500
          doc.circle(margin + 8, yPosition + 4, 6, "F");

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`F${index + 1}`, margin + 5, yPosition + 7);

          // Finding title
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          const findingTitle =
            finding.title || `FINDING ${finding.id || index + 1}`;
          doc.text(findingTitle.toUpperCase(), margin + 20, yPosition + 7);
          yPosition += 30;

          // Professional Content Box
          checkNewPage(40);

          // Left accent border
          doc.setFillColor(22, 211, 238); // cyan-500
          doc.rect(margin, yPosition, 3, 40, "F");

          // Main content area
          doc.setFillColor(248, 250, 252); // slate-50
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.setLineWidth(0.5);

          // Calculate content height for box
          const contentLines = finding.description
            ? doc.splitTextToSize(
                cleanText(finding.description),
                contentWidth - 30
              )
            : [];
          const contentHeight = Math.max(40, contentLines.length * 6 + 20);

          doc.rect(
            margin + 3,
            yPosition,
            contentWidth - 3,
            contentHeight,
            "FD"
          );
          yPosition += 12;

          // Professional Content Text
          if (finding.description) {
            doc.setTextColor(51, 65, 85); // slate-700
            doc.setFontSize(10.5);
            doc.setFont("helvetica", "normal");
            // Split content into lines and process each line
            const descLines = finding.description.split("\n");
            for (const line of descLines) {
              checkNewPage();
              yPosition = addWrappedText(
                line,
                margin + 15,
                yPosition,
                contentWidth - 30,
                10.5
              );
            }
          }
          yPosition += 25;
        });
      }

      // Recommendations
      if (report.recommendations && report.recommendations.length > 0) {
        checkNewPage(60);

        // Add separator line
        doc.setDrawColor(229, 231, 235); // gray-200
        doc.setLineWidth(0.5);
        doc.line(margin, yPosition - 10, pageWidth - margin, yPosition - 10);
        yPosition += 5;

        // Professional Section Header
        doc.setFillColor(71, 85, 105); // slate-600
        doc.rect(margin - 8, yPosition - 8, contentWidth + 16, 25, "F");

        // Section number circle
        doc.setFillColor(22, 211, 238); // cyan-500
        doc.circle(margin + 8, yPosition + 4, 6, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("4", margin + 6, yPosition + 7);

        // Section title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("RECOMMENDATIONS", margin + 20, yPosition + 7);
        yPosition += 30;

        report.recommendations.forEach((rec, index) => {
          checkNewPage(60);

          // Add separator line between recommendations
          if (index > 0) {
            doc.setDrawColor(229, 231, 235); // gray-200
            doc.setLineWidth(0.5);
            doc.line(
              margin,
              yPosition - 10,
              pageWidth - margin,
              yPosition - 10
            );
            yPosition += 5;
          }

          // Professional Recommendation Header
          doc.setFillColor(71, 85, 105); // slate-600
          doc.rect(margin - 8, yPosition - 8, contentWidth + 16, 25, "F");

          // Recommendation number circle
          doc.setFillColor(22, 211, 238); // cyan-500
          doc.circle(margin + 8, yPosition + 4, 6, "F");

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`R${index + 1}`, margin + 5, yPosition + 7);

          // Recommendation title
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.text(
            `RECOMMENDATION ${rec.findingId || index + 1}`,
            margin + 20,
            yPosition + 7
          );
          yPosition += 30;

          // Professional Content Box
          checkNewPage(40);

          // Left accent border
          doc.setFillColor(22, 211, 238); // cyan-500
          doc.rect(margin, yPosition, 3, 40, "F");

          // Main content area
          doc.setFillColor(248, 250, 252); // slate-50
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.setLineWidth(0.5);

          // Calculate content height for box
          const recContentLines = rec.recommendation
            ? doc.splitTextToSize(
                cleanText(rec.recommendation),
                contentWidth - 30
              )
            : [];
          const recContentHeight = Math.max(
            40,
            recContentLines.length * 6 + 20
          );

          doc.rect(
            margin + 3,
            yPosition,
            contentWidth - 3,
            recContentHeight,
            "FD"
          );
          yPosition += 12;

          // Professional Content Text
          if (rec.recommendation) {
            doc.setTextColor(51, 65, 85); // slate-700
            doc.setFontSize(10.5);
            doc.setFont("helvetica", "normal");
            // Split content into lines and process each line
            const recLines = rec.recommendation.split("\n");
            for (const line of recLines) {
              checkNewPage();
              yPosition = addWrappedText(
                line,
                margin + 15,
                yPosition,
                contentWidth - 30,
                10.5
              );
            }
          }
          yPosition += 25;
        });
      }

      // Conclusion
      if (report.conclusion) {
        checkNewPage(60);

        // Add separator line
        doc.setDrawColor(229, 231, 235); // gray-200
        doc.setLineWidth(0.5);
        doc.line(margin, yPosition - 10, pageWidth - margin, yPosition - 10);
        yPosition += 5;

        // Professional Section Header
        doc.setFillColor(71, 85, 105); // slate-600
        doc.rect(margin - 8, yPosition - 8, contentWidth + 16, 25, "F");

        // Section number circle
        doc.setFillColor(22, 211, 238); // cyan-500
        doc.circle(margin + 8, yPosition + 4, 6, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("5", margin + 6, yPosition + 7);

        // Section title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("CONCLUSION", margin + 20, yPosition + 7);
        yPosition += 30;

        // Professional Content Box
        checkNewPage(40);

        // Left accent border
        doc.setFillColor(22, 211, 238); // cyan-500
        doc.rect(margin, yPosition, 3, 40, "F");

        // Main content area
        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);

        // Calculate content height for box
        const conclusionContentLines = doc.splitTextToSize(
          cleanText(report.conclusion),
          contentWidth - 30
        );
        const conclusionContentHeight = Math.max(
          40,
          conclusionContentLines.length * 6 + 20
        );

        doc.rect(
          margin + 3,
          yPosition,
          contentWidth - 3,
          conclusionContentHeight,
          "FD"
        );
        yPosition += 12;

        // Professional Content Text
        doc.setTextColor(51, 65, 85); // slate-700
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "normal");
        yPosition = addWrappedText(
          report.conclusion,
          margin + 15,
          yPosition,
          contentWidth - 30,
          10.5
        );
        yPosition += 25;
      }
    }

    // Professional Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Footer background
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(0, pageHeight - 20, pageWidth, 20, "F");

      // Footer line
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.5);
      doc.line(0, pageHeight - 20, pageWidth, pageHeight - 20);

      // Company info
      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("KULDETEK AUDITING", margin, pageHeight - 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(
        "Confidential Audit Report | Professional Assessment Services",
        margin,
        pageHeight - 6
      );

      // Page numbering
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`${i} / ${totalPages}`, pageWidth - margin - 15, pageHeight - 9);

      // Document classification
      doc.setTextColor(220, 38, 127); // pink-600
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("CONFIDENTIAL", pageWidth - margin - 35, pageHeight - 6);
    }

    // Save the PDF
    const fileName = `Audit-Report-${cleanText(
      report.reportTitle || "Report"
    )}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF exported successfully!");
  };

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="header">
          <div>
            <h2 className="header-title">Audit Report Generation</h2>
            <p className="header-subtitle">
              Select an audit to generate a report for
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/reports/saved")}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <FileText className="w-4 h-4 mr-2" />
            View Saved Reports
          </Button>
        </div>
        <div className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <MdAnalytics className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Select Audit for Report generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Select value={auditId} onValueChange={handleAuditSelect}>
                  <SelectTrigger className="w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Choose an audit to generate report for...">
                      {auditId &&
                        audits.find((audit) => audit.id === auditId)?.title}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-96">
                    {audits.map((audit) => (
                      <SelectItem
                        key={audit.id}
                        value={audit.id}
                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 cursor-pointer mb-2 last:mb-0"
                      >
                        <div className="flex flex-col space-y-2 py-3">
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {audit.title}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
                            <span>Category: {audit.category}</span>
                            <span>Date: {audit.date}</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Auditor: {audit.auditor}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Audit Details */}
              {auditId && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Selected Audit Details
                  </h3>
                  {(() => {
                    const selectedAudit = audits.find(
                      (audit) => audit.id === auditId
                    );
                    if (!selectedAudit) return null;

                    return (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">
                              Title:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {selectedAudit.title}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">
                              Category:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {selectedAudit.category}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">
                              Date:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {selectedAudit.date}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">
                              Status:
                            </span>
                            <Badge
                              className={getStatusColor(selectedAudit.status)}
                            >
                              {selectedAudit.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">
                              Auditor:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {selectedAudit.auditor}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {/* Actions */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={generateReport}
                  disabled={!plan_id || isGenerating}
                  className={
                    `inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ` +
                    `transition-colors ` +
                    `${
                      !auditId || isGenerating
                        ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                        : "bg-cyan-600 hover:bg-cyan-500 text-white"
                    }`
                  }
                >
                  {isGenerating && (
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                  )}
                  {isGenerating ? "Generating..." : "Generate Report"}
                </button>
              </div>

              {/* Report Preview moved below as separate card(s) */}
            </CardContent>
          </Card>
          {reportResult && (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Report Preview</span>
                    {reportSaved && (
                      <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded border border-green-600/30">
                        Saved (ID: {savedReportId})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {reportResult.reportTitle && (
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-normal">
                        {reportResult.reportTitle}
                      </span>
                    )}
                    <div className="flex gap-2">
                      {!reportSaved && (
                        <Button
                          onClick={saveReportToDatabase}
                          disabled={isSaving || !reportResult}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-500 text-white"
                        >
                          <Database className="w-4 h-4 mr-1" />
                          {isSaving ? "Saving..." : "Save Report"}
                        </Button>
                      )}
                      <Button
                        onClick={() => generateReportPDF()}
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-700 text-white"
                      >
                        <MdDownload className="w-4 h-4 mr-1" />
                        Download PDF
                      </Button>
                      {isEditing ? (
                        <Button
                          onClick={handleSaveChanges}
                          size="sm"
                          className="bg-green-600 hover:bg-green-500 text-white"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                      ) : (
                        <Button
                          onClick={handleEditToggle}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {(isEditing ? editableReport?.raw : reportResult.raw) ? (
                  isEditing ? (
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        Raw Content:
                      </label>
                      <Textarea
                        value={editableReport?.raw || ""}
                        onChange={(e) =>
                          handleEditChange("raw", e.target.value)
                        }
                        className="min-h-[200px] text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200 font-mono"
                        placeholder="Raw report content..."
                      />
                    </div>
                  ) : (
                    <pre className="text-sm text-gray-900 dark:text-gray-200 whitespace-pre-wrap bg-white dark:bg-gray-900 p-3 rounded border border-gray-300 dark:border-gray-600 overflow-auto">
                      {reportResult.raw}
                    </pre>
                  )
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {(isEditing
                      ? editableReport?.auditScope
                      : reportResult.auditScope) && (
                      <div>
                        <span className="text-gray-700 dark:text-gray-300">
                          Audit Scope:
                        </span>
                        {isEditing ? (
                          <Textarea
                            value={editableReport?.auditScope || ""}
                            onChange={(e) =>
                              handleEditChange("auditScope", e.target.value)
                            }
                            className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
                            placeholder="Audit scope..."
                          />
                        ) : (
                          <p className="text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">
                            {reportResult.auditScope}
                          </p>
                        )}
                      </div>
                    )}
                    {(isEditing
                      ? editableReport?.summary
                      : reportResult.summary) && (
                      <div>
                        <span className="text-gray-700 dark:text-gray-300">
                          Summary:
                        </span>
                        {isEditing ? (
                          <Textarea
                            value={editableReport?.summary || ""}
                            onChange={(e) =>
                              handleEditChange("summary", e.target.value)
                            }
                            className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
                            placeholder="Summary..."
                          />
                        ) : (
                          <p className="text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">
                            {reportResult.summary}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!(isEditing ? editableReport?.raw : reportResult.raw) &&
                  Array.isArray(
                    isEditing ? editableReport?.findings : reportResult.findings
                  ) &&
                  (isEditing ? editableReport?.findings : reportResult.findings)
                    .length > 0 && (
                    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                        Findings
                      </h4>
                      <div className="divide-y divide-[#334155]">
                        {(isEditing
                          ? editableReport?.findings
                          : reportResult.findings
                        ).map((f, idx) => (
                          <div
                            key={idx}
                            className="py-3 grid grid-cols-1 md:grid-cols-6 gap-3"
                          >
                            <div className="md:col-span-1 text-gray-700 dark:text-gray-300 text-sm">
                              {isEditing ? (
                                <Textarea
                                  value={f.id || ""}
                                  onChange={(e) => {
                                    const newFindings = [
                                      ...editableReport.findings,
                                    ];
                                    newFindings[idx] = {
                                      ...f,
                                      id: e.target.value,
                                    };
                                    handleEditChange("findings", newFindings);
                                  }}
                                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300 text-sm min-h-[60px]"
                                  placeholder="Finding ID..."
                                />
                              ) : (
                                f.id
                              )}
                            </div>
                            <div className="md:col-span-2">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={f.title || ""}
                                    onChange={(e) => {
                                      const newFindings = [
                                        ...editableReport.findings,
                                      ];
                                      newFindings[idx] = {
                                        ...f,
                                        title: e.target.value,
                                      };
                                      handleEditChange("findings", newFindings);
                                    }}
                                    className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium text-sm"
                                    placeholder="Finding title..."
                                  />
                                  <Textarea
                                    value={f.description || ""}
                                    onChange={(e) => {
                                      const newFindings = [
                                        ...editableReport.findings,
                                      ];
                                      newFindings[idx] = {
                                        ...f,
                                        description: e.target.value,
                                      };
                                      handleEditChange("findings", newFindings);
                                    }}
                                    className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300 text-sm"
                                    placeholder="Finding description..."
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="text-gray-900 dark:text-white font-medium">
                                    {f.title}
                                  </div>
                                  <div className="text-gray-700 dark:text-gray-300 text-sm mt-1 whitespace-pre-wrap">
                                    {f.description}
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="md:col-span-1">
                              {isEditing ? (
                                <Select
                                  value={f.severity || ""}
                                  onValueChange={(value) => {
                                    const newFindings = [
                                      ...editableReport.findings,
                                    ];
                                    newFindings[idx] = {
                                      ...f,
                                      severity: value,
                                    };
                                    handleEditChange("findings", newFindings);
                                  }}
                                >
                                  <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs">
                                    <SelectValue placeholder="Severity" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                                    <SelectItem
                                      value="High"
                                      className="text-red-300"
                                    >
                                      High
                                    </SelectItem>
                                    <SelectItem
                                      value="Medium"
                                      className="text-yellow-300"
                                    >
                                      Medium
                                    </SelectItem>
                                    <SelectItem
                                      value="Low"
                                      className="text-green-300"
                                    >
                                      Low
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span
                                  className={`px-2 py-1 text-xs rounded-md ${
                                    f.severity === "High"
                                      ? "bg-red-600/20 text-red-300 border border-red-700/40"
                                      : f.severity === "Medium"
                                      ? "bg-yellow-600/20 text-yellow-300 border border-yellow-700/40"
                                      : f.severity === "Low"
                                      ? "bg-green-600/20 text-green-300 border border-green-700/40"
                                      : "bg-gray-600/20 text-gray-300 border border-gray-700/40"
                                  }`}
                                >
                                  {f.severity}
                                </span>
                              )}
                            </div>
                            <div className="md:col-span-2 text-gray-700 dark:text-gray-300 text-sm">
                              {isEditing ? (
                                <Textarea
                                  value={f.evidence || ""}
                                  onChange={(e) => {
                                    const newFindings = [
                                      ...editableReport.findings,
                                    ];
                                    newFindings[idx] = {
                                      ...f,
                                      evidence: e.target.value,
                                    };
                                    handleEditChange("findings", newFindings);
                                  }}
                                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300 text-sm min-h-[60px]"
                                  placeholder="Evidence..."
                                />
                              ) : (
                                <div className="whitespace-pre-wrap">
                                  {f.evidence}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {!(isEditing ? editableReport?.raw : reportResult.raw) &&
                  Array.isArray(
                    isEditing
                      ? editableReport?.recommendations
                      : reportResult.recommendations
                  ) &&
                  (isEditing
                    ? editableReport?.recommendations
                    : reportResult.recommendations
                  ).length > 0 && (
                    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {(isEditing
                          ? editableReport?.recommendations
                          : reportResult.recommendations
                        ).map((r, idx) => (
                          <li key={idx} className="text-sm">
                            {isEditing ? (
                              <div className="space-y-2 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
                                <div className="flex items-center gap-2">
                                  <label className="text-gray-600 dark:text-gray-400 text-xs min-w-[80px]">
                                    Finding ID:
                                  </label>
                                  <Textarea
                                    value={r.findingId || ""}
                                    onChange={(e) => {
                                      const newRecommendations = [
                                        ...editableReport.recommendations,
                                      ];
                                      newRecommendations[idx] = {
                                        ...r,
                                        findingId: e.target.value,
                                      };
                                      handleEditChange(
                                        "recommendations",
                                        newRecommendations
                                      );
                                    }}
                                    className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300 text-sm min-h-[40px] flex-1"
                                    placeholder="Finding ID..."
                                  />
                                </div>
                                <div className="flex items-start gap-2">
                                  <label className="text-gray-600 dark:text-gray-400 text-xs min-w-[80px] mt-2">
                                    Recommendation:
                                  </label>
                                  <Textarea
                                    value={r.recommendation || ""}
                                    onChange={(e) => {
                                      const newRecommendations = [
                                        ...editableReport.recommendations,
                                      ];
                                      newRecommendations[idx] = {
                                        ...r,
                                        recommendation: e.target.value,
                                      };
                                      handleEditChange(
                                        "recommendations",
                                        newRecommendations
                                      );
                                    }}
                                    className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm min-h-[80px] flex-1"
                                    placeholder="Recommendation text..."
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-gray-600 dark:text-gray-400">
                                  Finding {r.findingId}:
                                </span>
                                <span className="text-gray-900 dark:text-white ml-2 whitespace-pre-wrap">
                                  {r.recommendation}
                                </span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {!(isEditing ? editableReport?.raw : reportResult.raw) &&
                  (isEditing
                    ? editableReport?.conclusion
                    : reportResult.conclusion) && (
                    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                        Conclusion
                      </h4>
                      {isEditing ? (
                        <Textarea
                          value={editableReport?.conclusion || ""}
                          onChange={(e) =>
                            handleEditChange("conclusion", e.target.value)
                          }
                          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
                          placeholder="Conclusion..."
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white text-sm whitespace-pre-wrap">
                          {reportResult.conclusion}
                        </p>
                      )}
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
export default Report;
