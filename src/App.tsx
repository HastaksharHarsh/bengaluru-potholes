import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import ReportPothole from "./pages/ReportPothole";
import LiveMap from "./pages/LiveMap";
import Localities from "./pages/Localities";
import WardRanking from "./pages/WardRanking";
import LocalityDetail from "./pages/LocalityDetail";
import WardDetail from "./pages/WardDetail";
import Reports from "./pages/Reports";
import Newsletter from "./pages/Newsletter";
import NewsletterWard from "./pages/NewsletterWard";
import SupervisorLogin from "./pages/SupervisorLogin";
import Progressions from "./pages/Progressions";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/supervisor/login" element={<SupervisorLogin />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/report" element={<ReportPothole />} />
            <Route path="/map" element={<LiveMap />} />
            <Route path="/localities" element={<Localities />} />
            <Route path="/localities/:id" element={<LocalityDetail />} />
            <Route path="/wards" element={<WardRanking />} />
            <Route path="/wards/:id" element={<WardDetail />} />
            <Route path="/reports" element={<Reports />} />
<<<<<<< HEAD
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/newsletter/:wardId" element={<NewsletterWard />} />
=======
            <Route path="/progressions" element={<Progressions />} />
>>>>>>> b94f1038062ae4bbcc754e8f9660f02b0886897c
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
