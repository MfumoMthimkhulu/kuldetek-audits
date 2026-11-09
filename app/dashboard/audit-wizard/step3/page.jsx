"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { X, Plus } from "lucide-react";
import {
  showError,
  showSuccess,
  showWarning,
  showInfo,
  showLoading,
  dismissLoading,
  showValidationError,
  validateRequired,
  showSaveSuccess,
  showSaveError,
} from "@/lib/toast";
import AuditProgressStepper from "@/components/AuditProgressStepper";
import "../../../Dashboard.css";

export default function Step3() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auditId = searchParams.get("audit_id");
  const planId = searchParams.get("id");
  const summaryRef = useRef(null);

  const [tasks, setTasks] = useState([
    { task: "", goal: "", control: "", target_date: "" },
  ]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  useEffect(() => {
    if (auditId && planId) {
      async function saveCurrentStep() {
        await supabase.from("audit_plans").update({ last_step: "step2" }).eq("id", planId);
      }
      saveCurrentStep();
      setLoading(false);
      return;
    }

    if (!planId) {
      setLoading(false);
      showWarning("Missing Template ID", "No template ID provided");
      return;
    }

    const parsedId = parseInt(planId, 10);
    if (isNaN(parsedId)) {
      setLoading(false);
      showError("Invalid Template ID", "Template ID must be a valid number");
      return;
    }

    async function fetchTemplate() {
      setLoading(true);
      const loadingToast = showLoading("Loading audit template...");

      try {
        const { data, error } = await supabase
          .from("audit_plan_templates")
          .select("activities")
          .eq("id", parsedId)
          .single();

        if (error) {
          throw error;
        }

        setTasks(
          data?.activities?.length
            ? data.activities.map((a) => ({
                task: a.activity || "",
                goal: "",
                control: "",
                target_date: "",
              }))
            : [{ task: "", goal: "", control: "", target_date: "" }]
        );

        dismissLoading(loadingToast, "success", "Template loaded successfully");
      } catch (error) {
        console.error("Error loading audit template:", error.message);
        dismissLoading(loadingToast, "error", "Failed to load template");
        showError("Template Load Error", error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTemplate();

  }, [auditId, planId, supabase]);

  function updateTaskField(index, field, value) {
    setTasks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addTask() {
    setTasks((prev) => [
      ...prev,
      { task: "", goal: "", control: "", target_date: "" },
    ]);
    showInfo("Task Added", "New task field has been added");
  }

  function removeTask(index) {
    if (tasks.length > 1) {
      setTasks((prev) => prev.filter((_, i) => i !== index));
      showInfo("Task Removed", "Task has been removed");
    } else {
      showWarning("Cannot Remove", "At least one task is required");
    }
  }

  const validateTasks = () => {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (!validateRequired(task.task, `Task ${i + 1} Description`)) {
        return false;
      }
    }
    return true;
  };

  async function onSubmit() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showError(
        "Authentication Required",
        "You must be logged in to create tasks"
      );
      return;
    }

    if (!planId) {
      showError("Missing Plan ID", "Audit plan ID is required");
      return;
    }

    if (!validateTasks()) {
      return;
    }

    const loadingToast = showLoading("Creating audit tasks...");

    try {
      // Insert tasks into `audit_tasks` with plan_id and date
      const tasksToInsert = tasks.map((t) => ({
        task: t.task.trim(),
        goal: t.goal.trim() || "-",
        control: t.control.trim() || "-",
        date: t.target_date || new Date().toISOString().split("T")[0], // fallback to today
        plan_id: planId,
      }));

      const { error: insertError } = await supabase
        .from("audit_tasks")
        .insert(tasksToInsert);

      if (insertError) {
        throw insertError;
      }

      dismissLoading(
        loadingToast,
        "success",
        `Successfully created ${tasksToInsert.length} audit tasks`
      );
      showSaveSuccess("Audit tasks");

      // ✅ Redirect to the audit workspace or overview page
      router.push(`/dashboard/audit-summary?id=${auditId}&plan_id=${planId}`);
    } catch (error) {
      console.error(error);
      dismissLoading(loadingToast, "error", "Failed to create audit tasks");
      showSaveError("audit tasks", error.message);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="loading">Loading tasks...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h2 className="header-title">Step 3: Review & Customize Tasks</h2>
            <p className="header-subtitle">
              Define the specific tasks for your audit
            </p>
          </div>
        </div>

        <AuditProgressStepper
          currentStep="task-creation"
          auditId={auditId}
          planId={planId?.toString()}
        />

        <div className="space-y-6">
          {tasks.map((task, idx) => (
            <div key={idx} className="card">
              <div className="card-header">
                <h3 className="card-header-title">Task {idx + 1}</h3>
                {tasks.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeTask(idx)}
                    className="btn-icon btn-danger"
                    title="Remove Task"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="p-4 space-y-4">
                <div className="form-group">
                  <label>Task Description *</label>
                  <Textarea
                    placeholder="Describe the task to be performed"
                    value={task.task || ""}
                    onChange={(e) =>
                      updateTaskField(idx, "task", e.target.value)
                    }
                    className="form-input min-h-[80px] resize-none"
                  />
                </div>
                <div className="form-group">
                  <label>Goal</label>
                  <Textarea
                    placeholder="What is the goal of this task?"
                    value={task.goal || ""}
                    onChange={(e) =>
                      updateTaskField(idx, "goal", e.target.value)
                    }
                    className="form-input min-h-[80px] resize-none"
                  />
                </div>
                <div className="form-group">
                  <label>Control</label>
                  <Textarea
                    placeholder="What control is being tested?"
                    value={task.control || ""}
                    onChange={(e) =>
                      updateTaskField(idx, "control", e.target.value)
                    }
                    className="form-input min-h-[80px] resize-none"
                  />
                </div>
                <div className="form-group">
                  <label>Target Date</label>
                  <Input
                    type="date"
                    value={task.target_date || ""}
                    onChange={(e) =>
                      updateTaskField(idx, "target_date", e.target.value)
                    }
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-4">
            <Button onClick={addTask} className="btn-secondary">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
            <Button onClick={onSubmit} className="btn-primary">
              Create Tasks
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
