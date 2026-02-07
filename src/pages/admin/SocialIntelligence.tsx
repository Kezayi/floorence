import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Search, Users, GitBranch, ChevronLeft, ChevronRight } from "lucide-react";
import { TableSkeleton } from "@/components/admin/AdminSkeletons";
import RelationCategoryBadge from "@/components/admin/RelationCategoryBadge";

const CACHE_CONFIG = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };
const ITEMS_PER_PAGE = 20;

interface SocialUser {
  userId: string;
  authorName: string;
  rolesSummary: string;
  totalMemorialsLinked: number;
  detailedInferences: Array<{
    memorial_slug: string;
    role: string;
  }>;
}

const SocialIntelligence = () => {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery<SocialUser[]>({
    queryKey: ["admin-social-intelligence"],
    ...CACHE_CONFIG,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_social_inferences")
        .select("*")
        .order("total_memorials_linked", { ascending: false });

      if (error) {
        console.error("Error fetching social intelligence:", error);
        return [];
      }

      return (data || []).map((row) => ({
        userId: row.user_id || "",
        authorName: row.author_name || "",
        rolesSummary: row.roles_summary || "",
        totalMemorialsLinked: Number(row.total_memorials_linked) || 0,
        detailedInferences: Array.isArray(row.detailed_inferences)
          ? (row.detailed_inferences as Array<{ memorial_slug: string; role: string }>)
          : [],
      }));
    },
  });

  // Filter and paginate
  const filtered = useMemo(() => {
    if (!users) return [];
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.authorName.toLowerCase().includes(q) ||
        u.rolesSummary.toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const multiMemorialUsers = useMemo(
    () => (users || []).filter((u) => u.totalMemorialsLinked > 1).length,
    [users]
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
            <div className="text-2xl font-bold">{users?.length || 0}</div>
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
            <p className="text-xs text-muted-foreground">
              Actifs sur 2+ espaces
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Rôles détectés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set((users || []).flatMap((u) => u.detailedInferences.map((d) => d.role))).size}
            </div>
            <p className="text-xs text-muted-foreground">Catégories actives</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un contributeur…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-10"
        />
      </div>

      {/* User List */}
      <div className="space-y-3">
        {paginated.map((user) => (
          <Card
            key={user.userId}
            className={`transition-all ${
              expandedUser === user.userId ? "ring-1 ring-primary/30" : ""
            }`}
          >
            <div
              className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() =>
                setExpandedUser(expandedUser === user.userId ? null : user.userId)
              }
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
                      {user.rolesSummary}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className="font-sans">
                    {user.totalMemorialsLinked} mémorial
                    {user.totalMemorialsLinked > 1 ? "x" : ""}
                  </Badge>
                  {user.totalMemorialsLinked > 1 && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-sans text-[10px]">
                      Multi
                    </Badge>
                  )}
                </div>
              </div>

              {/* Expanded: detailed inferences */}
              {expandedUser === user.userId && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <h4 className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Parcours complet
                  </h4>
                  {user.detailedInferences.map((inf, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 p-2 bg-muted/30 rounded-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {inf.memorial_slug}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          inf.role === "Famille directe"
                            ? "bg-foreground/10 text-foreground border-foreground/20"
                            : inf.role === "Alliés"
                            ? "bg-[hsl(var(--gesture-candle)/0.15)] text-[hsl(var(--gesture-candle))] border-[hsl(var(--gesture-candle)/0.3)]"
                            : inf.role.includes("Socio")
                            ? "bg-[hsl(var(--gesture-flower)/0.15)] text-[hsl(var(--gesture-flower))] border-[hsl(var(--gesture-flower)/0.3)]"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {inf.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
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

export default SocialIntelligence;
