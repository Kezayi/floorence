import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalMemorials: number;
  demoMemorials: number;
  realMemorials: number;
  totalPosts: number;
  visiblePosts: number;
  postsLastWeek: number;
  postsPrevWeek: number;
  totalCandles: number;
  totalFlowers: number;
  candlesLastWeek: number;
  predictedCandlesNextWeek: number;
  totalUsers: number;
  totalRevenue: number;
  catFamilleDirecte: number;
  catFamilleElargie: number;
  catAllies: number;
  catSocioCoeur: number;
  catAutres: number;
}

const CACHE_CONFIG = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };

export const useDashboardStats = () => {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats-view'],
    ...CACHE_CONFIG,
    refetchOnMount: 'always' as const,
    queryFn: async () => {
      // Use .from() with type assertion since view may not be in generated types yet
      const { data, error } = await (supabase
        .from('v_dashboard_stats' as any)
        .select('*')
        .single() as any);

      if (error) {
        console.error('Dashboard stats error:', error);
        throw new Error(`Erreur dashboard : ${error.message}`);
      }

      return {
        totalMemorials: Number(data.total_memorials) || 0,
        demoMemorials: Number(data.demo_memorials) || 0,
        realMemorials: Number(data.real_memorials) || 0,
        totalPosts: Number(data.total_posts) || 0,
        visiblePosts: Number(data.visible_posts) || 0,
        postsLastWeek: Number(data.posts_last_week) || 0,
        postsPrevWeek: Number(data.posts_prev_week) || 0,
        totalCandles: Number(data.total_candles) || 0,
        totalFlowers: Number(data.total_flowers) || 0,
        candlesLastWeek: Number(data.candles_last_week) || 0,
        predictedCandlesNextWeek: Number(data.predicted_candles_next_week) || 0,
        totalUsers: Number(data.total_users) || 0,
        totalRevenue: Number(data.total_revenue) || 0,
        catFamilleDirecte: Number(data.cat_famille_directe) || 0,
        catFamilleElargie: Number(data.cat_famille_elargie) || 0,
        catAllies: Number(data.cat_allies) || 0,
        catSocioCoeur: Number(data.cat_socio_coeur) || 0,
        catAutres: Number(data.cat_autres) || 0,
      };
    },
  });
};
