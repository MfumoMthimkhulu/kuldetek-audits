"use client";
export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  SelectTrigger,
  SelectContent,
  Select,
  SelectItem,
} from "@/components/ui/select";

const AUDIT_TYPES = [
  "General Controls Audit",
  "Application Controls Audit",
  "Security Audit",
  "Compliance Audit",
  "Operational Audit",
];

export default function Step1() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState();

  const onNext = () => {
    if (selectedType) {
      router.push(
        `/dashboard/audit-wizard/step2?auditType=${encodeURIComponent(
          selectedType
        )}`
      );
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 space-y-6">
      <h1 className="text-3xl font-semibold">Step 1: Select Audit Type</h1>

      <Select defaultValue="" onValueChange={setSelectedType}>
        <SelectTrigger>
          <span>{selectedType || "Select an audit type"}</span>
        </SelectTrigger>
        <SelectContent>
          {AUDIT_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button disabled={!selectedType} onClick={onNext}>
        Next: Choose Standards
      </Button>
    </div>
  );
}
