"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Tasks,
  TaskItem,
  TaskContent,
  TaskTitle,
  TaskDescription,
  TaskMeta,
} from "@/components/ui/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Target,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  showError,
  showInfo,
  showLoading,
  dismissLoading,
  showNetworkError,
  showAccessDenied,
} from "@/lib/toast";
import AuditProgressStepper from "@/components/AuditProgressStepper";

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

const AuditFieldworkPage = () => {
  const searchParams = useSearchParams();
  const auditId = searchParams.get("id");
  const planId = searchParams.get("plan_id");
  const [tasks, setTasks] = useState<AuditTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateLastPage = async () => {
    if (!auditId) {
      showError(
        "Missing Audit ID",
        "Unable to update last page without audit ID"
      );
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("audits")
        .update({
          last_page: `/dashboard/audit-fieldwork?id=${auditId}&plan_id=${planId}`,
        })
        .eq("id", auditId);

      if (updateError) {
        console.error("Failed to update last_page:", updateError);
        showError("Navigation Error", "Failed to update navigation history");
      }
    } catch (err) {
      console.error("Error updating last page:", err);
      showError("Navigation Error", "Failed to update navigation history");
    }
  };

  useEffect(() => {
    updateLastPage();
  }, [auditId, planId]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!planId) {
        const errorMsg = "No plan ID provided";
        setError(errorMsg);
        setLoading(false);
        showError(
          "Missing Plan ID",
          "Please provide a valid plan ID to view tasks"
        );
        return;
      }

      const loadingToast = showLoading("Loading audit tasks...");

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("audit_tasks")
          .select("*")
          .eq("plan_id", planId)
          .order("date", { ascending: true });

        if (error) {
          throw error;
        }

        console.log(`Plan ID: ${planId}`);
        setTasks(data || []);

        if (data && data.length > 0) {
          dismissLoading(
            loadingToast,
            "success",
            `Loaded ${data.length} audit tasks`
          );
        } else {
          dismissLoading(
            loadingToast,
            "warning",
            "No audit tasks found for this plan"
          );
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
        const errorMsg = "Failed to load audit tasks";
        setError(errorMsg);
        dismissLoading(loadingToast, "error", errorMsg);
        showNetworkError("load audit tasks");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [planId]);

  const getTaskTypeIcon = (taskType?: string) => {
    switch (taskType) {
      case "control_testing":
        return "✅";
      case "document_review":
        return "📄";
      case "interviews":
        return "👥";
      case "observation":
        return "👁️";
      case "data_analysis":
        return "📊";
      default:
        return "📋";
    }
  };

  const getTaskTypeLabel = (taskType?: string) => {
    switch (taskType) {
      case "control_testing":
        return "Control Testing";
      case "document_review":
        return "Document Review";
      case "interviews":
        return "Interviews";
      case "observation":
        return "Observation";
      case "data_analysis":
        return "Data Analysis";
      default:
        return "Not Specified";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "blocked":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      case "blocked":
        return "Blocked";
      default:
        return "Not Started";
    }
  };

  const getProgressStats = () => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const notStarted = total - completed - inProgress - blocked;

    return { total, completed, inProgress, blocked, notStarted };
  };

  const confirmTasksCompletion = () => {
    const stats = getProgressStats();
    if (stats.completed === stats.total) {
      showInfo("Confirmation", "All tasks are completed!");
    } else {
      showInfo("Confirmation", "Some tasks are still in progress.");
      return;
    }
  };

  const handleGoBack = () => {
    showInfo("Navigation", "Returning to previous page");
    window.history.back();
  };

  const stats = getProgressStats();

  if (loading) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="loading">Loading audit tasks...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={handleGoBack}>Go Back</Button>
          </div>
        </main>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="dashboard-header">
            <div>
              <h2 className="header-title">Audit Fieldwork</h2>
              <p className="header-subtitle">
                Manage your audit fieldwork tasks
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-400 mb-4">
              No audit tasks found for this plan.
            </p>
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
            <h2 className="header-title">Audit Fieldwork Tasks</h2>
            <p className="header-subtitle">
              Click on any task to begin your audit fieldwork
            </p>
          </div>
        </div>

        <AuditProgressStepper
          currentStep="fieldwork"
          auditId={auditId}
          planId={planId}
        />

        {/* Progress Overview */}
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-header-title">Progress Overview</h3>
          </div>
          <div className="p-4">
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-value">{stats.total}</span>
                </div>
                <div className="metric-subtitle">Total Tasks</div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-value" style={{ color: "#10b981" }}>
                    {stats.completed}
                  </span>
                </div>
                <div className="metric-subtitle">Completed</div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-value" style={{ color: "#3b82f6" }}>
                    {stats.inProgress}
                  </span>
                </div>
                <div className="metric-subtitle">In Progress</div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-value" style={{ color: "#ef4444" }}>
                    {stats.blocked}
                  </span>
                </div>
                <div className="metric-subtitle">Blocked</div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-value" style={{ color: "#9ca3af" }}>
                    {stats.notStarted}
                  </span>
                </div>
                <div className="metric-subtitle">Not Started</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-header-title">Audit Tasks</h3>
          </div>
          <div className="p-4">
            <Tasks>
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  href={`/dashboard/audit-fieldwork/task/${task.id}?audit_id=${auditId}&plan_id=${planId}`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/10">
                    <span className="text-sm">
                      {getTaskTypeIcon(task.task_type)}
                    </span>
                  </div>
                  <TaskContent>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <TaskTitle>{task.task}</TaskTitle>
                        <TaskDescription>
                          <strong>Goal:</strong> {task.goal}
                        </TaskDescription>
                        <TaskDescription>
                          <strong>Control:</strong> {task.control}
                        </TaskDescription>
                        <TaskMeta className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.date).toLocaleDateString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getTaskTypeLabel(task.task_type)}
                          </Badge>
                        </TaskMeta>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {getStatusIcon(task.status)}
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                      </div>
                    </div>

                    {/* Show findings indicator if any */}
                    {task.findings && (
                      <div className="mt-2 flex items-center gap-1 text-orange-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs">Findings documented</span>
                      </div>
                    )}
                  </TaskContent>
                </TaskItem>
              ))}
            </Tasks>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuditFieldworkPage;
