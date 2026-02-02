import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Kanban from "./pages/Kanban";
import Agenda from "./pages/Agenda";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import LeadForm from "./pages/LeadForm";
import LeadFormEvidia from "./pages/LeadFormEvidia";
import EmbedForm from "./pages/EmbedForm";
import ImportLeads from "./pages/ImportLeads";
import NotFound from "./pages/NotFound";
// Financial module pages
import Financeiro from "./pages/Financeiro";
import FinanceiroProjecoes from "./pages/FinanceiroProjecoes";
import FinanceiroNovaVenda from "./pages/FinanceiroNovaVenda";
import FinanceiroCheques from "./pages/FinanceiroCheques";
import FinanceiroCalendario from "./pages/FinanceiroCalendario";
// TV Dashboard
import PainelTV from "./pages/PainelTV";
import PainelTVPublico from "./pages/PainelTVPublico";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Admin-only route protection
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/cadastro" element={<LeadForm />} />
      <Route path="/cadastro-evidia" element={<LeadFormEvidia />} />
      <Route path="/embed-form" element={<EmbedForm />} />
      
      {/* Protected routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
      <Route path="/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
      <Route path="/importar" element={<ProtectedRoute><ImportLeads /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
      
      {/* Financial module routes (Admin Only) */}
      <Route path="/financeiro" element={<AdminRoute><Financeiro /></AdminRoute>} />
      <Route path="/financeiro/projecoes" element={<AdminRoute><FinanceiroProjecoes /></AdminRoute>} />
      <Route path="/financeiro/nova-venda" element={<AdminRoute><FinanceiroNovaVenda /></AdminRoute>} />
      <Route path="/financeiro/cheques" element={<AdminRoute><FinanceiroCheques /></AdminRoute>} />
      <Route path="/financeiro/calendario" element={<AdminRoute><FinanceiroCalendario /></AdminRoute>} />
      
      {/* TV Dashboard - fullscreen, no layout */}
      <Route path="/painel-tv" element={<ProtectedRoute><PainelTV /></ProtectedRoute>} />
      
      {/* TV Dashboard PUBLIC - no auth required, token-based */}
      <Route path="/tv" element={<PainelTVPublico />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
            <div className="dark">
              <AppRoutes />
            </div>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;