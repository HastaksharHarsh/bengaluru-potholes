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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeeklyReports()
      .then((data) => {
        setReports(data);
        if (data.length > 0) setSelectedReport(data[0]);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to connect to the reports server. Please ensure the backend is running on port 3001.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadPDF = async (report: WeeklyReport) => {
    try {
      const element = document.getElementById("report-pdf-content");
      if (!element) return;
      
      const pdfHeader = document.getElementById("pdf-only-header");
      if (pdfHeader) pdfHeader.style.display = "block";
      
      const opt = {
        margin: [15, 10, 15, 10], // top, left, bottom, right
        filename: `BRW_Report_${report.week.replace(/\s+/g, "_")}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'css', avoid: 'tr' }
      };

      // @ts-ignore - html2pdf is dynamically imported or typeless
      const html2pdf = (await import('html2pdf.js')).default;
      
      toast.info("Generating PDF, please wait...");
      await html2pdf().set(opt).from(element).save();
      
      if (pdfHeader) pdfHeader.style.display = "none";
      toast.success("Report downloaded successfully as PDF");
    } catch (err) {
      console.error(err);
      if (document.getElementById("pdf-only-header")) {
        document.getElementById("pdf-only-header")!.style.display = "none";
      }
      toast.error("Failed to generate PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || (!loading && reports.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center px-4 animate-fade-in">
        <div className="bg-primary/10 p-6 rounded-full">
          <FileText className="h-12 w-12 text-primary opacity-50" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold">No Reports Yet</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {error || "Weekly road audits are generated automatically. Report potholes to see them reflected in the next audit."}
          </p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl">
            Check Again
          </Button>
          <Button 
            onClick={() => {
              toast.info("Generating fresh report from live data...");
              fetch("http://localhost:3001/api/reports/refresh", { method: "POST" })
                .then(() => window.location.reload());
            }}
            className="gradient-hero text-white rounded-xl shadow-elegant"
          >
            Generate Report Now
          </Button>
        </div>
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
        <div id="report-pdf-content" className="xl:col-span-3 space-y-6 bg-background rounded-xl p-1">
          {/* Header for PDF only (hidden in UI, shown in PDF via JS toggle) */}
          <div id="pdf-only-header" style={{ display: "none" }} className="pb-4 mb-4 border-b">
            <h1 className="text-3xl font-bold">Bengaluru Road Watch</h1>
            <h2 className="text-xl text-muted-foreground">Weekly Civic Report: {selectedReport.week}</h2>
            <p className="text-sm text-muted-foreground mt-2">Generated on: {new Date(selectedReport.generatedAt).toLocaleString()}</p>
          </div>

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

            <Card className="p-6 space-y-4 relative overflow-hidden flex flex-col h-full">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="h-24 w-24 text-primary" />
              </div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Audit Insights
              </h3>
              
              {selectedReport.aiInsights ? (
                <div className="space-y-4 flex-1">
                  <p className="text-sm leading-relaxed text-muted-foreground bg-secondary/30 p-4 rounded-xl border border-secondary/50 italic">
                    "{selectedReport.aiInsights.summary}"
                  </p>
                  
                  <div className="space-y-3 pt-2">
                    {selectedReport.aiInsights.issues.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase text-red-500 mb-1">Key Issues</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {selectedReport.aiInsights.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                        </ul>
                      </div>
                    )}
                    
                    {selectedReport.aiInsights.patterns.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase text-blue-500 mb-1">Observed Patterns</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {selectedReport.aiInsights.patterns.map((pattern, i) => <li key={i}>{pattern}</li>)}
                        </ul>
                      </div>
                    )}
                    
                    {selectedReport.aiInsights.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase text-green-500 mb-1">Recommendations</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {selectedReport.aiInsights.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-muted-foreground bg-secondary/30 p-4 rounded-xl border border-secondary/50 italic">
                    "{selectedReport.aiSummary}"
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-4">
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
                </div>
              )}
            </Card>
          </div>

          {/* Detailed Table */}
          {selectedReport.detailedTable && selectedReport.detailedTable.length > 0 && (
            <Card className="p-6">
              <h3 className="text-base font-bold mb-4">Detailed Pothole Log</h3>
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b text-muted-foreground bg-muted/20">
                    <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Location</th>
                    <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Locality</th>
                    <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Ward</th>
                    <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Reported</th>
                    <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Status</th>
                    <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Days to Fix</th>
                    <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.detailedTable.map((row) => (
                    <tr key={row.id} className="border-b border-muted/50 last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-4 truncate max-w-[150px]" title={row.location}>{row.location}</td>
                      <td className="py-2 px-4">{row.locality}</td>
                      <td className="py-2 px-4">{row.ward}</td>
                      <td className="py-2 px-4 whitespace-nowrap text-muted-foreground">{new Date(row.reportedAt).toLocaleDateString()}</td>
                      <td className="py-2 px-4 capitalize font-medium">{row.status.replace("_", " ")}</td>
                      <td className="py-2 px-4 text-center">{row.daysToFix > 0 ? row.daysToFix : "-"}</td>
                      <td className="py-2 px-4 capitalize">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.severity === 'critical' ? 'bg-red-500/10 text-red-600' : 
                          row.severity === 'high' ? 'bg-orange-500/10 text-orange-600' : 
                          row.severity === 'medium' ? 'bg-amber-500/10 text-amber-600' : 
                          'bg-blue-500/10 text-blue-600'
                        }`}>
                          {row.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
