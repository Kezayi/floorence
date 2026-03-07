import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, CalendarDays, CheckCircle } from 'lucide-react';

interface FinanceKPIsProps {
  today: number;
  week: number;
  month: number;
  successRate: number;
}

const FinanceKPIs = ({ today, week, month, successRate }: FinanceKPIsProps) => {
  const kpiCards = [
    { title: "CA du jour", value: `${today.toLocaleString()} XAF`, icon: CalendarDays, color: 'text-[hsl(var(--tab-business))]' },
    { title: "CA de la semaine", value: `${week.toLocaleString()} XAF`, icon: TrendingUp, color: 'text-[hsl(var(--tab-business))]' },
    { title: "CA du mois", value: `${month.toLocaleString()} XAF`, icon: DollarSign, color: 'text-[hsl(var(--tab-business))]' },
    { title: "Taux de conversion", value: `${successRate}%`, icon: CheckCircle, color: successRate >= 70 ? 'text-emerald-500' : 'text-amber-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map(kpi => (
        <Card key={kpi.title} className="bg-card shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
            <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FinanceKPIs;
