import { ReactNode, useState, useCallback, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import SocialSearchPalette from './SocialSearchPalette';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ADMIN_PREFIX } from '@/lib/adminRoutes';
import { resolveAdminCrumbs } from '@/lib/adminNav';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminCrumbs = () => {
  const { pathname } = useLocation();
  const c = resolveAdminCrumbs(pathname);
  const trail: { label: string; to?: string }[] = [{ label: 'Back-Office', to: ADMIN_PREFIX }];
  if (c) {
    trail.push({ label: c.pole.label });
    trail.push({ label: c.item.label, to: c.sub ? c.item.to : undefined });
    if (c.sub) trail.push({ label: c.sub });
  }
  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xs">
        {trail.map((t, i) => (
          <Fragment key={i}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {i === trail.length - 1 ? (
                <BreadcrumbPage>{t.label}</BreadcrumbPage>
              ) : t.to ? (
                <BreadcrumbLink asChild><Link to={t.to}>{t.label}</Link></BreadcrumbLink>
              ) : (
                <span>{t.label}</span>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);

  return (
    <div className="flex min-h-[100svh] w-full bg-background">
      <AdminSidebar onOpenSearch={openSearch} className="hidden lg:flex sticky top-0 h-[100svh]" />

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="p-0 w-72 border-champagne/30">
          <SheetTitle className="sr-only">Menu d'administration</SheetTitle>
          <AdminSidebar onOpenSearch={openSearch} onNavigate={() => setMenuOpen(false)} className="w-full h-full" />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-8 h-14 bg-background/95 backdrop-blur border-b border-champagne/25">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-md text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            aria-label="Ouvrir le menu d'administration"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0 overflow-x-auto"><AdminCrumbs /></div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>

      <SocialSearchPalette externalOpen={searchOpen} onExternalOpenChange={setSearchOpen} />
    </div>
  );
};

export default AdminLayout;
