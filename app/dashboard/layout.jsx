import Sidebar from "@/components/Sidebar";
import { Children } from "react";
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
