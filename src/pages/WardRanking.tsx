import { wards, wardStats } from "@/lib/bengaluru-data";
import { Card } from "@/components/ui/card";
import { Trophy, Award, Medal, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function WardRanking() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const rows = useMemo(
    () =>
      wards
        .map((w) => ({ w, ...wardStats(w.id) }))
        .sort((a, b) => b.perf - a.perf),
    []
  );

  const top = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl lg:text-2xl font-display font-bold">{t("nav_wards")}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Score = fix rate − SLA breaches. Higher is better. Tap any ward to see pothole logs.
        </p>
      </div>

      {/* Podium — 1 col mobile, 3 col md+ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {top.map((r, idx) => {
          const icon = idx === 0 ? Trophy : idx === 1 ? Medal : Award;
          const Icon = icon;
          const grad =
            idx === 0
              ? "gradient-hero"
              : idx === 1
              ? "bg-gradient-to-br from-secondary to-secondary/70"
              : "bg-gradient-to-br from-accent to-accent/70";
          return (
            <Link key={r.w.id} to={`/wards/${r.w.id}`} className="block">
              <Card
                className={`${grad} text-white p-4 lg:p-6 shadow-elegant hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider opacity-80">Rank #{idx + 1}</div>
                    <div className="font-display font-bold text-lg mt-0.5">
                      Ward {r.w.number} · {r.w.name}
                    </div>
                    <div className="text-xs opacity-75">{r.w.zone} Zone</div>
                  </div>
                  <Icon className="h-7 w-7 opacity-90 shrink-0" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-display font-bold">{r.perf}</div>
                    <div className="text-[10px] uppercase opacity-80">Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-display font-bold">{r.fixed}</div>
                    <div className="text-[10px] uppercase opacity-80">Repaired</div>
                  </div>
                  <div>
                    <div className="text-2xl font-display font-bold">{r.breached}</div>
                    <div className="text-[10px] uppercase opacity-80">Overdue</div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Mobile list for ranks 4+ */}
      <div className="lg:hidden space-y-2">
        {rest.map((r, idx) => {
          const perfColor =
            r.perf >= 70 ? "bg-health-good" : r.perf >= 40 ? "bg-health-warn" : "bg-health-bad";
          return (
            <Link key={r.w.id} to={`/wards/${r.w.id}`} className="block">
              <Card className="p-4 hover:bg-muted/30 active:scale-[0.98] transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="text-base font-display font-bold text-muted-foreground w-8 shrink-0">
                    #{idx + 4}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{r.w.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Ward {r.w.number} · {r.w.zone}
                    </div>
                    <div className="h-1.5 mt-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${perfColor}`}
                        style={{ width: `${r.perf}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="text-right">
                      <div className="font-display font-bold text-xl">{r.perf}</div>
                      <div className="text-[10px] text-muted-foreground">{r.open} open</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Desktop table */}
      <Card className="overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Rank</th>
                <th className="text-left px-4 py-3 font-medium">Ward</th>
                <th className="text-left px-4 py-3 font-medium">Zone</th>
                <th className="text-left px-4 py-3 font-medium">MLA</th>
                <th className="text-center px-4 py-3 font-medium">Total</th>
                <th className="text-center px-4 py-3 font-medium">Open</th>
                <th className="text-center px-4 py-3 font-medium">Repaired</th>
                <th className="text-center px-4 py-3 font-medium">SLA Breach</th>
                <th className="text-center px-4 py-3 font-medium">Avg Days</th>
                <th className="text-right px-4 py-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rest.map((r, idx) => (
                <tr
                  key={r.w.id}
                  className="hover:bg-muted/30 transition-smooth cursor-pointer"
                  onClick={() => navigate(`/wards/${r.w.id}`)}
                >
                  <td className="px-4 py-3 font-display font-bold text-muted-foreground">
                    #{idx + 4}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.w.name}</div>
                    <div className="text-xs text-muted-foreground">Ward {r.w.number}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.w.zone}</td>
                  <td className="px-4 py-3">
                    <div className="text-foreground">{r.w.mla}</div>
                    <div className="text-xs text-muted-foreground">{r.w.constituency}</div>
                  </td>
                  <td className="text-center">{r.total}</td>
                  <td className="text-center font-semibold">{r.open}</td>
                  <td className="text-center text-health-good font-semibold">{r.fixed}</td>
                  <td className="text-center text-destructive font-semibold">{r.breached}</td>
                  <td className="text-center">{r.avgResolveDays}d</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={
                            r.perf >= 70
                              ? "h-full bg-health-good"
                              : r.perf >= 40
                              ? "h-full bg-health-warn"
                              : "h-full bg-health-bad"
                          }
                          style={{ width: `${r.perf}%` }}
                        />
                      </div>
                      <span className="font-display font-bold w-8 text-right">{r.perf}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
