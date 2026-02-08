import { lazy, Suspense } from 'react';
import SuccessWall from '@/components/admin/SuccessWall';
import PredictionCard from '@/components/admin/PredictionCard';
import SocialDonutChart from '@/components/admin/SocialDonutChart';
import SuperConnectorsWidget from '@/components/admin/SuperConnectorsWidget';
import type { DashboardStats } from '@/hooks/useDashboardStats';
import { Loader2 } from 'lucide-react';

const AuditSuggestions = lazy(() => import('@/pages/admin/AuditSuggestions'));

interface Props {
  stats: DashboardStats;
}

const TabVerite = ({ stats }: Props) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Success Wall - Indicateurs de Vérité */}
      <SuccessWall />

      {/* Prediction + Donut + Connectors Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PredictionCard stats={stats} />
        <SocialDonutChart stats={stats} />
        <SuperConnectorsWidget />
      </div>

      {/* Embedded Audit Suggestions */}
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

export default TabVerite;
