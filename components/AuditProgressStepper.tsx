"use client";

import React from "react";
import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  description: string;
  path: string;
}

interface AuditProgressStepperProps {
  currentStep: string;
  auditId?: string;
  planId?: string;
  className?: string;
}

const steps: Step[] = [
  {
    id: "audit-plan",
    label: "Audit Planning",
    description: "Define scope, objectives, and structure",
    path: "/dashboard/audit-plan",
  },
  {
    id: "task-creation",
    label: "Task Creation",
    description: "Create and customize audit tasks",
    path: "/dashboard/audit-wizard/step3",
  },
  {
    id: "audit-summary",
    label: "Audit Summary",
    description: "Review and finalize audit plan",
    path: "/dashboard/audit-summary",
  },
  {
    id: "fieldwork",
    label: "Fieldwork Execution",
    description: "Execute tasks and collect evidence",
    path: "/dashboard/audit-fieldwork",
  },
];

export default function AuditProgressStepper({
  currentStep,
  auditId,
  planId,
  className,
}: AuditProgressStepperProps) {
  const router = useRouter();
  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.id === currentStep);
  };

  const currentStepIndex = getCurrentStepIndex();

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return "completed";
    if (stepIndex === currentStepIndex) return "current";
    return "upcoming";
  };

  const buildStepUrl = (step: Step) => {
    let url = step.path;
    const params = new URLSearchParams();

    if (auditId) {
      if (step.id === "audit-plan") {
        params.append("audit_id", auditId);
      } else if (step.id === "audit-summary") {
        params.append("id", auditId);
        if (planId) params.append("plan_id", planId);
      } else if (step.id === "fieldwork") {
        params.append("audit_id", auditId);
      } else if (step.id === "task-creation") {
        params.append("audit_id", auditId);
        if (planId) params.append("id", planId);
      }
    }

    return params.toString() ? `${url}?${params.toString()}` : url;
  };

  return (
    <div className={cn("w-full mb-8", className)}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Audit Progress
        </h3>

        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isClickable = status === "completed" || status === "current";

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  {/* Step Circle */}
                  <div
                    className={cn(
                      "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                      {
                        "bg-green-500 border-green-500 text-white":
                          status === "completed",
                        "bg-blue-500 border-blue-500 text-white":
                          status === "current",
                        "bg-gray-100 border-gray-300 text-gray-500":
                          status === "upcoming",
                        "cursor-pointer hover:scale-105": isClickable,
                      }
                    )}
                    onClick={() => {
                      if (isClickable && auditId) {
                        router.push(buildStepUrl(step));
                      }
                    }}
                  >
                    {status === "completed" ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}

                    {/* Step Number */}
                    <span className="absolute text-xs font-semibold">
                      {status === "completed" ? "✓" : index + 1}
                    </span>
                  </div>

                  {/* Step Label */}
                  <div className="mt-3 text-center">
                    <p
                      className={cn(
                        "text-sm font-medium transition-colors duration-200",
                        {
                          "text-green-600": status === "completed",
                          "text-blue-600": status === "current",
                          "text-gray-500": status === "upcoming",
                          "cursor-pointer hover:text-blue-700": isClickable,
                        }
                      )}
                      onClick={() => {
                        if (isClickable && auditId) {
                          router.push(buildStepUrl(step));
                        }
                      }}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[120px]">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Arrow between steps */}
                {index < steps.length - 1 && (
                  <div className="flex items-center px-4">
                    <ArrowRight
                      className={cn("w-5 h-5 transition-colors duration-200", {
                        "text-green-400": index < currentStepIndex,
                        "text-blue-400": index === currentStepIndex - 1,
                        "text-gray-300": index >= currentStepIndex,
                      })}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300 ease-in-out"
              style={{
                width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Start</span>
            <span>
              {Math.round(((currentStepIndex + 1) / steps.length) * 100)}%
              Complete
            </span>
            <span>Finish</span>
          </div>
        </div>
      </div>
    </div>
  );
}
