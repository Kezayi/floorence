import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Users, GitBranch, ChevronLeft, ChevronRight, Link2 } from "lucide-react";
import { TableSkeleton } from "@/components/admin/AdminSkeletons";
import AdminSearchHeader, { useAdminFilters } from "@/components/admin/AdminSearchHeader";
import { useSocialInferences, type SocialInference } from "@/hooks/useSocialInferences";

const ITEMS_PER_PAGE = 20;

/** Category badge style mapping */
const getCategoryStyle = (cat: string): string => {
  const upper = cat.toUpperCase();
  if (upper.includes("FAMILLE DIRECTE")) return "bg-foreground/10 text-foreground border-foreground/20";
  if (upper.includes("FAMILLE ELARGIE")) return "bg-muted text-muted-foreground border-muted-foreground/20";
  if (upper.includes("ALLIES")) return "bg-[hsl(var(--gesture-candle)/0.15)] text-[hsl(var(--gesture-candle))] border-[hsl(var(--gesture-candle)/0.3)]";
  if (upper.includes("SOCIO")) return "bg-[hsl(var(--gesture-flower)/0.15)] text-[hsl(var(--gesture-flower))] border-[hsl(var(--gesture-flower)/0.3)]";
  return "bg-secondary text-secondary-foreground border-border";
};

const SocialIntelligence = () => {
  const { filters, updateFilter } = useAdminFilters();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data: users, isLoading } = useSocialInferences();

  // Sort by total memorials descending
  const sorted = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => b.totalMemorials - a.totalMemorials);
  }, [users]);

  // Filter using AdminSearchHeader filters
  const filtered = useMemo(() => {
    let result = sorted;

    // Debounced text search — null-safe
    if (filters.debouncedSearch) {
      const q = filters.debouncedSearch.toLowerCase();
      result = result.filter(
        (u) =>
          (u.authorName ?? "").toLowerCase().includes(q) ||
          (u.detailLiens ?? []).some(
            (d) =>
              (d?.lien ?? "").toLowerCase().includes(q) ||
              (d?.defunt ?? "").toLowerCase().includes(q) ||
              (d?.categorie ?? "").toLowerCase().includes(q)
          )
      );
    }

    // Social group filter — null-safe
    if (filters.socialGroup !== "all") {
      result = result.filter((u) =>
        (u.detailLiens ?? []).some((d) => d?.categorie === filters.socialGroup)
      );
    }

    return result;
  }, [sorted, filters.debouncedSearch, filters.socialGroup]);

  // Reset page when filters change — useEffect (not useMemo) for side effects
  const filterKey = `${filters.debouncedSearch}-${filters.socialGroup}`;
  useState(() => { /* track prev */ });
  // Using a proper effect pattern:
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const multiMemorialUsers = useMemo(
    () => sorted.filter((u) => u.totalMemorials > 1).length,
    [sorted]
  );

  const uniqueCategories = useMemo(
    () => new Set(sorted.flatMap((u) => u.detailLiens.map((d) => d.categorie))).size,
    [sorted]
  );

  if (isLoading) return <TableSkeleton />;

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
        <Brain className="w-8 h-8 text-primary" />
        Intelligence Sociale
      </h1>
      <p className="text-muted-foreground mb-8 font-sans">
        Analyse automatisée du maillage entre les contributeurs et les mémoriaux
      </p>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contributeurs uniques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sorted.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Multi-mémoriaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{multiMemorialUsers}</div>
            <p className="text-xs text-muted-foreground">Actifs sur 2+ espaces</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Catégories détectées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCategories}</div>
            <p className="text-xs text-muted-foreground">Catégories actives</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <AdminSearchHeader
        placeholder="Rechercher un contributeur, un lien, un défunt…"
        showSocialGroup
        filters={filters}
        onChange={(f) => {
          Object.entries(f).forEach(([k, v]) => {
            if (filters[k as keyof typeof filters] !== v) {
              updateFilter(k as keyof typeof filters, v);
            }
          });
        }}
      />

      {/* User List */}
      <div className="space-y-3">
        {paginated.map((user) => (
          <UserCard
            key={user.userId}
            user={user}
            expanded={expandedUser === user.userId}
            onToggle={() =>
              setExpandedUser(expandedUser === user.userId ? null : user.userId)
            }
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-xs text-muted-foreground font-sans">
            {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} sur{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-sans px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Individual user card — extracted for clarity */
const UserCard = ({
  user,
  expanded,
  onToggle,
}: {
  user: SocialInference;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const rolesSummary = useMemo(() => {
    const categories = [...new Set((user.detailLiens ?? []).map((d) => d?.categorie ?? "—"))];
    return categories.join(", ") || "—";
  }, [user.detailLiens]);

  return (
    <Card className={`transition-all ${expanded ? "ring-1 ring-primary/30" : ""}`}>
      <div
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="font-serif font-medium text-primary">
                {user.authorName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-medium text-foreground truncate">
                {user.authorName}
              </h3>
              <p className="text-xs text-muted-foreground font-sans truncate">
                {rolesSummary}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="outline" className="font-sans">
              {user.totalMemorials} mémorial
              {user.totalMemorials > 1 ? "x" : ""}
            </Badge>
            {user.totalMemorials > 1 && (
              <Badge className="bg-primary/10 text-primary border-primary/20 font-sans text-[10px]">
                Multi
              </Badge>
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <h4 className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Parcours complet
            </h4>
            {user.detailLiens.map((dl, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-2 bg-muted/30 rounded-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-foreground font-sans font-medium">
                    {dl.lien}
                  </span>
                  <span className="text-xs text-muted-foreground font-sans truncate">
                    de {dl.defunt}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 font-mono">
                    ({dl.slug})
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${getCategoryStyle(dl.categorie)}`}
                >
                  {dl.categorie}
                </Badge>
              </div>
            ))}

            {user.connexionsSuggerees.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Link2 className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-sans font-medium text-primary">
                    Connexions suggérées
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  {user.connexionsSuggerees.join(", ")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SocialIntelligence;
