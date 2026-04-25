import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
  History,
  Loader2
} from "lucide-react";
import type { WeeklyReport } from "@/lib/bengaluru-data";
import { fetchWeeklyReports } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export default function Reports() {
  const { t } = useI18n();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyReports()
      .then((data) => {
        setReports(data);
        if (data.length > 0) setSelectedReport(data[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadPDF = (report: WeeklyReport) => {
    // Simulate PDF generation
    const content = `
      BENGALURU ROAD WATCH - WEEKLY REPORT
      Period: ${report.week}
      Generated At: ${new Date(report.generatedAt).toLocaleString()}
      
      SUMMARY:
      - Total Reported: ${report.totalReported}
      - Total Fixed: ${report.totalFixed}
      - Pending: ${report.pending}
      - Reoccurring: ${report.reoccurring}
      
      SEVERITY BREAKDOWN:
      - Critical: ${report.severityBreakdown.critical}
      - High: ${report.severityBreakdown.high}
      - Medium: ${report.severityBreakdown.medium}
      - Low: ${report.severityBreakdown.low}
      
      LOCALITY PERFORMANCE:
      - Top Performing: ${report.topLocality}
      - Critical Attention: ${report.worstLocality}
      
      AI ANALYSIS:
      ${report.aiSummary}
    `;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BRW_Report_${report.week.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Report downloaded successfully as text/PDF");
  };

  if (loading || !selectedReport) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const severityData = [
    { label: "Critical", value: selectedReport.severityBreakdown.critical, color: "bg-red-500" },
    { label: "High", value: selectedReport.severityBreakdown.high, color: "bg-orange-500" },
    { label: "Medium", value: selectedReport.severityBreakdown.medium, color: "bg-amber-500" },
    { label: "Low", value: selectedReport.severityBreakdown.low, color: "bg-blue-500" },
  ];

  const maxSeverity = Math.max(...severityData.map(d => d.value));

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Civic Reports</h1>
          <p className="text-muted-foreground text-sm">Transparency and accountability through weekly road audits.</p>
        </div>
        <Button
          onClick={() => handleDownloadPDF(selectedReport)}
          className="gradient-hero text-white shadow-elegant"
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Sidebar: Past Reports */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="p-4 border-none bg-secondary/20 shadow-none">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <History className="h-4 w-4" />
              Past Reports
            </h2>
            <div className="space-y-2">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${selectedReport.id === report.id
                      ? "bg-white border-primary/20 shadow-sm text-primary font-semibold"
                      : "hover:bg-white/50 border-transparent text-muted-foreground"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{report.week}</span>
                    <Calendar className="h-3 w-3 opacity-50" />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Main Content: Selected Report */}
        <div className="xl:col-span-3 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-primary/5 border-primary/10">
              <div className="flex items-center gap-2 text-primary mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase">Reported</span>
              </div>
              <div className="text-2xl font-display font-bold">{selectedReport.totalReported}</div>
              <div className="text-[10px] text-muted-foreground">New potholes</div>
            </Card>
            <Card className="p-4 bg-green-500/5 border-green-500/10">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase">Fixed</span>
              </div>
              <div className="text-2xl font-display font-bold">{selectedReport.totalFixed}</div>
              <div className="text-[10px] text-muted-foreground">Repaired this week</div>
            </Card>
            <Card className="p-4 bg-orange-500/5 border-orange-500/10">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase">Pending</span>
              </div>
              <div className="text-2xl font-display font-bold">{selectedReport.pending}</div>
              <div className="text-[10px] text-muted-foreground">Unresolved</div>
            </Card>
            <Card className="p-4 bg-red-500/5 border-red-500/10">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase">Critical</span>
              </div>
              <div className="text-2xl font-display font-bold">{selectedReport.severityBreakdown.critical}</div>
              <div className="text-[10px] text-muted-foreground">High-risk hazards</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-6">
              <h3 className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Severity Breakdown
              </h3>
              <div className="space-y-4">
                {severityData.map((d) => (
                  <div key={d.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{d.label}</span>
                      <span className="text-muted-foreground">{d.value}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${d.color} transition-all duration-500`}
                        style={{ width: `${(d.value / maxSeverity) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="h-24 w-24 text-primary" />
              </div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Audit Summary
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground bg-secondary/30 p-4 rounded-xl border border-secondary/50 italic">
                "{selectedReport.aiSummary}"
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Top Performance
                  </div>
                  <div className="text-sm font-semibold">{selectedReport.topLocality}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-red-600 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Worst Performance
                  </div>
                  <div className="text-sm font-semibold">{selectedReport.worstLocality}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
