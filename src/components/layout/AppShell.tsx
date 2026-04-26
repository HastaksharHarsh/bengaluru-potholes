import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Camera,
  Map as MapIcon,
  Trophy,
  MoreHorizontal,
  FileText,
  Building2,
  TrendingUp,
  Newspaper,
  Shield,
  Languages,
  X,
  Settings,
  LogOut,
  MapPin,
  BarChart2,
  Mail
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

const sidebarNavItems = [
  { to: "/",            icon: LayoutDashboard, label: "nav_dashboard",    end: true },
  { to: "/map",         icon: MapIcon,         label: "nav_map"             },
  { to: "/report",      icon: Camera,          label: "nav_report"       },
  { to: "/reports",     icon: FileText,        label: "nav_reports"              },
  { to: "/localities",  icon: MapPin,          label: "nav_localities"           },
  { to: "/wards",       icon: BarChart2,       label: "nav_wards"        },
  { to: "/progressions",icon: TrendingUp,      label: "nav_progressions"         },
  { to: "/newsletter",  icon: Mail,            label: "nav_newsletter"           },
];

const bottomNavItems = [
  { to: "/",     icon: LayoutDashboard, label: "nav_dashboard", end: true },
  { to: "/map",  icon: MapIcon,         label: "nav_map"               },
  { to: "/report",icon: Camera,         label: "nav_report", isCta: true},
  { to: "/wards",icon: BarChart2,       label: "nav_wards"             },
  { to: null,    icon: MoreHorizontal,  label: "nav_more",   isMore: true},
];

const citizenMoreItems = [
  { to: "/reports",      icon: FileText,   label: "nav_reports"      },
  { to: "/localities",   icon: MapPin,     label: "nav_localities"   },
  { to: "/progressions", icon: TrendingUp, label: "nav_progressions" },
  { to: "/newsletter",   icon: Mail,       label: "nav_newsletter"   },
];

const supervisorMoreItems = [
  { to: "/reports",      icon: FileText,   label: "nav_reports"       },
  { to: "/progressions", icon: TrendingUp, label: "nav_progressions"  },
  { to: "/newsletter",   icon: Mail,       label: "nav_newsletter"    },
  { to: "/supervisor/login", icon: Settings, label: "nav_settings"   },
];

function MoreSheet({ open, onClose, isSupervisor }: { open: boolean; onClose: () => void; isSupervisor: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const items = isSupervisor ? supervisorMoreItems : citizenMoreItems;
  if (!open) return null;

  return (
    <>
      <div className="lg:hidden fixed inset-0 z-50 bg-[#202124] opacity-40 transition-opacity" onClick={onClose} />
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 animate-fade-in">
        <div className="bg-[#1e293b] rounded-t-[16px] border-t border-white/10 shadow-lift-g">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-8 rounded-full bg-slate-600" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <span className="text-h3 text-white">
              {isSupervisor ? "Supervisor Menu" : "More Options"}
            </span>
            <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-surface-muted transition-colors">
              <X className="h-5 w-5 text-secondary-g" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 p-4 pb-8">
            {items.map((item) => (
              <button
                key={item.to}
                onClick={() => { navigate(item.to); onClose(); }}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-[10px] hover:bg-white/10 active:scale-[0.97] transition-all justify-center"
              >
                <item.icon className="h-6 w-6 text-white" />
                <span className="text-[11px] font-[500] text-slate-200 text-center leading-tight">{t(item.label as any)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function AppShell() {
  const { lang, setLang, t } = useI18n();
  const { isSupervisor, logout } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface-page" style={{ minHeight: "100vh" }}>
      {/* ── Desktop Sidebar ── */}
      <aside 
        className="hidden lg:flex flex-col shrink-0 sticky top-0 h-screen w-[280px] min-w-[280px] border-r border-gray-800"
        style={{ 
          background: "#1e293b",
          boxShadow: "4px 0 20px rgba(0,0,0,0.15)"
        }}
      >
        {/* Logo Zone */}
        <div 
          className="h-[72px] px-5 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div 
            className="h-[40px] w-[40px] rounded-full flex items-center justify-center text-white shrink-0"
            style={{ 
              background: "#ea4335",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            PH
          </div>
          <div>
            <div className="text-[16px] font-[700] text-white leading-tight tracking-wide">PlotHole</div>
            <div className="text-[11px] font-[500] text-slate-400 leading-tight">BBMP Bengaluru</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-4 space-y-1 overflow-y-auto">
          {sidebarNavItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 h-[48px] rounded-[10px] transition-all duration-150 text-[15px]",
                isActive
                  ? "text-white font-[600] bg-white/10"
                  : "text-slate-300 font-[500] hover:text-white hover:bg-white/5"
              )}
              style={({ isActive }) => isActive ? {
                borderLeft: "4px solid #3b82f6"
              } : { borderLeft: "4px solid transparent" }}
            >
              {({ isActive }) => (
                <>
                  <it.icon className="h-[20px] w-[20px] shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  <span>{t(it.label as any)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Controls */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} className="pt-4 pb-6 space-y-2">
          {isSupervisor && (
            <div className="mx-4 mb-3 px-3 py-2 rounded-[10px] flex items-center gap-2" style={{ background: "rgba(255,255,255,0.05)" }}>
              <Shield className="h-[16px] w-[16px] text-amber-400 shrink-0" />
              <span className="text-[12px] font-[600] text-amber-300 uppercase tracking-wider">Supervisor Mode</span>
            </div>
          )}
          <div className="px-4">
            <button
              onClick={() => isSupervisor ? logout() : navigate("/supervisor/login")}
              className="w-full flex items-center gap-3 px-4 h-[48px] rounded-[10px] text-[15px] font-[500] text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
            >
              {isSupervisor ? <LogOut className="h-[20px] w-[20px] shrink-0" /> : <Shield className="h-[20px] w-[20px] shrink-0" />}
              <span>{isSupervisor ? "Sign Out" : "Supervisor Login"}</span>
            </button>
            <button
              onClick={() => setLang(lang === "en" ? "kn" : "en")}
              className="w-full flex items-center gap-3 px-4 h-[48px] rounded-[10px] text-[15px] font-[500] text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-150 mt-1"
            >
              <Languages className="h-[20px] w-[20px] shrink-0" />
              <span>{lang === "en" ? "ಕನ್ನಡ" : "English"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 pb-[64px] lg:pb-0 overflow-auto">
        <Outlet />
      </main>
      {/* ── Mobile Bottom Navigation ── */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 h-[64px] bg-[#1e293b] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-around px-2 h-full">
          {bottomNavItems.map((item) => {
            if (item.isCta) {
              return (
                <button 
                  key="report-cta" 
                  onClick={() => navigate("/report")} 
                  className="relative flex items-center justify-center -top-4 h-[56px] w-[56px] rounded-[50%] active:scale-[0.97] transition-transform bg-[#ea4335] shadow-lg"
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
              );
            }

            if (item.isMore) {
              return (
                <button 
                  key="more" 
                  onClick={() => setMoreOpen(true)} 
                  className="flex flex-col items-center justify-center gap-1 flex-1 min-w-[40px] h-full active:bg-white/10 transition-colors"
                >
                  <MoreHorizontal className={cn("h-6 w-6", moreOpen ? "text-white" : "text-slate-300")} />
                  <span className={cn("text-[11px] font-[500]", moreOpen ? "text-white" : "text-slate-300")}>{t(item.label as any)}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={item.to!}
                to={item.to!}
                end={item.end}
                className="flex flex-col items-center justify-center gap-1 flex-1 min-w-[40px] h-full transition-colors active:bg-white/10"
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("h-6 w-6", isActive ? "text-white" : "text-slate-300")} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={cn("text-[11px] font-[500]", isActive ? "text-white" : "text-slate-300")}>{t(item.label as any)}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} isSupervisor={isSupervisor} />
    </div>
  );
}
