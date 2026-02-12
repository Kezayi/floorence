import { ReactNode, useState, useCallback } from 'react';
import AdminSidebar from './AdminSidebar';
import SocialSearchPalette from './SocialSearchPalette';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar onOpenSearch={openSearch} />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
      <SocialSearchPalette externalOpen={searchOpen} onExternalOpenChange={setSearchOpen} />
    </div>
  );
};

export default AdminLayout;
