import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDay {
  label: string;
  ca: number;
}

interface FinanceChartProps {
  data: ChartDay[];
}

const FinanceChart = ({ data }: FinanceChartProps) => {
  const hasData = data.some(d => d.ca > 0);

  return (
    <Card className="bg-card shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[hsl(var(--tab-business))]" />
          CA quotidien (30 derniers jours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
                  formatter={(value: number) => [`${value.toLocaleString()} XAF`, 'CA']}
                />
                <Bar dataKey="ca" fill="hsl(var(--tab-business))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <DollarSign className="w-10 h-10 opacity-20" />
              <p className="text-sm font-medium">Aucune transaction complétée sur cette période</p>
              <p className="text-xs">Les données apparaîtront ici dès les premiers paiements réussis.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FinanceChart;
