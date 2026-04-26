import { cn } from "@/lib/utils";
import { Severity } from "@/lib/bengaluru-data";

const map: Record<Severity, { label: string; cls: string; dot: string }> = {
  critical: { label: "Critical", cls: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-500" },
  high: { label: "High", cls: "bg-orange-50 text-orange-700 border-orange-100", dot: "bg-orange-500" },
  medium: { label: "Medium", cls: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" },
  low: { label: "Low", cls: "bg-green-50 text-green-700 border-green-100", dot: "bg-green-500" },
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const m = map[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border",
        m.cls,
        className
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}
