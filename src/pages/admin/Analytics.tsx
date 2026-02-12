import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Flame, Flower2, Users, TrendingUp, Award } from 'lucide-react';
import ExportCSVButton from '@/components/admin/ExportCSVButton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MemorialGestureRow {
  memorial_name: string;
  total_posts: number;
  total_candles: number;
  total_flowers: number;
  total_gestures: number;
  unique_contributors: number;
}

const Analytics = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics-behavioral'],
    queryFn: async () => {
      // Fetch all memorials
      const { data: memorials, error: mErr } = await supabase
        .from('memorials')
        .select('id, first_name, last_name');

      if (mErr) throw mErr;
      if (!memorials || memorials.length === 0) {
        return {
          topMemorials: [] as MemorialGestureRow[],
          avgCandles: 0,
          avgFlowers: 0,
          avgContributors: 0,
          totalPosts: 0,
          chartData: [] as { name: string; cierges: number; fleurs: number }[],
        };
      }

      // Fetch gesture stats via RPC
      const ids = memorials.map((m) => m.id);
      const { data: gestureStats, error: gErr } = await supabase.rpc(
        'get_memorial_gesture_stats',
        { p_memorial_ids: ids }
      );
      if (gErr) throw gErr;

      // Fetch unique contributors per memorial
      const { data: posts, error: pErr } = await supabase
        .from('guestbook_posts')
        .select('memorial_id, author_name, relation_category')
        .eq('is_hidden', false);
      if (pErr) throw pErr;

      // Count unique authors per memorial
      const contributorMap: Record<string, Set<string>> = {};
      const relationMap: Record<string, Set<string>> = {};
      (posts || []).forEach((p) => {
        if (!contributorMap[p.memorial_id]) {
          contributorMap[p.memorial_id] = new Set();
          relationMap[p.memorial_id] = new Set();
        }
        contributorMap[p.memorial_id].add(p.author_name);
        if (p.relation_category) {
          relationMap[p.memorial_id].add(p.relation_category);
        }
      });

      // Build top memorials data
      const statsMap = new Map(
        (gestureStats || []).map((s) => [s.memorial_id, s])
      );

      const topMemorials: MemorialGestureRow[] = memorials
        .map((m) => {
          const stats = statsMap.get(m.id);
          const candles = Number(stats?.total_candles || 0);
          const flowers = Number(stats?.total_flowers || 0);
          const postCount = Number(stats?.post_count || 0);
          const contributors = contributorMap[m.id]?.size || 0;
          return {
            memorial_name: `${m.first_name} ${m.last_name}`,
            total_posts: postCount,
            total_candles: candles,
            total_flowers: flowers,
            total_gestures: candles + flowers,
            unique_contributors: contributors,
          };
        })
        .sort((a, b) => b.total_gestures - a.total_gestures);

      // Calculate averages
      const memorialsWithPosts = topMemorials.filter((m) => m.total_posts > 0);
      const totalPosts = topMemorials.reduce((s, m) => s + m.total_posts, 0);
      const totalCandles = topMemorials.reduce((s, m) => s + m.total_candles, 0);
      const totalFlowers = topMemorials.reduce((s, m) => s + m.total_flowers, 0);

      const avgCandles =
        totalPosts > 0 ? Math.round((totalCandles / totalPosts) * 10) / 10 : 0;
      const avgFlowers =
        totalPosts > 0 ? Math.round((totalFlowers / totalPosts) * 10) / 10 : 0;

      // Average contributors per memorial (only those with activity)
      const avgContributors =
        memorialsWithPosts.length > 0
          ? Math.round(
              (memorialsWithPosts.reduce((s, m) => s + m.unique_contributors, 0) /
                memorialsWithPosts.length) *
                10
            ) / 10
          : 0;

      // Chart data: top 10 memorials for bar chart
      const chartData = topMemorials.slice(0, 10).map((m) => ({
        name:
          m.memorial_name.length > 18
            ? m.memorial_name.substring(0, 16) + '…'
            : m.memorial_name,
        cierges: m.total_candles,
        fleurs: m.total_flowers,
      }));

      return {
        topMemorials,
        avgCandles,
        avgFlowers,
        avgContributors,
        totalPosts,
        chartData,
      };
    },
  });

  const kpis = [
    {
      title: 'Hommages totaux',
      value: data?.totalPosts || 0,
      icon: TrendingUp,
      description: 'Messages déposés toutes pages confondues',
    },
    {
      title: 'Moy. Cierges / hommage',
      value: data?.avgCandles || 0,
      icon: Flame,
      description: 'Intensité moyenne du geste Cierge',
    },
    {
      title: 'Moy. Fleurs / hommage',
      value: data?.avgFlowers || 0,
      icon: Flower2,
      description: 'Intensité moyenne du geste Fleur',
    },
    {
      title: 'Moy. membres / famille',
      value: data?.avgContributors || 0,
      icon: Users,
      description: 'Contributeurs uniques par mémorial actif',
    },
  ];

  const fetchExportData = async () => {
    return data?.topMemorials || [];
  };

  const csvColumns: { key: keyof MemorialGestureRow; label: string }[] = [
    { key: 'memorial_name', label: 'Mémorial' },
    { key: 'total_posts', label: 'Hommages' },
    { key: 'total_candles', label: 'Cierges' },
    { key: 'total_flowers', label: 'Fleurs' },
    { key: 'total_gestures', label: 'Total Gestes' },
    { key: 'unique_contributors', label: 'Contributeurs' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Analytics Comportemental
          </h1>
          <p className="text-muted-foreground mt-1">
            Engagement des familles et intensité des gestes symboliques
          </p>
        </div>
        <ExportCSVButton
          fetchData={fetchExportData}
          columns={csvColumns}
          filename={`floorence-analytics-${new Date().toISOString().slice(0, 10)}`}
          label="Exporter CSV"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar Chart: Fleurs vs Cierges */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Fleurs vs Cierges par Mémorial
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comparaison des gestes symboliques (Top 10)
          </p>
        </CardHeader>
        <CardContent>
          {data?.chartData && data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={data.chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 12 }} />
                <Bar
                  dataKey="cierges"
                  name="Cierges"
                  fill="hsl(40, 45%, 48%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="fleurs"
                  name="Fleurs"
                  fill="hsl(340, 30%, 55%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Aucune donnée disponible pour le moment
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Memorials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Classement des Mémoriaux par Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.topMemorials && data.topMemorials.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Mémorial</TableHead>
                  <TableHead className="text-center">Hommages</TableHead>
                  <TableHead className="text-center">Cierges</TableHead>
                  <TableHead className="text-center">Fleurs</TableHead>
                  <TableHead className="text-center">Total Gestes</TableHead>
                  <TableHead className="text-center">Contributeurs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topMemorials.map((m, i) => (
                  <TableRow key={m.memorial_name + i}>
                    <TableCell className="font-medium text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">{m.memorial_name}</TableCell>
                    <TableCell className="text-center">{m.total_posts}</TableCell>
                    <TableCell className="text-center">{m.total_candles}</TableCell>
                    <TableCell className="text-center">{m.total_flowers}</TableCell>
                    <TableCell className="text-center font-bold">
                      {m.total_gestures}
                    </TableCell>
                    <TableCell className="text-center">
                      {m.unique_contributors}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucun mémorial avec des gestes pour le moment
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
