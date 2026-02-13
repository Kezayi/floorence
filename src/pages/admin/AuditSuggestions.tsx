import { useState, useMemo } from "react";
import { useAdminSuggestedLinks } from "@/hooks/useSuggestedLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, CheckCircle2, XCircle, Clock, TrendingUp, BarChart3, Loader2, AlertTriangle, ScrollText, Mail, Send, Zap, Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

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

  // Fetch audit logs for suggestion validations
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs-suggestions"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("action_type", "memorial_relation_created")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return [];
      // Filter only those from suggested_link_validation
      return (data || []).filter((log) => {
        const details = log.details as Record<string, any> | null;
        return details?.origin === "suggested_link_validation";
      });
    },
  });

  const queryClient = useQueryClient();
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [isMagicValidating, setIsMagicValidating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const pendingLinks = useMemo(() => links.filter((l) => l.status === "pending"), [links]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingLinks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingLinks.map((l) => l.id)));
    }
  };

  const handleSendNotifications = async () => {
    setIsSendingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-lineage-revelation", {
        method: "POST",
      });

      if (error) throw error;

      const result = data as { sent?: number; suggestions_notified?: number };
      if (result.sent && result.sent > 0) {
        toast.success(
          `📧 ${result.sent} email(s) envoyé(s) pour ${result.suggestions_notified} suggestion(s) — Notification envoyée avec succès`
        );
      } else {
        toast.info("Aucune suggestion à notifier (toutes ont déjà été envoyées ou les créateurs n'ont pas d'email)");
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-suggested-links-audit"] });
    } catch (err: any) {
      console.error("Error sending notifications:", err);
      toast.error("Erreur lors de l'envoi des notifications");
    } finally {
      setIsSendingEmails(false);
    }
  };

  const refreshAllQueries = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-suggested-links-audit"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["audit-logs-suggestions"] }),
      queryClient.invalidateQueries({ queryKey: ["humanity-gauge"] }),
      queryClient.invalidateQueries({ queryKey: ["success-wall"] }),
      queryClient.invalidateQueries({ queryKey: ["live-activity"] }),
      queryClient.invalidateQueries({ queryKey: ["memorial-relations-graph"] }),
      queryClient.invalidateQueries({ queryKey: ["pending-suggested-links-count"] }),
      queryClient.invalidateQueries({ queryKey: ["transitive-all-relations"] }),
    ]);

  const hasSelection = selectedIds.size > 0;

  const handleMagicValidation = async () => {
    setIsMagicValidating(true);
    try {
      if (hasSelection) {
        // Selective mode: mark selected as "pending" ready for RPC, then call RPC
        // First, ensure only selected items are pending (others temporarily set aside)
        const toValidate = pendingLinks.filter((l) => selectedIds.has(l.id));
        const toSkip = pendingLinks.filter((l) => !selectedIds.has(l.id));

        // Temporarily mark non-selected pending items as "deferred" so RPC skips them
        if (toSkip.length > 0) {
          await supabase
            .from("suggested_links")
            .update({ status: "deferred" })
            .in("id", toSkip.map((l) => l.id));
        }

        // Call RPC — it validates all remaining "pending" items (= our selection)
        const { data, error } = await supabase.rpc("admin_force_validate_all_suggestions");
        if (error) throw error;

        // Restore deferred items back to pending
        if (toSkip.length > 0) {
          await supabase
            .from("suggested_links")
            .update({ status: "pending" })
            .in("id", toSkip.map((l) => l.id));
        }

        const result = data as { status?: string; message?: string; count?: number } | null;
        const count = result?.count ?? toValidate.length;
        toast.success(`✨ ${count} lien(s) fusionné(s) avec succès !`, { duration: 6000 });
      } else {
        // Bulk mode: validate ALL pending via RPC
        const { data, error } = await supabase.rpc("admin_force_validate_all_suggestions");
        if (error) throw error;
        const result = data as { status?: string; message?: string; count?: number } | null;
        toast.success(`✨ ${result?.message || "Tous les liens ont été fusionnés avec succès !"}`, { duration: 6000 });
      }

      setSelectedIds(new Set());
      await refreshAllQueries();
    } catch (err: any) {
      console.error("Error in magic validation:", err);
      toast.error("Erreur lors de la validation forcée");
      // Safety: restore any deferred items on error
      if (hasSelection) {
        const toSkip = pendingLinks.filter((l) => !selectedIds.has(l.id));
        if (toSkip.length > 0) {
          await supabase
            .from("suggested_links")
            .update({ status: "pending" })
            .in("id", toSkip.map((l) => l.id));
        }
      }
    } finally {
      setIsMagicValidating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Count un-notified pending suggestions — aligned with edge function logic
  const unnotifiedCount = stats.unnotifiedPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Brain className="w-7 h-7 text-[hsl(45,90%,50%)]" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Audit des Suggestions</h1>
            <p className="text-sm text-muted-foreground">
              Suivi de la précision de l'Intelligence de Lignage
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Magic validation button — dual mode: selection or bulk */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleMagicValidation}
                  disabled={isMagicValidating || stats.pending === 0}
                  className="gap-2 bg-gradient-to-r from-[hsl(260,70%,55%)] to-[hsl(280,65%,50%)] hover:from-[hsl(260,75%,50%)] hover:to-[hsl(280,70%,45%)] text-white shadow-lg shadow-[hsl(260,70%,55%)]/20"
                >
                  {isMagicValidating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {hasSelection ? "Fusionner la sélection" : "Fusionner tout le flux"}
                  {(hasSelection ? selectedIds.size : stats.pending) > 0 && (
                    <Badge className="ml-1 bg-white/20 text-white text-[10px]">
                      {hasSelection ? selectedIds.size : stats.pending}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px] text-center">
                {hasSelection
                  ? "Valide les suggestions sélectionnées et crée les liens de parenté correspondants."
                  : "Réservé à la Bêta : Valide instantanément toutes les suggestions en attente pour les profils fantômes."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Send notifications button */}
          <Button
            onClick={handleSendNotifications}
            disabled={isSendingEmails || unnotifiedCount === 0}
            className="gap-2 bg-gradient-to-r from-[hsl(45,80%,45%)] to-[hsl(40,75%,50%)] hover:from-[hsl(45,85%,40%)] hover:to-[hsl(40,80%,45%)] text-white"
          >
            {isSendingEmails ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Notifier les créateurs
            {unnotifiedCount > 0 && (
              <Badge className="ml-1 bg-white/20 text-white text-[10px]">
                {unnotifiedCount}
              </Badge>
            )}
          </Button>
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

      {/* Trigger automation indicator */}
      <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            Trigger automatique actif
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Chaque nouvelle relation acceptée déclenche automatiquement l'analyse transitive sur le périmètre familial concerné. Les 15 règles de découverte sont appliquées avec validation chronologique.
          </p>
        </div>
      </div>

      {/* Admin global alert */}
      {stats.pending > 0 && (
        <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 rounded-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {stats.pending} nouvelle{stats.pending > 1 ? "s" : ""} suggestion{stats.pending > 1 ? "s" : ""} attend{stats.pending > 1 ? "ent" : ""} la validation des créateurs
            </p>
            <p className="text-xs text-muted-foreground">
              Surveillez le taux de transformation pour mesurer la précision de l'IA.
            </p>
          </div>
        </div>
      )}

      {/* Suggestions list */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Historique des suggestions</CardTitle>
          {pendingLinks.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Checkbox
                checked={selectedIds.size === pendingLinks.length && pendingLinks.length > 0}
                onCheckedChange={toggleSelectAll}
                className="h-3.5 w-3.5"
              />
              {selectedIds.size === pendingLinks.length ? "Tout désélectionner" : `Tout sélectionner (${pendingLinks.length})`}
            </button>
          )}
        </CardHeader>
        <CardContent>
          {links.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                const totalSugPages = Math.ceil(links.length / ITEMS_PER_PAGE);
                const paginatedLinks = links.slice((suggestionsPage - 1) * ITEMS_PER_PAGE, suggestionsPage * ITEMS_PER_PAGE);
                return (
                  <>
                    {paginatedLinks.map((link) => {
                const config = statusConfig[link.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                const isPending = link.status === "pending";
                const isSelected = selectedIds.has(link.id);

                return (
                  <div
                    key={link.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-[hsl(260,70%,55%)]/5 border border-[hsl(260,70%,55%)]/20"
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isPending ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(link.id)}
                          className="shrink-0 h-5 w-5 border-[hsl(260,70%,55%)]/40 data-[state=checked]:bg-[hsl(260,70%,55%)] data-[state=checked]:border-[hsl(260,70%,55%)]"
                        />
                      ) : (
                        <div className="w-5 h-5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <Avatar className="w-6 h-6 shrink-0">
                            {link.sourcePhotoUrl ? (
                              <AvatarImage src={link.sourcePhotoUrl} alt={link.sourceName} className="object-cover grayscale-[30%]" />
                            ) : null}
                            <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-sans">
                              {link.sourceName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <Link
                            to={`/memorial/${link.sourceSlug}`}
                            className="font-medium text-foreground hover:text-primary truncate"
                          >
                            {link.sourceName}
                          </Link>
                          <span className="text-[hsl(45,90%,50%)] font-semibold text-xs">
                            {link.suggestedRelation}
                          </span>
                          <Avatar className="w-6 h-6 shrink-0">
                            {link.targetPhotoUrl ? (
                              <AvatarImage src={link.targetPhotoUrl} alt={link.targetName} className="object-cover grayscale-[30%]" />
                            ) : null}
                            <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-sans">
                              {link.targetName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
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
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            {format(new Date(link.createdAt), "d MMM yyyy à HH:mm", {
                              locale: fr,
                            })}
                            {link.notifiedAt && (
                              <span className="inline-flex items-center gap-0.5 text-primary">
                                <Mail className="w-2.5 h-2.5" />
                                Notifié
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {link.status === "pending" && !link.notifiedAt && (
                        <Badge variant="outline" className="gap-1 border-muted-foreground/20 text-muted-foreground bg-muted/30 text-[10px]">
                          <Mail className="w-2.5 h-2.5" />
                          Non notifié
                        </Badge>
                      )}
                      <Badge variant="outline" className={`gap-1 ${config.color} text-[10px]`}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
                    {totalSugPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">
                          Page {suggestionsPage} / {totalSugPages} ({links.length} suggestions)
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSuggestionsPage(p => Math.max(1, p - 1))} disabled={suggestionsPage === 1} className="h-7 px-2">
                            Précédent
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSuggestionsPage(p => Math.min(totalSugPages, p + 1))} disabled={suggestionsPage === totalSugPages} className="h-7 px-2">
                            Suivant
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
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

      {/* Audit Log - Validation History */}
      {auditLogs.length > 0 && (
        <Card className="bg-card/80 backdrop-blur-sm border-border/50 mt-6">
          <CardHeader className="flex flex-row items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Journal d'audit des validations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const totalAuditPages = Math.ceil(auditLogs.length / ITEMS_PER_PAGE);
                const paginatedAudit = auditLogs.slice((auditPage - 1) * ITEMS_PER_PAGE, auditPage * ITEMS_PER_PAGE);
                return (
                  <>
                    {paginatedAudit.map((log) => {
                      const details = log.details as Record<string, any> | null;
                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-sans">
                              <strong>{log.performed_by_email || "Utilisateur"}</strong> a validé le lien{" "}
                              <strong>{details?.source_memorial}</strong>{" "}
                              <span className="text-[hsl(45,90%,50%)] font-semibold">
                                {details?.relation_type}
                              </span>{" "}
                              <strong>{details?.target_memorial}</strong>
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {format(new Date(log.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                              {" — "}Suggestion IA validée
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {totalAuditPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">
                          Page {auditPage} / {totalAuditPages} ({auditLogs.length} entrées)
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} className="h-7 px-2">
                            Précédent
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))} disabled={auditPage === totalAuditPages} className="h-7 px-2">
                            Suivant
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AuditSuggestions;
