import { useNavigate } from 'react-router-dom';
import { ADMIN_PREFIX } from '@/lib/adminRoutes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DashboardStats } from '@/hooks/useDashboardStats';

const CATEGORIES = [
  { key: 'catFamilleDirecte', label: 'Famille directe', color: 'hsl(0, 0%, 15%)', filter: 'Famille directe' },
  { key: 'catFamilleElargie', label: 'Famille élargie', color: 'hsl(0, 0%, 55%)', filter: 'Famille élargie' },
  { key: 'catAllies', label: 'Alliés', color: 'hsl(45, 90%, 50%)', filter: 'Alliés' },
  { key: 'catSocioCoeur', label: 'Socio cœur', color: 'hsl(340, 60%, 65%)', filter: 'Socio cœur (Amis)' },
  { key: 'catAutres', label: 'Autres', color: 'hsl(0, 0%, 80%)', filter: 'Autres' },
] as const;

interface Props {
  stats: DashboardStats;
}

const SocialDonutChart = ({ stats }: Props) => {
  const navigate = useNavigate();

  const data = CATEGORIES.map((cat) => ({
    name: cat.label,
    value: stats[cat.key as keyof DashboardStats] as number,
    color: cat.color,
    filter: cat.filter,
  })).filter((d) => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const handleClick = (filter: string) => {
    // Navigate to moderation with social group filter pre-applied
    navigate(`${ADMIN_PREFIX}/moderation?socialGroup=${encodeURIComponent(filter)}`);
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Répartition Sociale
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            Aucun hommage enregistré
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div className="w-[180px] h-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(_, idx) => handleClick(data[idx].filter)}
                    className="cursor-pointer"
                    stroke="none"
                  >
                    {data.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} (${((value / total) * 100).toFixed(0)}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {data.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => handleClick(cat.filter)}
                  className="flex items-center justify-between w-full px-2 py-1.5 rounded-sm hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs font-sans text-foreground">{cat.name}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {((cat.value / total) * 100).toFixed(0)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SocialDonutChart;
