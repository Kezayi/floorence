import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MemorialsProvider } from "./contexts/MemorialsContext";
import RequireAuth from "./components/auth/RequireAuth";
import Index from "./pages/Index";
import Memorial from "./pages/Memorial";
import Account from "./pages/Account";
import CreateMemorial from "./pages/CreateMemorial";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MemorialsProvider>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </MemorialsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
