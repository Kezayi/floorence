import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Flower2,
  BookOpen,
  LogOut,
  User,
  History,
  Activity,
  Brain,
  Sparkles,
  Route,
} from 'lucide-react';
import { useAdminSuggestedLinks } from '@/hooks/useSuggestedLinks';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ADMIN_PREFIX } from '@/lib/adminRoutes';

interface AdminSidebarProps {
  onOpenSearch?: () => void;
}

const AdminSidebar = ({ onOpenSearch }: AdminSidebarProps) => {
  const { isAdmin } = useAdminRole();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { stats } = useAdminSuggestedLinks();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { to: ADMIN_PREFIX, icon: LayoutDashboard, label: 'Tableau de bord', end: true },
    { to: `${ADMIN_PREFIX}/memoriaux`, icon: Flower2, label: 'Mémoriaux' },
    { to: `${ADMIN_PREFIX}/moderation`, icon: MessageSquare, label: 'Modération' },
    { to: `${ADMIN_PREFIX}/statistiques`, icon: BarChart3, label: 'Statistiques' },
    { to: `${ADMIN_PREFIX}/analytics`, icon: Activity, label: 'Analytics', adminOnly: true },
    { to: `${ADMIN_PREFIX}/audit-suggestions`, icon: Sparkles, label: 'Audit Suggestions', adminOnly: true, badge: stats.pending },
    { to: `${ADMIN_PREFIX}/pont-intermediaires`, icon: Route, label: 'Pont des Vivants', adminOnly: true },
    { to: `${ADMIN_PREFIX}/modeles`, icon: BookOpen, label: 'Modèles Textes', adminOnly: true },
  ];

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div
        className="p-6 flex flex-col items-center cursor-pointer transition-transform hover:scale-105"
        onClick={() => {
          if (window.location.pathname.startsWith(ADMIN_PREFIX)) {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            navigate(ADMIN_PREFIX);
          }
        }}
        role="link"
        aria-label="Retour en haut de page"
      >
        {/* Logo Bordeaux - Plus gros, au-dessus du nom */}
        <div className="w-20 h-20 rounded-full bg-admin-burgundy flex items-center justify-center mb-4 shadow-lg">
          <span className="font-serif text-3xl text-white font-medium">F</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">Floorence</h1>
        <p className="text-sm text-muted-foreground">Administration</p>
      </div>

      <nav className="px-3 flex-1">
        {navItems
          .filter(item => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </NavLink>
          ))}

        {/* Intelligence Sociale - page dédiée */}
        {isAdmin && (
          <NavLink
            to={`${ADMIN_PREFIX}/intelligence-sociale`}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Brain className="w-5 h-5" />
            <span className="text-sm font-medium">Intelligence Sociale</span>
          </NavLink>
        )}

        {/* Remaining admin-only nav items */}
        {isAdmin && (
          <>
            <NavLink
              to={`${ADMIN_PREFIX}/utilisateurs`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Utilisateurs</span>
            </NavLink>
            <NavLink
              to={`${ADMIN_PREFIX}/parametres`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Paramètres</span>
            </NavLink>
            <NavLink
              to={`${ADMIN_PREFIX}/historique`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <History className="w-5 h-5" />
              <span className="text-sm font-medium">Historiques</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Section Mon Compte + Déconnexion - Fond rouge foncé */}
      <div className="p-3 border-t border-border bg-admin-burgundy">
        <NavLink
          to="/compte"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/90 hover:bg-white/10 hover:text-white transition-colors mb-1"
        >
          <User className="w-5 h-5" />
          <span className="text-sm font-medium">Mon compte</span>
        </NavLink>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/90 hover:bg-white/10 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
