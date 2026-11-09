"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FaUserShield,
  FaExclamationTriangle,
  FaCheckCircle,
  FaServer,
  FaChevronDown,
  FaSignOutAlt,
  FaCog,
  FaChartLine,
  FaChartPie,
  FaCalendarAlt,
  FaTasks,
} from "react-icons/fa";
import { IoMdLogIn } from "react-icons/io";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { BsGearFill } from "react-icons/bs";
import { AiOutlineWarning, AiFillAlert } from "react-icons/ai";
import {
  MdStorage,
  MdLock,
  MdDashboard,
  MdSettings,
  MdAssessment,
  MdAssignment,
} from "react-icons/md";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import "../Dashboard.css";
import Sidebar from "../../components/Sidebar";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
export default function Dashboard() {
  const [audits, setAudits] = useState([]);
  const [fieldworkProgress, setFieldworkProgress] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [auditReports, setAuditReports] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showAddTodoForm, setShowAddTodoForm] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDescription, setNewTodoDescription] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState("medium");
  const [showCompletedTodos, setShowCompletedTodos] = useState(true);
  const supabase = createClient();
  const [chartHeight, setChartHeight] = useState(0);

  useEffect(() => {
    const initializeDashboard = async () => {
      const userWithRole = await fetchUser();
      await fetchDashboardData(userWithRole);
    };

    initializeDashboard();
    setChartHeight(Math.random() * 150 + 50);
  }, []);

  const fetchUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Fetch user profile to get role information
        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          // Combine auth user data with profile role
          const userWithRole = {
            ...user,
            role: profileData?.role || "auditor",
          };
          setUser(userWithRole);
          return userWithRole;
        } catch (profileError) {
          console.warn("Could not fetch user profile:", profileError);
          // Set user with default role if profile fetch fails
          const userWithRole = {
            ...user,
            role: "auditor",
          };
          setUser(userWithRole);
          return userWithRole;
        }
      } else {
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
      return null;
    }
  };

  const fetchDashboardData = async (userWithRole = null) => {
    try {
      setLoading(true);

      // Get current user to determine audit filtering
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      // Use passed user role or current state
      const userRole = userWithRole?.role || user?.role;

      // Debug logging
      console.log("Dashboard Data Fetch - User Role:", userRole);
      console.log("Dashboard Data Fetch - Current User ID:", currentUser?.id);
      console.log(
        "Dashboard Data Fetch - Should filter audits:",
        userRole?.toLowerCase() === "auditor" && currentUser?.id
      );

      // Fetch audits - filter by auditor if user is auditor role
      let auditsQuery = supabase
        .from("audits")
        .select("*")
        .order("created_at", { ascending: false });

      // If user is an auditor, only show audits assigned to them
      if (userRole?.toLowerCase() === "auditor" && currentUser?.id) {
        console.log("Filtering audits for auditor:", currentUser.id);
        auditsQuery = auditsQuery.eq("auditor_id", currentUser.id);
      }
      // Admins and other roles see all audits

      const { data: auditsData, error: auditsError } = await auditsQuery;

      if (auditsError) {
        console.error("Error fetching audits:", auditsError);
        setAudits([]);
      } else {
        console.log("Audits fetched:", auditsData?.length || 0);
        setAudits(auditsData || []);
        if (auditsData?.length) {
          const { data: plans } = await supabase.from("audit_plans").select("id,audit_id").in("audit_id", auditsData.map(audit => audit.id));
          if (plans?.length) {
            const { data: tasks } = await supabase.from("audit_tasks").select("plan_id,status").in("plan_id", plans.map(plan => plan.id));
            const auditIds = new Map(plans.map(plan => [plan.id, plan.audit_id]));
            const totals = {};
            for (const task of tasks ?? []) {
              const auditId = auditIds.get(task.plan_id);
              const count = totals[auditId] ??= { total: 0, completed: 0 };
              count.total++;
              if (task.status === "completed") count.completed++;
            }
            setFieldworkProgress(Object.fromEntries(Object.entries(totals).map(([id, count]) =>
              [id, Math.round(count.completed / count.total * 100)]
            )));
          }
        }
      }

      // Fetch system alerts (with error handling in case table doesn't exist)
      try {
        const { data: alertsData, error: alertsError } = await supabase
          .from("system_alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (alertsError) {
          console.warn("System alerts table not found or error:", alertsError);
          setAlerts([]);
        } else {
          setAlerts(alertsData || []);
        }
      } catch (alertError) {
        console.warn("System alerts not available:", alertError);
        setAlerts([]);
      }

      // Fetch audit reports for auditor dashboard
      try {
        let reportsQuery = supabase
          .from("audit_reports")
          .select("approval_status")
          .order("generated_at", { ascending: false });

        // If user is an auditor, only show reports they generated
        if (userRole?.toLowerCase() === "auditor" && currentUser?.id) {
          console.log("Filtering audit reports for auditor:", currentUser.id);
          reportsQuery = reportsQuery.eq("generated_by", currentUser.id);
        }
        // Admins see all reports

        const { data: auditReportsData, error: reportsError } =
          await reportsQuery;

        if (reportsError) {
          console.warn("Audit reports table not found or error:", reportsError);
          setAuditReports([]);
        } else {
          console.log("Audit reports fetched:", auditReportsData?.length || 0);
          setAuditReports(auditReportsData || []);
        }
      } catch (reportsError) {
        console.warn("Audit reports not available:", reportsError);
        setAuditReports([]);
      }

      // Fetch todos for auditor dashboard
      if (userRole?.toLowerCase() === "auditor" && currentUser?.id) {
        try {
          const { data: todosData, error: todosError } = await supabase
            .from("auditor_todos")
            .select("*")
            .eq("auditor_id", currentUser.id)
            .order("created_at", { ascending: false });

          if (todosError) {
            console.warn("Todos table not found or error:", todosError);
            setTodos([]);
          } else {
            console.log("Todos fetched:", todosData?.length || 0);
            setTodos(todosData || []);
          }
        } catch (todosError) {
          console.warn("Todos not available:", todosError);
          setTodos([]);
        }
      } else {
        setTodos([]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setAudits([]);
      setAlerts([]);
      setAuditReports([]);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new todo
  const handleAddTodo = async () => {
    if (!newTodoTitle.trim() || !user) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("auditor_todos")
        .insert([
          {
            title: newTodoTitle.trim(),
            description: newTodoDescription.trim(),
            priority: newTodoPriority,
            status: "pending",
            auditor_id: user.id,
          },
        ])
        .select();

      if (error) {
        console.error("Error adding todo:", error);
        alert("Failed to add todo. Please try again.");
        return;
      }

      // Add the new todo to the state
      setTodos((prevTodos) => [data[0], ...prevTodos]);

      // Reset form
      setNewTodoTitle("");
      setNewTodoDescription("");
      setNewTodoPriority("medium");
      setShowAddTodoForm(false);

      console.log("Todo added successfully:", data[0]);
    } catch (error) {
      console.error("Error adding todo:", error);
      alert("Failed to add todo. Please try again.");
    }
  };

  // Function to cancel adding todo
  const handleCancelAddTodo = () => {
    setNewTodoTitle("");
    setNewTodoDescription("");
    setNewTodoPriority("medium");
    setShowAddTodoForm(false);
  };

  // Function to toggle todo completion status
  const handleToggleTodoComplete = async (todoId) => {
    try {
      // Find the todo to toggle
      const todoToUpdate = todos.find((todo) => todo.id === todoId);
      if (!todoToUpdate) return;

      const newStatus =
        todoToUpdate.status === "completed" ? "pending" : "completed";

      // Update in database
      const { error } = await supabase
        .from("auditor_todos")
        .update({ status: newStatus })
        .eq("id", todoId);

      if (error) {
        console.error("Error updating todo:", error);
        alert("Failed to update todo. Please try again.");
        return;
      }

      // Update local state
      setTodos((prevTodos) =>
        prevTodos.map((todo) =>
          todo.id === todoId ? { ...todo, status: newStatus } : todo
        )
      );

      console.log("Todo updated successfully");
    } catch (error) {
      console.error("Error updating todo:", error);
      alert("Failed to update todo. Please try again.");
    }
  };

  // Function to remove todo
  const handleRemoveTodo = async (todoId) => {
    if (!confirm("Are you sure you want to delete this todo?")) {
      return;
    }

    try {
      // Delete from database
      const { error } = await supabase
        .from("auditor_todos")
        .delete()
        .eq("id", todoId);

      if (error) {
        console.error("Error deleting todo:", error);
        alert("Failed to delete todo. Please try again.");
        return;
      }

      // Update local state
      setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== todoId));

      console.log("Todo deleted successfully");
    } catch (error) {
      console.error("Error deleting todo:", error);
      alert("Failed to delete todo. Please try again.");
    }
  };

  // Calculate metrics
  const totalAudits = audits.length;
  const ongoingAudits = audits.filter(
    (audit) => audit.status === "In Progress"
  ).length;
  const completedAudits = audits.filter(
    (audit) => audit.status === "Completed"
  ).length;
  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === "critical"
  ).length;
  const highAlerts = alerts.filter((alert) => alert.severity === "high").length;
  const activeAlerts = alerts.filter(
    (alert) => alert.status === "active"
  ).length;

  // Calculate audit reports metrics for auditor dashboard
  const completedReports = auditReports.filter(
    (report) => report.approval_status === "approved"
  ).length;
  const inProgressReports = auditReports.filter(
    (report) => report.approval_status !== "approved"
  ).length;

  // Calculate todo metrics for auditor dashboard
  const pendingTodos = todos.filter((todo) => todo.status === "pending").length;
  const completedTodos = todos.filter(
    (todo) => todo.status === "completed"
  ).length;
  const highPriorityTodos = todos.filter(
    (todo) => todo.priority === "high" || todo.priority === "urgent"
  ).length;

  // Get unique categories from audits
  const uniqueCategories = new Set(audits.map((a) => a.category));

  // Calculate compliance score (mock calculation)
  const complianceScore =
    totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0;

  // Prepare chart data
  const auditStatusData = [
    { name: "In Progress", value: ongoingAudits, color: "#22d3ee" },
    { name: "Completed", value: completedAudits, color: "#4ade80" },
    {
      name: "Not Started",
      value: totalAudits - ongoingAudits - completedAudits,
      color: "#9ca3af",
    },
  ];

  const alertSeverityData = [
    { name: "Critical", value: criticalAlerts, color: "#ef4444" },
    { name: "High", value: highAlerts, color: "#f97316" },
    {
      name: "Medium",
      value: alerts.filter((alert) => alert.severity === "medium").length,
      color: "#eab308",
    },
    {
      name: "Low",
      value: alerts.filter((alert) => alert.severity === "low").length,
      color: "#22c55e",
    },
  ];

  const auditProgressData = audits.slice(0, 5).map((audit) => ({
    name:
      audit.title.length > 20
        ? audit.title.substring(0, 20) + "..."
        : audit.title,
    progress: fieldworkProgress[audit.id] ?? (audit.status === "Completed" ? 100 : 0),
    status: audit.status,
  }));

  // Custom tooltip for a cleaner look
  const ChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload || payload[0];
      return (
        <div
          className="chart-tooltip card"
          style={{ padding: 8, minWidth: 140 }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
          {payload.map((p, i) => (
            <div
              key={i}
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span style={{ color: p.color || p.fill }}>
                {p.name || data.name}
              </span>
              <span style={{ fontWeight: 600 }}>{p.value}</span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          {/* Header Skeleton */}
          <div className="dashboard-header">
            <div>
              <div className="h-8 w-64 bg-gray-300 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
              <div className="h-5 w-96 bg-gray-200 dark:bg-slate-800 rounded animate-pulse"></div>
            </div>
            <div className="h-12 w-32 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>

          {/* Metric Cards Skeleton */}
          <div className="metric-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card">
                <div className="flex items-center justify-between p-6">
                  <div className="space-y-3 flex-1">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    <div className="h-8 w-16 bg-gray-300 dark:bg-slate-600 rounded animate-pulse"></div>
                    <div className="h-3 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-12 w-12 bg-gray-300 dark:bg-slate-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="charts-grid">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="card">
                <div className="card-header">
                  <div className="h-6 w-48 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-6 w-6 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
                <div className="chart-container">
                  <div className="h-72 bg-gray-200 dark:bg-slate-700/50 rounded animate-pulse flex items-center justify-center">
                    <div className="h-32 w-32 bg-gray-300 dark:bg-slate-600 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Items Skeleton */}
          <div className="audit-alert-grid">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="card">
                <div className="card-header">
                  <div className="h-6 w-32 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-slate-800 rounded animate-pulse"></div>
                </div>
                <div className="space-y-4 p-6">
                  {[...Array(3)].map((_, j) => (
                    <div
                      key={j}
                      className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800/30 rounded-lg"
                    >
                      <div className="h-10 w-10 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
                        <div className="h-3 w-1/2 bg-gray-200 dark:bg-slate-800 rounded animate-pulse"></div>
                      </div>
                      <div className="h-6 w-16 bg-gray-200 dark:bg-slate-800 rounded-full animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Progress Chart Skeleton */}
          <div className="card">
            <div className="card-header">
              <div className="h-6 w-48 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="h-6 w-6 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
            <div className="chart-container">
              <div className="h-72 bg-gray-200 dark:bg-slate-700/50 rounded animate-pulse flex items-end justify-around p-8">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-300 dark:bg-slate-600 w-12 rounded animate-pulse"
                    style={{ height: `${chartHeight}px` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container orion-overview">
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <p className="orion-eyebrow">Audit operations</p>
            <h1 className="header-title">Audit overview</h1>
            <p className="header-subtitle">
              See active engagements, recent activity and work that needs attention.
            </p>
          </div>
          <div className="orion-legacy-user"><UserDropdown user={user} /></div>
          <Link href="/dashboard/audits" className="orion-overview-action">Open audit register <span aria-hidden="true">→</span></Link>
        </div>

        <div className="metric-grid">
          <MetricCard
            title={
              user?.role?.toLowerCase() === "admin"
                ? "Total Audits"
                : "My Audits"
            }
            value={totalAudits.toString()}
            subtitle={
              user?.role?.toLowerCase() === "admin"
                ? `${ongoingAudits} in progress`
                : `${ongoingAudits} assigned to me in progress`
            }
            icon={<FaUserShield className="icon-cyan" />}
          />
          {user?.role?.toLowerCase() === "admin" ? (
            <MetricCard
              title="System Alerts"
              value={activeAlerts.toString()}
              subtitle={`${criticalAlerts} critical, ${highAlerts} high`}
              icon={<FaExclamationTriangle className="icon-red" />}
            />
          ) : (
            <MetricCard
              title="My Todo List"
              value={todos.length.toString()}
              subtitle={`${pendingTodos} pending, ${highPriorityTodos} high priority`}
              icon={<FaTasks className="icon-blue" />}
            />
          )}
          {user?.role?.toLowerCase() === "auditor" && (
            <MetricCard
              title="Audit Reports Progress"
              value={auditReports.length.toString()}
              subtitle={`${completedReports} completed, ${inProgressReports} in progress`}
              icon={<FaChartLine className="icon-green" />}
            />
          )}
          <MetricCard
            title="Audit completion"
            value={`${complianceScore}%`}
            subtitle={`${completedAudits} completed audits`}
            icon={<FaCheckCircle className="icon-green" />}
          />
          <MetricCard
            title="Audit Categories"
            value={uniqueCategories.size.toString()}
            subtitle="Different audit types"
            icon={<FaChartPie className="icon-cyan" />}
          />
        </div>

        <div className="charts-grid">
          <div className="card">
            <div className="card-header">
              <h3>Audit Status Distribution</h3>
              <FaChartPie className="icon-cyan" />
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={auditStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    labelLine={false}
                    label={({ percent }) => `${Math.round(percent * 100)}%`}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {auditStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Alert Severity Levels</h3>
              <FaExclamationTriangle className="icon-red" />
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={alertSeverityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                    {alertSeverityData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="audit-alert-grid">
          <div className="card">
            <div className="card-header">
              <h3>Recent Audits</h3>
              <Link href="/dashboard/audits">View All</Link>
            </div>
            {audits.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <p>No audits found</p>
                <p className="text-sm">Start an audit to see it here.</p>
              </div>
            ) : (
              audits
                .slice(0, 5)
                .map((audit) => <AuditItem key={audit.id} audit={audit} />)
            )}
          </div>

          {user?.role?.toLowerCase() === "admin" ? (
            <div className="card">
              <div className="card-header">
                <h3>System Alerts</h3>
                <Link href="/dashboard/notifications">View All</Link>
              </div>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🔔</div>
                  <p>No alerts found</p>
                  <p className="text-sm">System is running smoothly</p>
                </div>
              ) : (
                alerts
                  .slice(0, 5)
                  .map((alert) => (
                    <AlertItem
                      key={alert.id}
                      type={alert.severity}
                      message={alert.title}
                      description={alert.description}
                      time={new Date(alert.created_at).toLocaleDateString()}
                    />
                  ))
              )}
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h3>My Todo List</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCompletedTodos(!showCompletedTodos)}
                    className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {showCompletedTodos ? "Hide Completed" : "Show Completed"}
                  </button>
                  <button
                    className="text-cyan-400 hover:text-cyan-300"
                    onClick={() => setShowAddTodoForm(true)}
                  >
                    Add New
                  </button>
                </div>
              </div>

              {showAddTodoForm && (
                <div className="mb-4 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <h4 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">
                    Add New Todo
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        placeholder="Enter todo title"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={newTodoDescription}
                        onChange={(e) => setNewTodoDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        placeholder="Enter todo description"
                        rows={3}
                        maxLength={500}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Priority
                      </label>
                      <select
                        value={newTodoPriority}
                        onChange={(e) => setNewTodoPriority(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleAddTodo}
                        disabled={!newTodoTitle.trim()}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Add Todo
                      </button>
                      <button
                        onClick={handleCancelAddTodo}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(() => {
                const filteredTodos = showCompletedTodos
                  ? todos
                  : todos.filter((todo) => todo.status !== "completed");

                return filteredTodos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">✓</div>
                    <p>
                      {showCompletedTodos
                        ? "No todos found"
                        : "No pending todos"}
                    </p>
                    <p className="text-sm">
                      {showCompletedTodos
                        ? "All caught up!"
                        : "Great job! All tasks completed"}
                    </p>
                  </div>
                ) : (
                  filteredTodos
                    .slice(0, 5)
                    .map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggleComplete={handleToggleTodoComplete}
                        onRemove={handleRemoveTodo}
                      />
                    ))
                );
              })()}
            </div>
          )}
        </div>

        <div className="card orion-overview-progress">
          <div className="card-header">
            <h3>Fieldwork completion</h3>
            <FaChartLine className="icon-cyan" />
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={auditProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="progress" radius={[6, 6, 6, 6]}>
                  {auditProgressData.map((entry, index) => (
                    // Use green for completed-ish, cyan for in-progress, gray otherwise
                    <Cell
                      key={`prog-${index}`}
                      fill={
                        entry.status === "Completed"
                          ? "#4ade80"
                          : entry.status === "In Progress"
                          ? "#22d3ee"
                          : "#9ca3af"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

function UserDropdown({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function HandleSignOut() {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
    }
    router.push("/sign-in");
  }

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "user@example.com";

  return (
    <div className="header-user" ref={dropdownRef}>
      <button
        className="user-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="user-icon">
          <FaUserShield />
        </span>
        <span>
          {userName}{" "}
          <FaChevronDown className={`chevron ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>

      {isOpen && (
        <div className="user-dropdown">
          <div className="user-info">
            <div className="user-name">{userName}</div>
            <div className="user-email">{userEmail}</div>
          </div>
          <div className="dropdown-divider"></div>
          <button className="dropdown-item">
            <FaCog className="item-icon" />
            <span>Settings</span>
          </button>
          <button className="dropdown-item" onClick={HandleSignOut}>
            <FaSignOutAlt className="item-icon" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <div>
          <h4>{title}</h4>
          <p className="metric-value">{value}</p>
        </div>
        <div className="metric-icon">{icon}</div>
      </div>
      <p className="metric-subtitle">{subtitle}</p>
    </div>
  );
}

function ProgressItem({ label, progress, color }) {
  return (
    <div className="progress-item">
      <div className="progress-info">
        <span className={`dot ${color}`} />
        <span className="progress-label">{label}</span>
      </div>
      <p className="progress-text">{progress}% Complete</p>
      <div className="progress-bar-bg">
        <div
          className={`progress-bar ${color}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function AlertItem({ type, message, description, time }) {
  const isCritical = type === "critical" || type === "Critical";
  const isHigh = type === "high" || type === "High";
  const isMedium = type === "medium" || type === "Medium";

  const alertClass = isCritical
    ? "critical"
    : isHigh
    ? "high"
    : isMedium
    ? "warning"
    : "low";

  return (
    <div className={`alert-item ${alertClass}`}>
      <div className="alert-icon">
        {isCritical ? <AiFillAlert /> : <AiOutlineWarning />}
      </div>
      <div className="alert-content">
        <div className="alert-header">
          <strong className="alert-type">{type.toUpperCase()}</strong>
          <span className="alert-time">{time}</span>
        </div>
        <div className="alert-msg">{message}</div>
        {description && <div className="alert-desc">{description}</div>}
      </div>
    </div>
  );
}

function AuditItem({ audit }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "green";
      case "In Progress":
        return "yellow";
      case "Not Started":
        return "gray";
      default:
        return "gray";
    }
  };

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:shadow-md transition-shadow duration-200 mb-3">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {audit.title}
          </h4>
          <span
            className={`audit-state px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
              audit.status
            )}`}
          >
            {audit.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{audit.category}</span>
          <span>by {audit.auditor}</span>
          <span>{new Date(audit.date).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function LogItem({ icon, title, desc, time }) {
  return (
    <div className="log-item">
      <div className="log-icon">{icon}</div>
      <div className="log-content">
        <p className="log-title">{title}</p>
        <p className="log-desc">{desc}</p>
      </div>
      <div className="log-time">{time}</div>
    </div>
  );
}

function TodoItem({ todo, onToggleComplete, onRemove }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20";
      case "high":
        return "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20";
      case "low":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "✓";
      case "in_progress":
        return "⏳";
      case "cancelled":
        return "✗";
      default:
        return "○";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div
      className={`group flex items-start gap-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
        todo.status === "completed" ? "opacity-60" : ""
      }`}
    >
      <div className="flex-shrink-0 mt-1">
        <button
          onClick={() => onToggleComplete(todo.id)}
          className={`text-lg hover:scale-110 transition-transform ${
            todo.status === "completed"
              ? "text-green-500 hover:text-green-600"
              : "text-gray-400 dark:text-gray-500 hover:text-green-500"
          }`}
          title={
            todo.status === "completed"
              ? "Mark as pending"
              : "Mark as completed"
          }
        >
          {getStatusIcon(todo.status)}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`font-medium text-sm text-gray-900 dark:text-white ${
            todo.status === "completed" ? "line-through" : ""
          }`}
        >
          {todo.title}
        </div>
        {todo.description && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {todo.description}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(
              todo.priority
            )}`}
          >
            {todo.priority}
          </span>
          {todo.due_date && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Due: {formatDate(todo.due_date)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatDate(todo.created_at)}
        </div>
        <button
          onClick={() => onRemove(todo.id)}
          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-all hover:scale-110"
          title="Delete todo"
        >
          ✗
        </button>
      </div>
    </div>
  );
}
