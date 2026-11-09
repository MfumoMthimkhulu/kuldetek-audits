"use client";

import { useRef } from "react";
import html2pdf from "html2pdf.js";
import { Button } from "@/components/ui/button";

export default function GenerateAuditPDF({ audit, auditTasks }) {
  const summaryRef = useRef(null);

  const generatePDF = () => {
    if (!summaryRef.current) return;

    const opt = {
      margin: 0.5,
      filename: `audit-summary-${audit?.id}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    html2pdf().set(opt).from(summaryRef.current).save();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={generatePDF}>Download PDF</Button>
      </div>

      <div ref={summaryRef} className="space-y-6 bg-white p-4 rounded shadow">
        <div>
          <h2 className="text-lg font-semibold">Title</h2>
          <p>{audit.title}</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Summary</h2>
          <p>{audit.summary}</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Date</h2>
          <p>{new Date(audit.created_at).toLocaleDateString()}</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Tasks</h2>
          <ul className="list-disc pl-5">
            {auditTasks.map((task, index) => (
              <li key={index}>{task.task}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
