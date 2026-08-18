import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useMemorialsWithGuestbook } from "@/contexts/MemorialsContext";
import { getOptimizedImageUrl, getOptimizedSrcSet } from "@/lib/imageUrl";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { SearchableMemorial } from "@/lib/searchWithRelations";
import { getCleanRelationName, getRelationWithDeceased, inferUserToPersonRelation, inferRelationship, UserRelationResult } from "@/lib/relationshipInference";
import { inferGender } from "@/lib/genderInference";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ChevronRight, ArrowLeft, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import RelationshipGraphSearch from "@/components/search/RelationshipGraphSearch";
import { useDebounce } from "@/hooks/useDebounce";
import MemorialPagination from "@/components/home/MemorialPagination";

// ============================================================================
// TYPES
// ============================================================================

// Membre d'un groupe familial (dans un mémorial)
interface FamilyMember {
  normalizedName: string;
  displayName: string;
  relation: string;
  isCreator: boolean;
  guestbookCount: number;
  // Lien avec l'utilisateur connecté
  userConnection?: UserRelationResult;
  // Liens croisés avec les autres membres du groupe
  crossLinks: Array<{
    targetName: string;
    label: string;
    confidence: "high" | "medium" | "low";
  }>;
}

// Groupe familial (par mémorial)
interface FamilyGroup {
  memorialId: string;
  memorialSlug: string;
  memorialShareToken?: string | null;
  deceasedName: string;
  deceasedPhoto?: string;
  members: FamilyMember[];
}

// Profil multi-mémorial (pour déduplication)
interface MultiMemorialProfile {
  normalizedName: string;
  displayName: string;
  memorialActivities: Array<{
    memorialId: string;
    memorialSlug: string;
    memorialShareToken?: string | null;
    memorialName: string;
    relation: string;
    isCreator: boolean;
    guestbookCount: number;
    photo?: string;
  }>;
  mainPhoto?: string;
  // Meilleur lien avec l'utilisateur
  bestUserConnection?: UserRelationResult & { memorialName: string };
}

// Types de résultats
type SearchResultItem = 
  | { type: "family_group"; data: FamilyGroup }
  | { type: "multi_memorial"; data: MultiMemorialProfile };

// ============================================================================
// NORMALISATION ET DÉDUPLICATION
// ============================================================================

const normalizeString = (str: string | null | undefined): string => {
  if (!str) return "";
  return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Normalisation agressive pour la déduplication (supprime particules, espaces multiples)
const normalizeForDedup = (str: string): string => {
  return normalizeString(str)
    .replace(/\b(de|du|des|le|la|les|el|al|ben|ibn|van|von)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Vérifie si deux noms désignent probablement la même personne
const isSamePerson = (name1: string, name2: string): boolean => {
  const n1 = normalizeForDedup(name1);
  const n2 = normalizeForDedup(name2);
  
  // Match exact après normalisation
  if (n1 === n2) return true;
  
  // Un nom est contenu dans l'autre (ex: "Marie" vs "Marie Koné")
  if (n1.includes(n2) || n2.includes(n1)) {
    // Seulement si le nom court fait au moins 4 caractères
    const shorter = n1.length < n2.length ? n1 : n2;
    if (shorter.length >= 4) return true;
  }
  
  // Distance de Levenshtein faible
  if (n1.length > 4 && n2.length > 4) {
    const distance = levenshteinDistance(n1, n2);
    const maxLen = Math.max(n1.length, n2.length);
    if (distance <= Math.floor(maxLen * 0.2)) return true; // 20% de tolérance
  }
  
  return false;
};

// Trouve la clé de dédup existante pour un nom, ou retourne null
const findDedupKey = (name: string, existingKeys: Map<string, string[]>): string | null => {
  const normalized = normalizeForDedup(name);
  
  for (const [key, variants] of existingKeys) {
    if (key === normalized) return key;
    for (const variant of variants) {
      if (isSamePerson(normalized, variant)) return key;
    }
  }
  return null;
};

// Distance de Levenshtein pour le fuzzy match
const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// Vérifie si deux chaînes sont similaires
const isFuzzyMatch = (query: string, target: string, threshold: number = 2): boolean => {
  if (target.includes(query)) return true;
  if (query.length <= 3) return target.includes(query);
  
  const targetWords = target.split(/\s+/);
  for (const word of targetWords) {
    if (word.startsWith(query.substring(0, Math.min(3, query.length)))) {
      const distance = levenshteinDistance(query, word.substring(0, query.length + 1));
      if (distance <= threshold) return true;
    }
    const distance = levenshteinDistance(query, word);
    const adaptiveThreshold = Math.min(threshold, Math.floor(query.length / 3) + 1);
    if (distance <= adaptiveThreshold) return true;
  }
  return false;
};

// ============================================================================
// COULEURS PAR TYPE DE RELATION
// ============================================================================

const getRelationColorClass = (relation: string): string => {
  // Alliance = Doré
  if (relation.includes("Époux") || relation.includes("Épouse") || 
      relation.includes("Belle-") || relation.includes("Beau-") ||
      relation.includes("Gendre")) {
    return "text-[hsl(var(--gesture-candle))]";
  }
  // Féminin = Rose
  if (relation.includes("Mère") || relation.includes("Fille") || 
      relation.includes("Sœur") || relation.includes("Tante") ||
      relation.includes("Nièce") || relation.includes("Cousine") ||
      relation.includes("Grand-mère") || relation.includes("Petite-")) {
    return "text-[hsl(var(--gesture-flower))]";
  }
  // Direct = Noir
  return "text-foreground";
};

// ============================================================================
// MOTEUR DE RECHERCHE AVEC GROUPEMENT FAMILIAL
// ============================================================================

const searchWithFamilyGrouping = (
  query: string,
  memorials: SearchableMemorial[],
  currentUserName?: string
): SearchResultItem[] => {
  if (!query.trim()) return [];

  const normalizedQuery = normalizeString(query);
  const normalizedUserName = currentUserName ? normalizeString(currentUserName) : null;
  
  // Map pour détecter les personnes multi-mémoriaux (avec dédup fuzzy)
  const personMemorials = new Map<string, Array<{
    memorialId: string;
    memorialSlug: string;
    memorialShareToken?: string | null;
    memorialName: string;
    relation: string;
    isCreator: boolean;
    guestbookCount: number;
    photo?: string;
    userConnection?: UserRelationResult;
  }>>();
  
  // Map de variantes de noms pour la dédup fuzzy
  const dedupVariants = new Map<string, string[]>(); // dedupKey -> [variants]

  // Map pour les groupes familiaux par mémorial
  const familyGroups = new Map<string, FamilyGroup>();

  // Parcourir tous les mémoriaux
  for (const memorial of memorials) {
    const memorialNameNormalized = normalizeString(memorial.name);
    let matchesInThisMemorial: Array<{
      normalizedName: string;
      displayName: string;
      relation: string;
      isCreator: boolean;
      guestbookCount: number;
    }> = [];

    // 1. Chercher le défunt
    if (isFuzzyMatch(normalizedQuery, memorialNameNormalized)) {
      // Le défunt lui-même - on crée un groupe spécial
      if (!familyGroups.has(memorial.id)) {
        familyGroups.set(memorial.id, {
          memorialId: memorial.id,
          memorialSlug: memorial.slug,
          memorialShareToken: (memorial as any).shareToken || null,
          deceasedName: memorial.name,
          deceasedPhoto: memorial.photos[0],
          members: [],
        });
      }

      // Track deceased in multi-memorial dedup (in case same person appears as contributor elsewhere)
      const deceasedNorm = normalizeForDedup(memorial.name);
      const deceasedDedupKey = findDedupKey(deceasedNorm, dedupVariants) || deceasedNorm;
      if (!dedupVariants.has(deceasedDedupKey)) {
        dedupVariants.set(deceasedDedupKey, [deceasedNorm]);
      } else if (!dedupVariants.get(deceasedDedupKey)!.includes(deceasedNorm)) {
        dedupVariants.get(deceasedDedupKey)!.push(deceasedNorm);
      }
      const existingDeceased = personMemorials.get(deceasedDedupKey) || [];
      const alreadyTrackedDeceased = existingDeceased.find(e => e.memorialId === memorial.id);
      if (!alreadyTrackedDeceased) {
        existingDeceased.push({
          memorialId: memorial.id,
          memorialSlug: memorial.slug,
          memorialShareToken: (memorial as any).shareToken || null,
          memorialName: memorial.name,
          relation: "Défunt(e)",
          isCreator: false,
          guestbookCount: 0,
          photo: memorial.photos[0],
        });
        personMemorials.set(deceasedDedupKey, existingDeceased);
      }
    }

    // 2. Chercher le créateur
    const authorNameNormalized = normalizeString(memorial.author.name);
    if (isFuzzyMatch(normalizedQuery, authorNameNormalized)) {
      matchesInThisMemorial.push({
        normalizedName: authorNameNormalized,
        displayName: memorial.author.name,
        relation: memorial.author.relation,
        isCreator: true,
        guestbookCount: 0,
      });

      // Ajouter au tracking multi-mémorial avec dédup fuzzy
      const dedupKey = findDedupKey(authorNameNormalized, dedupVariants) || authorNameNormalized;
      if (!dedupVariants.has(dedupKey)) {
        dedupVariants.set(dedupKey, [authorNameNormalized]);
      } else if (!dedupVariants.get(dedupKey)!.includes(authorNameNormalized)) {
        dedupVariants.get(dedupKey)!.push(authorNameNormalized);
      }
      const existing = personMemorials.get(dedupKey) || [];
      existing.push({
        memorialId: memorial.id,
        memorialSlug: memorial.slug,
        memorialShareToken: (memorial as any).shareToken || null,
        memorialName: memorial.name,
        relation: memorial.author.relation,
        isCreator: true,
        guestbookCount: 0,
        photo: memorial.photos[0],
      });
      personMemorials.set(dedupKey, existing);
    }

    // 3. Chercher dans les contributeurs du livre d'or
    const guestbookByPerson = new Map<string, { count: number; relation: string; displayName: string }>();
    for (const message of memorial.guestbookMessages) {
      const msgAuthorNormalized = normalizeString(message.authorName);
      if (isFuzzyMatch(normalizedQuery, msgAuthorNormalized)) {
        const existing = guestbookByPerson.get(msgAuthorNormalized);
        if (existing) {
          existing.count++;
        } else {
          guestbookByPerson.set(msgAuthorNormalized, {
            count: 1,
            relation: message.relationCategory,
            displayName: message.authorName,
          });
        }
      }
    }

    // Ajouter les contributeurs
    for (const [normName, data] of guestbookByPerson) {
      // Ne pas dupliquer si déjà créateur (dédup fuzzy)
      const isAlsoCreator = matchesInThisMemorial.some(m => isSamePerson(m.normalizedName, normName) && m.isCreator);
      if (!isAlsoCreator) {
        matchesInThisMemorial.push({
          normalizedName: normName,
          displayName: data.displayName,
          relation: data.relation,
          isCreator: false,
          guestbookCount: data.count,
        });
      } else {
        // Mettre à jour le count si aussi créateur (dédup fuzzy)
        const creator = matchesInThisMemorial.find(m => isSamePerson(m.normalizedName, normName) && m.isCreator);
        if (creator) creator.guestbookCount = data.count;
      }

      // Ajouter au tracking multi-mémorial avec dédup fuzzy
      const dedupKey = findDedupKey(normName, dedupVariants) || normName;
      if (!dedupVariants.has(dedupKey)) {
        dedupVariants.set(dedupKey, [normName]);
      } else if (!dedupVariants.get(dedupKey)!.includes(normName)) {
        dedupVariants.get(dedupKey)!.push(normName);
      }
      const existingDedup = personMemorials.get(dedupKey) || [];
      const alreadyTracked = existingDedup.find(e => e.memorialId === memorial.id);
      if (alreadyTracked) {
        alreadyTracked.guestbookCount = data.count;
      } else {
        existingDedup.push({
          memorialId: memorial.id,
          memorialSlug: memorial.slug,
          memorialShareToken: (memorial as any).shareToken || null,
          memorialName: memorial.name,
          relation: data.relation,
          isCreator: false,
          guestbookCount: data.count,
          photo: memorial.photos[0],
        });
        personMemorials.set(dedupKey, existingDedup);
      }
    }

    // Si on a des matches dans ce mémorial, créer le groupe familial
    if (matchesInThisMemorial.length > 0) {
      // Tous les contributeurs du mémorial pour les liens croisés
      const allContributors = [
        { name: memorial.author.name, relation: memorial.author.relation },
        ...memorial.guestbookMessages.map(m => ({ name: m.authorName, relation: m.relationCategory }))
      ];

      // Trouver la relation de l'utilisateur dans ce mémorial
      let userRelationInMemorial: string | null = null;
      if (normalizedUserName) {
        const userContrib = allContributors.find(c => {
          const contribNormalized = normalizeString(c.name);
          return contribNormalized === normalizedUserName || contribNormalized.includes(normalizedUserName);
        });
        if (userContrib) userRelationInMemorial = userContrib.relation;
      }

      // Construire les membres avec liens croisés
      const members: FamilyMember[] = matchesInThisMemorial.map(match => {
        // Calculer le lien avec l'utilisateur
        let userConnection: UserRelationResult | undefined;
        if (userRelationInMemorial && userRelationInMemorial !== match.relation) {
          userConnection = inferUserToPersonRelation(userRelationInMemorial, match.relation) || undefined;
        }

        // Calculer les liens croisés avec les autres membres trouvés
        const crossLinks: FamilyMember["crossLinks"] = [];
        for (const other of matchesInThisMemorial) {
          if (other.normalizedName === match.normalizedName) continue;
          
          const inferred = inferRelationship(
            match.relation,
            other.relation,
            match.displayName,
            other.displayName
          );
          
          if (inferred) {
            crossLinks.push({
              targetName: other.displayName,
              label: inferred.link,
              confidence: inferred.confidence,
            });
          }
        }

        return {
          normalizedName: match.normalizedName,
          displayName: match.displayName,
          relation: match.relation,
          isCreator: match.isCreator,
          guestbookCount: match.guestbookCount,
          userConnection,
          crossLinks,
        };
      });

      // Trier: utilisateur connecté en premier, puis par confiance du lien
      members.sort((a, b) => {
        // Lien utilisateur prioritaire
        if (a.userConnection && !b.userConnection) return -1;
        if (!a.userConnection && b.userConnection) return 1;
        if (a.userConnection && b.userConnection) {
          const order = { high: 0, medium: 1, low: 2 };
          return (order[a.userConnection.confidence] || 3) - (order[b.userConnection.confidence] || 3);
        }
        return 0;
      });

      if (!familyGroups.has(memorial.id)) {
        familyGroups.set(memorial.id, {
          memorialId: memorial.id,
          memorialSlug: memorial.slug,
          memorialShareToken: (memorial as any).shareToken || null,
          deceasedName: memorial.name,
          deceasedPhoto: memorial.photos[0],
          members,
        });
      } else {
        familyGroups.get(memorial.id)!.members = members;
      }
    }
  }

  // Construire les résultats
  const results: SearchResultItem[] = [];

  // Identifier les personnes multi-mémoriaux (apparaissent dans 2+ mémoriaux distincts)
  const multiMemorialPersons = new Set<string>();
  for (const [dedupKey, activities] of personMemorials) {
    // Compter les mémoriaux distincts
    const uniqueMemorials = new Set(activities.map(a => a.memorialId));
    if (uniqueMemorials.size >= 2) {
      multiMemorialPersons.add(dedupKey);
      // Ajouter aussi toutes les variantes pour le filtrage dans les groupes familiaux
      const variants = dedupVariants.get(dedupKey) || [dedupKey];
      variants.forEach(v => multiMemorialPersons.add(v));
    }
  }

  // Ajouter les groupes familiaux (en excluant les membres multi-mémoriaux qui auront leur propre carte)
  for (const group of familyGroups.values()) {
    // Filtrer les membres qui seront affichés séparément (dédup fuzzy)
    const membersToShow = group.members.filter(m => {
      // Vérifier si ce membre a une clé de dédup multi-mémorial
      const memberDedupKey = findDedupKey(m.normalizedName, dedupVariants);
      return !multiMemorialPersons.has(m.normalizedName) && 
             !(memberDedupKey && multiMemorialPersons.has(memberDedupKey));
    });
    
    if (membersToShow.length > 0 || group.members.length === 0) {
      results.push({
        type: "family_group",
        data: {
          ...group,
          members: membersToShow,
        },
      });
    }
  }

  // Ajouter les profils multi-mémoriaux
  for (const [normName, activities] of personMemorials) {
    if (activities.length >= 2) {
      // Trouver le meilleur lien avec l'utilisateur
      let bestConnection: MultiMemorialProfile["bestUserConnection"] = undefined;
      if (normalizedUserName) {
        for (const activity of activities) {
          const memorial = memorials.find(m => m.id === activity.memorialId);
          if (!memorial) continue;

          const allContributors = [
            { name: memorial.author.name, relation: memorial.author.relation },
            ...memorial.guestbookMessages.map(m => ({ name: m.authorName, relation: m.relationCategory }))
          ];

          const userContrib = allContributors.find(c => {
            const contribNormalized = normalizeString(c.name);
            return contribNormalized === normalizedUserName || contribNormalized.includes(normalizedUserName);
          });

          if (userContrib) {
            const inferred = inferUserToPersonRelation(userContrib.relation, activity.relation);
            if (inferred) {
              if (!bestConnection || 
                  (inferred.confidence === "high" && bestConnection.confidence !== "high") ||
                  (inferred.confidence === "medium" && bestConnection.confidence === "low")) {
                bestConnection = { ...inferred, memorialName: memorial.name };
              }
            }
          }
        }
      }

      results.push({
        type: "multi_memorial",
        data: {
          normalizedName: normName,
          displayName: activities[0].memorialName.split(" ")[0], // Fallback
          memorialActivities: activities,
          mainPhoto: activities[0].photo,
          bestUserConnection: bestConnection,
        },
      });

      // Mettre à jour le displayName correct (dédup fuzzy)
      const lastResult = results[results.length - 1];
      if (lastResult.type === "multi_memorial") {
        const variants = dedupVariants.get(normName) || [normName];
        let found = false;
        for (const memorial of memorials) {
          const authorNorm = normalizeString(memorial.author.name);
          if (variants.some(v => isSamePerson(authorNorm, v))) {
            lastResult.data.displayName = memorial.author.name;
            found = true;
            break;
          }
          if (!found) {
            for (const msg of memorial.guestbookMessages) {
              const msgNorm = normalizeString(msg.authorName);
              if (variants.some(v => isSamePerson(msgNorm, v))) {
                lastResult.data.displayName = msg.authorName;
                found = true;
                break;
              }
            }
          }
          if (found) break;
        }
      }
    }
  }

  // Trier les résultats: groupes familiaux d'abord, puis profils multi-mémoriaux
  results.sort((a, b) => {
    if (a.type === "family_group" && b.type === "multi_memorial") return -1;
    if (a.type === "multi_memorial" && b.type === "family_group") return 1;
    return 0;
  });

  return results;
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

// Skeleton pour les résultats de recherche
const SearchResultSkeleton = () => (
  <div className="space-y-6">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="overflow-hidden">
        <CardHeader className="pb-3 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-16 rounded-sm" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[1, 2].map((j) => (
            <div key={j} className="flex items-center gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    ))}
  </div>
);

const SEARCH_ITEMS_PER_PAGE = 10;

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);
  const [resultsPage, setResultsPage] = useState(1);
  const { memorials, loading: memorialsLoading } = useMemorialsWithGuestbook();
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const currentUserName = profile?.display_name || user?.email?.split("@")[0];

  // Debounce la saisie — 300ms, minimum 2 caractères
  const debouncedInput = useDebounce(searchInput, 300);

  // Synchroniser le debounce avec les URL params (sans flash)
  useEffect(() => {
    const trimmed = debouncedInput.trim();
    if (trimmed.length >= 2) {
      setSearchParams({ q: trimmed }, { replace: true });
    } else if (trimmed.length === 0 && query) {
      setSearchParams({}, { replace: true });
    }
  }, [debouncedInput]);

  // Synchroniser l'input si on arrive avec un ?q= dans l'URL
  useEffect(() => {
    if (query && !searchInput) {
      setSearchInput(query);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed.length >= 2) {
      setSearchParams({ q: trimmed });
    }
  };

  // Recherche avec groupement familial
  const searchResults = useMemo(
    () => query && query.length >= 2 ? searchWithFamilyGrouping(query, memorials, currentUserName) : [],
    [query, memorials, currentUserName]
  );

  // Keep Previous Data : garder les anciens résultats tant que les nouveaux ne sont pas prêts
  const previousResultsRef = useRef<SearchResultItem[]>([]);
  const isSearching = debouncedInput.trim() !== query && searchInput.trim().length >= 2;

  // Mettre à jour les résultats précédents seulement quand on a de vrais résultats
  useEffect(() => {
    if (searchResults.length > 0) {
      previousResultsRef.current = searchResults;
    }
  }, [searchResults]);

  // Résultats à afficher : nouveaux si disponibles, sinon les précédents pendant la transition
  const displayResults = searchResults.length > 0 
    ? searchResults 
    : (isSearching && previousResultsRef.current.length > 0 
        ? previousResultsRef.current 
        : searchResults);

  // Comptage
  const totalGroups = displayResults.filter(r => r.type === "family_group").length;
  const totalProfiles = displayResults.filter(r => r.type === "multi_memorial").length;

  // Pagination des résultats
  const totalResultPages = Math.ceil(displayResults.length / SEARCH_ITEMS_PER_PAGE);
  const paginatedResults = useMemo(() => {
    const start = (resultsPage - 1) * SEARCH_ITEMS_PER_PAGE;
    return displayResults.slice(start, start + SEARCH_ITEMS_PER_PAGE);
  }, [displayResults, resultsPage]);

  // Reset page when query changes
  useEffect(() => {
    setResultsPage(1);
  }, [query]);

  // Message d'aide pour les requêtes trop courtes
  const isTooShort = searchInput.trim().length > 0 && searchInput.trim().length < 2;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20 pb-24 md:pb-12">
        <div className="max-w-3xl mx-auto px-4">
          {/* Header de la page */}
          <div className="mb-8">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </Link>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-2xl text-foreground">
                  Recherche
                </h1>
                <p className="text-muted-foreground font-sans text-sm">
                  Trouvez un défunt ou un proche
                </p>
              </div>
            </div>

            {/* Formulaire de recherche */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nom du défunt ou d'un proche (min. 2 caractères)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 h-12 text-base bg-background border-border"
                  autoFocus
                />
                {/* Indicateur de recherche en cours */}
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                )}
              </div>
              <Button type="submit" className="h-12 px-6">
                Rechercher
              </Button>
            </form>

            {/* Avertissement: saisie trop courte */}
            {isTooShort && (
              <p className="text-xs text-muted-foreground font-sans mt-2">
                Saisissez au moins 2 caractères pour lancer la recherche.
              </p>
            )}

            {/* Barre de progression discrète pendant la transition */}
            {isSearching && (
              <div className="mt-2">
                <Progress value={undefined} className="h-1 w-full [&>div]:animate-pulse" />
              </div>
            )}
          </div>

          {/* Chargement initial des données */}
          {memorialsLoading && query && (
            <SearchResultSkeleton />
          )}

          {/* Pas de recherche */}
          {!query && !isTooShort && (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground font-sans">
                Entrez un nom pour lancer la recherche
              </p>
            </div>
          )}

          {/* Résultats de recherche */}
          {query && !memorialsLoading && (
            <div className="mb-4">
              <p className="text-muted-foreground font-sans text-sm">
                {totalGroups > 0 && `${totalGroups} famille${totalGroups > 1 ? "s" : ""}`}
                {totalGroups > 0 && totalProfiles > 0 && " • "}
                {totalProfiles > 0 && `${totalProfiles} profil${totalProfiles > 1 ? "s" : ""} multi-mémorial`}
                {totalGroups === 0 && totalProfiles === 0 && !isSearching && "Aucun résultat"}
                {" "}pour "{query}"
                {isSearching && (
                  <span className="text-xs text-muted-foreground/70 ml-2">(mise à jour…)</span>
                )}
              </p>
            </div>
          )}

          {/* Aucun résultat */}
          {query && !memorialsLoading && displayResults.length === 0 && !isSearching && (
            <div className="text-center py-16">
              <p className="text-muted-foreground font-sans text-lg mb-2">
                Aucun résultat pour "{query}"
              </p>
              <p className="text-muted-foreground/70 font-sans text-sm">
                Essayez avec un autre nom ou prénom
              </p>
            </div>
          )}

          {/* Résultats groupés — avec opacité réduite pendant la transition */}
          {query && !memorialsLoading && displayResults.length > 0 && (
            <>
              <div className={`space-y-6 transition-opacity duration-200 ${isSearching ? 'opacity-60' : 'opacity-100'}`}>
                {paginatedResults.map((result, index) => {
                  if (result.type === "family_group") {
                    return (
                      <FamilyGroupCard 
                        key={`family-${result.data.memorialId}`} 
                        group={result.data}
                        isLoggedIn={!!user}
                      />
                    );
                  } else {
                    return (
                      <MultiMemorialCard 
                        key={`multi-${result.data.normalizedName}`} 
                        profile={result.data}
                        isLoggedIn={!!user}
                      />
                    );
                  }
                })}
              </div>

              {totalResultPages > 1 && (
                <MemorialPagination
                  currentPage={resultsPage}
                  totalPages={totalResultPages}
                  onPageChange={setResultsPage}
                />
              )}
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

// ============================================================================
// COMPOSANT: CARTE GROUPE FAMILIAL
// ============================================================================

interface FamilyGroupCardProps {
  group: FamilyGroup;
  isLoggedIn: boolean;
}

const FamilyGroupCard = ({ group, isLoggedIn }: FamilyGroupCardProps) => {
  const groupUrl = group.memorialShareToken ? `/m/${group.memorialShareToken}` : `/memorial/${group.memorialSlug}`;
  return (
    <Card className="overflow-hidden">
      {/* Header du groupe = Mémorial pivot */}
      <CardHeader className="pb-3 bg-muted/30 border-b border-border">
        <Link 
          to={groupUrl}
          className="flex items-center gap-4 group"
        >
          <div className="w-14 h-16 overflow-hidden rounded-sm bg-muted shrink-0">
            {group.deceasedPhoto ? (
              <img
                src={getOptimizedImageUrl(group.deceasedPhoto, { width: 56, height: 64 })}
                srcSet={getOptimizedSrcSet(group.deceasedPhoto, { width: 56, height: 64 })}
                alt=""
                width={56}
                height={64}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-serif text-lg text-muted-foreground">
                  {group.deceasedName.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="font-serif text-xl group-hover:text-primary transition-colors">
              Famille de {group.deceasedName}
            </CardTitle>
            <p className="text-sm text-muted-foreground font-sans mt-1">
              {group.members.length} proche{group.members.length > 1 ? "s" : ""} trouvé{group.members.length > 1 ? "s" : ""}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </CardHeader>

      {/* Liste des membres */}
      {group.members.length > 0 && (
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {group.members.map((member) => (
              <div key={member.normalizedName} className="p-4">
                {/* Nom et relation */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-lg text-foreground">
                      {member.displayName}
                    </span>
                    <span className={`text-sm font-sans ${getRelationColorClass(member.relation)}`}>
                      {getRelationWithDeceased(member.relation, inferGender(group.deceasedName.split(" ")[0]))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
                    {member.isCreator && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">Créateur</span>}
                    {member.guestbookCount > 0 && <span>{member.guestbookCount} hommage{member.guestbookCount > 1 ? "s" : ""}</span>}
                  </div>
                </div>

                {/* Lien avec l'utilisateur (prioritaire, en gras) */}
                {member.userConnection && isLoggedIn && (
                  <div className="mb-2">
                    <span className={`font-semibold font-sans ${member.userConnection.colorClass || 'text-foreground'}`}>
                      {member.userConnection.label}
                    </span>
                  </div>
                )}

                {/* Liens croisés avec les autres membres */}
                {member.crossLinks.length > 0 && (
                  <div className="text-sm text-muted-foreground font-sans space-y-1 mt-2">
                    {member.crossLinks.slice(0, 3).map((link, idx) => (
                      <p key={idx} className="text-xs">
                        <span className={link.confidence === "high" ? "text-foreground" : "text-muted-foreground"}>
                          {link.label}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// ============================================================================
// COMPOSANT: CARTE PROFIL MULTI-MÉMORIAL
// ============================================================================

interface MultiMemorialCardProps {
  profile: MultiMemorialProfile;
  isLoggedIn: boolean;
}

const MultiMemorialCard = ({ profile, isLoggedIn }: MultiMemorialCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-16 overflow-hidden rounded-sm bg-muted shrink-0 flex items-center justify-center">
            {profile.mainPhoto ? (
              <img
                src={getOptimizedImageUrl(profile.mainPhoto, { width: 56, height: 64 })}
                srcSet={getOptimizedSrcSet(profile.mainPhoto, { width: 56, height: 64 })}
                alt=""
                width={56}
                height={64}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-serif text-lg text-muted-foreground">
                {profile.displayName.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="font-serif text-xl flex items-center gap-2 flex-wrap">
              {profile.displayName}
              <span className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs font-sans rounded">
                Profil Multi-Mémorial
              </span>
            </CardTitle>
            
            {/* Meilleur lien avec l'utilisateur */}
            {profile.bestUserConnection && isLoggedIn && (
              <p className={`font-semibold font-sans mt-1 ${profile.bestUserConnection.colorClass || 'text-foreground'}`}>
                {profile.bestUserConnection.label}
                <span className="text-xs text-muted-foreground ml-2">
                  (via {profile.bestUserConnection.memorialName})
                </span>
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground font-sans mb-3">
          Intervient sur les mémoriaux de :
        </p>
        <div className="space-y-2">
          {profile.memorialActivities.map((activity) => (
            <Link
              key={activity.memorialId}
              to={activity.memorialShareToken ? `/m/${activity.memorialShareToken}` : `/memorial/${activity.memorialSlug}`}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors group"
            >
              <div className="w-10 h-12 overflow-hidden rounded-sm bg-muted shrink-0">
                {activity.photo && (
                  <img
                    src={getOptimizedImageUrl(activity.photo, { width: 40, height: 48 })}
                    srcSet={getOptimizedSrcSet(activity.photo, { width: 40, height: 48 })}
                    alt=""
                    width={40}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-foreground group-hover:text-primary transition-colors truncate">
                  {activity.memorialName}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
                  <span className={getRelationColorClass(activity.relation)}>
                    {getRelationWithDeceased(activity.relation, inferGender(activity.memorialName.split(" ")[0]))}
                  </span>
                  {activity.isCreator && <span className="text-primary">• Créateur</span>}
                  {activity.guestbookCount > 0 && <span>• {activity.guestbookCount} hommage{activity.guestbookCount > 1 ? "s" : ""}</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchPage;
