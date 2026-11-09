"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { updateAuditLastPage } from "@/lib/utils";
import { useRouter } from "next/navigation";
import AuditProgressStepper from "@/components/AuditProgressStepper";
import "../../Dashboard.css";

export default function AuditPlan() {
  const searchParams = useSearchParams();
  const [success, setSuccess] = useState(true);
  const auditId = searchParams.get("audit_id");

  const router = useRouter();
  const supabase = createClient();
  const [users, setUsers] = useState([]);

  // Initialize plan state with default values
  const [plan, setPlan] = useState({
    title: "",
    summary: "",
    objectives: [""],
    systems: [],
    auditCriteria: [""],
    riskSummary: [],
    roles: [{ name: "", role: "", responsibility: "" }],
    schedule: [{ activity: "", start_date: "", end_date: "" }],
  });
  const [planId, setPlanId] = useState();
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    if (!auditId) return;
    updateAuditLastPage(
      supabase,
      auditId,
      `/dashboard/audit-plan?audit_id=${auditId}`
    );
  }, [auditId]);

  useEffect(() => {
    if (planId) {
      supabase
        .from("audit_plans")
        .update({ last_step: "step1" })
        .eq("id", planId);
    }
  }, [planId]);

  useEffect(() => {
    async function fetchUsers() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,role");

      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers(data);
      }
    }
    fetchUsers();
  }, []);

  // Populate plan state with data from query parameters
  useEffect(() => {
    const data = searchParams.get("data");
    if (data) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(data));
        setPlan({
          title: parsedData.title || "",
          summary: parsedData.summary || "",
          objectives: parsedData.objectives || [""],
          systems: parsedData.systems || [],
          auditCriteria: parsedData.auditCriteria || [""],
          riskSummary: parsedData.riskSummary || [],
          roles: parsedData.roles || [
            { name: "", role: "", responsibility: "" },
          ],
          schedule: parsedData.schedule || [
            { activity: "", start_date: "", end_date: "" },
          ],
        });
        setPlanId(parsedData.id);
      } catch (error) {
        console.error("Failed to parse audit data:", error);
      }
    }
  }, [searchParams]);

  const handleChange = (field, value) => {
    setPlan({ ...plan, [field]: value });
  };

  const hasError = (fieldKey) => {
    return (
      validationErrors &&
      validationErrors.some((e) => e.field && e.field.indexOf(fieldKey) === 0)
    );
  };

  const clearFieldErrors = (fieldKey) => {
    if (!validationErrors || validationErrors.length === 0) return;
    const remaining = validationErrors.filter(
      (e) => !(e.field && e.field.indexOf(fieldKey) === 0)
    );
    setValidationErrors(remaining);
  };

  const removeItem = (field, index) => {
    const newArray = [...plan[field]];
    newArray.splice(index, 1);
    setPlan({ ...plan, [field]: newArray });
  };

  const addScope = () => {
    setPlan({
      ...plan,
      systems: [...plan.systems, { name: "", rating: "", justification: "" }],
    });
  };

  const addRisk = () => {
    setPlan({
      ...plan,
      riskSummary: [
        ...plan.riskSummary,
        { activity: "", rating: "", justification: "" },
      ],
    });
  };

  const addSchedule = () => {
    setPlan({
      ...plan,
      schedule: [
        ...plan.schedule,
        { activity: "", start_date: "", end_date: "" },
      ],
    });
  };

  // Client-side validation according to DB constraints
  const validatePlan = () => {
    const errors = [];

    // Title required
    if (!plan.title || plan.title.trim() === "") {
      errors.push({ field: "title", message: "Audit title is required." });
    }

    // Validate systems (audit_scope): rating must be High/Medium/Low
    const allowedRatings = ["High", "Medium", "Low"];
    plan.systems.forEach((s, idx) => {
      if (s.name && s.name.trim() !== "") {
        if (!s.rating || !allowedRatings.includes(s.rating)) {
          errors.push({
            field: `systems.${idx}.rating`,
            message: `Scope rating must be one of: ${allowedRatings.join(
              ", "
            )}`,
          });
        }
      }
    });

    // Validate riskSummary (audit_risks)
    plan.riskSummary.forEach((r, idx) => {
      if (r.activity && r.activity.trim() !== "") {
        if (!r.rating || !allowedRatings.includes(r.rating)) {
          errors.push({
            field: `riskSummary.${idx}.rating`,
            message: `Risk rating must be one of: ${allowedRatings.join(", ")}`,
          });
        }
      }
    });

    // Validate schedule dates: start_date and end_date required and start <= end
    plan.schedule.forEach((s, idx) => {
      if (s.activity && s.activity.trim() !== "") {
        if (!s.start_date || !s.end_date) {
          errors.push({
            field: `schedule.${idx}.dates`,
            message: `Schedule entries require both start and end dates.`,
          });
        } else {
          const start = new Date(s.start_date);
          const end = new Date(s.end_date);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            errors.push({
              field: `schedule.${idx}.dates`,
              message: `Schedule dates must be valid dates.`,
            });
          } else if (start > end) {
            errors.push({
              field: `schedule.${idx}.dates`,
              message: `Schedule start date must be before or equal to end date.`,
            });
          }
        }
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleSubmit = async () => {
    setSuccess(true);
    // Run client-side validation before attempting inserts
    const validation = validatePlan();
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      toast.error(
        "Please fix the highlighted validation errors before saving the plan."
      );
      return;
    }
    console.log(`auditId: ${auditId}`);

    const { data: t_s_data, error: t_s_error } = await supabase
      .from("audit_plans")
      .insert({
        audit_id: auditId,
        title: plan.title,
        executive_summary: plan.summary,
      })
      .select()
      .single();
    if (t_s_error) {
      console.error("Failed to insert title or summary", t_s_error);
      setSuccess(false);
      return;
    }
    const objectivesPayload = plan.objectives
      .filter((desc) => desc.trim() !== "") // Filter out empty objectives
      .map((desc) => ({
        plan_id: t_s_data.id,
        description: desc,
      }));
    if (objectivesPayload.length > 0) {
      const { error: o_error } = await supabase
        .from("audit_objectives")
        .insert(objectivesPayload);
      if (o_error) {
        console.error("Failed to insert objectives:", o_error);
        setSuccess(false);
        return;
      }
    }

    const newRiskSummary = plan.riskSummary.filter(
      (risk) =>
        risk.activity.trim() !== "" &&
        risk.rating.trim() !== "" &&
        risk.justification.trim() !== ""
    );
    const newRiskPayload = newRiskSummary.map((riskSummary) => ({
      plan_id: t_s_data.id,
      area: riskSummary.activity,
      rating: riskSummary.rating,
      justification: riskSummary.justification,
    }));
    if (newRiskPayload.length > 0) {
      const { error: r_error } = await supabase
        .from("audit_risks")
        .insert(newRiskPayload);
      if (r_error) {
        console.error("Failed to insert risk:", r_error);
        setSuccess(false);
        return;
      }
    }

    const newScopePayload = plan.systems
      .filter(
        (sys) =>
          sys.name.trim() !== "" &&
          sys.rating.trim() !== "" &&
          sys.justification.trim() !== ""
      )
      .map((sys) => ({
        plan_id: t_s_data.id,
        system: sys.name,
        rating: sys.rating,
        justification: sys.justification,
      }));
    if (newScopePayload.length > 0) {
      const { error: scope_error } = await supabase
        .from("audit_scope")
        .insert(newScopePayload);
      if (scope_error) {
        console.error("Failed to insert audit scope:", scope_error);
        setSuccess(false);
        return;
      }
    }

    const newRolesPayload = plan.roles
      .filter(
        (role) =>
          role.name.trim() !== "" &&
          role.role.trim() !== "" &&
          role.responsibility.trim() !== ""
      )
      .map((role) => ({
        plan_id: t_s_data.id,
        name: role.name,
        role: role.role,
        responsibility: role.responsibility,
      }));
    if (newRolesPayload.length > 0) {
      const { error: re_error } = await supabase
        .from("audit_resources")
        .insert(newRolesPayload);
      if (re_error) {
        console.error("Failed to insert roles:", re_error);
        setSuccess(false);
        return;
      }
    }

    const newCriteriaPayload = plan.auditCriteria
      .filter((c) => c.trim() !== "")
      .map((c) => ({
        plan_id: t_s_data.id,
        criteria: c,
      }));
    if (newCriteriaPayload.length > 0) {
      const { error: c_error } = await supabase
        .from("audit_criteria")
        .insert(newCriteriaPayload);
      if (c_error) {
        console.error("Failed to insert criteria:", c_error);
        setSuccess(false);
        return;
      }
    }

    const newSchedulePayload = plan.schedule
      .filter((s) => s.activity.trim() !== "" && s.start_date && s.end_date)
      .map((s) => ({
        plan_id: t_s_data.id,
        activity: s.activity,
        start_date: s.start_date,
        end_date: s.end_date,
      }));
    if (newSchedulePayload.length > 0) {
      const { error: sch_error } = await supabase
        .from("audit_schedule")
        .insert(newSchedulePayload);
      if (sch_error) {
        console.error("Failed to insert schedule:", sch_error);
        setSuccess(false);
        return;
      }
    }

    setPlan({
      title: "",
      summary: "",
      objectives: [""],
      systems: [],
      auditCriteria: [""],
      riskSummary: [],
      roles: [{ name: "", role: "", responsibility: "" }],
      schedule: [{ activity: "", start_date: "", end_date: "" }],
    });
    alert("Successfully added plan");

    router.push(
      `/dashboard/audit-wizard/step3?id=${t_s_data.id}&audit_id=${auditId}`
    );
  };

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h2 className="header-title">Audit Plan</h2>
            <p className="header-subtitle">Create and manage your audit plan</p>
          </div>
        </div>

        <AuditProgressStepper
          currentStep="audit-plan"
          auditId={auditId}
          // @ts-ignore
          planId={planId?.toString()}
        />

        <div className="space-y-6">
          {validationErrors && validationErrors.length > 0 && (
            <div className="p-4 border border-red-200 bg-red-50 text-red-800 rounded">
              <strong className="block font-semibold mb-2">
                Please fix the following errors:
              </strong>
              <ul className="list-disc list-inside text-sm space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Basic Information</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="form-group">
                <label>Audit Title</label>
                <Input
                  placeholder="Enter audit title"
                  value={plan.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Executive Summary</label>
                <Textarea
                  placeholder="Enter executive summary"
                  value={plan.summary}
                  onChange={(e) => handleChange("summary", e.target.value)}
                  className="form-input min-h-[100px]"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Audit Objectives</h3>
            </div>
            <div className="p-4 space-y-4">
              {plan.objectives.map((obj, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Objective ${i + 1}`}
                    value={obj}
                    onChange={(e) => {
                      const newObjectives = [...plan.objectives];
                      newObjectives[i] = e.target.value;
                      setPlan({ ...plan, objectives: newObjectives });
                    }}
                    className="form-input"
                  />
                  {plan.objectives.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem("objectives", i)}
                      className="btn-icon btn-danger"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPlan({ ...plan, objectives: [...plan.objectives, ""] })
                }
                className="btn-secondary"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Objective
              </Button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Scope of the Audit</h3>
            </div>
            <div className="p-4 space-y-4">
              {plan.systems.map((sys, i) => (
                <div
                  key={i}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Input
                      placeholder="Title (e.g., System or Process Name)"
                      value={sys.name}
                      onChange={(e) => {
                        const newSystems = [...plan.systems];
                        newSystems[i].name = e.target.value;
                        setPlan({ ...plan, systems: newSystems });
                      }}
                      className="form-input"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem("systems", i)}
                      className="btn-icon btn-danger"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Rating (High, Medium, Low)"
                    value={sys.rating}
                    onChange={(e) => {
                      const newSystems = [...plan.systems];
                      newSystems[i].rating = e.target.value;
                      setPlan({ ...plan, systems: newSystems });
                      clearFieldErrors(`systems.${i}.rating`);
                    }}
                    className={`form-input ${
                      hasError(`systems.${i}.rating`)
                        ? "border-red-500 ring-1 ring-red-200"
                        : ""
                    }`}
                  />
                  <Input
                    placeholder="Justification"
                    value={sys.justification}
                    onChange={(e) => {
                      const newSystems = [...plan.systems];
                      newSystems[i].justification = e.target.value;
                      setPlan({ ...plan, systems: newSystems });
                    }}
                    className="form-input"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addScope}
                className="btn-secondary"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Scope Item
              </Button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Audit Criteria</h3>
            </div>
            <div className="p-4 space-y-4">
              {plan.auditCriteria.map((crit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Criteria ${i + 1}`}
                    value={crit}
                    onChange={(e) => {
                      const newCriteria = [...plan.auditCriteria];
                      newCriteria[i] = e.target.value;
                      setPlan({ ...plan, auditCriteria: newCriteria });
                    }}
                    className="form-input"
                  />
                  {plan.auditCriteria.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem("auditCriteria", i)}
                      className="btn-icon btn-danger"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPlan({
                    ...plan,
                    auditCriteria: [...plan.auditCriteria, ""],
                  })
                }
                className="btn-secondary"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Criteria
              </Button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Risk Assessment Summary</h3>
            </div>
            <div className="p-4 space-y-4">
              {plan.riskSummary.map((risk, i) => (
                <div
                  key={i}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Input
                      placeholder="Title (e.g., Risk Area)"
                      value={risk.activity}
                      onChange={(e) => {
                        const newRisks = [...plan.riskSummary];
                        newRisks[i].activity = e.target.value;
                        setPlan({ ...plan, riskSummary: newRisks });
                      }}
                      className="form-input"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem("riskSummary", i)}
                      className="btn-icon btn-danger"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Rating (High, Medium, Low)"
                    value={risk.rating}
                    onChange={(e) => {
                      const newRisks = [...plan.riskSummary];
                      newRisks[i].rating = e.target.value;
                      setPlan({ ...plan, riskSummary: newRisks });
                      clearFieldErrors(`riskSummary.${i}.rating`);
                    }}
                    className={`form-input ${
                      hasError(`riskSummary.${i}.rating`)
                        ? "border-red-500 ring-1 ring-red-200"
                        : ""
                    }`}
                  />
                  <Input
                    placeholder="Justification"
                    value={risk.justification}
                    onChange={(e) => {
                      const newRisks = [...plan.riskSummary];
                      newRisks[i].justification = e.target.value;
                      setPlan({ ...plan, riskSummary: newRisks });
                    }}
                    className="form-input"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addRisk}
                className="btn-secondary"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Risk
              </Button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Responsibilities</h3>
            </div>
            <div className="p-4 space-y-4">
              {plan.roles.map((role, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center"
                >
                  {/* Role input (automatically filled) */}
                  <Input
                    placeholder="Role"
                    value={role.role}
                    readOnly
                    className="form-input"
                    disabled
                  />

                  {/* Dropdown of users */}
                  <select
                    value={role.name}
                    onChange={(e) => {
                      const selectedUser = users.find(
                        (u) => u.full_name === e.target.value
                      );
                      if (selectedUser) {
                        const newRoles = [...plan.roles];
                        newRoles[i].name = selectedUser.full_name;
                        newRoles[i].role = selectedUser.role; // auto populate role
                        setPlan({ ...plan, roles: newRoles });
                      }
                    }}
                    className="form-select"
                  >
                    <option value="">Select User</option>
                    {users
                      .filter((u) =>
                        [
                          "Audit Lead",
                          "Auditor",
                          "Senior Auditor",
                          "Business Analyst",
                          "Client",
                        ].includes(u.role)
                      )
                      .map((u) => (
                        <option key={u.id} value={u.full_name}>
                          {u.full_name} ({u.role})
                        </option>
                      ))}
                  </select>

                  {/* Responsibility input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Responsibility"
                      value={role.responsibility}
                      onChange={(e) => {
                        const newRoles = [...plan.roles];
                        newRoles[i].responsibility = e.target.value;
                        setPlan({ ...plan, roles: newRoles });
                      }}
                      className="form-input"
                    />
                    {plan.roles.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem("roles", i)}
                        className="btn-icon btn-danger"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPlan({
                    ...plan,
                    roles: [
                      ...plan.roles,
                      { name: "", role: "", responsibility: "" },
                    ],
                  })
                }
                className="btn-secondary"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Role
              </Button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-header-title">Audit Schedule</h3>
            </div>
            <div className="p-4 space-y-4">
              {plan.schedule.map((sched, i) => (
                <div
                  key={i}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Input
                      placeholder="Activity"
                      value={sched.activity}
                      onChange={(e) => {
                        const newSchedule = [...plan.schedule];
                        newSchedule[i].activity = e.target.value;
                        setPlan({ ...plan, schedule: newSchedule });
                      }}
                      className="form-input"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem("schedule", i)}
                      className="btn-icon btn-danger"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      type="date"
                      placeholder="Start Date"
                      value={sched.start_date}
                      onChange={(e) => {
                        const newSchedule = [...plan.schedule];
                        newSchedule[i].start_date = e.target.value;
                        setPlan({ ...plan, schedule: newSchedule });
                        clearFieldErrors(`schedule.${i}.dates`);
                      }}
                      className={`form-input ${
                        hasError(`schedule.${i}.dates`)
                          ? "border-red-500 ring-1 ring-red-200"
                          : ""
                      }`}
                    />
                    <Input
                      type="date"
                      placeholder="End Date"
                      value={sched.end_date}
                      onChange={(e) => {
                        const newSchedule = [...plan.schedule];
                        newSchedule[i].end_date = e.target.value;
                        setPlan({ ...plan, schedule: newSchedule });
                        clearFieldErrors(`schedule.${i}.dates`);
                      }}
                      className={`form-input ${
                        hasError(`schedule.${i}.dates`)
                          ? "border-red-500 ring-1 ring-red-200"
                          : ""
                      }`}
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addSchedule}
                className="btn-secondary"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Schedule Item
              </Button>
            </div>
          </div>

          <Button className="btn-primary w-full" onClick={handleSubmit}>
            Save Audit Plan
          </Button>
        </div>
      </main>
    </div>
  );
}
