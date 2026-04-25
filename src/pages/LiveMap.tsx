import { useEffect, useState, useMemo } from "react";
import { PotholeMap } from "@/components/maps/PotholeMap";
import { Severity } from "@/lib/bengaluru-data";
import { fetchPotholes } from "@/lib/api";
import { Pothole } from "../../backend/src/models/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export default function LiveMap() {
  const { t } = useI18n();
  const [heatmap, setHeatmap] = useState(true);
  const [filter, setFilter] = useState<Severity | "all">("all");

  const [dbPotholes, setDbPotholes] = useState<Pothole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPotholes().then(res => setDbPotholes(res.potholes)).finally(() => setLoading(false));
  }, []);

  const data = useMemo(
    () => (filter === "all" ? dbPotholes : dbPotholes.filter((p) => p.severity === filter)),
    [filter, dbPotholes]
  );

  return (
    <div className="p-4 lg:p-8 space-y-4 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{t("nav_map")}</h1>
          <p className="text-sm text-muted-foreground">Bengaluru-wide pothole density and incidents</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={heatmap ? "default" : "outline"} size="sm" onClick={() => setHeatmap(true)}>
            Heatmap
          </Button>
          <Button variant={!heatmap ? "default" : "outline"} size="sm" onClick={() => setHeatmap(false)}>
            Markers
          </Button>
          <div className="w-px bg-border mx-1" />
          {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "secondary" : "outline"}
              onClick={() => setFilter(s)}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[75vh] rounded-xl bg-muted/20 animate-pulse border border-border flex items-center justify-center">
          Loading Live Google Cloud Data...
        </div>
      ) : (
        <PotholeMap potholes={data} showHeatmap={heatmap} height="75vh" />
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="font-medium text-sm">Legend:</div>
          {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
            <div key={s} className="flex items-center gap-2 capitalize">
              <span
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor:
                    s === "critical" ? "hsl(var(--severity-critical))" :
                      s === "high" ? "hsl(var(--severity-high))" :
                        s === "medium" ? "hsl(var(--severity-medium))" :
                          "hsl(var(--severity-low))",
                }}
              />
              {s}
            </div>
          ))}
          <div className="ml-auto text-muted-foreground">{data.length} potholes shown</div>
        </div>
      </Card>
    </div>
  );
}
