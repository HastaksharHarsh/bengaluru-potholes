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
  default: "from-card to-muted/40 border-border",
  critical: "from-severity-critical/10 to-card border-severity-critical/30",
  good: "from-health-good/10 to-card border-health-good/30",
  warn: "from-severity-medium/15 to-card border-severity-medium/30",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default", className }: Props) {
  return (
    <Card className={cn("p-5 bg-gradient-to-br border", toneMap[tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-3xl font-display font-bold mt-1.5">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
        </div>
        {Icon && (
          <div className="h-10 w-10 rounded-lg bg-background/60 flex items-center justify-center text-muted-foreground">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
