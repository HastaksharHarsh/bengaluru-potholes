import { cn } from "@/lib/utils";
import { Severity } from "@/lib/bengaluru-data";

const map: Record<Severity, { label: string; cls: string; dot: string }> = {
  critical: { label: "Critical", cls: "bg-severity-critical/10 text-severity-critical border-severity-critical/30", dot: "bg-severity-critical" },
  high: { label: "High", cls: "bg-severity-high/10 text-severity-high border-severity-high/30", dot: "bg-severity-high" },
  medium: { label: "Medium", cls: "bg-severity-medium/15 text-amber-700 border-severity-medium/30", dot: "bg-severity-medium" },
  low: { label: "Low", cls: "bg-severity-low/10 text-severity-low border-severity-low/30", dot: "bg-severity-low" },
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const m = map[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        m.cls,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}
