import { Pothole } from "@/lib/bengaluru-data";

export function getDerivedStatus(p: Pothole) {
  if (p.status === "repaired") {
    return { label: "Fixed", colorClass: "bg-green-500/20 text-green-700 dark:text-green-400" };
  }
  if (p.slaBreached) {
    return { label: "Reported Long Back", colorClass: "bg-red-500/20 text-red-700 dark:text-red-400" };
  }
  return { label: "Reported", colorClass: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" };
}

export function PotholeStatusBadge({ pothole, className = "" }: { pothole: Pothole; className?: string }) {
  const { label, colorClass } = getDerivedStatus(pothole);
  return (
    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${colorClass} ${className}`}>
      {label}
    </span>
  );
}
