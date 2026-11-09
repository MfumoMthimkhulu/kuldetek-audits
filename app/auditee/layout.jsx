import Sidebar from "@/components/Sidebar";
export const dynamic = "force-dynamic";

export default function AuditeeLayout({ children }) {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
