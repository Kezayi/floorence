import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, MessageSquare, Flame, Flower2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MemorialRanking {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  postCount: number;
  totalCandles: number;
  totalFlowers: number;
  totalInteractions: number;
}

const CACHE_CONFIG = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };

const TabClassement = () => {
  const { data: rankings, isLoading } = useQuery({
    queryKey: ['admin-memorial-rankings'],
    ...CACHE_CONFIG,
    queryFn: async () => {
      const { data: memorials } = await supabase
        .from('memorials')
        .select('id, slug, first_name, last_name')
        .eq('is_active', true);

      if (!memorials || memorials.length === 0) return [];

      const memorialIds = memorials.map(m => m.id);
      const { data: gestureStats } = await supabase
        .rpc('get_memorial_gesture_stats', { p_memorial_ids: memorialIds });

      const statsMap: Record<string, { post_count: number; total_candles: number; total_flowers: number }> = {};
      (gestureStats || []).forEach(s => { statsMap[s.memorial_id] = s; });

      const result: MemorialRanking[] = memorials.map(m => {
        const s = statsMap[m.id] || { post_count: 0, total_candles: 0, total_flowers: 0 };
        return {
          id: m.id,
          slug: m.slug,
          firstName: m.first_name,
          lastName: m.last_name,
          postCount: Number(s.post_count),
          totalCandles: Number(s.total_candles),
          totalFlowers: Number(s.total_flowers),
          totalInteractions: Number(s.post_count) + Number(s.total_candles) + Number(s.total_flowers),
        };
      });

      result.sort((a, b) => b.totalInteractions - a.totalInteractions);
      return result.slice(0, 10);
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="py-12">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
                <div className="h-6 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="bg-card shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[hsl(142,70%,45%)]" />
            Classement des espaces mémoriels par chaleur
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Somme des messages + fleurs + cierges par espace mémoriel
          </p>
        </CardHeader>
        <CardContent>
          {rankings && rankings.length > 0 ? (
            <div className="space-y-3">
              {rankings.map((memorial, index) => (
                <div
                  key={memorial.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-[hsl(142,70%,45%)] text-white' :
                      index === 1 ? 'bg-[hsl(142,70%,45%)]/60 text-foreground' :
                      index === 2 ? 'bg-[hsl(142,70%,45%)]/30 text-foreground' :
                      'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <Link
                        to={`/memorial/${memorial.slug}`}
                        className="font-medium text-foreground hover:text-[hsl(142,70%,45%)] transition-colors"
                      >
                        {memorial.firstName} {memorial.lastName}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {memorial.postCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {memorial.totalCandles}
                        </span>
                        <span className="flex items-center gap-1">
                          <Flower2 className="w-3 h-3" />
                          {memorial.totalFlowers}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[hsl(142,70%,45%)]">
                      {memorial.totalInteractions.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">interactions</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">
              Aucune donnée de classement disponible
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TabClassement;
