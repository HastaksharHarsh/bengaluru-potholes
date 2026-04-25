import { localities, potholes, getWard } from "@/lib/bengaluru-data";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function Localities() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const rows = useMemo(() => {
    return localities.map((l) => {
      const items = potholes.filter((p) => p.localityId === l.id);
      const totalPotholes = items.length;
      
      const fixed = items.filter((p) => p.status === "repaired");
      const resolutionRate = totalPotholes === 0 ? 0 : Math.round((fixed.length / totalPotholes) * 100);
      
      let avgSeverityLabel = "Low";
      if (totalPotholes > 0) {
        const avgScore = items.reduce((acc, p) => acc + p.severityScore, 0) / totalPotholes;
        if (avgScore >= 70) avgSeverityLabel = "High";
        else if (avgScore >= 40) avgSeverityLabel = "Medium";
      }

      // In this mock data, each locality maps to 1 ward. We will display 1 for accuracy, or if we had multiple wards per locality, we'd count them here.
      const totalWards = 1; 

      return { l, totalPotholes, resolutionRate, avgSeverityLabel, totalWards };
    });
  }, []);

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl lg:text-2xl font-display font-bold">Localities Drilldown</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Select a locality to view ward-level details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((r) => (
          <Card 
            key={r.l.id} 
            className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-smooth flex flex-col justify-between"
            onClick={() => navigate(`/localities/${r.l.id}`)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display font-semibold text-lg">{lang === "kn" ? r.l.nameKn : r.l.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.totalWards} {r.totalWards === 1 ? 'Ward' : 'Wards'}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 divide-x">
              <div className="flex flex-col items-center justify-center">
                <div className="text-xl font-bold">{r.totalPotholes}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Reports</div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className={`text-sm font-bold ${
                  r.avgSeverityLabel === "High" ? "text-destructive" : r.avgSeverityLabel === "Medium" ? "text-amber-500" : "text-health-good"
                }`}>
                  {r.avgSeverityLabel}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Severity</div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="text-xl font-bold">{r.resolutionRate}%</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Resolution</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
