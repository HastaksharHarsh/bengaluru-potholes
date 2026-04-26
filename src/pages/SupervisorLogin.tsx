import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Shield, Lock, User, Loader2, ChevronLeft } from "lucide-react";
import { supervisorLogin } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

export default function SupervisorLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAppStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await supervisorLogin(username, password);
      login(data.token);
      toast.success("Welcome back, Supervisor!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8f9fa]">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="mx-auto h-[64px] w-[64px] rounded-full flex items-center justify-center text-[#1a73e8] bg-blue-50 border border-blue-100 mb-6">
            <Shield className="h-[32px] w-[32px]" />
          </div>
          <h1 className="text-page-title text-[28px] font-[600]">Supervisor Portal</h1>
          <p className="text-sub-header">Authorized BBMP personnel only</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-[16px] p-[32px] shadow-sm">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-[600] text-[#1a1f36]">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-[18px] w-[18px] text-secondary-g" />
                <input
                  type="text"
                  placeholder="e.g. jayanagar_admin"
                  className="w-full pl-[40px] pr-[16px] h-[46px] rounded-[12px] bg-surface-muted border border-default-g focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 transition-all text-[14px] font-[500] text-primary-g"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-[600] text-[#1a1f36]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-[18px] w-[18px] text-secondary-g" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-[40px] pr-[16px] h-[46px] rounded-[12px] bg-surface-muted border border-default-g focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 transition-all text-[14px] font-[500] text-primary-g"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-[46px] rounded-[10px] text-white font-[600] text-[15px] flex items-center justify-center gap-2 mt-2 transition-all duration-200 bg-[#1a73e8] hover:bg-[#1557b0] shadow-sm disabled:opacity-70"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-[20px] w-[20px] animate-spin" /> : "Sign In"}
            </button>
          </form>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] text-[13px] font-[500] text-secondary-g hover:text-primary-g hover:bg-white/50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Citizen Portal
          </button>
        </div>
      </div>
    </div>
  );
}
