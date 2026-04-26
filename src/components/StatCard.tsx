import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "critical" | "good" | "warn";
  className?: string;
}

const toneMap = {
  default: "border-border",
  critical: "border-l-4 border-l-severity-critical",
  good: "border-l-4 border-l-health-good",
  warn: "border-l-4 border-l-severity-medium",
};

const iconToneMap = {
  default: "bg-gray-50 text-gray-400",
  critical: "bg-red-50 text-red-600",
  good: "bg-green-50 text-green-600",
  warn: "bg-amber-50 text-amber-600",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default", className }: Props) {
  return (
    <Card className={cn("p-5 bg-white shadow-card border border-border overflow-hidden", toneMap[tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-1 font-medium">{hint}</div>}
        </div>
        {Icon && (
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", iconToneMap[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
