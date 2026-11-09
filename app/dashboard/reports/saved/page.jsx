"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Eye,
  Trash2,
  FileText,
  X,
  Share2,
  Check,
  Clock,
  XCircle,
  Edit,
  Plus,
  Minus,
} from "lucide-react";
import { MdDownload } from "react-icons/md";
import jsPDF from "jspdf";

function SavedReports() {
  const supabase = createClient();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredReports, setFilteredReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState({
    reportId: null,
    recipientId: "",
    message: "",
  });
  const [isSharing, setIsSharing] = useState(false);
  const [seniors, setSeniors] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [editData, setEditData] = useState({
    title: "",
    audit_scope: "",
    summary: "",
    conclusion: "",
    findings: [],
    recommendations: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSavedReports();
    fetchSeniors();
  }, []);

  useEffect(() => {
    // Filter reports based on search term
    if (searchTerm.trim() === "") {
      setFilteredReports(reports);
    } else {
      const filtered = reports.filter(
        (report) =>
          report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.audit_scope.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.summary.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredReports(filtered);
    }
  }, [searchTerm, reports]);

  const fetchSavedReports = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        toast.error("Error fetching user information");
        return;
      }

      if (!user) {
        toast.error("Please log in to view saved reports");
        router.push("/sign-in");
        return;
      }

      // Fetch reports for the current user
      const { data: reportsData, error: reportsError } = await supabase
        .from("audit_reports")
        .select("*")
        .eq("generated_by", user.id)
        .order("generated_at", { ascending: false });

      if (reportsError) {
        console.error("Error fetching reports:", reportsError);
        toast.error("Error fetching saved reports");
        return;
      }

      // Fetch admin responses for each report
      const reportIds = reportsData?.map((report) => report.id) || [];
      let adminResponses = [];

      if (reportIds.length > 0) {
        // First get all shares for these reports that have responses
        const { data: responsesData, error: responsesError } = await supabase
          .from("audit_report_shares")
          .select("*")
          .in("report_id", reportIds)
          .in("status", ["approved", "rejected"])
          .order("responded_at", { ascending: false });

        if (!responsesError && responsesData) {
          // Get unique admin profile IDs
          const adminIds = [
            ...new Set(responsesData.map((r) => r.shared_with)),
          ];

          // Fetch admin profiles
          const { data: adminProfiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, email, role")
            .in("id", adminIds);

          if (!profilesError) {
            // Manually join the data and get the most recent response per report
            const responsesByReport = {};
            responsesData.forEach((response) => {
              const adminProfile = adminProfiles?.find(
                (p) => p.id === response.shared_with
              );
              const responseWithProfile = {
                ...response,
                shared_with_profile: adminProfile,
              };

              // Keep only the most recent response per report
              if (
                !responsesByReport[response.report_id] ||
                new Date(response.responded_at) >
                  new Date(responsesByReport[response.report_id].responded_at)
              ) {
                responsesByReport[response.report_id] = responseWithProfile;
              }
            });

            adminResponses = Object.values(responsesByReport);
          }
        }
      }

      // Combine reports with admin responses
      const reportsWithResponses =
        reportsData?.map((report) => {
          const adminResponse = adminResponses.find(
            (response) => response.report_id === report.id
          );
          console.log(
            `Report ${report.id}: Admin response found:`,
            adminResponse
          ); // Debug log
          return {
            ...report,
            admin_response: adminResponse || null,
          };
        }) || [];

      setReports(reportsWithResponses);
    } catch (error) {
      console.error("Error in fetchSavedReports:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from("audit_reports")
        .delete()
        .eq("id", reportId);

      if (error) {
        console.error("Error deleting report:", error);
        toast.error("Error deleting report");
        return;
      }

      toast.success("Report deleted successfully");
      setReports(reports.filter((report) => report.id !== reportId));
      setSelectedReport(null);
    } catch (error) {
      console.error("Error in handleDeleteReport:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchSeniors = async () => {
    try {
      // Fetch users with senior roles from your profiles table
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["manager", "senior_auditor", "director", "admin"])
        .order("full_name");

      if (error) {
        console.error("Error fetching seniors:", error);
        return;
      }

      setSeniors(profiles || []);
    } catch (error) {
      console.error("Error in fetchSeniors:", error);
    }
  };

  const handleShareReport = async () => {
    try {
      setIsSharing(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to share reports");
        return;
      }

      // Create share record
      const { error: shareError } = await supabase
        .from("audit_report_shares")
        .insert({
          report_id: shareData.reportId,
          shared_by: user.id,
          shared_with: shareData.recipientId,
          message: shareData.message,
        });

      if (shareError) {
        console.error("Error sharing report:", shareError);
        toast.error("Error sharing report");
        return;
      }

      // Update report status
      const { error: updateError } = await supabase
        .from("audit_reports")
        .update({ approval_status: "pending_approval" })
        .eq("id", shareData.reportId);

      if (updateError) {
        console.error("Error updating report status:", updateError);
      }

      toast.success("Report shared successfully");
      setShareModalOpen(false);
      setShareData({ reportId: null, recipientId: "", message: "" });
      fetchSavedReports(); // Refresh to show updated status
    } catch (error) {
      console.error("Error in handleShareReport:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSharing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-600 text-white">
            <Check className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge className="bg-yellow-600 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Pending Approval
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-600 text-white">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-400 border-gray-400">
            Draft
          </Badge>
        );
    }
  };

  const handleEditReport = (report) => {
    setEditingReport(report);

    // Ensure all findings have proper default values
    const normalizedFindings = (report.findings || []).map((finding) => ({
      id: finding.id || "",
      title: finding.title || "",
      description: finding.description || "",
    }));

    // Ensure all recommendations have proper default values
    const normalizedRecommendations = (report.recommendations || []).map(
      (rec) => ({
        id: rec.id || "",
        title: rec.title || "",
        description: rec.description || "",
      })
    );

    setEditData({
      title: report.title || "",
      audit_scope: report.audit_scope || "",
      summary: report.summary || "",
      conclusion: report.conclusion || "",
      findings: normalizedFindings,
      recommendations: normalizedRecommendations,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from("audit_reports")
        .update({
          title: editData.title,
          audit_scope: editData.audit_scope,
          summary: editData.summary,
          conclusion: editData.conclusion,
          findings: editData.findings,
          recommendations: editData.recommendations,
        })
        .eq("id", editingReport.id);

      if (error) {
        console.error("Error updating report:", error);
        toast.error("Error saving changes");
        return;
      }

      toast.success("Report updated successfully");
      setEditModalOpen(false);
      setEditingReport(null);
      setEditData({
        title: "",
        audit_scope: "",
        summary: "",
        conclusion: "",
        findings: [],
        recommendations: [],
      });
      fetchSavedReports(); // Refresh the reports
    } catch (error) {
      console.error("Error in handleSaveEdit:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper functions for managing findings and recommendations
  const addFinding = () => {
    const newFinding = {
      id: `F${(editData.findings.length + 1).toString().padStart(2, "0")}`,
      title: "",
      description: "",
    };
    setEditData({
      ...editData,
      findings: [...editData.findings, newFinding],
    });
  };

  const removeFinding = (index) => {
    const updatedFindings = editData.findings.filter((_, i) => i !== index);
    setEditData({
      ...editData,
      findings: updatedFindings,
    });
  };

  const updateFinding = (index, field, value) => {
    const updatedFindings = editData.findings.map((finding, i) =>
      i === index ? { ...finding, [field]: value } : finding
    );
    setEditData({
      ...editData,
      findings: updatedFindings,
    });
  };

  const addRecommendation = () => {
    const newRecommendation = {
      id: `R${(editData.recommendations.length + 1)
        .toString()
        .padStart(2, "0")}`,
      title: "",
      description: "",
    };
    setEditData({
      ...editData,
      recommendations: [...editData.recommendations, newRecommendation],
    });
  };

  const removeRecommendation = (index) => {
    const updatedRecommendations = editData.recommendations.filter(
      (_, i) => i !== index
    );
    setEditData({
      ...editData,
      recommendations: updatedRecommendations,
    });
  };

  const updateRecommendation = (index, field, value) => {
    const updatedRecommendations = editData.recommendations.map((rec, i) =>
      i === index ? { ...rec, [field]: value } : rec
    );
    setEditData({
      ...editData,
      recommendations: updatedRecommendations,
    });
  };

  // PDF Generation Function for Saved Reports
  const generateSavedReportPDF = (report) => {
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
      const cleanTitle = cleanText(report.title || "Saved Audit Report");
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
        `Original Date: ${new Date(report.generated_at).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        )} | Exported: ${new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        margin,
        yPosition + 18
      );

      // Document ID
      doc.text(
        `Report ID: ${report.id || "ORN-SAVED-" + new Date().getTime()}`,
        pageWidth - margin - 80,
        yPosition + 18
      );

      yPosition += 35;
    }

    // Audit Scope
    if (report.audit_scope) {
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
      const scopeLines = doc.splitTextToSize(
        cleanText(report.audit_scope),
        contentWidth - 30
      );
      const scopeHeight = Math.max(40, scopeLines.length * 6 + 20);

      doc.rect(margin + 3, yPosition, contentWidth - 3, scopeHeight, "FD");
      yPosition += 12;

      // Professional Content Text
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "normal");
      yPosition = addWrappedText(
        report.audit_scope,
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

      // Add separator line if not first section
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
      doc.text("SUMMARY", margin + 20, yPosition + 7);
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
      const summaryLines = doc.splitTextToSize(
        cleanText(report.summary),
        contentWidth - 30
      );
      const summaryHeight = Math.max(40, summaryLines.length * 6 + 20);

      doc.rect(margin + 3, yPosition, contentWidth - 3, summaryHeight, "FD");
      yPosition += 12;

      // Professional Content Text
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
          doc.line(margin, yPosition - 10, pageWidth - margin, yPosition - 10);
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

        doc.rect(margin + 3, yPosition, contentWidth - 3, contentHeight, "FD");
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
          doc.line(margin, yPosition - 10, pageWidth - margin, yPosition - 10);
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
        const recContentHeight = Math.max(40, recContentLines.length * 6 + 20);

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
      // Split content into lines and process each line
      const conclusionLines = report.conclusion.split("\n");
      for (const line of conclusionLines) {
        checkNewPage();
        yPosition = addWrappedText(
          line,
          margin + 15,
          yPosition,
          contentWidth - 30,
          10.5
        );
      }
      yPosition += 25;
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
    const fileName = `Saved-Audit-Report-${cleanText(
      report.title || "Report"
    )}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF exported successfully!");
  };

  const renderReportDetails = (report) => {
    if (!report) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {report.title}
              </h3>
              {getStatusBadge(report.approval_status)}
            </div>
            <p className="text-gray-400 text-sm">
              Generated on {formatDate(report.generated_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => generateSavedReportPDF(report)}
              className="bg-cyan-600 text-white hover:bg-cyan-700"
            >
              <MdDownload className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              onClick={() => handleEditReport(report)}
              disabled={report.approval_status === "approved"}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={() => {
                setShareData({ ...shareData, reportId: report.id });
                setShareModalOpen(true);
              }}
              disabled={report.approval_status === "pending_approval"}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              onClick={() => setSelectedReport(null)}
              className="bg-gray-800 dark:bg-black text-white hover:bg-gray-700 dark:hover:bg-gray-800"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button
              onClick={() => handleDeleteReport(report.id)}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        {/* Audit Scope */}
        <div className="space-y-2">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            Audit Scope
          </h4>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {report.audit_scope}
          </p>
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            Summary
          </h4>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {report.summary}
          </p>
        </div>

        {/* Findings */}
        {report.findings && report.findings.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Findings
            </h4>
            <div className="space-y-4">
              {report.findings.map((finding, index) => (
                <Card
                  key={index}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-600"
                >
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="md:col-span-1">
                        <Badge
                          variant="outline"
                          className="text-cyan-600 dark:text-cyan-400 border-cyan-600/50 dark:border-cyan-400/50"
                        >
                          {finding.id}
                        </Badge>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-gray-900 dark:text-white font-medium mb-2">
                          {finding.title}
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                          {finding.description}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Recommendations ({report.recommendations.length})
            </h4>
            <div className="space-y-4">
              {report.recommendations.map((recommendation, index) => (
                <Card
                  key={recommendation.id || recommendation.findingId || index}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-600"
                >
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="md:col-span-1">
                        <Badge
                          variant="outline"
                          className="text-green-600 dark:text-green-400 border-green-600/50 dark:border-green-400/50"
                        >
                          {recommendation.id ||
                            recommendation.findingId ||
                            `R${index + 1}`}
                        </Badge>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-gray-900 dark:text-white font-medium mb-2">
                          {recommendation.title ||
                            `Finding ${recommendation.findingId || index + 1}`}
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                          {recommendation.description ||
                            recommendation.recommendation}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Conclusion */}
        {report.conclusion && (
          <div className="space-y-2">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Conclusion
            </h4>
            <p className="text-gray-900 whitespace-pre-wrap dark:text-white">
              {report.conclusion}
            </p>
          </div>
        )}

        {/* Admin Response */}
        {report.admin_response && report.admin_response.response_message && (
          <div className="space-y-2 border-t border-gray-300 dark:border-gray-600 pt-6">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                Admin Response
              </h4>
              <Badge
                className={
                  report.admin_response.status === "approved"
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                }
              >
                {report.admin_response.status === "approved"
                  ? "Approved"
                  : "Rejected"}
              </Badge>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-300 dark:border-gray-600">
              <p className="text-gray-300 whitespace-pre-wrap mb-2">
                {report.admin_response.response_message}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Response from:{" "}
                  {report.admin_response.shared_with_profile?.full_name ||
                    "Admin"}
                </span>
                <span>{formatDate(report.admin_response.responded_at)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    // Skeleton loading UI: header, search and a grid of report cards
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mb-2" />
              <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
            </div>
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
          </div>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="relative">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-8 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="header">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push("/dashboard/reports")}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reports
              </Button>
              <div>
                <h2 className="header-title">Saved Reports</h2>
                <p className="header-subtitle">
                  View and manage your saved audit reports
                </p>
              </div>
            </div>
            {/* <Button
              onClick={fetchSavedReports}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button> */}
          </div>
        </div>

        <div className="space-y-6">
          {/* Search */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                <Input
                  placeholder="Search reports by title, scope, or summary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
            </CardContent>
          </Card>

          {filteredReports.length === 0 ? (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {reports.length === 0
                    ? "No Saved Reports"
                    : "No Reports Found"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {reports.length === 0
                    ? "You haven't saved any reports yet. Generate and save a report to see it here."
                    : "No reports match your search criteria. Try adjusting your search terms."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Reports List */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Reports ({filteredReports.length})
                </h3>
                <div className="space-y-3">
                  {filteredReports.map((report) => (
                    <Card
                      key={report.id}
                      className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:border-cyan-400/50 ${
                        selectedReport?.id === report.id
                          ? "border-cyan-400/50 bg-gray-50 dark:bg-gray-800/80"
                          : ""
                      }`}
                      onClick={() => setSelectedReport(report)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-gray-900 dark:text-white font-medium line-clamp-1">
                                {report.title}
                              </h4>
                              <div className="flex items-center gap-1">
                                {getStatusBadge(report.approval_status)}
                                {report.admin_response &&
                                  report.admin_response.response_message && (
                                    <Badge className="bg-blue-600 text-white text-xs">
                                      Response Available
                                    </Badge>
                                  )}
                              </div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                              {report.summary}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                              <span>{formatDate(report.generated_at)}</span>
                              {report.findings && (
                                <span>{report.findings.length} findings</span>
                              )}
                              {report.recommendations && (
                                <span>
                                  {report.recommendations.length}{" "}
                                  recommendations
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditReport(report);
                              }}
                              disabled={report.approval_status === "approved"}
                              className="text-green-400 hover:bg-green-400/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareData({
                                  ...shareData,
                                  reportId: report.id,
                                });
                                setShareModalOpen(true);
                              }}
                              disabled={
                                report.approval_status === "pending_approval"
                              }
                              className="text-blue-400 hover:bg-blue-400/10"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-cyan-400 hover:bg-cyan-400/10"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Report Details */}
              <div className="space-y-4">
                {selectedReport ? (
                  <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <CardContent className="p-6">
                      {renderReportDetails(selectedReport)}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <CardContent className="p-8 text-center">
                      <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">
                        Select a Report
                      </h3>
                      <p className="text-gray-400">
                        Click on a report from the list to view its details.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Share Modal */}
        <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
          <DialogContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
            <DialogHeader>
              <DialogTitle>Share Report for Approval</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Share with
                </label>
                <Select
                  value={shareData.recipientId}
                  onValueChange={(value) =>
                    setShareData({ ...shareData, recipientId: value })
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select a senior to share with" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    {seniors.map((senior) => (
                      <SelectItem
                        key={senior.id}
                        value={senior.id}
                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {senior.full_name} ({senior.email}) - {senior.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Message (optional)
                </label>
                <Textarea
                  placeholder="Add a message for the recipient..."
                  value={shareData.message}
                  onChange={(e) =>
                    setShareData({ ...shareData, message: e.target.value })
                  }
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setShareModalOpen(false)}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleShareReport}
                  disabled={!shareData.recipientId || isSharing}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSharing ? "Sharing..." : "Share Report"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Report Title
                </label>
                <Input
                  value={editData.title || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, title: e.target.value })
                  }
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="Enter report title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Audit Scope
                </label>
                <Textarea
                  value={editData.audit_scope || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, audit_scope: e.target.value })
                  }
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="Describe the audit scope"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Summary
                </label>
                <Textarea
                  value={editData.summary || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, summary: e.target.value })
                  }
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="Provide a summary of the audit"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Conclusion
                </label>
                <Textarea
                  value={editData.conclusion || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, conclusion: e.target.value })
                  }
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="Enter the audit conclusion"
                  rows={3}
                />
              </div>

              {/* Findings Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Findings</label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addFinding}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Finding
                  </Button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {editData.findings.map((finding, index) => (
                    <Card
                      key={index}
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge
                            variant="outline"
                            className="text-cyan-600 dark:text-cyan-400 border-cyan-600/50 dark:border-cyan-400/50"
                          >
                            {finding.id}
                          </Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFinding(index)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-400/10 p-1"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Input
                            value={finding.title || ""}
                            onChange={(e) =>
                              updateFinding(index, "title", e.target.value)
                            }
                            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
                            placeholder="Finding title"
                          />
                          <Textarea
                            value={finding.description || ""}
                            onChange={(e) =>
                              updateFinding(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
                            placeholder="Finding description"
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Recommendations Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">
                    Recommendations
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addRecommendation}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Recommendation
                  </Button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {editData.recommendations.map((recommendation, index) => (
                    <Card
                      key={index}
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge
                            variant="outline"
                            className="text-green-600 dark:text-green-400 border-green-600/50 dark:border-green-400/50"
                          >
                            {recommendation.id}
                          </Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRecommendation(index)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-400/10 p-1"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Input
                            value={recommendation.title || ""}
                            onChange={(e) =>
                              updateRecommendation(
                                index,
                                "title",
                                e.target.value
                              )
                            }
                            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
                            placeholder="Recommendation title"
                          />
                          <Textarea
                            value={recommendation.description || ""}
                            onChange={(e) =>
                              updateRecommendation(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
                            placeholder="Recommendation description"
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setEditModalOpen(false)}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={!editData.title || !editData.summary || isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default SavedReports;
