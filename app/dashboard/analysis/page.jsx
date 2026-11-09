"use client";
import { orionFetch } from "@/lib/orion-fetch";
import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MdAnalytics,
  MdAssessment,
  MdWarning,
  MdInfo,
  MdCheckCircle,
  MdHistory,
  MdEdit,
  MdDelete,
  MdShare,
  MdVisibility,
} from "react-icons/md";
import AnalysisSharingModal from "@/components/AnalysisSharingModal";

export default function Analysis() {
  const supabase = createClient();
  const router = useRouter();
  const [audits, setAudits] = useState([]);
  const [auditId, setAuditId] = useState("");
  const [findings, setFindings] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState("");
  const [editedAnalysis, setEditedAnalysis] = useState(null);
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [analysisToShare, setAnalysisToShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [findingsLoading, setFindingsLoading] = useState(false);

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from("audits")
          .select("*")
          .order("date", { ascending: false });

        if (error) {
          toast.error("Failed to fetch audits.");
        } else {
          setAudits(data || []);
        }
      } catch (error) {
        console.error("Error fetching audits:", error);
        toast.error("Failed to load audits");
      } finally {
        setLoading(false);
      }
    };

    fetchAudits();
  }, []);

  useEffect(() => {
    if (analysis) {
      setEditedAnalysis([...analysis]); // Create a deep copy to avoid mutating original
    }
  }, [analysis]);

  const handleAnalysisEdit = (index, field, value) => {
    setEditedAnalysis((prev) => {
      const newAnalysis = [...prev];
      newAnalysis[index] = { ...newAnalysis[index], [field]: value };
      return newAnalysis;
    });
  };

  const saveEditedAnalysis = async () => {
    try {
      const { error } = await supabase.from("audit_analysis").upsert({
        audit_id: auditId,
        analysis_type: analysisType,
        results: editedAnalysis,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        toast.error("Failed to save edited analysis");
        console.error("Save error:", error);
      } else {
        toast.success("Analysis saved successfully");
      }
    } catch (error) {
      toast.error("Error saving analysis");
      console.error("Save error:", error);
    }
  };

  // Debug effect to monitor analysis state changes
  useEffect(() => {
    console.log("Analysis state changed:", analysis);
    if (analysis) {
      console.log("Analysis is now set with:", analysis);
      console.log(
        "Analysis length:",
        Array.isArray(analysis) ? analysis.length : "Not an array"
      );
    }
  }, [analysis]);

  const handleAuditSelect = async (auditId) => {
    console.log("handleAuditSelect called with auditId:", auditId);
    setAuditId(auditId);
    setFindingsLoading(true);
    setFindings([]); // Clear previous findings

    try {
      // see what audits exist
      const { data: all_audits, error: all_audits_error } = await supabase
        .from("audits")
        .select("id, title");
      console.log("All audits in database:", all_audits);

      // Then see what audit plans exist
      const { data: all_plans, error: all_plans_error } = await supabase
        .from("audit_plans")
        .select("*");
      console.log("All audit plans in database:", all_plans);

      // Check for the specific audit plan with this audit_id
      let { data: plan_data, error: plan_error } = await supabase
        .from("audit_plans")
        .select("*")
        .eq("audit_id", auditId);

      console.log("Plan query error:", plan_error);
      console.log("Plan data found for audit", auditId, ":", plan_data);

      if (plan_error) {
        console.log("Error fetching plan id", plan_error);
        toast.error("Failed to fetch audit plan");
        return;
      }

      if (!plan_data || plan_data.length === 0) {
        console.log("No plan data found for audit:", auditId);
        console.log("Checking with string conversion...");

        // Try with string conversion
        const { data: plan_data_str, error: plan_error_str } = await supabase
          .from("audit_plans")
          .select("*")
          .eq("audit_id", String(auditId));

        console.log("Plan data with string conversion:", plan_data_str);

        if (!plan_data_str || plan_data_str.length === 0) {
          toast.error(
            "No audit plan found for this audit. Please create an audit plan first."
          );
          return;
        } else {
          // Use the string converted result
          plan_data = plan_data_str;
        }
      }

      console.log("Plan data found:", plan_data);
      const planIds = plan_data.map((p) => p.id);
      console.log("Using plan IDs:", planIds);

      // Fetch tasks for all plans linked to this audit
      let { data, error } = await supabase
        .from("audit_tasks")
        .select(
          "id, task, task_type, notes, findings, severity, recommendation, plan_id"
        )
        .in("plan_id", planIds);

      if (error) {
        console.log("error fetching tasks by plan_ids", error);
        toast.error("Failed to fetch audit tasks");
        return;
      }

      // If no results via IN, try each plan_id individually (some RLS/policies can interfere with IN)
      if (!data || data.length === 0) {
        console.log(
          "No tasks via IN(plan_id). Trying individual plan_id queries..."
        );
        for (const pid of planIds) {
          const { data: singleData, error: singleErr } = await supabase
            .from("audit_tasks")
            .select(
              "id, task, task_type, notes, findings, severity, recommendation, plan_id"
            )
            .eq("plan_id", pid)
            .order("date", { ascending: true });
          if (singleErr) {
            console.log("Error fetching tasks for plan_id", pid, singleErr);
            continue;
          }
          if (singleData && singleData.length > 0) {
            console.log(
              "Found tasks for plan_id",
              pid,
              "count:",
              singleData.length
            );
            data = singleData;
            break;
          }
        }
      }

      // Normalize field names across schema variants
      const normalized = (data || []).map((row) => ({
        task: row.task ?? "",
        task_type: row.task_type ?? "",
        notes: row.notes ?? "",
        findings: row.findings ?? "",
        severity: (row.severity ?? "").toString(),
        recommendation: row.recommendation ?? "",
      }));

      console.log("Tasks data fetched:", normalized);
      setFindings(normalized);
      console.log("Findings state updated with:", normalized);
    } catch (error) {
      console.error("Error in handleAuditSelect:", error);
      toast.error("Failed to load audit data");
    } finally {
      setFindingsLoading(false);
    }
  };

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

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "low":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const analyzeData = async () => {
    // Prevent multiple simultaneous requests
    if (isAnalyzing) {
      console.log("Analysis already in progress, ignoring duplicate request");
      return;
    }

    setIsAnalyzing(true);

    try {
      console.log("Starting analysis with:", { analysisType, findings });

      const payload = {
        analysisType: analysisType,
        data: findings,
        auditId,
      };

      // Use fetch with proper error handling (remove sendBeacon to avoid duplicates)
      const response = await orionFetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`Analysis request failed: ${response.status}`);
      }

      console.log("Analysis request sent successfully");

      // Navigate immediately to a waiting/results page that polls DB
      router.push(
        `/dashboard/analysis-results?type=${analysisType}&auditId=${auditId}`
      );
    } catch (error) {
      console.error("Error analyzing data:", error);
      setAnalysis([
        {
          metric: "Error",
          value: "Failed to analyze data. Please try again.",
          icon: "❌",
          color: "warning",
        },
      ]);
    }

    setIsAnalyzing(false);
  };

  const parseAnalysisResult = (result, type) => {
    console.log("parseAnalysisResult called with:", { result, type });
    console.log("Result type:", typeof result);
    console.log("Result value:", result);

    // Handle both string and object responses
    if (typeof result === "string") {
      console.log("Processing string result");
      // Handle string responses (legacy format)
      if (type === "correlation") {
        const sections = [];
        const lines = result.split("\n");
        let currentSection = null;

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (/^\d+\)/.test(trimmedLine)) {
            if (currentSection) {
              sections.push(currentSection);
            }
            currentSection = {
              title: trimmedLine.split(")")[1]?.trim() || trimmedLine,
              content: [],
              icon: getSectionIcon(trimmedLine),
            };
          } else if (currentSection && trimmedLine.startsWith("-")) {
            currentSection.content.push(trimmedLine.substring(1).trim());
          } else if (currentSection && trimmedLine.startsWith("Observation:")) {
            currentSection.observation = trimmedLine
              .substring("Observation:".length)
              .trim();
          } else if (currentSection && trimmedLine.startsWith("Caveats")) {
            sections.push(currentSection);
            currentSection = {
              title: "Caveats",
              content: [],
              icon: "⚠️",
              isWarning: true,
            };
          } else if (currentSection) {
            currentSection.content.push(trimmedLine);
          }
        }

        if (currentSection) {
          sections.push(currentSection);
        }

        const parsedResult = sections.map((section) => ({
          metric: section.title,
          value: section.content.join("\n"),
          observation: section.observation,
          icon: section.icon,
          color: section.isWarning ? "warning" : "info",
          isStructured: true,
        }));

        console.log("Parsed string result:", parsedResult);
        return parsedResult;
      } else {
        const parsedResult = [
          {
            metric: `${type.charAt(0).toUpperCase() + type.slice(1)} Analysis`,
            value: result,
            icon: "🤖",
            color: "info",
            isLongText: true,
          },
        ];
        console.log("Parsed string result (default):", parsedResult);
        return parsedResult;
      }
    } else if (typeof result === "object" && result !== null) {
      console.log("Processing object result");

      // Check if this is a raw response that needs parsing
      if (result.raw && typeof result.raw === "string") {
        console.log("Found raw response, attempting to extract JSON");
        try {
          // Try to extract JSON from the raw content
          let rawContent = result.raw;
          if (rawContent.includes("```json")) {
            const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              rawContent = jsonMatch[1].trim();
            }
          } else if (rawContent.includes("```")) {
            const codeMatch = rawContent.match(/```\s*([\s\S]*?)\s*```/);
            if (codeMatch) {
              rawContent = codeMatch[1].trim();
            }
          }

          // Try to find JSON content
          const jsonStart = rawContent.indexOf("{");
          const jsonEnd = rawContent.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonContent = rawContent.substring(jsonStart, jsonEnd + 1);
            const parsedJson = JSON.parse(jsonContent);
            console.log(
              "Successfully parsed JSON from raw content:",
              parsedJson
            );
            // Recursively call parseAnalysisResult with the parsed JSON
            return parseAnalysisResult(parsedJson, type);
          }
        } catch (parseError) {
          console.log("Failed to parse raw content as JSON:", parseError);
        }
      }

      // Handle structured JSON responses
      const analysisItems = [];

      // Handle different analysis types
      switch (type) {
        case "summary":
          if (result.summary) {
            analysisItems.push({
              metric: "Summary",
              value: result.summary,
              icon: "📋",
              color: "info",
              isLongText: true,
            });
          }
          if (result.keyActivities && Array.isArray(result.keyActivities)) {
            analysisItems.push({
              metric: "Key Activities",
              value: result.keyActivities.join("\n• "),
              icon: "📝",
              color: "info",
              isStructured: true,
            });
          }
          if (result.mainFindings && Array.isArray(result.mainFindings)) {
            analysisItems.push({
              metric: "Main Findings",
              value: result.mainFindings.join("\n• "),
              icon: "🔍",
              color: "warning",
              isStructured: true,
            });
          }
          if (result.recommendations && Array.isArray(result.recommendations)) {
            analysisItems.push({
              metric: "Recommendations",
              value: result.recommendations.join("\n• "),
              icon: "💡",
              color: "success",
              isStructured: true,
            });
          }
          break;

        case "riskAssessment":
          if (result.summary) {
            analysisItems.push({
              metric: "Risk Summary",
              value: result.summary,
              icon: "⚠️",
              color: "warning",
              isLongText: true,
            });
          }
          if (result.vulnerabilities && Array.isArray(result.vulnerabilities)) {
            analysisItems.push({
              metric: "Vulnerabilities",
              value: result.vulnerabilities.join("\n• "),
              icon: "🚨",
              color: "danger",
              isStructured: true,
            });
          }
          if (result.severity && typeof result.severity === "object") {
            const severityText = Object.entries(result.severity)
              .map(
                ([level, items]) =>
                  `${level.toUpperCase()}:\n${items.join("\n• ")}`
              )
              .join("\n\n");
            analysisItems.push({
              metric: "Severity Breakdown",
              value: severityText,
              icon: "📊",
              color: "warning",
              isStructured: true,
            });
          }
          if (
            result.priorityRemediation &&
            Array.isArray(result.priorityRemediation)
          ) {
            analysisItems.push({
              metric: "Priority Remediation",
              value: result.priorityRemediation.join("\n• "),
              icon: "⚡",
              color: "success",
              isStructured: true,
            });
          }
          break;

        case "controlEffectiveness":
          if (result.summary) {
            analysisItems.push({
              metric: "Control Effectiveness Summary",
              value: result.summary,
              icon: "🛡️",
              color: "info",
              isLongText: true,
            });
          }
          if (
            result.effectiveControls &&
            Array.isArray(result.effectiveControls)
          ) {
            analysisItems.push({
              metric: "Effective Controls",
              value: result.effectiveControls.join("\n• "),
              icon: "✅",
              color: "success",
              isStructured: true,
            });
          }
          if (result.gaps && Array.isArray(result.gaps)) {
            analysisItems.push({
              metric: "Control Gaps",
              value: result.gaps.join("\n• "),
              icon: "❌",
              color: "danger",
              isStructured: true,
            });
          }
          if (result.improvements && Array.isArray(result.improvements)) {
            analysisItems.push({
              metric: "Improvements Needed",
              value: result.improvements.join("\n• "),
              icon: "🔧",
              color: "warning",
              isStructured: true,
            });
          }
          break;

        case "complianceCheck":
          if (result.summary) {
            analysisItems.push({
              metric: "Compliance Summary",
              value: result.summary,
              icon: "📋",
              color: "info",
              isLongText: true,
            });
          }
          if (
            result.nonCompliantAreas &&
            Array.isArray(result.nonCompliantAreas)
          ) {
            analysisItems.push({
              metric: "Non-Compliant Areas",
              value: result.nonCompliantAreas.join("\n• "),
              icon: "🚨",
              color: "danger",
              isStructured: true,
            });
          }
          if (result.missingEvidence && Array.isArray(result.missingEvidence)) {
            analysisItems.push({
              metric: "Missing Evidence",
              value: result.missingEvidence.join("\n• "),
              icon: "📄",
              color: "warning",
              isStructured: true,
            });
          }
          if (
            result.correctiveActions &&
            Array.isArray(result.correctiveActions)
          ) {
            analysisItems.push({
              metric: "Corrective Actions",
              value: result.correctiveActions.join("\n• "),
              icon: "🔧",
              color: "success",
              isStructured: true,
            });
          }
          break;

        case "recommendations":
          if (result.summary) {
            analysisItems.push({
              metric: "Recommendations Summary",
              value: result.summary,
              icon: "💡",
              color: "info",
              isLongText: true,
            });
          }
          if (result.recommendations && Array.isArray(result.recommendations)) {
            analysisItems.push({
              metric: "Key Recommendations",
              value: result.recommendations.join("\n• "),
              icon: "🎯",
              color: "success",
              isStructured: true,
            });
          }
          if (result.bestPractices && Array.isArray(result.bestPractices)) {
            analysisItems.push({
              metric: "Best Practices",
              value: result.bestPractices.join("\n• "),
              icon: "⭐",
              color: "info",
              isStructured: true,
            });
          }
          break;

        default:
          // Handle generic object response
          Object.entries(result).forEach(([key, value]) => {
            if (typeof value === "string") {
              analysisItems.push({
                metric: key.charAt(0).toUpperCase() + key.slice(1),
                value: value,
                icon: "📋",
                color: "info",
                isLongText: value.length > 100,
              });
            } else if (Array.isArray(value)) {
              analysisItems.push({
                metric: key.charAt(0).toUpperCase() + key.slice(1),
                value: value.join("\n• "),
                icon: "📝",
                color: "info",
                isStructured: true,
              });
            }
          });
          break;
      }

      console.log("Final analysis items:", analysisItems);
      return analysisItems;
    }

    // Fallback for unexpected data types
    const fallbackResult = [
      {
        metric: "Analysis Result",
        value: JSON.stringify(result, null, 2),
        icon: "🤖",
        color: "info",
        isLongText: true,
      },
    ];
    console.log("Fallback result:", fallbackResult);
    return fallbackResult;
  };

  const getSectionIcon = (sectionText) => {
    if (sectionText.includes("date")) return "📅";
    if (sectionText.includes("distribution")) return "📊";
    if (sectionText.includes("concentration")) return "🎯";
    if (sectionText.includes("relationships")) return "🔗";
    return "📋";
  };

  const getAnalysisIcon = (type) => {
    switch (type) {
      case "summary":
        return <MdInfo className="w-5 h-5" />;
      case "riskAssessment":
        return <MdWarning className="w-5 h-5" />;
      case "controlEffectiveness":
        return <MdAssessment className="w-5 h-5" />;
      case "complianceCheck":
        return <MdCheckCircle className="w-5 h-5" />;
      case "recommendations":
        return <MdAnalytics className="w-5 h-5" />;
      default:
        return <MdAnalytics className="w-5 h-5" />;
    }
  };

  const handleShareAnalysis = async () => {
    if (!analysis || !auditId) {
      toast.error("No analysis to share");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      // First save the analysis if not already saved
      const { data: savedAnalysis, error: saveError } = await supabase
        .from("audit_analysis")
        .insert({
          audit_id: auditId,
          analysis_type: analysisType,
          results: analysis,
          created_by: user.id,
        })
        .select()
        .single();

      if (saveError) {
        console.error("Error saving analysis:", saveError);
        toast.error("Failed to save analysis for sharing");
        return;
      }

      // Set up sharing modal
      setAnalysisToShare({
        id: savedAnalysis.id,
        audit_title: audits.find((a) => a.id === auditId)?.title,
        analysis_type: analysisType,
        summary: analysis[0]?.value || "Analysis completed",
        results: analysis,
      });
      setShowSharingModal(true);
    } catch (error) {
      console.error("Error in handleShareAnalysis:", error);
      toast.error("An error occurred while preparing to share the analysis");
    }
  };

  const handleSharingComplete = () => {
    setShowSharingModal(false);
    setAnalysisToShare(null);
  };

  // Show loading skeleton while data loads
  if (loading) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          {/* Header Skeleton */}
          <div className="dashboard-header">
            <div>
              <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-5 w-96 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
            </div>
            <div className="h-12 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>

          <div className="space-y-6">
            {/* Audit Selection Card Skeleton */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Options Skeleton */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="h-12 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </CardContent>
            </Card>

            {/* Results Skeleton */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                      </div>
                      <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h2 className="header-title">Audit Analysis</h2>
            <p className="header-subtitle">
              Select an audit to view findings and perform AI-powered analysis
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/saved-analyses")}
            className="bg-purple-600 hover:bg-purple-700 text-white mb-1"
          >
            <MdHistory className="w-5 h-5 mr-2" />
            Saved Analyses
          </Button>
        </div>

        <div className="space-y-6">
          {/* Audit Selection Card */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <MdAnalytics className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Select Audit for Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Choose an audit to analyze
                </label>
                <Select value={auditId} onValueChange={handleAuditSelect}>
                  <SelectTrigger className="w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Choose an audit to analyze...">
                      {auditId &&
                        audits.find((audit) => audit.id === auditId)?.title}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-96">
                    {audits.map((audit) => (
                      <SelectItem
                        key={audit.id}
                        value={audit.id}
                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 cursor-pointer"
                      >
                        <div className="flex flex-col space-y-1 py-2">
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {audit.title}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
                            <span>Category: {audit.category}</span>
                            <span>Date: {audit.date}</span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
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
            </CardContent>
          </Card>

          {/* Findings Table */}
          {(findingsLoading || findings.length > 0) && (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  Audit Findings & Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-gray-600">
                        <TableHead className="text-gray-900 dark:text-white w-1/6">
                          Task
                        </TableHead>
                        <TableHead className="text-gray-900 dark:text-white w-20">
                          Type
                        </TableHead>
                        <TableHead className="text-gray-900 dark:text-white w-1/4">
                          Findings
                        </TableHead>
                        <TableHead className="text-gray-900 dark:text-white w-20">
                          Severity
                        </TableHead>
                        <TableHead className="text-gray-900 dark:text-white w-1/4">
                          Recommendation
                        </TableHead>
                        <TableHead className="text-gray-900 dark:text-white w-1/6">
                          Notes
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {findingsLoading
                        ? // Skeleton rows while loading
                          [...Array(5)].map((_, index) => (
                            <TableRow
                              key={index}
                              className="border-gray-200 dark:border-gray-600 animate-pulse"
                            >
                              <TableCell className="w-1/6 align-top">
                                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                              </TableCell>
                              <TableCell className="w-20 align-top">
                                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                              </TableCell>
                              <TableCell className="w-1/4 align-top">
                                <div className="space-y-1">
                                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                </div>
                              </TableCell>
                              <TableCell className="w-20 align-top">
                                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                              </TableCell>
                              <TableCell className="w-1/4 align-top">
                                <div className="space-y-1">
                                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                  <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                </div>
                              </TableCell>
                              <TableCell className="w-1/6 align-top">
                                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                              </TableCell>
                            </TableRow>
                          ))
                        : findings.map((finding, index) => (
                            <TableRow
                              key={index}
                              className="border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                            >
                              <TableCell className="text-gray-900 dark:text-white w-1/6 align-top">
                                <div className="break-words whitespace-normal text-sm leading-relaxed">
                                  {finding.task || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-300 w-20 align-top">
                                <div className="break-words whitespace-normal text-sm">
                                  {finding.task_type || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-900 dark:text-white w-1/4 align-top">
                                <div className="break-words whitespace-normal text-sm leading-relaxed">
                                  {finding.findings || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell className="w-20 align-top">
                                <Badge
                                  className={getSeverityColor(finding.severity)}
                                >
                                  {finding.severity || "N/A"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-900 dark:text-white w-1/4 align-top">
                                <div className="break-words whitespace-normal text-sm leading-relaxed">
                                  {finding.recommendation || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-300 w-1/6 align-top">
                                <div className="break-words whitespace-normal text-sm leading-relaxed">
                                  {finding.notes || "N/A"}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {auditId && findings.length === 0 && (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  No findings or tasks found for this audit.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Analysis Controls */}
          {auditId && findings.length > 0 && (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Analysis Type
                    </label>
                    <Select
                      value={analysisType}
                      onValueChange={setAnalysisType}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Select analysis type..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectItem
                          value="summary"
                          className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Summary Analysis
                        </SelectItem>
                        <SelectItem
                          value="riskAssessment"
                          className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Risk Assessment
                        </SelectItem>
                        <SelectItem
                          value="controlEffectiveness"
                          className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Control Effectiveness
                        </SelectItem>
                        <SelectItem
                          value="complianceCheck"
                          className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Compliance Check
                        </SelectItem>
                        <SelectItem
                          value="recommendations"
                          className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Recommendations
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={analyzeData}
                    disabled={isAnalyzing || !analysisType}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        {getAnalysisIcon(analysisType)}
                        <span className="ml-2">Analyze Findings</span>
                      </>
                    )}
                  </Button>

                  {analysis && analysis.length > 0 && (
                    <Button
                      onClick={handleShareAnalysis}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                    >
                      <MdShare className="w-4 h-4 mr-2" />
                      Share Analysis
                    </Button>
                  )}

                  {/* <Button
                    onClick={() => {
                      console.log("Test analysis button clicked");
                      const testData = [
                        {
                          task: "Test Task 1",
                          task_type: "Control Test",
                          findings: "Test finding description",
                          severity: "High",
                          recommendation: "Test recommendation"
                        }
                      ];
                      console.log("Test data:", testData);
                      setFindings(testData);
                      setAnalysisType("summary");
                      setTimeout(() => {
                        console.log("Triggering test analysis");
                        analyzeData();
                      }, 100);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                  >
                    Test Analysis
                  </Button>
                  
                  <Button
                    onClick={async () => {
                      console.log("Testing API endpoint directly");
                      try {
                        const response = await orionFetch("/api/analyze", {
                          method: "GET"
                        });
                        const result = await response.json();
                        console.log("API test response:", result);
                        toast.success("API test successful");
                      } catch (error) {
                        console.error("API test failed:", error);
                        toast.error("API test failed");
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    Test API
                  </Button> */}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Sharing Modal */}
          {showSharingModal && (
            <AnalysisSharingModal
              analysis={analysisToShare}
              isOpen={showSharingModal}
              onClose={() => setShowSharingModal(false)}
              onShare={handleSharingComplete}
            />
          )}
        </div>
      </main>
    </div>
  );
}
