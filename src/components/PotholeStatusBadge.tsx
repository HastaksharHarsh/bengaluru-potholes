import { Pothole } from "../../backend/src/models/types";
import { cn } from "@/lib/utils";

export function getDerivedStatus(p: Pothole) {
  if (p.status === "repaired") {
    return { label: "Repaired", colorClass: "bg-green-50 text-green-700 border-green-100" };
  }
  if (p.slaBreached) {
    return { label: "SLA Overdue", colorClass: "bg-red-50 text-red-700 border-red-100" };
  }
  return { label: "Pending", colorClass: "bg-amber-50 text-amber-700 border-amber-100" };
}

export function PotholeStatusBadge({ pothole, className = "" }: { pothole: Pothole; className?: string }) {
  const { label, colorClass } = getDerivedStatus(pothole);
  return (
    <span className={cn("px-2 py-0.5 rounded-lg font-bold uppercase text-[9px] tracking-wider border transition-colors", colorClass, className)}>
      {label}
    </span>
  );
}
