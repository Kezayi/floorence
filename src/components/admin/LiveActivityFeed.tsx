import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, CheckCircle2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Json } from "@/integrations/supabase/types";

interface AuditEntry {
  id: string;
  performedByEmail: string | null;
  sourceMemorial: string;
  targetMemorial: string;
  relationType: string;
  createdAt: string;
}

const LiveActivityFeed = () => {
  const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["admin-live-activity-feed"],
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("action_type", "memorial_relation_created")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) return [];

      return (data || [])
        .filter((log) => {
          const details = log.details as Record<string, Json> | null;
          return details?.origin === "suggested_link_validation";
        })
        .map((log) => {
          const details = log.details as Record<string, string> | null;
          return {
            id: log.id,
            performedByEmail: log.performed_by_email,
            sourceMemorial: details?.source_memorial || "Inconnu",
            targetMemorial: details?.target_memorial || "Inconnu",
            relationType: details?.relation_type || "",
            createdAt: log.created_at,
          };
        });
    },
  });

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ScrollText className="w-4 h-4 text-primary" />
          Journal d'Activité en Direct
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-3 max-h-[280px] overflow-y-auto">
            {entries.map((entry) => {
              const timeAgo = formatDistanceToNow(new Date(entry.createdAt), {
                locale: fr,
                addSuffix: true,
              });

              const userName = entry.performedByEmail
                ? entry.performedByEmail.split("@")[0]
                : "Un utilisateur";

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-primary/5 border border-primary/10"
                >
                  <CheckCircle2 className="w-4 h-4 text-[hsl(45,90%,50%)] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground leading-relaxed">
                      <span className="capitalize font-medium">{timeAgo}</span>,{" "}
                      <strong>{userName}</strong> a révélé la vérité sur le lien entre{" "}
                      <strong>{entry.sourceMemorial}</strong> et{" "}
                      <strong>{entry.targetMemorial}</strong>
                      <span className="text-[hsl(45,80%,40%)] font-semibold">
                        {" "}
                        ({entry.relationType})
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Aucune validation enregistrée</p>
            <p className="text-[10px] mt-1">
              Les validations de liens par les créateurs apparaîtront ici en temps réel.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveActivityFeed;
