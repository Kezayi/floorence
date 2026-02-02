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
    <aside className="w-64 min-h-screen bg-card border-r border-border">
      <div className="p-6">
        <h1 className="text-xl font-bold text-foreground">Floorence Admin</h1>
        <p className="text-sm text-muted-foreground">Back-office</p>
      </div>

      <nav className="px-3">
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

      <div className="absolute bottom-0 left-0 w-64 p-3 border-t border-border">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Retour au site</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default AdminSidebar;
