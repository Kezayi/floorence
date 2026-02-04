import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MemorialsProvider } from "./contexts/MemorialsContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import ScrollToTop from "./components/ScrollToTop";
import RequireAuth from "./components/auth/RequireAuth";
import RequireAdmin from "./components/admin/RequireAdmin";
import AdminLayout from "./components/admin/AdminLayout";

// Eager load: Homepage (critical path)
import Index from "./pages/Index";

// Lazy load: All other pages
const Memorial = lazy(() => import("./pages/Memorial"));
const Account = lazy(() => import("./pages/Account"));
const CreateMemorial = lazy(() => import("./pages/CreateMemorial"));
const Auth = lazy(() => import("./pages/Auth"));
const Search = lazy(() => import("./pages/Search"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
const Conditions = lazy(() => import("./pages/Conditions"));
const Confidentialite = lazy(() => import("./pages/Confidentialite"));
const Vision = lazy(() => import("./pages/Vision"));
const Mission = lazy(() => import("./pages/Mission"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin pages (lazy loaded)
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminModeration = lazy(() => import("./pages/admin/Moderation"));
const AdminMemorials = lazy(() => import("./pages/admin/Memorials"));
const AdminStatistics = lazy(() => import("./pages/admin/Statistics"));
const AdminRevenue = lazy(() => import("./pages/admin/Revenue"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));

const queryClient = new QueryClient();

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Chargement...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MemorialsProvider>
        <NotificationsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
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
                  <Route path="/conditions" element={<Conditions />} />
                  <Route path="/confidentialite" element={<Confidentialite />} />
                  <Route path="/a-propos" element={<Vision />} />
                  <Route path="/mission" element={<Mission />} />

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
                  <Route path="/admin/historique" element={
                    <RequireAdmin requireAdmin>
                      <AdminLayout><AdminAuditLogs /></AdminLayout>
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
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </NotificationsProvider>
      </MemorialsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
