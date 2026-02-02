import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  MessageSquare, 
  Users, 
  BarChart3, 
  DollarSign,
  Flower2,
  LogOut
} from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { cn } from '@/lib/utils';

const AdminSidebar = () => {
  const { isAdmin } = useAdminRole();

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
    { to: '/admin/moderation', icon: MessageSquare, label: 'Modération' },
    { to: '/admin/memoriaux', icon: Flower2, label: 'Mémoriaux' },
    { to: '/admin/statistiques', icon: BarChart3, label: 'Statistiques' },
    { to: '/admin/revenus', icon: DollarSign, label: 'Chiffre d\'affaires', adminOnly: true },
    { to: '/admin/utilisateurs', icon: Users, label: 'Utilisateurs', adminOnly: true },
    { to: '/admin/parametres', icon: Settings, label: 'Paramètres', adminOnly: true },
  ];

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 flex flex-col items-center">
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
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
      </nav>

      {/* Section Retour au site - Fond rouge foncé */}
      <div className="p-3 border-t border-border bg-admin-burgundy">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/90 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Retour au site</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default AdminSidebar;
