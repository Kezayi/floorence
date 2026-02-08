import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const AuditSuggestions = lazy(() => import('@/pages/admin/AuditSuggestions'));

const TabSuggestions = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Suspense fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }>
        <AuditSuggestions />
      </Suspense>
    </div>
  );
};

export default TabSuggestions;
