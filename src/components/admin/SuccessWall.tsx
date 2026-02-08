import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TreePine, Brain, Users, Sparkles } from "lucide-react";

interface SuccessMetrics {
  totalReunions: number;
  successRatePercent: number | null;
  activeFamiliesEngaged: number;
}

const useSuccessMetrics = () => {
  return useQuery<SuccessMetrics>({
    queryKey: ["admin-success-metrics"],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: "always" as const,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("v_admin_success_metrics" as any)
        .select("*")
        .single() as any);

      if (error) {
        console.error("Success metrics error:", error);
        return { totalReunions: 0, successRatePercent: null, activeFamiliesEngaged: 0 };
      }

      return {
        totalReunions: Number(data.total_reunions) || 0,
        successRatePercent: data.success_rate_percent != null ? Number(data.success_rate_percent) : null,
        activeFamiliesEngaged: Number(data.active_families_engaged) || 0,
      };
    },
  });
};

const SuccessWall = () => {
  const { data: metrics, isLoading } = useSuccessMetrics();

  if (isLoading || !metrics) return null;

  const rate = metrics.successRatePercent;
  const rateDisplay = rate != null ? `${rate.toFixed(0)}%` : "—";
  const rateColor =
    rate == null
      ? "text-muted-foreground"
      : rate >= 70
      ? "text-[hsl(var(--accent-green))]"
      : rate >= 40
      ? "text-[hsl(45,80%,40%)]"
      : "text-destructive";

  const cards = [
    {
      title: "Lignages Réunis",
      value: metrics.totalReunions,
      icon: TreePine,
      gradient: "from-[hsl(45,90%,50%)]/10 to-transparent",
      iconColor: "text-[hsl(45,90%,50%)]",
      description: "Liens familiaux scellés par les créateurs",
    },
    {
      title: "Précision de l'IA",
      value: rateDisplay,
      icon: Brain,
      gradient: "from-primary/10 to-transparent",
      iconColor: "text-primary",
      valueColor: rateColor,
      description: "Taux de transformation des suggestions",
    },
    {
      title: "Engagement Familles",
      value: metrics.activeFamiliesEngaged,
      icon: Users,
      gradient: "from-[hsl(340,60%,65%)]/10 to-transparent",
      iconColor: "text-[hsl(340,60%,65%)]",
      description: "Créateurs ayant interagi avec l'IA",
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[hsl(45,90%,50%)]" />
        <h2 className="text-lg font-bold text-foreground">Indicateurs de Vérité</h2>
        <Badge
          variant="outline"
          className="text-[10px] border-[hsl(45,90%,50%)]/30 text-[hsl(45,70%,35%)] bg-[hsl(45,90%,50%)]/5"
        >
          Intelligence de Lignage
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card
            key={card.title}
            className="bg-card/80 backdrop-blur-sm border-border/50 relative overflow-hidden"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`}
            />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </CardHeader>
            <CardContent className="relative">
              <div
                className={`text-3xl font-bold tabular-nums ${
                  (card as any).valueColor || "text-foreground"
                }`}
              >
                {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SuccessWall;
