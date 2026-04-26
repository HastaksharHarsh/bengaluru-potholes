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
  Loader2,
  ChevronRight,
  Info
} from "lucide-react";
import type { WeeklyReport } from "@/lib/bengaluru-data";
import { fetchWeeklyReports } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
        setError("Failed to connect to the reports server.");
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
        margin: [15, 10, 15, 10] as [number, number, number, number],
        filename: `BRW_Report_${report.week.replace(/\s+/g, "_")}.pdf`,
        image: { type: 'jpeg' as 'jpeg' | 'png' | 'webp', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as 'portrait' | 'landscape' },
        pagebreak: { mode: 'css', avoid: 'tr' }
      };

      const html2pdf = (await import('html2pdf.js')).default;
      toast.info("Generating PDF report...");
      await html2pdf().set(opt).from(element).save();
      
      if (pdfHeader) pdfHeader.style.display = "none";
      toast.success("Report downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || (!loading && reports.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center px-4 animate-fade-in">
        <div className="bg-gray-100 p-6 rounded-full">
          <FileText className="h-12 w-12 text-gray-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">No Reports Available</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            Weekly road audits are generated automatically based on live reported data.
          </p>
        </div>
        <Button 
          onClick={() => {
            toast.info("Triggering report generation...");
            fetch("http://localhost:3001/api/reports/refresh", { method: "POST" })
              .then(() => window.location.reload());
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-semibold shadow-raised"
        >
          Generate Weekly Audit
        </Button>
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
    <div className="p-[24px] lg:p-[28px] space-y-[20px] animate-fade-in pb-[120px] lg:pb-[28px]">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="hero-banner flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <div className="hero-banner-tag">CITY AUDIT BUREAU</div>
            <h1 className="hero-banner-title">Civic Reports</h1>
            <p className="hero-banner-subtitle">Official weekly road audit and infrastructure health logs.</p>
          </div>
          <div>
            <button
              onClick={() => handleDownloadPDF(selectedReport)}
              className="inline-flex items-center justify-center gap-2 h-[42px] px-5 rounded-[10px] text-[14px] font-[600] text-white bg-[#1a73e8] hover:bg-[#1557b0] transition-all shadow-sm"
            >
              <Download className="h-4 w-4" /> Export to PDF
            </button>
          </div>
        </div>

        {/* Topbar: Past Reports */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">
            <History className="h-3.5 w-3.5" /> Sessions:
          </div>
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap",
                selectedReport.id === report.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              )}
            >
              {report.week}
            </button>
          ))}
        </div>

        {/* Main Content: Selected Report */}
        <div id="report-pdf-content" className="space-y-6 bg-transparent">
          {/* Header for PDF only */}
          <div id="pdf-only-header" style={{ display: "none" }} className="pb-8 mb-8 border-b-2 border-gray-100">
            <div className="flex items-center gap-2 mb-4">
               <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">PH</div>
               <h1 className="text-2xl font-bold">PlotHole</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Weekly Audit: {selectedReport.week}</h2>
            <p className="text-sm text-gray-500 mt-2">Generated At: {new Date(selectedReport.generatedAt).toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Reported", val: selectedReport.totalReported, icon: FileText, sub: "New entries", color: "text-blue-600" },
              { label: "Fixed", val: selectedReport.totalFixed, icon: CheckCircle2, sub: "Repaired", color: "text-green-600" },
              { label: "Pending", val: selectedReport.pending, icon: Clock, sub: "In progress", color: "text-amber-600" },
              { label: "Critical", val: selectedReport.severityBreakdown.critical, icon: AlertCircle, sub: "High risk", color: "text-red-600" },
            ].map((stat) => (
              <Card key={stat.label} className="p-4 bg-white border-border shadow-card flex flex-col gap-1">
                <div className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-60", stat.color)}>
                  <stat.icon className="h-3 w-3" /> {stat.label}
                </div>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">{stat.val}</div>
                <div className="text-[10px] text-gray-400 font-medium">{stat.sub}</div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 bg-white border-border shadow-card space-y-6">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" /> Severity Analysis
              </h3>
              <div className="space-y-4">
                {severityData.map((d) => (
                  <div key={d.label} className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-600">{d.label}</span>
                      <span className="text-gray-900">{d.value}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-500", d.color)}
                        style={{ width: `${(d.value / maxSeverity) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-white border-border shadow-card space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" /> AI Audit Summary
              </h3>
              
              <div className="space-y-4">
                <div className="text-sm leading-relaxed text-gray-600 p-4 rounded-xl bg-gray-50 border border-gray-100 italic">
                  "{selectedReport.aiInsights?.summary || selectedReport.aiSummary}"
                </div>
                
                {selectedReport.aiInsights && (
                  <div className="grid grid-cols-1 gap-3">
                    {selectedReport.aiInsights.recommendations.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Priority Recommendations
                        </div>
                        <ul className="space-y-1">
                          {selectedReport.aiInsights.recommendations.slice(0, 3).map((rec, i) => (
                            <li key={i} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                              <span className="text-gray-300 font-bold">•</span> {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {!selectedReport.aiInsights && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase text-green-600">Top Ward</div>
                      <div className="text-xs font-semibold text-gray-800">{selectedReport.topLocality}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase text-red-600">Worst Ward</div>
                      <div className="text-xs font-semibold text-gray-800">{selectedReport.worstLocality}</div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Detailed Table */}
          {selectedReport.detailedTable && selectedReport.detailedTable.length > 0 && (
            <Card className="bg-white border-border shadow-card overflow-hidden rounded-2xl">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                 <h3 className="text-sm font-semibold text-gray-900">Incident Activity Log</h3>
                 <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                   <Info className="h-3 w-3" /> Audited for performance
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="py-3 px-4 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-center">Road / Area</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-center">Ward</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-center">Reported</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-center">Status</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-center">Days</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-center">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedReport.detailedTable.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="py-3 px-4 text-center">
                          <div className="text-sm font-semibold text-gray-900">{row.location}</div>
                          <div className="text-[10px] text-gray-400">{row.locality}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 font-medium text-center">{row.ward}</td>
                        <td className="py-3 px-4 text-[11px] text-gray-400 tabular-nums text-center">
                          {new Date(row.reportedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                            row.status === 'repaired' ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {row.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-gray-500 font-medium text-center tabular-nums">
                          {row.daysToFix > 0 ? row.daysToFix : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                            row.severity === 'critical' ? 'bg-red-600 text-white' : 
                            row.severity === 'high' ? 'bg-orange-500 text-white' : 
                            'bg-gray-200 text-gray-600'
                          )}>
                            {row.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
