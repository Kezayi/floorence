import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network } from 'lucide-react';
import { useSocialInferences } from '@/hooks/useSocialInferences';

/** Connectivity gauge — visual bar from 0 to 15 */
const ConnectivityGauge = ({ score }: { score: number }) => {
  const max = 15;
  const pct = Math.min((score / max) * 100, 100);
  const isExcellent = score >= 10;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: isExcellent
              ? 'hsl(var(--accent-green))'
              : 'hsl(var(--primary))',
          }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">
        {score}
      </span>
      {isExcellent && (
        <Badge className="bg-[hsl(var(--accent-green)/0.15)] text-[hsl(var(--accent-green))] border-[hsl(var(--accent-green)/0.3)] text-[10px] px-1.5">
          Excellent
        </Badge>
      )}
    </div>
  );
};

const SuperConnectorsWidget = () => {
  const { data: users, isLoading } = useSocialInferences();

  // Top 5 by total memorial count (connectivity index)
  const topConnectors = useMemo(() => {
    if (!users) return [];
    return [...users]
      .sort((a, b) => {
        // Primary: total memorials, secondary: detail_liens count
        const scoreA = a.totalMemorials * 3 + a.detailLiens.length;
        const scoreB = b.totalMemorials * 3 + b.detailLiens.length;
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map((u) => ({
        ...u,
        connectivityIndex: Math.min(u.totalMemorials * 3 + u.detailLiens.length, 15),
      }));
  }, [users]);

  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Network className="w-4 h-4" />
            Super-Connecteurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-2 w-full bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Network className="w-4 h-4" />
          Super-Connecteurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topConnectors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun connecteur détecté
          </p>
        ) : (
          <div className="space-y-4">
            {topConnectors.map((user, idx) => (
              <div key={user.userId} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-serif font-medium text-primary">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">
                      {user.authorName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {user.totalMemorials} mémorial{user.totalMemorials > 1 ? 'x' : ''} · {user.detailLiens.length} lien{user.detailLiens.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <ConnectivityGauge score={user.connectivityIndex} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SuperConnectorsWidget;
