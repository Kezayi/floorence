import { ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';
import SocialSearchPalette from './SocialSearchPalette';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex justify-end mb-4">
          <SocialSearchPalette />
        </div>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
