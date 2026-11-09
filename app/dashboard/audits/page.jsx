"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";

export default function AuditsPage() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("scratch");
  const [template, setTemplate] = useState("");
  const [templates, setTemplates] = useState([]);
  const [audits, setAudits] = useState([]);
  const [auditees, setAuditees] = useState([]);
  const [threads, setThreads] = useState([]);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [auditId, setAuditId] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "",
    auditor: "",
    date: "",
    auditee_id: "",
    auditee: "",
  });

  const router = useRouter();

  // Memoize Supabase client to avoid recreation
  const supabase = useMemo(() => createClient(), []);

  // Batch all data loading into a single function
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Run all queries in parallel for faster loading
      const [templatesResult, auditsResult, userResult, auditeesResult] =
        await Promise.all([
          supabase.from("audit_plan_templates").select("*"),
          supabase.from("audits").select("*").order("date", {
            ascending: false,
          }),
          supabase.auth.getUser(),
          supabase
            .from("profiles")
            .select("id,full_name")
            .eq("role", "auditee"),
        ]);

      // Handle templates
      if (templatesResult.data && !templatesResult.error) {
        const transformedTemplates = templatesResult.data.map((template) => ({
          id: template.id,
          name: template.name,
          category: template.category,
          title: template.title,
          summary: template.summary,
          objectives: template.objectives,
          systems: template.systems,
          auditCriteria: template.audit_criteria,
          riskSummary: template.risk_summary,
          roles: template.roles,
          schedule: template.schedule,
          activities: template.activities,
        }));
        setTemplates(transformedTemplates);
      }

      // Handle audits
      if (auditsResult.data && !auditsResult.error) {
        setAudits(auditsResult.data);
      } else if (auditsResult.error) {
        toast.error("Failed to fetch audits.");
      }

      // Handle auditees
      if (auditeesResult.data && !auditeesResult.error) {
        setAuditees(auditeesResult.data);
      } else if (auditeesResult.error) {
        // non-blocking
        console.warn("Failed to fetch auditees:", auditeesResult.error);
      }

      // Handle user and profile
      if (userResult.data?.user && !userResult.error) {
        const userData = userResult.data.user;
        setUser(userData);

        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userData.id)
          .single();

        if (profileData && !profileError) {
          setProfile(profileData);
        }

        // If current user is present, attempt to load thread summaries (audits where they are auditor)
        if (userData) {
          try {
            const { data: auditorAudits } = await supabase
              .from("audits")
              .select("id,title,auditee_id,auditee")
              .eq("auditor_id", userData.id)
              .order("date", { ascending: false });

            if (auditorAudits && auditorAudits.length > 0) {
              const detailed = await Promise.all(
                auditorAudits.map(async (a) => {
                  const { data: lastMsg } = await supabase
                    .from("messages")
                    .select("id,message,created_at,is_read")
                    .eq("audit_id", a.id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                  const { data: unread } = await supabase
                    .from("messages")
                    .select("id", { count: "exact" })
                    .eq("audit_id", a.id)
                    .eq("is_read", false)
                    .eq("receiver_id", userData.id);

                  // Fetch auditee profile
                  let audProfile = null;
                  if (a.auditee_id) {
                    const { data: p } = await supabase
                      .from("profiles")
                      .select("full_name,email,country")
                      .eq("id", a.auditee_id)
                      .single();
                    audProfile = p;
                  }

                  return {
                    auditId: a.id,
                    title: a.title,
                    auditee: a.auditee || audProfile?.full_name || null,
                    auditeeEmail: audProfile?.email || null,
                    auditeeCountry: audProfile?.country || null,
                    lastMessage: lastMsg ? lastMsg.message : null,
                    lastAt: lastMsg ? lastMsg.created_at : null,
                    unreadCount: unread ? unread.length : 0,
                  };
                })
              );

              setThreads(detailed);
            }
          } catch (e) {
            console.warn("Failed to fetch threads summary", e);
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load page data.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Single useEffect for all data loading
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Auto-fill auditor when profile loads
  useEffect(() => {
    if (profile && form.auditor === "") {
      setForm((prev) => ({ ...prev, auditor: profile.full_name }));
    }
  }, [profile, form.auditor]);

  // Prefetch audit-related routes for faster navigation
  useEffect(() => {
    router.prefetch("/dashboard/audit-plan");
    router.prefetch("/dashboard/audit-wizard");
    router.prefetch("/dashboard/audit-fieldwork");
  }, [router]);

  // Optimized handleStartAudit function
  const handleStartAudit = useCallback(async () => {
    if (!form.title || !form.category || !form.auditor || !form.date) {
      toast.error("All fields are required.");
      return;
    }

    try {
      const newAudit = {
        ...form,
        status: "In Progress",
        auditor_id: user.id,
        auditee_id: form.auditee_id || null,
        auditee: form.auditee || null,
      };

      const { data, error } = await supabase
        .from("audits")
        .insert([newAudit])
        .select()
        .single();

      if (error) {
        toast.error("Failed to start audit.");
        return;
      }

      const auditPlanUrl = `/dashboard/audit-plan?audit_id=${data.id}`;

      // Update last_page in parallel with navigation
      const updatePromise = supabase
        .from("audits")
        .update({ last_page: auditPlanUrl })
        .eq("id", data.id);

      // Prepare data for AuditPlan
      const auditData =
        mode === "template"
          ? templates.find((t) => t.name === template) || form
          : form;

      // Start navigation immediately, don't wait for update
      router.push(
        `${auditPlanUrl}&data=${encodeURIComponent(JSON.stringify(auditData))}`
      );

      // Update local state
      setAudits((prev) => [data, ...prev]);
      setForm({
        title: "",
        category: "",
        auditor: "",
        date: "",
        auditee_id: "",
        auditee: "",
      });
      setTemplate("");

      toast.success("New audit started.");

      // Await the update (optional, doesn't block navigation)
      await updatePromise;
    } catch (error) {
      console.error("Error starting audit:", error);
      toast.error("Failed to start audit.");
    }
  }, [form, user, supabase, mode, templates, template, router]);

  // Show loading skeleton while data loads
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 transition-colors">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="h-5 w-96 bg-gray-200 dark:bg-slate-800 rounded animate-pulse"></div>
            </div>
            <div className="h-12 w-40 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
            <div className="h-6 w-32 bg-gray-300 dark:bg-slate-700 rounded animate-pulse mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-200 dark:bg-slate-700/50 rounded animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors">
              Audit Management
            </h1>
            <p className="text-gray-600 dark:text-slate-400 text-lg transition-colors">
              Create, monitor, and manage your security audits
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-slate-400 transition-colors">
                Total Audits
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-cyan-400 transition-colors">
                {audits.length}
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-600 dark:hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Start New Audit
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white border-gray-200 dark:border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto transition-colors">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold mb-6 text-gray-900 dark:text-white transition-colors">
                    Create New Audit
                  </DialogTitle>
                </DialogHeader>

                {/* Mode Selector */}
                <div className="space-y-4">
                  <div className="space-y-4">
                    <Label className="text-gray-700 dark:text-slate-300 text-sm font-medium transition-colors">
                      Creation Method
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={mode}
                      onValueChange={(val) => setMode(val || "scratch")}
                      className="grid grid-cols-2 gap-3"
                    >
                      <ToggleGroupItem
                        value="scratch"
                        className="bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 data-[state=on]:bg-gradient-to-r data-[state=on]:from-blue-500 data-[state=on]:to-blue-600 dark:data-[state=on]:from-cyan-600 dark:data-[state=on]:to-blue-600 data-[state=on]:border-blue-500 dark:data-[state=on]:border-cyan-500 data-[state=on]:text-white p-4 rounded-lg transition-all duration-200 hover:bg-gray-200 dark:hover:bg-slate-600"
                      >
                        <div className="text-center space-y-2 ">
                          <div>
                            <div className="font-medium">From Scratch</div>
                          </div>
                        </div>
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="template"
                        className="bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 data-[state=on]:bg-gradient-to-r data-[state=on]:from-blue-500 data-[state=on]:to-blue-600 dark:data-[state=on]:from-cyan-600 dark:data-[state=on]:to-blue-600 data-[state=on]:border-blue-500 dark:data-[state=on]:border-cyan-500 data-[state=on]:text-white p-4 rounded-lg transition-all duration-200 hover:bg-gray-200 dark:hover:bg-slate-600"
                      >
                        <div className="text-center space-y-2">
                          <div>
                            <div className="font-medium">From Template</div>
                          </div>
                        </div>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Auditee Selector */}
                  <div className="mt-4">
                    <Label className="text-gray-700 dark:text-slate-300 text-sm font-medium transition-colors">
                      Assign Auditee
                    </Label>
                    <Select
                      value={form.auditee_id}
                      onValueChange={(val) => {
                        const selected = auditees.find((a) => a.id === val);
                        setForm({
                          ...form,
                          auditee_id: val,
                          auditee: selected ? selected.full_name : "",
                        });
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-blue-500 dark:focus:ring-cyan-500 h-12 transition-colors">
                        <SelectValue placeholder="Select auditee" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-200 dark:border-slate-700 transition-colors">
                        {auditees.length === 0 ? (
                          <SelectItem value="" disabled>
                            No auditees found
                          </SelectItem>
                        ) : (
                          auditees.map((a) => (
                            <SelectItem
                              key={a.id}
                              value={a.id}
                              className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              {a.full_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-6 mt-8">
                  {mode === "template" ? (
                    <div className="space-y-4">
                      <Label className="text-slate-300 text-sm font-medium">
                        Select Template
                      </Label>
                      <Select
                        value={template}
                        onValueChange={(val) => {
                          setTemplate(val);
                          const selected = templates.find(
                            (t) => t.name === val
                          );
                          if (selected) {
                            setForm({
                              title: selected.title,
                              category: selected.category,
                              auditor: profile ? profile.full_name : "",
                              date: "",
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-blue-500 dark:focus:ring-cyan-500 h-12 transition-colors">
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-200 dark:border-slate-700 transition-colors">
                          {templates.map((t, i) => (
                            <SelectItem
                              key={i}
                              value={t.name}
                              className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300 text-sm font-medium">
                          Audit Title
                        </Label>
                        <Input
                          value={form.title}
                          onChange={(e) =>
                            setForm({ ...form, title: e.target.value })
                          }
                          className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-blue-500 dark:focus:ring-cyan-500 h-12 transition-colors"
                          placeholder="Enter audit title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-slate-300 text-sm font-medium transition-colors">
                          Category
                        </Label>
                        <Select
                          value={form.category}
                          onValueChange={(val) =>
                            setForm({ ...form, category: val })
                          }
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-blue-500 dark:focus:ring-cyan-500 h-12 transition-colors">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-200 dark:border-slate-700 transition-colors">
                            <SelectItem
                              value="Security"
                              className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              Security
                            </SelectItem>
                            <SelectItem
                              value="Performance"
                              className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              Performance
                            </SelectItem>
                            <SelectItem
                              value="Compliance"
                              className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              Compliance
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Common Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-slate-300 text-sm font-medium transition-colors">
                        Lead Auditor
                      </Label>
                      <Input
                        value={form.auditor}
                        onChange={(e) =>
                          setForm({ ...form, auditor: e.target.value })
                        }
                        className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-blue-500 dark:focus:ring-cyan-500 h-12 transition-colors"
                        placeholder="Auditor name"
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-slate-300 text-sm font-medium transition-colors">
                        Start Date
                      </Label>
                      <Input
                        type="date"
                        value={form.date}
                        onChange={(e) =>
                          setForm({ ...form, date: e.target.value })
                        }
                        className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-blue-500 dark:focus:ring-cyan-500 h-12 transition-colors"
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-600 dark:hover:to-blue-700 text-white h-12 rounded-lg font-medium transition-all duration-200"
                    onClick={handleStartAudit}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Start Audit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Audits Table */}
        <Card className="bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-slate-800/50 dark:to-slate-900/50 border border-gray-200 dark:border-slate-700/50 backdrop-blur-sm transition-colors">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 transition-colors">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-cyan-400 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Recent Audits
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-slate-700/50 hover:bg-transparent transition-colors">
                    <TableHead className="text-slate-400 font-medium py-4 px-6">
                      Title
                    </TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-400 font-medium py-4 px-6 transition-colors">
                      Category
                    </TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-400 font-medium py-4 px-6 transition-colors">
                      Status
                    </TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-400 font-medium py-4 px-6 transition-colors">
                      Date
                    </TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-400 font-medium py-4 px-6 transition-colors">
                      Auditor
                    </TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-400 font-medium py-4 px-6 transition-colors">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center space-y-4">
                          <svg
                            className="w-16 h-16 text-gray-400 dark:text-slate-600 transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <div className="text-slate-400">
                            <p className="text-lg font-medium">
                              No audits found
                            </p>
                            <p className="text-sm text-gray-500 dark:text-slate-400 transition-colors">
                              Start your first audit to get began
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    audits.map((audit, i) => (
                      <TableRow
                        key={i}
                        className="border-b border-gray-100 dark:border-slate-700/30 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-all duration-200 cursor-pointer group"
                        onClick={() => {
                          if (audit.last_page) {
                            router.push(audit.last_page);
                          } else {
                            toast.warning("No saved progress for this audit.");
                          }
                        }}
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-blue-500 dark:bg-cyan-400 rounded-full transition-colors"></div>
                            <span className="text-gray-900 dark:text-white font-medium transition-colors">
                              {audit.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Badge
                            variant="secondary"
                            className={`${
                              audit.category === "Security"
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : audit.category === "Performance"
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                : "bg-green-500/20 text-green-400 border-green-500/30"
                            }`}
                          >
                            {audit.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Badge
                            variant="secondary"
                            className={`${
                              audit.status === "Completed"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : audit.status === "In Progress"
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  audit.status === "Completed"
                                    ? "bg-green-400"
                                    : audit.status === "In Progress"
                                    ? "bg-yellow-400"
                                    : "bg-blue-400"
                                }`}
                              ></div>
                              <span>{audit.status}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-gray-600 dark:text-slate-300 transition-colors">
                          {new Date(audit.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-cyan-500 dark:to-blue-600 rounded-full flex items-center justify-center transition-colors">
                              <span className="text-white text-sm font-medium">
                                {audit.auditor?.charAt(0)?.toUpperCase() || "A"}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white transition-colors">
                                {audit.auditor}
                              </span>
                              {audit.auditee ? (
                                <span className="text-sm text-slate-400">
                                  Auditee: {audit.auditee}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 hover:bg-blue-500/10 dark:hover:bg-cyan-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (audit.last_page) {
                                router.push(audit.last_page);
                              } else {
                                toast.warning(
                                  "No saved progress for this audit."
                                );
                              }
                            }}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
