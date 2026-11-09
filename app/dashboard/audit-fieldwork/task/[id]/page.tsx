"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { updateAuditLastPage } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Target,
  Shield,
  ArrowLeft,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import {
  showError,
  showSuccess,
  showWarning,
  showInfo,
  showLoading,
  dismissLoading,
  showNetworkError,
  showValidationError,
  validateRequired,
  showSaveSuccess,
  showSaveError,
  showUploadSuccess,
  showUploadError,
  showTaskStarted,
  showTaskCompleted,
  showTaskBlocked,
  showEvidenceUploaded,
  showFindingDocumented,
} from "@/lib/toast";

interface AuditTask {
  id: string;
  task: string;
  goal: string;
  control: string;
  date: string;
  plan_id: string;
  task_type?: string;
  status?: string;
  notes?: string;
  findings?: string;
  evidence?: string[];
}

const TaskDetailPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const taskId = params.id as string;
  const auditId = searchParams.get("audit_id");
  const planId = searchParams.get("plan_id");

  const [task, setTask] = useState<AuditTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [taskType, setTaskType] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [findings, setFindings] = useState("");
  const [severity, setSeverity] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceNotes, setEvidenceNotes] = useState("");

  const taskTypes = [
    {
      value: "control_testing",
      label: "Control Testing",
      icon: "✅",
      description: "Select samples, test against expected outcomes",
    },
    {
      value: "document_review",
      label: "Document Review",
      icon: "📄",
      description: "Compare policies/procedures with standards",
    },
    {
      value: "interviews",
      label: "Interviews",
      icon: "👥",
      description: "Ask specific questions to staff",
    },
    {
      value: "observation",
      label: "Observation",
      icon: "👁️",
      description: "Watch processes being performed",
    },
    {
      value: "data_analysis",
      label: "Data Analysis",
      icon: "📊",
      description: "Use tools to detect anomalies",
    },
  ];

  const statusOptions = [
    {
      value: "not_started",
      label: "Not Started",
      icon: Clock,
      color: "bg-gray-100 text-gray-800",
    },
    {
      value: "in_progress",
      label: "In Progress",
      icon: Clock,
      color: "bg-blue-100 text-blue-800",
    },
    {
      value: "completed",
      label: "Completed",
      icon: CheckCircle,
      color: "bg-green-100 text-green-800",
    },
    {
      value: "blocked",
      label: "Blocked",
      icon: XCircle,
      color: "bg-red-100 text-red-800",
    },
  ];

  const severityOptions = [
    { value: "low", label: "Low", color: "bg-green-100 text-green-800" },
    {
      value: "medium",
      label: "Medium",
      color: "bg-yellow-100 text-yellow-800",
    },
    { value: "high", label: "High", color: "bg-red-100 text-red-800" },
  ];

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) {
        const errorMsg = "No task ID provided";
        setError(errorMsg);
        setLoading(false);
        showError("Missing Task ID", "Please provide a valid task ID");
        return;
      }

      const loadingToast = showLoading("Loading task details...");

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("audit_tasks")
          .select("*")
          .eq("id", taskId)
          .single();

        if (error) {
          throw error;
        }

        setTask(data);
        setTaskType(data.task_type || "");
        setStatus(data.status || "not_started");
        setNotes(data.notes || "");
        setFindings(data.findings || "");
        setSeverity(data.severity || "");
        setRecommendation(data.recommendation || "");

        dismissLoading(
          loadingToast,
          "success",
          "Task details loaded successfully"
        );

        // Show task started notification if status is in progress
        if (data.status === "in_progress") {
          showTaskStarted(data.task);
        }
      } catch (err) {
        console.error("Error fetching task:", err);
        const errorMsg = "Failed to load audit task";
        setError(errorMsg);
        dismissLoading(loadingToast, "error", errorMsg);
        showNetworkError("load task details");
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
    // Persist last page for the parent audit when viewing a specific task
    const auditIdParam = searchParams.get("audit_id");
    const planIdParam = searchParams.get("plan_id");
    if (auditIdParam) {
      const supabaseClient = createClient();
      updateAuditLastPage(
        supabaseClient,
        auditIdParam,
        `/dashboard/audit-fieldwork/task/${taskId}?audit_id=${auditIdParam}&plan_id=${planIdParam}`
      );
    }
  }, [taskId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file types
    const allowedTypes = [
      ".pdf",
      ".png",
      ".jpg",
      ".jpeg",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".txt",
    ];
    const invalidFiles = files.filter((file) => {
      const extension = "." + file.name.split(".").pop()?.toLowerCase();
      return !allowedTypes.includes(extension);
    });

    if (invalidFiles.length > 0) {
      showError(
        "Invalid File Type",
        `${invalidFiles.map((f) => f.name).join(", ")} are not supported`
      );
      return;
    }

    // Validate file sizes (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter((file) => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      showError(
        "File Too Large",
        `${oversizedFiles.map((f) => f.name).join(", ")} exceed 10MB limit`
      );
      return;
    }

    setEvidenceFiles((prev) => [...prev, ...files]);

    files.forEach((file) => {
      showUploadSuccess(file.name);
    });
  };

  const removeFile = (index: number) => {
    const removedFile = evidenceFiles[index];
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
    showInfo(
      "File Removed",
      `${removedFile.name} has been removed from upload queue`
    );
  };

  const validateForm = (): boolean => {
    // Validate task type
    if (!validateRequired(taskType, "Task Type")) {
      return false;
    }

    // Validate status
    if (!validateRequired(status, "Task Status")) {
      return false;
    }

    // Validate notes if status is completed
    if (status === "completed" && !validateRequired(notes, "Fieldwork Notes")) {
      return false;
    }

    // Validate findings if present
    if (findings && !validateRequired(severity, "Finding Severity")) {
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    const loadingToast = showLoading("Saving fieldwork data...");

    try {
      const supabase = createClient();

      // Upload evidence files if any
      const uploadedFiles: string[] = [];
      for (const file of evidenceFiles) {
        const fileName = `${taskId}/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from("audit-evidence")
          .upload(fileName, file);

        if (error) {
          showUploadError(file.name, error.message);
          continue;
        }

        if (data) {
          const { data: urlData } = supabase.storage
            .from("audit-evidence")
            .getPublicUrl(fileName);
          uploadedFiles.push(urlData.publicUrl);
          showEvidenceUploaded(file.name);
        }
      }

      // Update task with all fieldwork data
      const { error: updateError } = await supabase
        .from("audit_tasks")
        .update({
          task_type: taskType,
          status: status,
          notes: notes,
          findings: findings,
          severity: severity,
          recommendation: recommendation,
          evidence: uploadedFiles.length > 0 ? uploadedFiles : null,
          evidence_notes: evidenceNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (updateError) {
        throw updateError;
      }

      // Show appropriate notifications based on status change
      if (status === "completed") {
        showTaskCompleted(task?.task || "Task");
      } else if (status === "blocked") {
        showTaskBlocked(task?.task || "Task");
      } else if (status === "in_progress") {
        showTaskStarted(task?.task || "Task");
      }

      // Show finding notification if findings were added
      if (findings && severity) {
        showFindingDocumented(severity);
      }

      dismissLoading(
        loadingToast,
        "success",
        "Fieldwork data saved successfully"
      );
      showSaveSuccess("Fieldwork data");
    } catch (err) {
      console.error("Error saving task:", err);
      dismissLoading(loadingToast, "error", "Failed to save fieldwork data");
      showSaveError(
        "fieldwork data",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGoBack = () => {
    showInfo("Navigation", "Returning to task list");
    window.history.back();
  };

  const getStatusIcon = (statusValue: string) => {
    const status = statusOptions.find((s) => s.value === statusValue);
    return status ? status.icon : Clock;
  };

  const getStatusColor = (statusValue: string) => {
    const status = statusOptions.find((s) => s.value === statusValue);
    return status ? status.color : "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="loading">Loading task details...</div>
        </main>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || "Task not found"}</p>
            <Button onClick={handleGoBack}>Go Back</Button>
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
            <h2 className="header-title">Audit Task Details</h2>
            <p className="header-subtitle">
              Complete your fieldwork for this task
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </div>

        <div className="space-y-6">
          {/* Task Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Task Information</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label className="font-medium">Task Description</Label>
                <p className="mt-1 text-gray-300">{task.task}</p>
              </div>

              <div>
                <Label className="font-medium">Goal</Label>
                <p className="mt-1 text-gray-300">{task.goal}</p>
              </div>

              <div>
                <Label className="font-medium">Control</Label>
                <p className="mt-1 text-gray-300">{task.control}</p>
              </div>

              <div>
                <Label className="font-medium">Due Date</Label>
                <p className="mt-1 text-gray-300">
                  {new Date(task.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Task Type Selection */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">
                Task Type & Execution Method
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label>Task Type *</Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {taskType && (
                <div className="p-4 bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-300">
                    <strong>Execution Method:</strong>{" "}
                    {taskTypes.find((t) => t.value === taskType)?.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status & Progress */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Task Status</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label>Current Status *</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Working Papers */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Working Papers</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label htmlFor="notes">
                  Fieldwork Notes {status === "completed" && "*"}
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Document what you tested/reviewed, the method used, and the results..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2 min-h-[150px]"
                />
              </div>
            </div>
          </div>

          {/* Evidence Collection */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Evidence Collection</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label>Upload Evidence</Label>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleFileUpload}
                  className="mt-2"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Supported: Screenshots, PDFs, System logs, Interview
                  transcripts, Photos (Max 10MB each)
                </p>
              </div>

              {evidenceFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Files:</Label>
                  {evidenceFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-800 rounded"
                    >
                      <span className="text-sm">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>Evidence Notes</Label>
                <Textarea
                  placeholder="Add notes about the evidence collected..."
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  className="mt-2 min-h-[100px]"
                />
              </div>
            </div>
          </div>

          {/* Findings */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Findings & Issues</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label>Findings</Label>
                <Textarea
                  placeholder="Document any non-compliance or weaknesses discovered..."
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  className="mt-2 min-h-[100px]"
                />
              </div>

              {findings && (
                <>
                  <div>
                    <Label>Severity *</Label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {severityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <Badge className={option.color}>
                              {option.label}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Recommendation</Label>
                    <Textarea
                      placeholder="Suggest corrective actions or improvements..."
                      value={recommendation}
                      onChange={(e) => setRecommendation(e.target.value)}
                      className="mt-2 min-h-[100px]"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="card">
            <div className="p-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? "Saving..." : "Save Fieldwork"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TaskDetailPage;
