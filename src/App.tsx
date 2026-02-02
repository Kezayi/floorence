import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MemorialsProvider } from "./contexts/MemorialsContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import RequireAuth from "./components/auth/RequireAuth";
import RequireAdmin from "./components/admin/RequireAdmin";
import AdminLayout from "./components/admin/AdminLayout";
import Index from "./pages/Index";
import Memorial from "./pages/Memorial";
import Account from "./pages/Account";
import CreateMemorial from "./pages/CreateMemorial";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminModeration from "./pages/admin/Moderation";
import AdminMemorials from "./pages/admin/Memorials";
import AdminStatistics from "./pages/admin/Statistics";
import AdminRevenue from "./pages/admin/Revenue";
import AdminUsers from "./pages/admin/Users";
import AdminSettings from "./pages/admin/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MemorialsProvider>
        <NotificationsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/recherche" element={<Search />} />
                <Route path="/memorial/:slug" element={<Memorial />} />
                <Route path="/compte" element={<Account />} />
                <Route path="/creer" element={
                  <RequireAuth>
                    <CreateMemorial />
                  </RequireAuth>
                } />
                <Route path="/auth" element={<Auth />} />
                <Route path="/paiement/succes" element={<PaymentSuccess />} />
                <Route path="/paiement/annule" element={<PaymentCancelled />} />

                {/* Admin routes */}
                <Route path="/admin" element={
                  <RequireAdmin>
                    <AdminLayout><AdminDashboard /></AdminLayout>
                  </RequireAdmin>
                } />
                <Route path="/admin/moderation" element={
                  <RequireAdmin>
                    <AdminLayout><AdminModeration /></AdminLayout>
                  </RequireAdmin>
                } />
                <Route path="/admin/memoriaux" element={
                  <RequireAdmin>
                    <AdminLayout><AdminMemorials /></AdminLayout>
                  </RequireAdmin>
                } />
                <Route path="/admin/statistiques" element={
                  <RequireAdmin>
                    <AdminLayout><AdminStatistics /></AdminLayout>
                  </RequireAdmin>
                } />
                <Route path="/admin/revenus" element={
                  <RequireAdmin requireAdmin>
                    <AdminLayout><AdminRevenue /></AdminLayout>
                  </RequireAdmin>
                } />
                <Route path="/admin/utilisateurs" element={
                  <RequireAdmin requireAdmin>
                    <AdminLayout><AdminUsers /></AdminLayout>
                  </RequireAdmin>
                } />
                <Route path="/admin/parametres" element={
                  <RequireAdmin requireAdmin>
                    <AdminLayout><AdminSettings /></AdminLayout>
                  </RequireAdmin>
                } />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </NotificationsProvider>
      </MemorialsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
