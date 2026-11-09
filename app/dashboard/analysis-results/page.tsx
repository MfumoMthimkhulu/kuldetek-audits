"use client";
export const dynamic = "force-dynamic";
import { orionFetch } from "@/lib/orion-fetch";
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
// progress bar
function ProgressBar({ progress = 0 }: { progress?: number }) {
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
      <div
        className="h-full bg-cyan-600 rounded"
        style={{ width: `${pct}%`, transition: "width 0.3s ease" }}
      />
    </div>
  );
}
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MdDownload,
  MdShare,
  MdEdit,
  MdSave,
  MdCancel,
  MdPerson,
  MdEmail,
} from "react-icons/md";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import jsPDF from "jspdf";

export default function AnalysisResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Read from URL params
  const analysisType = searchParams.get("type") || "";
  const auditId = searchParams.get("auditId");

  // Initialize state
  const [editableAnalysis, setEditableAnalysis] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [permissionLevel, setPermissionLevel] = useState("view");
  const [shareExpiry, setShareExpiry] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("");

  // Poll DB for results
  useEffect(() => {
    // Don't start polling if we already have completed results
    if (
      editableAnalysis.length > 0 &&
      (statusText === "Completed" || progress === 100)
    ) {
      console.log("Already have completed results, skipping polling");
      return;
    }

    let isCancelled = false;
    let intervalRef: { current: NodeJS.Timeout | null } = { current: null };

    const load = async () => {
      if (!auditId || !analysisType || isCancelled) {
        console.log("Missing auditId/analysisType or polling cancelled:", {
          auditId,
          analysisType,
          isCancelled,
        });
        return;
      }

      try {
        console.log("Polling for analysis results:", { auditId, analysisType });

        // Use API endpoint instead of direct database query for better RLS handling
        const apiResponse = await orionFetch(
          `/api/analysis-results?auditId=${auditId}&analysisType=${analysisType}`
        );
        console.log("API response status:", apiResponse.status);

        if (!apiResponse.ok) {
          if (apiResponse.status === 404) {
            console.log("Analysis not found yet, continuing to poll...");
            return;
          } else {
            const errorText = await apiResponse.text();
            console.error("API request failed:", apiResponse.status, errorText);
            return;
          }
        }

        const data = await apiResponse.json();
        console.log("API response successful, data:", data);

        if (!isCancelled && data?.results) {
          console.log("Received results from database:", data.results);

          // Extract status/progress if present
          let statusItem: any = null;
          if (Array.isArray(data.results)) {
            statusItem = data.results.find((r: any) => r?.metric === "Status");
          }

          console.log("Status item found:", statusItem);

          if (statusItem) {
            setProgress(
              typeof statusItem.progress === "number" ? statusItem.progress : 0
            );
            setStatusText(statusItem.value || "Processing");

            // If status is completed, stop polling and show results
            if (
              statusItem.value === "Completed" ||
              statusItem.progress === 100
            ) {
              console.log("Analysis completed, stopping polling");
              isCancelled = true; // Stop future polling
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              console.log("Analysis complete - final status update");
            }
          }

          // Filter out status items for display (but keep them for progress tracking)
          const displayItems = Array.isArray(data.results)
            ? data.results.filter((item: any) => item.metric !== "Status")
            : [
                {
                  metric: `${analysisType}`,
                  value: JSON.stringify(data.results, null, 2),
                  icon: "🤖",
                  color: "info",
                  isLongText: true,
                },
              ];

          console.log("Display items (filtered):", displayItems);
          console.log("Total results from DB:", data.results?.length || 0);
          console.log("Display items count:", displayItems.length);

          // Only set analysis if we have actual content items (not just status)
          if (displayItems.length > 0) {
            const mappedItems = displayItems.map((item) => ({
              ...item,
              value: item.value,
              observation: item.observation || "",
            }));

            setEditableAnalysis(mappedItems);
            console.log(
              "Set editableAnalysis with",
              mappedItems.length,
              "items"
            );
            console.log(
              "editableAnalysis items:",
              mappedItems.map((item) => item.metric)
            );

            // If we have results and they're complete, stop polling
            if (
              statusItem &&
              (statusItem.value === "Completed" || statusItem.progress === 100)
            ) {
              console.log("Results are complete, stopping polling");
              isCancelled = true;
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }
          } else {
            console.log(
              "No display items found, keeping current analysis state"
            );
          }
        }
      } catch {}
    };

    // initial fetch
    load();
    // poll every 2s until we have completed results
    intervalRef.current = setInterval(async () => {
      if (!isCancelled) {
        await load();
      }
    }, 2000);

    return () => {
      isCancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [auditId, analysisType]);

  // Load current user and available users for sharing
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUser(user);

        // Get all users for sharing
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .neq("id", user?.id); // Exclude current user

        if (error) throw error;
        setUsers(profiles || []);
      } catch (error) {
        console.error("Error loading user data:", error);
        toast.error("Failed to load user data");
      }
    };

    loadUserData();
  }, []);

  // Handle content changes
  const handleContentChange = (index, field, value) => {
    const updatedAnalysis = [...editableAnalysis];
    updatedAnalysis[index][field] = value;
    setEditableAnalysis(updatedAnalysis);
  };

  // Save edited analysis
  const saveAnalysis = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("audit_analysis")
        .update({
          results: editableAnalysis,
          updated_at: new Date().toISOString(),
        })
        .eq("audit_id", auditId)
        .eq("analysis_type", analysisType);

      if (error) throw error;

      toast.success("Analysis saved successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving analysis:", error);
      toast.error("Failed to save analysis");
    } finally {
      setIsSaving(false);
    }
  };

  // Generate PDF
  const generatePDF = () => {
    if (editableAnalysis.length === 0) {
      toast.error("No analysis data to export.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25;
    const contentWidth = pageWidth - (2 * margin);
    let yPosition = margin;

    // Helper function to add professional header to each page
    const addPageHeader = () => {
      // Professional Header Design
      // Header background - gradient effect simulation
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Accent line
      doc.setFillColor(22, 211, 238); // cyan-500
      doc.rect(0, 40, pageWidth, 5, 'F');
      
      // Company Logo Area (text-based)
      doc.setTextColor(22, 211, 238); // cyan-500
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("KULDETEK AUDITING", margin, 18);
      
      // Main Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      const cleanTitle = cleanText(`${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis Report`);
      doc.text(cleanTitle, margin, 32);

      return 60; // Return starting Y position after header
    };

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace = 20) => {
      if (yPosition + requiredSpace > pageHeight - 40) { // Account for footer space
        doc.addPage();
        yPosition = addPageHeader(); // Add header to new page
        return true;
      }
      return false;
    };

    // Helper function to clean text and remove problematic characters
    const cleanText = (text: string): string => {
      if (!text) return "";
      
      // Remove emoji and special unicode characters that cause encoding issues
      return text
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc symbols
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport symbols
        .replace(/[\u{2600}-\u{26FF}]/gu, '') // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental symbols
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
        .replace(/[\u00A0-\u9999]/g, (match) => { // Handle other special characters
          const code = match.charCodeAt(0);
          if (code > 127) return ''; // Remove non-ASCII
          return match;
        })
        .replace(/[^\x20-\x7E\n\r\t]/g, '') // Keep only printable ASCII + whitespace
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    // Helper function to add text with proper wrapping and cleaning
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 11, fontStyle = "normal") => {
      const cleanedText = cleanText(text);
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      const lines = doc.splitTextToSize(cleanedText, maxWidth);
      
      let currentY = y;
      lines.forEach((line: string, index: number) => {
        if (index > 0) {
          const wasNewPage = checkNewPage();
          if (wasNewPage) {
            currentY = yPosition;
          }
        }
        doc.text(line, x, currentY + (index * (fontSize * 0.4)));
      });
      
      return currentY + (lines.length * (fontSize * 0.4));
    };

    // Add header to first page and set initial position
    yPosition = addPageHeader();

    // Subtitle and Date Section (only on first page)
    if (doc.getNumberOfPages() === 1) {
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(0, yPosition, pageWidth, 25, 'F');
    
    // Document Info
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("CONFIDENTIAL ANALYSIS REPORT", margin, yPosition + 8);
    
    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFontSize(10);
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })} | ${new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      margin,
      yPosition + 18
    );
    
    // Document ID
    doc.text(
      `Document ID: ORN-${analysisType.toUpperCase()}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
      pageWidth - margin - 80,
      yPosition + 18
    );
    
    yPosition += 35;
    }

    // Executive Summary Section (only on first page)
    if (doc.getNumberOfPages() === 1) {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin - 8, yPosition - 5, contentWidth + 16, 22, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("EXECUTIVE SUMMARY", margin, yPosition + 8);
    yPosition += 30;

    const analysisTypeMap = {
      'risk': 'Risk Assessment Analysis',
      'compliance': 'Compliance Assessment Analysis', 
      'security': 'Security Assessment Analysis',
      'financial': 'Financial Assessment Analysis'
    };

    // Summary content with professional styling
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    
    const summaryText = `This ${analysisTypeMap[analysisType] || 'assessment'} presents a comprehensive evaluation of organizational processes and controls. Our analysis has identified ${editableAnalysis.length} critical areas requiring attention, each with detailed findings and strategic recommendations for improvement.

The assessment methodology employed industry-standard frameworks and best practices to ensure thorough coverage of all relevant aspects. Key focus areas include process efficiency, compliance adherence, risk mitigation, and operational effectiveness.`;

    const summaryHeight = 45;
    doc.rect(margin, yPosition, contentWidth, summaryHeight, 'FD');
    
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    yPosition = addWrappedText(summaryText, margin + 12, yPosition + 8, contentWidth - 24, 11);
    yPosition += 25;
    }

    // Analysis content with improved formatting
    editableAnalysis.forEach((item, index) => {
      checkNewPage(60); // Ensure we have space for the section

      // Add separator line
      if (index > 0) {
        doc.setDrawColor(229, 231, 235); // gray-200
        doc.setLineWidth(0.5);
        doc.line(margin, yPosition - 10, pageWidth - margin, yPosition - 10);
        yPosition += 5;
      }

      // Professional Section Header
      doc.setFillColor(71, 85, 105); // slate-600
      doc.rect(margin - 8, yPosition - 8, contentWidth + 16, 25, 'F');
      
      // Section number circle
      doc.setFillColor(22, 211, 238); // cyan-500
      doc.circle(margin + 8, yPosition + 4, 6, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text((index + 1).toString(), margin + 6, yPosition + 7);
      
      // Section title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const cleanedTitle = cleanText(item.metric);
      doc.text(cleanedTitle.toUpperCase(), margin + 20, yPosition + 7);
      yPosition += 30;

      // Professional Content Box
      checkNewPage(40);
      
      // Left accent border
      doc.setFillColor(22, 211, 238); // cyan-500
      doc.rect(margin, yPosition, 3, 40, 'F');
      
      // Main content area
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      
      // Calculate content height for box
      const contentLines = item.isStructured 
        ? item.value.split("\n").length 
        : doc.splitTextToSize(item.value, contentWidth - 30).length;
      const contentHeight = Math.max(40, (contentLines * 6) + 20);
      
      doc.rect(margin + 3, yPosition, contentWidth - 3, contentHeight, 'FD');
      yPosition += 12;

      // Professional Content Text
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "normal");

      if (item.isStructured) {
        const lines = item.value.split("\n").filter(line => line.trim());
        lines.forEach((line, lineIdx) => {
          checkNewPage();
          let cleanLine = cleanText(line.trim());
          
          // Enhanced formatting for different content types
          if (cleanLine.startsWith("• ") || cleanLine.startsWith("- ")) {
            // Bullet points
            doc.setTextColor(22, 211, 238); // cyan-500
            doc.text("▪", margin + 15, yPosition);
            doc.setTextColor(51, 65, 85); // slate-700
            doc.setFont("helvetica", "normal");
            cleanLine = cleanLine.substring(2);
            yPosition = addWrappedText(cleanLine, margin + 22, yPosition, contentWidth - 35, 10.5);
          } else if (line.includes("SEVERITY") || line.includes("Summary") || line.includes("Vulnerabilities")) {
            // Headers
            doc.setTextColor(15, 23, 42); // slate-900
            doc.setFont("helvetica", "bold");
            yPosition = addWrappedText(cleanLine, margin + 15, yPosition, contentWidth - 30, 11, "bold");
          } else if (cleanLine.includes(":") && !cleanLine.includes("  ")) {
            // Key-value pairs
            const parts = cleanLine.split(":");
            doc.setTextColor(71, 85, 105); // slate-600
            doc.setFont("helvetica", "bold");
            yPosition = addWrappedText(parts[0] + ":", margin + 15, yPosition, contentWidth - 30, 10.5, "bold");
            if (parts[1]) {
              doc.setTextColor(51, 65, 85); // slate-700
              doc.setFont("helvetica", "normal");
              yPosition = addWrappedText(parts[1].trim(), margin + 15, yPosition + 4, contentWidth - 30, 10.5);
            }
          } else {
            // Regular content
            doc.setTextColor(51, 65, 85); // slate-700
            doc.setFont("helvetica", "normal");
            yPosition = addWrappedText(cleanLine, margin + 15, yPosition, contentWidth - 30, 10.5);
          }
          yPosition += 4;
        });
      } else {
        yPosition = addWrappedText(item.value, margin + 15, yPosition, contentWidth - 30, 10.5);
      }

      yPosition += 10;

      // Observation section if it exists
      if (item.observation && item.observation.trim()) {
        checkNewPage(25);
        
        // Professional Observation Section
        doc.setFillColor(249, 115, 22); // orange-500
        doc.rect(margin, yPosition, 4, 20, 'F');
        
        doc.setFillColor(255, 247, 237); // orange-50
        doc.setDrawColor(251, 146, 60); // orange-400
        doc.setLineWidth(0.5);
        doc.rect(margin + 4, yPosition, contentWidth - 4, 20, 'FD');
        
        // Observation icon and title
        doc.setTextColor(194, 65, 12); // orange-800
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("KEY", margin + 8, yPosition + 8);
        doc.text("OBSERVATION", margin + 8, yPosition + 15);
        
        doc.setTextColor(154, 52, 18); // orange-900
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("CRITICAL FINDING", margin + 35, yPosition + 12);
        yPosition += 25;

        // Observation content with enhanced styling
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(251, 146, 60); // orange-400
        doc.setLineWidth(0.3);
        
        const obsLines = doc.splitTextToSize(cleanText(item.observation), contentWidth - 25);
        const obsHeight = Math.max(25, (obsLines.length * 6) + 15);
        
        doc.rect(margin, yPosition, contentWidth, obsHeight, 'FD');
        
        doc.setTextColor(67, 56, 202); // indigo-700
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "normal");
        yPosition = addWrappedText(item.observation, margin + 12, yPosition + 8, contentWidth - 25, 10.5);
        yPosition += 20;
      }

      yPosition += 15; // Space between sections
    });

    // Professional Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer background
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
      
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
      doc.text("Confidential Analysis Report | Professional Risk Assessment", margin, pageHeight - 6);
      
      // Page numbering
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${i} / ${totalPages}`,
        pageWidth - margin - 15,
        pageHeight - 9
      );
      
      // Document classification
      doc.setTextColor(220, 38, 127); // pink-600
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(
        "CONFIDENTIAL",
        pageWidth - margin - 35,
        pageHeight - 6
      );
    }

    // Save the PDF
    const fileName = `RiskAssessment-Analysis-Report-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF exported successfully with improved formatting!");
  };

  // Share analysis
  const shareAnalysis = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user to share with");
      return;
    }

    setIsSharing(true);
    try {
      // First, get or create the analysis record
      const { data: analysisData, error: analysisError } = await supabase
        .from("audit_analysis")
        .select("id")
        .eq("audit_id", auditId)
        .eq("analysis_type", analysisType)
        .single();

      if (analysisError && analysisError.code !== "PGRST116") {
        throw analysisError;
      }

      let analysisId = analysisData?.id;

      // If analysis doesn't exist, create it
      if (!analysisId) {
        const { data: newAnalysis, error: createError } = await supabase
          .from("audit_analysis")
          .insert({
            audit_id: auditId,
            analysis_type: analysisType,
            results: editableAnalysis,
            created_by: currentUser.id,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        analysisId = newAnalysis.id;
      }

      // Create shares for selected users
      const shares = selectedUsers.map((userId) => ({
        analysis_id: analysisId,
        shared_with_user_id: userId,
        shared_by_user_id: currentUser.id,
        permission_level: permissionLevel,
        expires_at: shareExpiry ? new Date(shareExpiry).toISOString() : null,
      }));

      const { error: shareError } = await supabase
        .from("analysis_shares")
        .insert(shares);

      if (shareError) throw shareError;

      // Create notifications for shared users
      const notificationPromises = selectedUsers.map(async (userId) => {
        try {
          const response = await orionFetch("/api/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              type: "analysis_shared",
              title: "Analysis Shared",
              message: `${
                currentUser?.user_metadata?.full_name || currentUser?.email
              } shared a ${analysisType} analysis with you.`,
              data: {
                auditId,
                analysisType,
                analysisId,
                sharedBy: currentUser.id,
              },
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(`Failed to create notification for user: ${userId}`, {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
            });
            return { userId, success: false, error: errorData };
          }
          return { userId, success: true };
        } catch (error) {
          console.error(
            `Error creating notification for user: ${userId}`,
            error
          );
          return { userId, success: false, error: error.message };
        }
      });

      const notificationResults = await Promise.all(notificationPromises);
      const failedNotifications = notificationResults.filter(
        (result) => !result.success
      );

      if (failedNotifications.length > 0) {
        console.warn(
          `${failedNotifications.length} notification(s) failed to send:`,
          failedNotifications
        );
        toast.success(
          `Analysis shared with ${selectedUsers.length} user(s) (${failedNotifications.length} notifications failed)`
        );
      } else {
        toast.success(`Analysis shared with ${selectedUsers.length} user(s)`);
      }
      setIsSharing(false);
      setSelectedUsers([]);
      setShareExpiry("");
    } catch (error) {
      console.error("Error sharing analysis:", error);
      toast.error("Failed to share analysis");
    } finally {
      setIsSharing(false);
    }
  };

  // Handle user selection for sharing
  const handleUserSelection = (userId, checked) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    }
  };

  // Generate LaTeX content (unchanged from previous fix)
  const generateLatex = () => {
    if (editableAnalysis.length === 0) {
      toast.error("No analysis data to export.");
      return;
    }

    let latexContent = `
\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{geometry}
\\geometry{a4paper, margin=1in}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{parskip}
\\usepackage{noto}

\\title{Audit Analysis Report}
\\author{}
\\date{\\today}

\\begin{document}

\\maketitle

\\section*{${
      analysisType.charAt(0).toUpperCase() + analysisType.slice(1)
    } Analysis}
`;

    editableAnalysis.forEach((item) => {
      latexContent += `
\\subsection*{\\textbf{${item.metric.replace(
        /([{}])/g,
        "\\$1"
      )}} \\quad {\\small (${item.icon})}}
`;

      if (item.isStructured) {
        let listItems = "";
        item.value.split("\n").forEach((line) => {
          const cleanedLine = line
            .replace(/^• /, "")
            .replace(/([{}])/g, "\\$1"); // Basic LaTeX escaping
          listItems += `  \\item ${cleanedLine}\n`;
        });

        latexContent += `
\\begin{itemize}[leftmargin=*]
${listItems}\\end{itemize}
`;

        if (item.observation) {
          latexContent += `\\textbf{Observation:} ${item.observation.replace(
            /([{}])/g,
            "\\$1"
          )}\n`;
        }
      } else {
        latexContent += `${item.value.replace(/([{}])/g, "\\$1")}\n`;
      }

      latexContent += "\n";
    });

    latexContent += `
\\end{document}
    `.trim();

    // Trigger download
    const blob = new Blob([latexContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-report-${analysisType}.tex`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      "LaTeX file downloaded! Compile it in Overleaf or a LaTeX editor to get the PDF."
    );
  };

  // Back navigation
  const handleBack = () => {
    router.back();
  };

  console.log(
    "Render check - editableAnalysis.length:",
    editableAnalysis.length
  );
  console.log("Render check - statusText:", statusText);
  console.log("Render check - progress:", progress);

  if (editableAnalysis.length === 0) {
    return (
      <div className="dashboard-container p-6">
        <main className="main-content">
          <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  {statusText || "Preparing analysis..."}
                </p>
                <ProgressBar progress={progress} />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container p-6">
      <main className="main-content">
        <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-gray-900 dark:text-white">
                {analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}{" "}
                Analysis Results
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Back
                </Button>

                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <MdEdit className="w-5 h-5 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={saveAnalysis}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <MdSave className="w-5 h-5 mr-2" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      <MdCancel className="w-5 h-5 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}

                <Button
                  onClick={generatePDF}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <MdDownload className="w-5 h-5 mr-2" />
                  Export PDF
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      <MdShare className="w-5 h-5 mr-2" />
                      Share
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 dark:text-white">
                        Share Analysis
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-700 dark:text-gray-300">
                          Select Users
                        </Label>
                        <div className="max-h-40 overflow-y-auto space-y-2 mt-2">
                          {users.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={user.id}
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={(checked) =>
                                  handleUserSelection(user.id, checked)
                                }
                              />
                              <Label
                                htmlFor={user.id}
                                className="text-gray-900 dark:text-white flex items-center space-x-2"
                              >
                                <MdPerson className="w-4 h-4" />
                                <span>{user.full_name || user.email}</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-gray-700 dark:text-gray-300">
                          Permission Level
                        </Label>
                        <Select
                          value={permissionLevel}
                          onValueChange={setPermissionLevel}
                        >
                          <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                            <SelectItem
                              value="view"
                              className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              View Only
                            </SelectItem>
                            <SelectItem
                              value="edit"
                              className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Edit
                            </SelectItem>
                            <SelectItem
                              value="comment"
                              className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Comment
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-gray-700 dark:text-gray-300">
                          Expiry Date (Optional)
                        </Label>
                        <Input
                          type="datetime-local"
                          value={shareExpiry}
                          onChange={(e) => setShareExpiry(e.target.value)}
                          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={shareAnalysis}
                          disabled={isSharing || selectedUsers.length === 0}
                          className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                        >
                          {isSharing ? "Sharing..." : "Share"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {editableAnalysis.map((item, index) => (
                <div key={index} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{item.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.metric}
                    </h3>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={item.value}
                      onChange={(e) =>
                        handleContentChange(index, "value", e.target.value)
                      }
                      className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white min-h-[150px]"
                      placeholder="Edit analysis content..."
                    />
                  ) : (
                    <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-[150px]">
                      {item.isStructured ? (
                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                          {item.value.split("\n").map((line, lineIndex) => (
                            <p key={lineIndex} className="leading-relaxed">
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {item.value}
                        </p>
                      )}
                    </div>
                  )}

                  {item.observation && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Observation
                      </label>
                      {isEditing ? (
                        <Textarea
                          value={item.observation}
                          onChange={(e) =>
                            handleContentChange(
                              index,
                              "observation",
                              e.target.value
                            )
                          }
                          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white min-h-[100px]"
                          placeholder="Edit observation..."
                        />
                      ) : (
                        <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-[100px]">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {item.observation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <Separator className="bg-gray-300 dark:bg-gray-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
