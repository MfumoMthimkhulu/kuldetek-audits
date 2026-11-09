"use client";
export const dynamic = "force-dynamic";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const STANDARDS = [
  "ISO 27001",
  "POPIA",
  "GDPR",
  "SOX",
  "NIST",
  "HIPAA",
  "PCI-DSS",
  "ITIL",
  "COBIT",
  "SOC 2",
];

export default function Step2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auditType = searchParams.get("auditType") || "";
  const [selected, setSelected] = useState([]);

  function toggleStandard(standard) {
    if (selected.includes(standard)) {
      setSelected(selected.filter((s) => s !== standard));
    } else {
      setSelected([...selected, standard]);
    }
  }

  const onNext = () => {
    if (selected.length > 0) {
      router.push(
        `/dashboard/audit-wizard/step3?auditType=${encodeURIComponent(
          auditType
        )}&standards=${encodeURIComponent(selected.join(","))}`
      );
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 space-y-6">
      <h1 className="text-3xl font-semibold">
        Step 2: Choose Applicable Standards
      </h1>
      <div className="grid grid-cols-2 gap-3 max-h-72 overflow-auto border rounded p-4">
        {STANDARDS.map((standard) => (
          <label
            key={standard}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <Checkbox
              checked={selected.includes(standard)}
              onCheckedChange={() => toggleStandard(standard)}
            />
            <span>{standard}</span>
          </label>
        ))}
      </div>

      <Button disabled={selected.length === 0} onClick={onNext}>
        Next: View Suggested Tasks
      </Button>
    </div>
  );
}
