import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
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
import { ADMIN_PREFIX } from "./lib/adminRoutes";

// Lazy load: FAQ
const FAQ = lazy(() => import("./pages/FAQ"));

// Eager load: Homepage (critical path)
import Index from "./pages/Index";

 // Lazy load: All other pages
 const Memorial = lazy(() => import("./pages/Memorial"));
 const Account = lazy(() => import("./pages/Account"));
 const CreateMemorial = lazy(() => import("./pages/CreateMemorial"));
 const Auth = lazy(() => import("./pages/Auth"));
 const Search = lazy(() => import("./pages/Search"));
 const Conditions = lazy(() => import("./pages/Conditions"));
 const Confidentialite = lazy(() => import("./pages/Confidentialite"));
 const Vision = lazy(() => import("./pages/Vision"));
 const Mission = lazy(() => import("./pages/Mission"));
 const NotFound = lazy(() => import("./pages/NotFound"));
 const CommunityGraph = lazy(() => import("./pages/CommunityGraph"));
 const SuggestedLinks = lazy(() => import("./pages/SuggestedLinks"));
 // ShareTokenRedirect no longer needed — Memorial page handles both slug and token

// Admin pages (lazy loaded)
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminModeration = lazy(() => import("./pages/admin/Moderation"));
const AdminMemorials = lazy(() => import("./pages/admin/Memorials"));
const AdminStatistics = lazy(() => import("./pages/admin/Statistics"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminSocialIntelligence = lazy(() => import("./pages/admin/SocialIntelligence"));
const AdminMemorialDetail = lazy(() => import("./pages/admin/MemorialDetail"));
const AdminAuditSuggestions = lazy(() => import("./pages/admin/AuditSuggestions"));
const AdminShortestPath = lazy(() => import("./pages/admin/ShortestPath"));

const queryClient = new QueryClient();

// Force full remount when navigating between different memorials
// Prevents stale state (dbFallbackDone, guestbook, events) from leaking between pages
const MemorialWrapper = () => {
  const { token, slug } = useParams();
  return <Memorial key={token || slug || 'memorial'} />;
};
// Minimal loading fallback with logo fade animation
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-32 h-32 rounded-full bg-foreground/10 flex items-center justify-center animate-fade-in">
        <span className="font-serif text-6xl text-foreground/60">F</span>
      </div>
    </div>
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
                  {/* Primary obfuscated route — resolves token to memorial */}
                  <Route path="/m/:token" element={<MemorialWrapper />} />
                  {/* Legacy slug route — backward compat for shared links */}
                  <Route path="/memorial/:slug" element={<MemorialWrapper />} />
                  <Route path="/compte" element={<Account />} />
                  <Route path="/creer" element={
                    <RequireAuth>
                      <CreateMemorial />
                    </RequireAuth>
                  } />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/conditions" element={<Conditions />} />
                  <Route path="/confidentialite" element={<Confidentialite />} />
                  <Route path="/a-propos" element={<Vision />} />
                  <Route path="/mission" element={<Mission />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/communaute" element={<CommunityGraph />} />
                  <Route path="/liens-suggeres" element={
                    <RequireAuth>
                      <SuggestedLinks />
                    </RequireAuth>
                  } />

                  {/* Admin routes — obfuscated prefix, real security via RequireAdmin */}
                  <Route path={ADMIN_PREFIX} element={
                    <RequireAdmin>
                      <AdminLayout><AdminDashboard /></AdminLayout>
                    </RequireAdmin>
                  } />
                  <Route path={`${ADMIN_PREFIX}/moderation`} element={
                    <RequireAdmin>
                      <AdminLayout><AdminModeration /></AdminLayout>
                    </RequireAdmin>
                  } />
                  <Route path={`${ADMIN_PREFIX}/memoriaux`} element={
                    <RequireAdmin>
                      <AdminLayout><AdminMemorials /></AdminLayout>
                    </RequireAdmin>
                  } />
                  <Route path={`${ADMIN_PREFIX}/memoriaux/:id`} element={
                    <RequireAdmin>
                      <AdminLayout><AdminMemorialDetail /></AdminLayout>
                    </RequireAdmin>
                  } />
                  <Route path={`${ADMIN_PREFIX}/statistiques`} element={
                    <RequireAdmin>
                      <AdminLayout><AdminStatistics /></AdminLayout>
                    </RequireAdmin>
                  } />
                  <Route path={`${ADMIN_PREFIX}/analytics`} element={
                    <RequireAdmin requireAdmin>
                      <AdminLayout><AdminAnalytics /></AdminLayout>
                    </RequireAdmin>
                  } />
                  <Route path={`${ADMIN_PREFIX}/utilisateurs`} element={
                    <RequireAdmin requireAdmin>
                      <AdminLayout><AdminUsers /></AdminLayout>
                    </RequireAdmin>
                  } />
                  <Route path={`${ADMIN_PREFIX}/historique`} element={
                    <RequireAdmin requireAdmin>
                      <AdminLayout><AdminAuditLogs /></AdminLayout>
                    </RequireAdmin>
                  } />
                  <Route path={`${ADMIN_PREFIX}/parametres`} element={
                    <RequireAdmin requireAdmin>
                      <AdminLayout><AdminSettings /></AdminLayout>
                    </RequireAdmin>
                  } />
                  <Route path={`${ADMIN_PREFIX}/intelligence-sociale`} element={
                    <RequireAdmin requireAdmin>
                      <AdminLayout><AdminSocialIntelligence /></AdminLayout>
                    </RequireAdmin>
                  } />

                  <Route path={`${ADMIN_PREFIX}/audit-suggestions`} element={
                    <RequireAdmin requireAdmin>
                      <AdminLayout><AdminAuditSuggestions /></AdminLayout>
                    </RequireAdmin>
                  } />
                  <Route path={`${ADMIN_PREFIX}/pont-intermediaires`} element={
                    <RequireAdmin requireAdmin>
                      <AdminLayout><AdminShortestPath /></AdminLayout>
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
