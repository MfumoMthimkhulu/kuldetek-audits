"use client";

import { orionFetch } from "@/lib/orion-fetch";
import React, { useState, useEffect } from "react";
import {
  MdDashboard,
  MdStorage,
  MdLock,
  MdAssessment,
  MdAssignment,
  MdSettings,
  MdLibraryBooks,
  MdAnalytics,
  MdNotifications,
  MdHistory,
} from "react-icons/md";
import "../app/Dashboard.css";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "./theme-toggle";
import { demoMode } from "@/lib/demo-mode";
import { ShieldCheck } from "lucide-react";

export default function Sidebar({ workspace = false, onNavigate } = {}) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await orionFetch("/api/notifications?unreadOnly=true");
        const data = await response.json();
        if (response.ok) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();

    // Refresh unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);
  // const pathname = usePathname();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user:", userError);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
      } else {
        setUserRole(profile?.role || "user");
      }
    } catch (error) {
      console.error("Error in fetchUserRole:", error);
    } finally {
      setLoading(false);
    }
  };

  // Base navigation items (common for all non-auditee users)
  const baseNavItems = [
    { label: "Dashboard", icon: <MdDashboard />, href: "/dashboard" },
    { label: "Audits", icon: <MdStorage />, href: "/dashboard/audits" },
    {
      label: "Auditee Threads",
      icon: <MdLibraryBooks />,
      href: "/dashboard/auditee-threads",
    },
    { label: "Analysis", icon: <MdAnalytics />, href: "/dashboard/analysis" },
    {
      label: "Notifications",
      icon: <MdNotifications />,
      href: "/dashboard/notifications",
      hasBadge: true,
    },
    { label: "Reports", icon: <MdAssignment />, href: "/dashboard/reports" },
    { label: "Settings", icon: <MdSettings />, href: "/dashboard/settings" },
  ];

  // Admin-only navigation items
  const adminOnlyItems = [
    {
      label: "System Alerts",
      icon: <MdNotifications />,
      href: "/dashboard/alerts",
      hasBadge: true,
    },
    {
      label: "Approvals",
      icon: <MdLock />,
      href: "/dashboard/approvals",
    },
  ];

  // If the user is an auditee, present a minimal sidebar per product requirement
  const auditeeNavItems = [
    {
      label: "Dashboard Overview",
      icon: <MdDashboard />,
      href: "/auditee/dashboard",
    },
    // // Audit View (read-only) - route to auditee dashboard where individual audit read-only pages exist
    // { label: "Audit View", icon: <MdAssessment />, href: "/auditee/audits" },
    // // Chat entry - links to auditee threads (list) — individual audit chat lives under audits/[auditId]/chat
    // { label: "Chat", icon: <MdLibraryBooks />, href: "/auditee/threads" },
  ];

  const navItems =
    userRole === "auditee"
      ? auditeeNavItems
      : userRole === "admin"
      ? [...baseNavItems, ...adminOnlyItems]
      : userRole === "manager" && workspace
      ? [...baseNavItems, adminOnlyItems[1]]
      : baseNavItems;
  // Compute a single best-matching nav item index (exact match preferred,
  // otherwise the longest prefix match). This must run in component scope
  // (not inside JSX) to avoid statement usage inside JSX expressions.
  const normalizedPath = pathname || "/";
  let bestMatchIndex = -1;
  let bestMatchLength = -1;

  navItems.forEach((item, idx) => {
    const href = item.href || "/";
    if (normalizedPath === href) {
      bestMatchIndex = idx;
      bestMatchLength = href.length;
      return;
    }
    if (
      normalizedPath.startsWith(href + "/") ||
      normalizedPath.startsWith(href)
    ) {
      if (href.length > bestMatchLength) {
        bestMatchIndex = idx;
        bestMatchLength = href.length;
      }
    }
  });
  return (
    <aside className="sidebar" aria-busy={loading}>
      {workspace ? (
        <Link href="/" className="orion-brand" onClick={onNavigate}><ShieldCheck aria-hidden="true" /> <span>Kuldetek<span> / </span>Auditing</span></Link>
      ) : <h1 className="sidebar-title">Kuldetek Auditing</h1>}

      {demoMode && !workspace && (
        <div className="mb-3 shrink-0 space-y-1 rounded-md border border-current/20 px-3 py-2 text-xs">
          <p className="font-semibold">Local demo · fictional data</p>
          <Link className="underline" href={pathname.startsWith("/auditee/") ? "/dashboard" : "/auditee/dashboard"}>
            {pathname.startsWith("/auditee/") ? "Open auditor workspace" : "Open auditee workspace"}
          </Link>
        </div>
      )}

      {/* While loading user role, show a simple skeleton to avoid flashing incorrect nav */}
      {loading ? (
        <nav className="sidebar-nav" aria-label="Loading navigation">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="sidebar-link" style={{ opacity: 0.3 }}>
              <span className="sidebar-icon">●</span>
              <span style={{ width: 100, display: "inline-block" }}>
                &nbsp;
              </span>
            </div>
          ))}
        </nav>
      ) : (
        <nav className="sidebar-nav" aria-label="Workspace">
          {navItems.map(({ label, icon, href, hasBadge }, idx) => {
            const isSelected = idx === bestMatchIndex;
            return (
              <Link
                key={label}
                href={href}
                aria-current={isSelected ? "page" : undefined}
                onClick={onNavigate}
                className={`sidebar-link ${isSelected ? "selected" : ""}`}
              >
                <span
                  className={`sidebar-icon ${
                    isSelected ? "selected-icon" : ""
                  }`}
                >
                  {icon}
                </span>
                {label}
                {hasBadge && unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Theme Toggle */}
      <div className="mt-auto flex shrink-0 justify-center pt-4">
        <ThemeToggle />
      </div>
    </aside>
  );
}
