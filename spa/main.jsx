import { lazy, Suspense, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import Sidebar from "@/components/Sidebar";
import { demoAccounts, enableDemoSessions, getDemoIdentity, setDemoIdentity, subscribeDemoIdentity } from "@/lib/demo-session";
import Landing, { homeFor } from "./Landing";
import "@/app/globals.css";
import "@/app/Dashboard.css";
import "./orion.css";

enableDemoSessions();

const pages = import.meta.glob("../app/{dashboard,auditee}/**/page.{js,jsx,ts,tsx}");

function workspaceRoutes(workspace) {
  return Object.entries(pages)
    .filter(([file]) => file.startsWith(`../app/${workspace}/`))
    .map(([file, load]) => {
      const path = file.slice(`../app/${workspace}/`.length)
        .replace(/(?:^|\/)page\.[jt]sx?$/, "")
        .replace(/\[([^\]]+)\]/g, ":$1");
      const Page = lazy(load);
      return path
        ? <Route key={file} path={path} element={<Page />} />
        : <Route key={file} index element={<Page />} />;
    });
}

function LoadingPage() {
  return <p className="p-6" role="status">Loading Kuldetek…</p>;
}

function Workspace({ account, auditee }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuPath, setMenuPath] = useState(null);
  if (!account) return <Navigate to="/" replace />;
  if (auditee !== (account.id === "demo-auditee")) return <Navigate to={homeFor(account)} replace />;
  const menuOpen = menuPath === pathname;
  const section = pathname.split("/").filter(Boolean).at(-1);
  const title = section === "dashboard" ? "Overview" : section.replaceAll("-", " ");
  return (
    <div className="orion-workspace">
      <Sidebar workspace onNavigate={() => setMenuPath(null)} />
      {menuOpen && <button type="button" className="orion-menu-backdrop" onClick={() => setMenuPath(null)} aria-label="Close navigation" />}
      <div className={menuOpen ? "orion-content orion-menu-open" : "orion-content"}>
        <header className="orion-topbar">
          <div className="orion-topbar-location">
            <button className="orion-menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuPath(menuOpen ? null : pathname)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
            <ShieldCheck size={18} aria-hidden="true" /><span className="orion-breadcrumb-root">Workspace</span><span aria-hidden="true">/</span><strong>{title}</strong>
          </div>
          <div className="orion-topbar-account">
            <span className="orion-avatar" aria-hidden="true">{account.initials}</span>
            <span className="orion-profile"><strong>{account.name}</strong><small>{account.role}</small></span>
            <details className="orion-switcher">
              <summary className="orion-topbar-action">Switch account <ChevronDown size={13} aria-hidden="true" /></summary>
              <div className="orion-switcher-options">
                <p className="orion-eyebrow">Demo accounts</p>
                {demoAccounts.map(identity => (
                  <button type="button" key={identity.id} disabled={identity.id === account.id} onClick={() => {
                    setDemoIdentity(identity.id);
                    navigate(homeFor(identity), { replace: true });
                  }}>
                    <span className="orion-avatar" aria-hidden="true">{identity.initials}</span>
                    <span><strong>{identity.name}</strong><small>{identity.role}</small></span>
                  </button>
                ))}
              </div>
            </details>
            <button className="orion-topbar-action" type="button" onClick={() => setDemoIdentity(null)}><LogOut size={16} aria-hidden="true" /> <span>Sign out</span></button>
          </div>
        </header>
        <div className="orion-page"><Suspense fallback={<LoadingPage />}><Outlet /></Suspense></div>
      </div>
    </div>
  );
}

function Kuldetek() {
  const account = useSyncExternalStore(subscribeDemoIdentity, getDemoIdentity);
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} themes={["light", "dark"]}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing account={account} />} />
          <Route path="/sign-in" element={<Navigate to="/#accounts" replace />} />
          <Route path="/sign-up" element={<Navigate to="/#accounts" replace />} />
          <Route path="/dashboard" element={<Workspace key={account?.id} account={account} auditee={false} />}>
            {workspaceRoutes("dashboard")}
          </Route>
          <Route path="/auditee" element={<Workspace key={account?.id} account={account} auditee />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            {workspaceRoutes("auditee")}
          </Route>
          <Route path="*" element={<div className="p-6"><h1>Page not found</h1><a href="/dashboard">Open the dashboard</a></div>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton duration={4000} />
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(<Kuldetek />);
