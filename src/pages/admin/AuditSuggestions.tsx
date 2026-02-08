import { useAdminSuggestedLinks } from "@/hooks/useSuggestedLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle2, XCircle, Clock, TrendingUp, BarChart3, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  accepted: {
    label: "Validé",
    color: "border-primary/30 text-primary bg-primary/5",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejeté",
    color: "border-destructive/30 text-destructive bg-destructive/5",
    icon: XCircle,
  },
  pending: {
    label: "En attente",
    color: "border-[hsl(45,90%,50%)]/30 text-[hsl(45,70%,35%)] bg-[hsl(45,90%,50%)]/5",
    icon: Clock,
  },
};

const AuditSuggestions = () => {
  const { links, stats, isLoading } = useAdminSuggestedLinks();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Brain className="w-7 h-7 text-[hsl(45,90%,50%)]" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit des Suggestions</h1>
          <p className="text-sm text-muted-foreground">
            Suivi de la précision de l'Intelligence de Lignage
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-[10px] text-muted-foreground">suggestions générées</p>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Validées</CardTitle>
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.accepted}</div>
            <p className="text-[10px] text-muted-foreground">liens confirmés</p>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejetées</CardTitle>
            <XCircle className="w-5 h-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.rejected}</div>
            <p className="text-[10px] text-muted-foreground">suggestions écartées</p>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(45,90%,50%,0.06)] to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de transformation
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-[hsl(45,90%,50%)]" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-[hsl(45,70%,35%)]">{stats.rate}%</div>
            <p className="text-[10px] text-muted-foreground">précision de l'IA</p>
            {/* Progress bar */}
            <div className="mt-2 w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${stats.rate}%`,
                  background:
                    stats.rate >= 70
                      ? "hsl(var(--accent-green))"
                      : stats.rate >= 40
                      ? "hsl(45, 90%, 50%)"
                      : "hsl(var(--destructive))",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending alert */}
      {stats.pending > 0 && (
        <div className="mb-6 p-4 bg-[hsl(45,90%,50%)]/5 border border-[hsl(45,90%,50%)]/20 rounded-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[hsl(45,90%,50%)]/20 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-[hsl(45,70%,35%)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {stats.pending} suggestion{stats.pending > 1 ? "s" : ""} en attente de validation
            </p>
            <p className="text-xs text-muted-foreground">
              Les créateurs de mémoriaux doivent confirmer ou rejeter ces suggestions.
            </p>
          </div>
        </div>
      )}

      {/* Suggestions list */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Historique des suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          {links.length > 0 ? (
            <div className="space-y-3">
              {links.map((link) => {
                const config = statusConfig[link.status] || statusConfig.pending;
                const StatusIcon = config.icon;

                return (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-[hsl(45,90%,50%)]/10 flex items-center justify-center shrink-0">
                        <Brain className="w-4 h-4 text-[hsl(45,90%,50%)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <Link
                            to={`/memorial/${link.sourceSlug}`}
                            className="font-medium text-foreground hover:text-primary truncate"
                          >
                            {link.sourceName}
                          </Link>
                          <span className="text-[hsl(45,90%,50%)] font-semibold text-xs">
                            {link.suggestedRelation}
                          </span>
                          <Link
                            to={`/memorial/${link.targetSlug}`}
                            className="font-medium text-foreground hover:text-primary truncate"
                          >
                            {link.targetName}
                          </Link>
                        </div>
                        {link.inferenceLogic && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {link.inferenceLogic}
                          </p>
                        )}
                        {link.createdAt && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(link.createdAt), "d MMM yyyy à HH:mm", {
                              locale: fr,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={`gap-1 ${config.color} text-[10px] shrink-0 ml-3`}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {config.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune suggestion générée pour le moment</p>
              <p className="text-xs mt-1">
                Les suggestions apparaîtront ici lorsque l'Intelligence de Lignage détectera des
                liens potentiels.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditSuggestions;
