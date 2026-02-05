import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useMemorials } from "@/contexts/MemorialsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { SearchableMemorial } from "@/lib/searchWithRelations";
import { getCleanRelationName, getRelationWithDeceased, inferUserToPersonRelation, UserRelationResult } from "@/lib/relationshipInference";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { User, Heart, BookOpen, ChevronRight, FileText, Users, ArrowLeft, Search, GitBranch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RelationshipGraphSearch from "@/components/search/RelationshipGraphSearch";

// ============================================================================
// TYPES
// ============================================================================

// Représente une personne avec toutes ses activités groupées
interface GroupedPerson {
  normalizedName: string;
  displayName: string;
  type: "deceased" | "author";
  // Pour les défunts
  deceasedMemorial?: {
    id: string;
    slug: string;
    name: string;
    photo?: string;
  };
  // Pour les auteurs (créateurs + contributeurs)
  createdMemorials: Array<{
    memorialId: string;
    memorialSlug: string;
    memorialName: string;
    photo?: string;
    relation: string;
  }>;
  guestbookEntries: Array<{
    memorialId: string;
    memorialSlug: string;
    memorialName: string;
    photo?: string;
    relationCategory: string;
    content: string;
  }>;
  // Photo principale
  mainPhoto?: string;
  // Lien inféré avec l'utilisateur connecté
  userConnection?: {
    type: "direct" | "indirect" | "none";
    inferredLabel?: string;
    colorClass?: string;
    confidence?: "high" | "medium" | "low";
    description: string;
    // Données pour le graphe
    userRelation?: string;
    personRelation?: string;
    deceasedName?: string;
  };
  // Score de tri (pour priorité par lien de parenté)
  sortScore: number;
}

// ============================================================================
// NORMALISATION
// ============================================================================

const normalizeString = (str: string): string => {
  return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
// MOTEUR DE RECHERCHE AVEC GROUPEMENT ET TRI
// ============================================================================

const searchAndGroupPersons = (
  query: string,
  memorials: SearchableMemorial[],
  currentUserName?: string
): GroupedPerson[] => {
  if (!query.trim()) return [];

  const normalizedQuery = normalizeString(query);
  const personsMap = new Map<string, GroupedPerson>();

  // Parcourir tous les mémoriaux
  for (const memorial of memorials) {
    const memorialNameNormalized = normalizeString(memorial.name);

    // 1. Chercher dans les défunts
    if (isFuzzyMatch(normalizedQuery, memorialNameNormalized)) {
      const key = `deceased-${memorialNameNormalized}`;
      if (!personsMap.has(key)) {
        personsMap.set(key, {
          normalizedName: memorialNameNormalized,
          displayName: memorial.name,
          type: "deceased",
          deceasedMemorial: {
            id: memorial.id,
            slug: memorial.slug,
            name: memorial.name,
            photo: memorial.photos[0],
          },
          createdMemorials: [],
          guestbookEntries: [],
          mainPhoto: memorial.photos[0],
          sortScore: 0,
        });
      }
    }

    // 2. Chercher dans les créateurs de mémoriaux
    const authorNameNormalized = normalizeString(memorial.author.name);
    if (isFuzzyMatch(normalizedQuery, authorNameNormalized)) {
      const key = `author-${authorNameNormalized}`;
      const existing = personsMap.get(key);
      
      if (existing) {
        // Ajouter ce mémorial à la liste des créations
        existing.createdMemorials.push({
          memorialId: memorial.id,
          memorialSlug: memorial.slug,
          memorialName: memorial.name,
          photo: memorial.photos[0],
          relation: memorial.author.relation,
        });
        if (!existing.mainPhoto && memorial.photos[0]) {
          existing.mainPhoto = memorial.photos[0];
        }
      } else {
        personsMap.set(key, {
          normalizedName: authorNameNormalized,
          displayName: memorial.author.name,
          type: "author",
          createdMemorials: [{
            memorialId: memorial.id,
            memorialSlug: memorial.slug,
            memorialName: memorial.name,
            photo: memorial.photos[0],
            relation: memorial.author.relation,
          }],
          guestbookEntries: [],
          mainPhoto: memorial.photos[0],
          sortScore: 0,
        });
      }
    }

    // 3. Chercher dans les contributeurs du livre d'or
    for (const message of memorial.guestbookMessages) {
      const msgAuthorNormalized = normalizeString(message.authorName);
      if (isFuzzyMatch(normalizedQuery, msgAuthorNormalized)) {
        const key = `author-${msgAuthorNormalized}`;
        const existing = personsMap.get(key);

        if (existing) {
          // Ajouter cette entrée au livre d'or
          existing.guestbookEntries.push({
            memorialId: memorial.id,
            memorialSlug: memorial.slug,
            memorialName: memorial.name,
            photo: memorial.photos[0],
            relationCategory: message.relationCategory,
            content: message.content,
          });
          if (!existing.mainPhoto && memorial.photos[0]) {
            existing.mainPhoto = memorial.photos[0];
          }
        } else {
          personsMap.set(key, {
            normalizedName: msgAuthorNormalized,
            displayName: message.authorName,
            type: "author",
            createdMemorials: [],
            guestbookEntries: [{
              memorialId: memorial.id,
              memorialSlug: memorial.slug,
              memorialName: memorial.name,
              photo: memorial.photos[0],
              relationCategory: message.relationCategory,
              content: message.content,
            }],
            mainPhoto: memorial.photos[0],
            sortScore: 0,
          });
        }
      }
    }
  }

  // Convertir en tableau et calculer les liens avec l'utilisateur
  let results = Array.from(personsMap.values());

  // Calculer le lien contextuel avec l'utilisateur connecté
  if (currentUserName) {
    const userNameNormalized = normalizeString(currentUserName);
    
    results = results.map(person => {
      if (person.type === "deceased") return person;

      // Récupérer toutes les relations de cette personne dans les mémoriaux
      const allPersonRelations: Array<{
        memorialId: string;
        memorialName: string;
        relation: string;
      }> = [
        ...person.createdMemorials.map(m => ({
          memorialId: m.memorialId,
          memorialName: m.memorialName,
          relation: m.relation,
        })),
        ...person.guestbookEntries.map(e => ({
          memorialId: e.memorialId,
          memorialName: e.memorialName,
          relation: e.relationCategory,
        })),
      ];

      // Chercher l'utilisateur dans les mêmes mémoriaux
      for (const personRel of allPersonRelations) {
        const memorial = memorials.find(m => m.id === personRel.memorialId);
        if (!memorial) continue;

        // Construire la liste des contributeurs de ce mémorial
        const allContributors = [
          { name: memorial.author.name, relation: memorial.author.relation },
          ...memorial.guestbookMessages.map(m => ({ name: m.authorName, relation: m.relationCategory }))
        ];

        // Chercher l'utilisateur dans les contributeurs (comparaison stricte normalisée)
        const userContrib = allContributors.find(c => {
          const contribNormalized = normalizeString(c.name);
          return contribNormalized === userNameNormalized || contribNormalized.includes(userNameNormalized);
        });

        if (userContrib) {
          // L'utilisateur et la personne sont tous les deux dans ce mémorial !
          const inferredRelation = inferUserToPersonRelation(userContrib.relation, personRel.relation);
          
          if (inferredRelation) {
            return {
              ...person,
              userConnection: {
                type: "direct" as const,
                inferredLabel: inferredRelation.label,
                colorClass: inferredRelation.colorClass,
                confidence: inferredRelation.confidence,
                description: `Via le mémorial de ${memorial.name}`,
                userRelation: userContrib.relation,
                personRelation: personRel.relation,
                deceasedName: memorial.name,
              },
              sortScore: inferredRelation.confidence === "high" ? 100 : inferredRelation.confidence === "medium" ? 50 : 25,
            };
          } else {
            return {
              ...person,
              userConnection: {
                type: "indirect" as const,
                description: `Vous êtes ${getCleanRelationName(userContrib.relation)} et ${person.displayName} est ${getCleanRelationName(personRel.relation)} de ${memorial.name}`,
                userRelation: userContrib.relation,
                personRelation: personRel.relation,
                deceasedName: memorial.name,
              },
              sortScore: 10,
            };
          }
        }
      }

      // Aucun lien trouvé
      return {
        ...person,
        userConnection: {
          type: "none" as const,
          description: "Aucun lien trouvé dans les mémoriaux partagés",
        },
        sortScore: 0,
      };
    });
  }

  // Trier : personnes avec lien de parenté en premier
  results.sort((a, b) => {
    // D'abord par score de lien (descendant)
    if (b.sortScore !== a.sortScore) {
      return b.sortScore - a.sortScore;
    }
    // Ensuite les défunts en premier
    if (a.type !== b.type) {
      return a.type === "deceased" ? -1 : 1;
    }
    // Puis par nombre d'activités (descendant)
    const aActivities = a.createdMemorials.length + a.guestbookEntries.length;
    const bActivities = b.createdMemorials.length + b.guestbookEntries.length;
    return bActivities - aActivities;
  });

  return results;
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);
  const { memorials } = useMemorials();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [selectedPerson, setSelectedPerson] = useState<GroupedPerson | null>(null);
  
  // Utiliser le display_name du profil si disponible, sinon fallback sur l'email
  const currentUserName = profile?.display_name || user?.email?.split("@")[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
      setSelectedPerson(null);
    }
  };

  // Recherche avec groupement et tri
  const groupedResults = useMemo(
    () => query ? searchAndGroupPersons(query, memorials, currentUserName) : [],
    [query, memorials, currentUserName]
  );

  // Comptage total pour l'affichage
  const totalCount = groupedResults.length;

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
                  placeholder="Nom du défunt ou d'un proche..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 h-12 text-base bg-background border-border"
                  autoFocus
                />
              </div>
              <Button type="submit" className="h-12 px-6">
                Rechercher
              </Button>
            </form>
          </div>

          {/* Pas de recherche */}
          {!query && (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground font-sans">
                Entrez un nom pour lancer la recherche
              </p>
            </div>
          )}

          {/* Résultats de recherche */}
          {query && (
            <div className="mb-4">
              <p className="text-muted-foreground font-sans text-sm">
                {totalCount} personne{totalCount > 1 ? "s" : ""} trouvée{totalCount > 1 ? "s" : ""} pour "{query}"
              </p>
            </div>
          )}

          {/* Aucun résultat */}
          {query && totalCount === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground font-sans text-lg mb-2">
                Aucun résultat pour "{query}"
              </p>
              <p className="text-muted-foreground/70 font-sans text-sm">
                Essayez avec un autre nom ou prénom
              </p>
            </div>
          )}

          {/* Liste des personnes groupées */}
          {query && totalCount > 0 && !selectedPerson && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="divide-y divide-border">
                {groupedResults.map((person) => (
                  <button
                    key={`${person.type}-${person.normalizedName}`}
                    onClick={() => setSelectedPerson(person)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="w-14 h-16 overflow-hidden rounded-sm bg-muted shrink-0 flex items-center justify-center">
                      {person.mainPhoto ? (
                        <img
                          src={person.mainPhoto}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-serif text-lg text-muted-foreground">
                          {person.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                          {person.displayName}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-sans rounded ${
                          person.type === "deceased" 
                            ? "bg-primary/10 text-primary" 
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {person.type === "deceased" ? "Défunt" : "Témoin"}
                        </span>
                        {/* Badge de lien inféré */}
                        {person.userConnection?.type === "direct" && person.userConnection.inferredLabel && (
                          <span className={`px-2 py-0.5 text-xs font-sans rounded bg-green-500/10 border border-green-500/20 ${person.userConnection.colorClass || 'text-foreground'}`}>
                            {person.userConnection.inferredLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-sans truncate">
                        {person.type === "deceased" 
                          ? "Espace mémorial" 
                          : `${person.createdMemorials.length > 0 ? `Créateur de ${person.createdMemorials.length} mémorial${person.createdMemorials.length > 1 ? 's' : ''}` : ''}${person.createdMemorials.length > 0 && person.guestbookEntries.length > 0 ? ' • ' : ''}${person.guestbookEntries.length > 0 ? `${person.guestbookEntries.length} hommage${person.guestbookEntries.length > 1 ? 's' : ''}` : ''}`
                        }
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Détails d'une personne sélectionnée */}
          {query && totalCount > 0 && selectedPerson && (
            <PersonDetails
              person={selectedPerson}
              user={user}
              showBackButton={true}
              onBack={() => setSelectedPerson(null)}
            />
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

// ============================================================================
// COMPOSANT DÉTAILS PERSONNE
// ============================================================================

interface PersonDetailsProps {
  person: GroupedPerson;
  user: any;
  showBackButton: boolean;
  onBack: () => void;
}

const PersonDetails = ({ person, user, showBackButton, onBack }: PersonDetailsProps) => {
  return (
    <div className="space-y-6">
      {/* Header avec infos de la personne */}
      <div className="bg-card border border-border rounded-lg p-6">
        {showBackButton && (
          <button
            onClick={onBack}
            className="text-sm text-primary hover:underline font-sans mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux résultats
          </button>
        )}
        <div className="flex items-center gap-4">
          <div className="w-16 h-20 overflow-hidden rounded-sm bg-muted shrink-0 flex items-center justify-center">
            {person.mainPhoto ? (
              <img
                src={person.mainPhoto}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-serif text-2xl text-muted-foreground">
                {person.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h2 className="font-serif text-2xl text-foreground">
              {person.displayName}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-block px-3 py-1 text-sm font-sans rounded ${
                person.type === "deceased" 
                  ? "bg-primary/10 text-primary" 
                  : "bg-secondary text-muted-foreground"
              }`}>
                {person.type === "deceased" ? "Défunt" : "Témoin"}
              </span>
              {/* Badge de lien inféré */}
              {person.userConnection?.type === "direct" && person.userConnection.inferredLabel && (
                <span className={`px-3 py-1 text-sm font-sans rounded bg-green-500/10 border border-green-500/20 ${person.userConnection.colorClass || 'text-foreground'}`}>
                  {person.userConnection.inferredLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Espace mémorial (si défunt) */}
      {person.type === "deceased" && person.deceasedMemorial && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 text-primary">
              <Heart className="w-4 h-4" />
              <h3 className="font-sans text-sm font-medium uppercase tracking-wide">
                Espace Mémorial
              </h3>
            </div>
          </div>
          <Link
            to={`/memorial/${person.deceasedMemorial.slug}`}
            className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group"
          >
            <div className="w-16 h-20 overflow-hidden rounded-sm bg-muted shrink-0">
              {person.deceasedMemorial.photo && (
                <img
                  src={person.deceasedMemorial.photo}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-xl text-foreground group-hover:text-primary transition-colors">
                {person.deceasedMemorial.name}
              </p>
              <p className="text-sm text-muted-foreground font-sans mt-1">
                Accéder à l'espace mémorial
              </p>
            </div>
            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </div>
      )}

      {/* Mémoriaux créés */}
      {person.createdMemorials.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-4 h-4" />
              <h3 className="font-sans text-sm font-medium uppercase tracking-wide">
                Mémoriaux créés ({person.createdMemorials.length})
              </h3>
            </div>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              Espaces mémoriels créés par {person.displayName}
            </p>
          </div>
          <div className="divide-y divide-border">
            {person.createdMemorials.map((pub) => (
              <Link
                key={pub.memorialId}
                to={`/memorial/${pub.memorialSlug}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group"
              >
                <div className="w-12 h-14 overflow-hidden rounded-sm bg-muted shrink-0">
                  {pub.photo && (
                    <img
                      src={pub.photo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-foreground group-hover:text-primary transition-colors">
                    {pub.memorialName}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-sans rounded">
                    {getRelationWithDeceased(pub.relation)}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Messages Livre d'Or */}
      {person.guestbookEntries.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="w-4 h-4" />
              <h3 className="font-sans text-sm font-medium uppercase tracking-wide">
                Messages Livre d'Or ({person.guestbookEntries.length})
              </h3>
            </div>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              Contributions de {person.displayName} aux livres d'or
            </p>
          </div>
          <div className="divide-y divide-border">
            {person.guestbookEntries.map((entry, idx) => (
              <Link
                key={`${entry.memorialId}-${idx}`}
                to={`/memorial/${entry.memorialSlug}`}
                className="block p-4 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-serif text-foreground group-hover:text-primary transition-colors">
                    {entry.memorialName}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs rounded font-sans">
                    {getRelationWithDeceased(entry.relationCategory)}
                  </span>
                </div>
                <p className="text-muted-foreground font-serif italic ml-10">
                  "{entry.content}"
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Lien avec l'utilisateur connecté */}
      {person.type !== "deceased" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 text-primary">
              <GitBranch className="w-4 h-4" />
              <h3 className="font-sans text-sm font-medium uppercase tracking-wide">
                Votre lien avec {person.displayName}
              </h3>
            </div>
          </div>
          <div className="p-4">
            {!user ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground font-sans mb-3">
                  Connectez-vous pour voir vos liens avec cette personne
                </p>
                <Link
                  to="/auth"
                  className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-sm font-sans text-sm hover:bg-primary/90 transition-colors"
                >
                  Se connecter
                </Link>
              </div>
            ) : person.userConnection && (person.userConnection.type === "direct" || person.userConnection.type === "indirect") ? (
              <div className="space-y-4">
                {/* Visualisation graphique */}
                {person.userConnection.userRelation && person.userConnection.personRelation && person.userConnection.deceasedName && (
                  <div className="bg-muted/30 rounded-sm p-4">
                    <RelationshipGraphSearch
                      userName="Vous"
                      userRelation={person.userConnection.userRelation}
                      personName={person.displayName}
                      personRelation={person.userConnection.personRelation}
                      deceasedName={person.userConnection.deceasedName}
                      inferredRelation={person.userConnection.inferredLabel ? {
                        label: person.userConnection.inferredLabel,
                        confidence: person.userConnection.confidence || "medium",
                        colorClass: person.userConnection.colorClass || "text-foreground",
                      } : undefined}
                    />
                  </div>
                )}

                {/* Badge et description */}
                <div className={`p-4 rounded-sm ${
                  person.userConnection.type === "direct"
                    ? "bg-green-500/10 border border-green-500/20" 
                    : "bg-amber-500/10 border border-amber-500/20"
                }`}>
                  {person.userConnection.type === "direct" && person.userConnection.inferredLabel ? (
                    <>
                      <p className={`font-serif text-xl ${person.userConnection.colorClass || 'text-foreground'}`}>
                        {person.userConnection.inferredLabel}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-sans ${
                          person.userConnection.confidence === "high" 
                            ? "bg-green-100 text-green-800"
                            : person.userConnection.confidence === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {person.userConnection.confidence === "high" ? "Lien direct" : person.userConnection.confidence === "medium" ? "Lien probable" : "Lien indirect"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 font-sans">
                        {person.userConnection.description}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-sans text-foreground">
                        {person.userConnection.description}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : person.userConnection?.type === "none" ? (
              <div className="bg-muted/50 p-4 rounded-sm">
                <p className="text-muted-foreground font-sans">
                  {person.userConnection.description}
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground font-sans mb-3">
                  Complétez votre profil pour découvrir vos liens familiaux
                </p>
                <Link
                  to="/account"
                  className="inline-block px-4 py-2 bg-secondary text-foreground rounded-sm font-sans text-sm hover:bg-secondary/80 transition-colors"
                >
                  Modifier mon profil
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
