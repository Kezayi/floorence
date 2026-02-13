import { useMemo, useState } from "react";
import { Users, Link2, GitBranch, ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getDemoAvatarUrl } from "@/lib/demoAvatars";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inferAllRelationships, InferredRelationship, getCleanRelationName, getRelationWithDeceased, getGenderAwareRelation, getInverseRelation } from "@/lib/relationshipInference";
import RelationshipGraph2D from "./RelationshipGraph2D";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { displayName } from "@/lib/privacyUtils";
import { formatRelationLabel } from "@/lib/formatRelationLabel";
import { inferGender } from "@/lib/genderInference";
import { getRelationCategory, getCategoryBgColor, type RelationCategoryName } from "@/lib/relationCategoryUtils";

interface RelationshipMaillageProps {
  deceasedName: string;
  memorialId?: string;
  posts: Array<{
    authorId: string;
    authorName: string;
    authorAvatarUrl?: string | null;
    relationCategory: string;
    relationLink?: string | null;
  }>;
}

// 5 catégories ordonnées avec couleurs exactes
const ORDERED_CATEGORIES: { key: RelationCategoryName; label: string; number: string }[] = [
  { key: "Famille directe", label: "LA FAMILLE DIRECTE", number: "1" },
  { key: "Famille élargie", label: "FAMILLE ÉLARGIE", number: "2" },
  { key: "Alliés", label: "LES ALLIÉS", number: "3" },
  { key: "Socio cœur (Amis)", label: "SOCIO CŒUR", number: "4" },
  { key: "Autres", label: "AUTRES", number: "5" },
];

const confidenceBadges = {
  high: { label: "Lien direct", className: "bg-foreground/5 text-foreground border-foreground/15" },
  medium: { label: "Lien probable", className: "bg-ai-gold/10 text-ai-gold-foreground border-ai-gold/20" },
  low: { label: "Lien indirect", className: "bg-muted text-muted-foreground border-border" },
};

const RelationshipMaillage = ({ deceasedName, memorialId, posts }: RelationshipMaillageProps) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [fullscreenGraph, setFullscreenGraph] = useState(false);

  // Fetch inter-memorial links (Pont des Ancêtres)
  const isValidUUID = memorialId ? /^[0-9a-f]{8}-/.test(memorialId) : false;
  const { data: interMemorialLinks } = useQuery({
    queryKey: ["memorial-relations-graph", memorialId],
    enabled: !!memorialId && isValidUUID,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('memorial_relations')
        .select('id, relation_type, memorial_id_1, memorial_id_2')
        .or(`memorial_id_1.eq.${memorialId},memorial_id_2.eq.${memorialId}`)
        .eq('status', 'accepted');

      if (!data || data.length === 0) return [];

      const linkedIds = data.map(r =>
        r.memorial_id_1 === memorialId ? r.memorial_id_2 : r.memorial_id_1
      ).filter((id): id is string => !!id);

      if (linkedIds.length === 0) return [];

      const { data: linkedMemorials } = await supabase
        .from('memorials')
        .select('id, first_name, last_name')
        .in('id', linkedIds);

      const nameMap = new Map(
        (linkedMemorials || []).map(m => [m.id, `${m.first_name} ${m.last_name}`])
      );
      const firstNameMap = new Map(
        (linkedMemorials || []).map(m => [m.id, m.first_name])
      );

      const currentFirstName = deceasedName.split(' ')[0];

      return data.map(r => {
        const isSource = r.memorial_id_1 === memorialId;
        const linkedId = isSource ? r.memorial_id_2 : r.memorial_id_1;
        const relType = r.relation_type;
        if (!linkedId) return { name: 'Inconnu', relationType: relType };

        let relationType: string;
        if (isSource) {
          relationType = getGenderAwareRelation(relType, currentFirstName);
        } else {
          relationType = getInverseRelation(relType, currentFirstName);
        }

        return {
          name: nameMap.get(linkedId) || 'Inconnu',
          relationType,
        };
      });
    },
  });
  const directRelations = useMemo(() => {
    const uniqueAuthors = new Map<string, { name: string; category: string; relationLink: string | null; avatarUrl: string | null }>();
    posts.forEach((post) => {
      if (!uniqueAuthors.has(post.authorId)) {
        uniqueAuthors.set(post.authorId, {
          name: post.authorName,
          category: post.relationCategory,
          relationLink: post.relationLink || null,
          avatarUrl: post.authorAvatarUrl || null,
        });
      }
    });
    return Array.from(uniqueAuthors.values());
  }, [posts]);

  const inferredRelationships = useMemo(() => {
    const messages = posts.map((p) => ({ authorName: p.authorName, relationCategory: p.relationLink || p.relationCategory }));
    return inferAllRelationships(messages);
  }, [posts]);

  const groupedRelations = useMemo(() => {
    const groups: Record<RelationCategoryName, Array<{ name: string; category: string; relationLink: string | null; avatarUrl: string | null }>> = {
      "Famille directe": [], "Famille élargie": [], "Alliés": [], "Socio cœur (Amis)": [], "Autres": [],
    };
    directRelations.forEach((rel) => {
      const cat = getRelationCategory(rel.relationLink || rel.category);
      groups[cat].push(rel);
    });
    return groups;
  }, [directRelations]);

  const isMaillageEmpty = directRelations.length === 0;

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h3 className="flex items-center gap-2 mb-2">
          <GitBranch className="w-5 h-5 text-foreground/70" />
          Maillage relationnel
        </h3>
        <p className="font-serif text-muted-foreground">
          Visualisation des liens autour de {deceasedName}
        </p>
      </div>

      {isMaillageEmpty ? (
        <div className="bg-muted/30 border border-border rounded-sm p-10 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <h4 className="text-lg font-serif mb-2">Commencer à tisser la communauté</h4>
          <p className="text-sm text-muted-foreground font-serif max-w-md mx-auto mb-3">
            Aucun hommage n'a encore été déposé. Soyez le premier à partager un souvenir 
            et à construire le maillage relationnel autour de {deceasedName}.
          </p>
          <p className="text-xs text-muted-foreground/60 font-sans italic">
            Chaque témoignage enrichit la mémoire collective et révèle les liens qui unissent les proches.
          </p>
        </div>
      ) : (
        <>
          {/* Graphe 2D */}
          <div className="relative bg-card/50 border border-border/60 rounded-sm p-4">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-20 h-8 w-8 p-0 bg-background/80 hover:bg-background border border-border/60"
              onClick={() => setFullscreenGraph(true)}
              aria-label="Mode immersion plein écran"
              title="Mode immersion"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <RelationshipGraph2D deceasedName={deceasedName} posts={posts.map(p => ({ ...p, relationLink: p.relationLink }))} interMemorialLinks={interMemorialLinks || []} />
          </div>

          {/* Fullscreen Graph Dialog */}
          {fullscreenGraph && (
            <div className="fixed inset-0 z-50 bg-background flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-foreground/70" />
                  <h3 className="font-serif text-lg">Maillage de {deceasedName}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setFullscreenGraph(false)}
                  aria-label="Fermer le mode immersion"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 p-4">
                <RelationshipGraph2D deceasedName={deceasedName} posts={posts.map(p => ({ ...p, relationLink: p.relationLink }))} interMemorialLinks={interMemorialLinks || []} />
              </div>
            </div>
          )}

          {/* Pont des Ancêtres */}
          {interMemorialLinks && interMemorialLinks.length > 0 && (
            <div className="bg-ai-gold/5 border border-ai-gold/20 p-5 rounded-sm">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4 text-ai-gold" />
                <h4 className="font-serif text-lg text-ai-gold">Pont des Ancêtres</h4>
              </div>
              <div className="space-y-2">
                {interMemorialLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-0.5 bg-ai-gold rounded-full" />
                    <span className="font-serif">
                      {deceasedName.split(" ")[0]} — <span className="text-ai-gold">{link.relationType}</span> de {displayName(link.name, isAuthenticated)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relations directes */}
          <div className="bg-muted/30 border border-border/60 p-6 rounded-sm">
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-4 h-4 text-foreground/60" />
              <h4 className="font-serif text-lg">Relations du défunt</h4>
            </div>
            
            <div className="space-y-5">
              {ORDERED_CATEGORIES.map((cat) => {
                const members = groupedRelations[cat.key];
                if (members.length === 0) return null;
                const color = getCategoryBgColor(cat.key);
                
                return (
                  <div key={cat.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color, boxShadow: cat.key === "Famille élargie" ? "0 0 0 1px rgba(0,0,0,0.15)" : undefined }}
                      />
                      <span className="text-sm font-sans font-medium tracking-wide">
                        {cat.number}. {cat.label} ({members.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-4">
                      {members.map((rel, idx) => {
                        const displayRelation = rel.relationLink
                          ? formatRelationLabel(rel.relationLink, inferGender(deceasedName.split(' ')[0]))
                          : getCleanRelationName(rel.category);
                        return (
                          <div key={idx} className="flex items-center gap-2 text-sm py-1">
                            <Avatar className="w-6 h-6 shrink-0">
                              {(rel.avatarUrl || rel.name) ? (
                                <AvatarImage
                                  src={rel.avatarUrl || getDemoAvatarUrl(rel.name)}
                                  alt={rel.name}
                                  className="object-cover grayscale-[30%]"
                                />
                              ) : null}
                              <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-sans">
                                {rel.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className="inline-block text-xs font-sans px-2 py-0.5 rounded-sm"
                              style={{ color: color }}
                            >
                              {displayRelation}
                            </span>
                            <span className="font-serif text-foreground">{displayName(rel.name, isAuthenticated)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Liens inférés */}
          {inferredRelationships.length > 0 && (
            <InferredRelationshipsSection relationships={inferredRelationships} isAuthenticated={isAuthenticated} />
          )}

          {inferredRelationships.length === 0 && directRelations.length > 1 && (
            <div className="bg-muted/20 p-6 rounded-sm text-center border border-border/40">
              <Link2 className="w-7 h-7 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground font-serif italic">
                Pas assez d'informations pour inférer des relations entre les proches.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Groupage par individu
interface GroupedPerson {
  name: string;
  relationWithDeceased: string;
  connections: Array<{
    otherName: string;
    otherRelationWithDeceased: string;
    inferredLink: string;
    confidence: "high" | "medium" | "low";
  }>;
  bestConfidence: "high" | "medium" | "low";
}

const groupByPerson = (relationships: InferredRelationship[]): GroupedPerson[] => {
  const personMap = new Map<string, GroupedPerson>();
  const seenPairs = new Set<string>();

  for (const rel of relationships) {
    // Clé de paire normalisée pour éviter les doublons bidirectionnels
    const pairKey = [rel.fromAuthor, rel.toAuthor].sort().join("|");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    // Ajouter la connexion au premier individu (fromAuthor)
    if (!personMap.has(rel.fromAuthor)) {
      personMap.set(rel.fromAuthor, {
        name: rel.fromAuthor,
        relationWithDeceased: getRelationWithDeceased(rel.fromRelation),
        connections: [],
        bestConfidence: rel.confidence,
      });
    }
    const fromPerson = personMap.get(rel.fromAuthor)!;
    fromPerson.connections.push({
      otherName: rel.toAuthor,
      otherRelationWithDeceased: getRelationWithDeceased(rel.toRelation),
      inferredLink: rel.inferredLink,
      confidence: rel.confidence,
    });
    // Mettre à jour la meilleure confiance
    const confOrder = { high: 0, medium: 1, low: 2 };
    if (confOrder[rel.confidence] < confOrder[fromPerson.bestConfidence]) {
      fromPerson.bestConfidence = rel.confidence;
    }
  }

  // Trier : plus de connexions d'abord, puis par confiance
  return Array.from(personMap.values()).sort((a, b) => {
    if (b.connections.length !== a.connections.length) return b.connections.length - a.connections.length;
    const confOrder = { high: 0, medium: 1, low: 2 };
    return confOrder[a.bestConfidence] - confOrder[b.bestConfidence];
  });
};

const PERSONS_PER_PAGE = 5;

const InferredRelationshipsSection = ({ relationships, isAuthenticated }: { relationships: InferredRelationship[]; isAuthenticated: boolean }) => {
  const grouped = useMemo(() => groupByPerson(relationships), [relationships]);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(grouped.length / PERSONS_PER_PAGE);
  const startIndex = (currentPage - 1) * PERSONS_PER_PAGE;
  const endIndex = startIndex + PERSONS_PER_PAGE;
  const paginatedPersons = grouped.slice(startIndex, endIndex);
  const totalConnections = grouped.reduce((sum, p) => sum + p.connections.length, 0);

  return (
    <div className="bg-muted/30 border border-border/60 p-6 rounded-sm">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-foreground/60" />
        <h4 className="font-serif text-lg">Liens de parenté retrouvés</h4>
        <span className="text-sm text-muted-foreground font-sans">
          ({grouped.length} personnes · {totalConnections} liens)
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-5 font-sans italic">
        Liens déduits automatiquement, groupés par individu
      </p>

      <div className="space-y-3">
        {paginatedPersons.map((person) => (
          <PersonGroupCard key={person.name} person={person} isAuthenticated={isAuthenticated} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
          <span className="text-xs text-muted-foreground font-sans">
            {startIndex + 1}–{Math.min(endIndex, grouped.length)} sur {grouped.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-sans px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-2"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const PersonGroupCard = ({ person, isAuthenticated }: { person: GroupedPerson; isAuthenticated: boolean }) => {
  return (
    <div className="p-4 bg-card/80 rounded-sm border border-border/40">
      <div className="flex items-center gap-2 mb-3">
        <Avatar className="w-6 h-6 shrink-0">
          <AvatarImage src={getDemoAvatarUrl(person.name)} alt={person.name} className="object-cover grayscale-[30%]" />
          <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-sans">
            {person.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-serif text-foreground font-medium">{displayName(person.name, isAuthenticated)}</span>
        <span className="text-xs text-muted-foreground font-sans">— {person.relationWithDeceased}</span>
      </div>
      <div className="space-y-1.5 ml-5">
        {person.connections.map((conn, idx) => {
          const badge = confidenceBadges[conn.confidence];
          return (
            <div key={idx} className="flex items-center gap-2 text-sm flex-wrap">
              <span className="w-1 h-1 rounded-full bg-border shrink-0" />
              <span className={`text-xs px-2 py-0.5 rounded-sm border font-serif ${badge.className}`}>
                {conn.inferredLink}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RelationshipMaillage;
