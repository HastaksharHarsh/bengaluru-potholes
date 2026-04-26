import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Camera, Map, Building2, Trophy, Languages, Shield, FileText, Newspaper, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

const navItems = [
  { to: "/", icon: LayoutDashboard, key: "nav_dashboard" as const, label: "Home", end: true },
  { to: "/progressions", icon: TrendingUp, key: "nav_progressions" as const, label: "Progressions" },
  { to: "/map", icon: Map, key: "nav_map" as const, label: "Map" },
  { to: "/report", icon: Camera, key: "nav_report" as const, label: "Report" },
  { to: "/reports", icon: FileText, key: "nav_reports" as const, label: "Reports" },
  { to: "/localities", icon: Building2, key: "nav_localities" as const, label: "Areas" },
  { to: "/wards", icon: Trophy, key: "nav_wards" as const, label: "Wards" },
  { to: "/newsletter", icon: Newspaper, key: "nav_newsletter" as const, label: "Newsletter" },
];


export function AppShell() {
  const { t, lang, setLang } = useI18n();
  const { isSupervisor, logout } = useAppStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Desktop Sidebar (lg+) ─────────────────────────────────── */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-sidebar text-sidebar-foreground shrink-0 border-r border-sidebar-border sticky top-0 h-screen transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-9 w-9 rounded-lg gradient-hero flex items-center justify-center text-white font-display font-bold text-sm shrink-0">
              ಬೆಂ
            </div>
            {!collapsed && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="font-display font-semibold text-sm leading-tight whitespace-nowrap">{t("app_name")}</div>
                <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">BBMP Smart City</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              title={collapsed ? t(it.key) : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0"
                )
              }
            >
              <it.icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="animate-in fade-in slide-in-from-left-2 duration-300">
                  {t(it.key)}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Toggle */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background flex items-center justify-center text-muted-foreground hover:text-primary shadow-sm z-50 transition-transform active:scale-95"
        >
          {collapsed ? "→" : "←"}
        </button>

        {/* Bottom Controls */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            title={collapsed ? (isSupervisor ? "Logout" : "Supervisor Mode") : undefined}
            className={cn(
              "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-300",
              isSupervisor && "bg-sidebar-primary/20 text-sidebar-primary font-semibold",
              collapsed && "justify-center px-0"
            )}
            onClick={() => isSupervisor ? logout() : navigate("/supervisor/login")}
          >
            <Shield className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && <span>{isSupervisor ? "Logout (Supervisor)" : "Supervisor Mode"}</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title={collapsed ? (lang === "en" ? "ಕನ್ನಡ" : "English") : undefined}
            className={cn(
              "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-300",
              collapsed && "justify-center px-0"
            )}
            onClick={() => setLang(lang === "en" ? "kn" : "en")}
          >
            <Languages className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && <span>{lang === "en" ? "ಕನ್ನಡ" : "English"}</span>}
          </Button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ───────────────────────────────────────── */}
      <div className="lg:hidden fixed inset-x-0 top-0 z-50 bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between border-b border-sidebar-border shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-hero flex items-center justify-center text-white font-bold text-xs shrink-0">ಬೆಂ</div>
          <div>
            <div className="font-display text-sm font-semibold leading-tight">{t("app_name")}</div>
            {isSupervisor && (
              <div className="text-[9px] font-semibold text-sidebar-primary uppercase tracking-wider">Supervisor Mode</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => isSupervisor ? logout() : navigate("/supervisor/login")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-smooth",
              isSupervisor
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
            )}
          >
            <Shield className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setLang(lang === "en" ? "kn" : "en")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent transition-smooth"
          >
            <Languages className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 pt-14 pb-20 lg:pt-0 lg:pb-0 overflow-auto">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Navigation ─────────────────────────────── */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-sidebar/80 backdrop-blur-md text-sidebar-foreground border-t border-sidebar-border pb-safe">
        <div className="flex items-stretch justify-around px-2">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-all relative min-h-[64px]",
                  it.to === "/report" ? "text-white" : isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {it.to === "/report" ? (
                    /* Popped Camera Icon */
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                      <div className={cn(
                        "h-14 w-14 rounded-2xl gradient-hero flex items-center justify-center shadow-lg shadow-primary/40 ring-4 ring-background transition-transform active:scale-90",
                        isActive ? "scale-110" : "scale-100"
                      )}>
                        <Camera className="h-7 w-7 text-white" />
                      </div>
                      <span className="mt-1 font-bold text-primary">{t("nav_report")}</span>
                    </div>
                  ) : (
                    <>
                      <it.icon className={cn("h-5 w-5 mb-0.5", isActive ? "text-sidebar-primary scale-110" : "text-sidebar-foreground/60")} />
                      <span>{t(it.key)}</span>
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
