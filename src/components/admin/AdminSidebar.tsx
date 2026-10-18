import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAdminSuggestedLinks } from '@/hooks/useSuggestedLinks';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ADMIN_PREFIX } from '@/lib/adminRoutes';
import { ADMIN_NAV } from '@/lib/adminNav';

interface AdminSidebarProps {
  onOpenSearch?: () => void;
  onNavigate?: () => void;
  className?: string;
}

const AdminSidebar = ({ onNavigate, className }: AdminSidebarProps) => {
  const { isAdmin } = useAdminRole();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { stats } = useAdminSuggestedLinks();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside className={cn('w-72 min-h-[100svh] bg-ivory border-r border-champagne/30 flex flex-col', className)}>
      <button
        type="button"
        className="px-6 pt-8 pb-6 flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne rounded-lg"
        onClick={() => { navigate(ADMIN_PREFIX); onNavigate?.(); }}
        aria-label="Retour au tableau de bord"
      >
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-3 ring-1 ring-champagne/60">
          <span className="font-serif text-3xl text-primary-foreground">F</span>
        </div>
        <span className="font-serif text-2xl text-foreground">Floorence</span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Administration</span>
        <span aria-hidden className="mt-3 text-champagne text-xs">✦</span>
      </button>

      <nav aria-label="Navigation administrative" className="px-3 flex-1 min-h-0 overflow-y-auto pb-4">
        {ADMIN_NAV.map((pole) => {
          const items = pole.items.filter((i) => !i.adminOnly || isAdmin);
          if (!items.length) return null;
          return (
            <div key={pole.id} className="mb-5" role="group" aria-labelledby={`pole-${pole.id}`}>
              <p id={`pole-${pole.id}`} className="px-3 mb-2 font-serif text-sm italic tracking-wide text-foreground/80 border-b border-champagne/25 pb-1">
                {pole.label}
              </p>
              {items.map((item) => {
                const badge = item.badgeKey === 'suggestions' ? stats.pending : 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 pl-3 pr-2 py-2 rounded-md mb-0.5 text-sm border-l-[3px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne',
                        isActive
                          ? 'border-champagne bg-background text-foreground font-semibold'
                          : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground'
                      )
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span className="min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center" aria-label={`${badge} en attente`}>
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-champagne/30 bg-primary">
        <NavLink to="/compte" onClick={onNavigate} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-primary-foreground/90 hover:bg-primary-foreground/10 transition-colors mb-1">
          <User className="w-4 h-4" />
          <span className="text-sm font-medium">Mon compte</span>
        </NavLink>
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-primary-foreground/90 hover:bg-primary-foreground/10 transition-colors w-full">
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
