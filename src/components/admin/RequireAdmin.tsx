import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RequireAdminProps {
  children: ReactNode;
  requireAdmin?: boolean; // true = admin only, false = admin or mod
}

/**
 * Admin route guard — Security by obscurity + RBAC.
 * 
 * CRITICAL: Non-admin users are silently redirected to the 404 page
 * to avoid revealing the existence of the admin interface.
 * Unauthenticated users go to /auth (they don't know what route they tried).
 */
const RequireAdmin = ({ children, requireAdmin = false }: RequireAdminProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isAdminOrMod, loading: roleLoading } = useAdminRole();

  // CRITICAL: Show loading state while EITHER auth OR roles are loading
  // This prevents the flash of "Access Denied" before roles are fetched
  const isLoading = authLoading || roleLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Unauthenticated: redirect to auth without revealing admin exists
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const hasAccess = requireAdmin ? isAdmin : isAdminOrMod;

  // SECURITY: Non-admin users see the generic 404 page — 
  // the admin interface's existence is never disclosed.
  if (!hasAccess) {
    return <Navigate to="/404-not-found" replace />;
  }

  return <>{children}</>;
};

export default RequireAdmin;
