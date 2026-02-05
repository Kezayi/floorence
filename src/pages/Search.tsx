import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useMemorials } from "@/contexts/MemorialsContext";
import { useAuth } from "@/contexts/AuthContext";
import { searchMemorialsAndAuthors, SearchableMemorial } from "@/lib/searchWithRelations";
import { getCleanRelationName, getRelationWithDeceased, inferUserToPersonRelation, UserRelationResult } from "@/lib/relationshipInference";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { User, Heart, BookOpen, Link2, ChevronRight, FileText, Users, ArrowLeft, Search, GitBranch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RelationshipGraphSearch from "@/components/search/RelationshipGraphSearch";
// Types pour la désambiguïsation
interface PersonMatch {
  id: string;
  name: string;
  type: "deceased" | "author";
  memorialId: string;
  memorialSlug: string;
  memorialName: string;
  photo?: string;
  relation?: string;
}

// Types pour organiser les résultats
interface AuthorPublications {
  memorialId: string;
  memorialName: string;
  memorialSlug: string;
  photo?: string;
  relation: string;
}

interface AuthorGuestbookEntry {
  memorialId: string;
  memorialName: string;
  memorialSlug: string;
  photo?: string;
  relationCategory: string;
  content: string;
}

interface OrganizedResults {
  isDeceased: boolean;
  deceasedMemorial?: {
    id: string;
    name: string;
    slug: string;
    photo?: string;
  };
  authorName: string;
  publications: AuthorPublications[];
  guestbookEntries: AuthorGuestbookEntry[];
  connectionWithUser?: {
    type: "direct" | "indirect" | "none";
    description: string;
    inferredLabel?: string;
    colorClass?: string;
    confidence?: "high" | "medium" | "low";
    via?: string;
    // Données pour le graphe
    userRelation?: string;
    personRelation?: string;
    deceasedName?: string;
  };
}

// Trouve toutes les personnes correspondant à la recherche (dédoublonnées)
const findAllMatchingPersons = (
  query: string,
  memorials: SearchableMemorial[]
): PersonMatch[] => {
  const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Group by normalized name to deduplicate
  const personsByName = new Map<string, PersonMatch>();

  for (const memorial of memorials) {
    const memorialNameNormalized = memorial.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Check deceased
    if (memorialNameNormalized.includes(normalizedQuery)) {
      const key = `deceased-${memorialNameNormalized}`;
      if (!personsByName.has(key)) {
        personsByName.set(key, {
          id: memorial.id,
          name: memorial.name,
          type: "deceased",
          memorialId: memorial.id,
          memorialSlug: memorial.slug,
          memorialName: memorial.name,
          photo: memorial.photos[0],
        });
      }
    }

    // Check memorial author
    const authorNameNormalized = memorial.author.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (authorNameNormalized.includes(normalizedQuery)) {
      const key = `author-${authorNameNormalized}`;
      // If already exists, keep the first one (or update with better data)
      if (!personsByName.has(key)) {
        personsByName.set(key, {
          id: memorial.author.id,
          name: memorial.author.name,
          type: "author",
          memorialId: memorial.id,
          memorialSlug: memorial.slug,
          memorialName: memorial.name,
          photo: memorial.photos[0],
          relation: memorial.author.relation,
        });
      }
    }

    // Check guestbook messages
    for (const message of memorial.guestbookMessages) {
      const msgAuthorNormalized = message.authorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (msgAuthorNormalized.includes(normalizedQuery)) {
        const key = `author-${msgAuthorNormalized}`;
        // Only add if not already present (deduplicate by normalized name)
        if (!personsByName.has(key)) {
          personsByName.set(key, {
            id: message.id,
            name: message.authorName,
            type: "author",
            memorialId: memorial.id,
            memorialSlug: memorial.slug,
            memorialName: memorial.name,
            photo: memorial.photos[0],
            relation: message.relationCategory,
          });
        }
      }
    }
  }

  return Array.from(personsByName.values());
};

const organizeResultsForPerson = (
  person: PersonMatch,
  memorials: SearchableMemorial[],
  currentUserName?: string,
  userRelation?: string // La relation de l'utilisateur avec un défunt (si connue)
): OrganizedResults => {
  const publications: AuthorPublications[] = [];
  const guestbookEntries: AuthorGuestbookEntry[] = [];
  
  if (person.type === "deceased") {
    return {
      isDeceased: true,
      deceasedMemorial: {
        id: person.memorialId,
        name: person.name,
        slug: person.memorialSlug,
        photo: person.photo,
      },
      authorName: person.name,
      publications: [],
      guestbookEntries: [],
    };
  }

  const personNameNormalized = person.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const memorial of memorials) {
    const authorNameNormalized = memorial.author.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (authorNameNormalized === personNameNormalized) {
      publications.push({
        memorialId: memorial.id,
        memorialName: memorial.name,
        memorialSlug: memorial.slug,
        photo: memorial.photos[0],
        relation: memorial.author.relation,
      });
    }

    for (const message of memorial.guestbookMessages) {
      const msgAuthorNormalized = message.authorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (msgAuthorNormalized === personNameNormalized) {
        guestbookEntries.push({
          memorialId: memorial.id,
          memorialName: memorial.name,
          memorialSlug: memorial.slug,
          photo: memorial.photos[0],
          relationCategory: message.relationCategory,
          content: message.content,
        });
      }
    }
  }

  let connectionWithUser: OrganizedResults["connectionWithUser"];
  
  if (currentUserName) {
    const userNameNormalized = currentUserName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    for (const memorial of memorials) {
      const allContributors = [
        { name: memorial.author.name, relation: memorial.author.relation },
        ...memorial.guestbookMessages.map(m => ({ name: m.authorName, relation: m.relationCategory }))
      ];
      
      const personContrib = allContributors.find(c => 
        c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === personNameNormalized
      );
      
      const userContrib = allContributors.find(c =>
        c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(userNameNormalized)
      );

      if (personContrib && userContrib) {
        // Utiliser le nouveau moteur d'inférence vectorielle
        const inferredRelation = inferUserToPersonRelation(userContrib.relation, personContrib.relation);
        
        if (inferredRelation) {
          connectionWithUser = {
            type: "direct",
            description: `Via le mémorial de ${memorial.name}`,
            inferredLabel: inferredRelation.label,
            colorClass: inferredRelation.colorClass,
            confidence: inferredRelation.confidence,
            via: memorial.name,
            // Données pour le graphe
            userRelation: userContrib.relation,
            personRelation: personContrib.relation,
            deceasedName: memorial.name,
          };
        } else {
          connectionWithUser = {
            type: "indirect",
            description: `Vous êtes ${getCleanRelationName(userContrib.relation)} et ${person.name} est ${getCleanRelationName(personContrib.relation)} de ${memorial.name}`,
            via: memorial.name,
            // Données pour le graphe même sans inférence directe
            userRelation: userContrib.relation,
            personRelation: personContrib.relation,
            deceasedName: memorial.name,
          };
        }
        break;
      }
    }

    if (!connectionWithUser) {
      connectionWithUser = {
        type: "none",
        description: "Aucun lien trouvé dans les mémoriaux partagés",
      };
    }
  }

  return {
    isDeceased: false,
    authorName: person.name,
    publications,
    guestbookEntries,
    connectionWithUser,
  };
};

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);
  const { memorials } = useMemorials();
  const { user } = useAuth();
  const [selectedPerson, setSelectedPerson] = useState<PersonMatch | null>(null);
  
  const currentUserName = user?.email?.split("@")[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
      setSelectedPerson(null);
    }
  };

  const results = useMemo(
    () => query ? searchMemorialsAndAuthors(query, memorials) : [],
    [query, memorials]
  );

  const matchingPersons = useMemo(
    () => query ? findAllMatchingPersons(query, memorials) : [],
    [query, memorials]
  );

  const organized = useMemo(
    () => selectedPerson ? organizeResultsForPerson(selectedPerson, memorials, currentUserName) : null,
    [selectedPerson, memorials, currentUserName]
  );

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
                {results.length} résultat{results.length > 1 ? "s" : ""} pour "{query}"
              </p>
            </div>
          )}

          {/* Aucun résultat */}
          {query && results.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground font-sans text-lg mb-2">
                Aucun résultat pour "{query}"
              </p>
              <p className="text-muted-foreground/70 font-sans text-sm">
                Essayez avec un autre nom ou prénom
              </p>
            </div>
          )}

          {/* Liste de désambiguïsation */}
          {query && matchingPersons.length > 1 && !selectedPerson && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Users className="w-4 h-4" />
                  <h2 className="font-serif text-lg text-foreground">
                    Plusieurs personnes trouvées
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground font-sans">
                  Sélectionnez la personne recherchée
                </p>
              </div>
              
              <div className="divide-y divide-border">
                {matchingPersons.map((person) => (
                  <button
                    key={`${person.type}-${person.id}`}
                    onClick={() => setSelectedPerson(person)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="w-14 h-16 overflow-hidden rounded-sm bg-muted shrink-0 flex items-center justify-center">
                      {person.photo ? (
                        <img
                          src={person.photo}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-serif text-lg text-muted-foreground">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                          {person.name}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-sans rounded ${
                          person.type === "deceased" 
                            ? "bg-primary/10 text-primary" 
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {person.type === "deceased" ? "Défunt" : "Témoin"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground font-sans truncate">
                        {person.type === "deceased" 
                          ? "Espace mémorial" 
                          : `${getCleanRelationName(person.relation || "")} de ${person.memorialName}`
                        }
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Détails d'une personne */}
          {query && results.length > 0 && (matchingPersons.length === 1 || selectedPerson) && (
            <PersonDetails
              person={selectedPerson || matchingPersons[0]}
              organized={organized || organizeResultsForPerson(selectedPerson || matchingPersons[0], memorials, currentUserName)}
              user={user}
              showBackButton={matchingPersons.length > 1}
              onBack={() => setSelectedPerson(null)}
            />
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

interface PersonDetailsProps {
  person: PersonMatch;
  organized: OrganizedResults;
  user: any;
  showBackButton: boolean;
  onBack: () => void;
}

const PersonDetails = ({ person, organized, user, showBackButton, onBack }: PersonDetailsProps) => {
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
            {person.photo ? (
              <img
                src={person.photo}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-serif text-2xl text-muted-foreground">
                {organized.authorName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h2 className="font-serif text-2xl text-foreground">
              {organized.authorName}
            </h2>
            <span className={`inline-block mt-1 px-3 py-1 text-sm font-sans rounded ${
              person.type === "deceased" 
                ? "bg-primary/10 text-primary" 
                : "bg-secondary text-muted-foreground"
            }`}>
              {person.type === "deceased" ? "Défunt" : "Témoin"}
            </span>
          </div>
        </div>
      </div>

      {/* Espace mémorial (si défunt) */}
      {organized.isDeceased && organized.deceasedMemorial && (
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
            to={`/memorial/${organized.deceasedMemorial.slug}`}
            className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group"
          >
            <div className="w-16 h-20 overflow-hidden rounded-sm bg-muted shrink-0">
              {organized.deceasedMemorial.photo && (
                <img
                  src={organized.deceasedMemorial.photo}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-xl text-foreground group-hover:text-primary transition-colors">
                {organized.deceasedMemorial.name}
              </p>
              <p className="text-sm text-muted-foreground font-sans mt-1">
                Accéder à l'espace mémorial
              </p>
            </div>
            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </div>
      )}

      {/* Publications */}
      {organized.publications.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-4 h-4" />
              <h3 className="font-sans text-sm font-medium uppercase tracking-wide">
                Publications ({organized.publications.length})
              </h3>
            </div>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              Espaces mémoriels créés par {organized.authorName}
            </p>
          </div>
          <div className="divide-y divide-border">
            {organized.publications.map((pub) => (
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
      {organized.guestbookEntries.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="w-4 h-4" />
              <h3 className="font-sans text-sm font-medium uppercase tracking-wide">
                Messages Livre d'Or ({organized.guestbookEntries.length})
              </h3>
            </div>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              Contributions de {organized.authorName} aux livres d'or
            </p>
          </div>
          <div className="divide-y divide-border">
            {organized.guestbookEntries.map((entry, idx) => (
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
      {!organized.isDeceased && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 text-primary">
              <GitBranch className="w-4 h-4" />
              <h3 className="font-sans text-sm font-medium uppercase tracking-wide">
                Votre lien avec {organized.authorName}
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
            ) : organized.connectionWithUser && (organized.connectionWithUser.type === "direct" || organized.connectionWithUser.type === "indirect") ? (
              <div className="space-y-4">
                {/* Visualisation graphique */}
                {organized.connectionWithUser.userRelation && organized.connectionWithUser.personRelation && organized.connectionWithUser.deceasedName && (
                  <div className="bg-muted/30 rounded-sm p-4">
                    <RelationshipGraphSearch
                      userName="Vous"
                      userRelation={organized.connectionWithUser.userRelation}
                      personName={organized.authorName}
                      personRelation={organized.connectionWithUser.personRelation}
                      deceasedName={organized.connectionWithUser.deceasedName}
                      inferredRelation={organized.connectionWithUser.inferredLabel ? {
                        label: organized.connectionWithUser.inferredLabel,
                        confidence: organized.connectionWithUser.confidence || "medium",
                        colorClass: organized.connectionWithUser.colorClass || "text-foreground",
                      } : undefined}
                    />
                  </div>
                )}

                {/* Badge et description */}
                <div className={`p-4 rounded-sm ${
                  organized.connectionWithUser.type === "direct"
                    ? "bg-green-500/10 border border-green-500/20" 
                    : "bg-amber-500/10 border border-amber-500/20"
                }`}>
                  {organized.connectionWithUser.type === "direct" && organized.connectionWithUser.inferredLabel ? (
                    <>
                      <p className={`font-serif text-xl ${organized.connectionWithUser.colorClass || 'text-foreground'}`}>
                        {organized.connectionWithUser.inferredLabel}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-sans ${
                          organized.connectionWithUser.confidence === "high" 
                            ? "bg-green-100 text-green-800"
                            : organized.connectionWithUser.confidence === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {organized.connectionWithUser.confidence === "high" ? "Lien direct" : organized.connectionWithUser.confidence === "medium" ? "Lien probable" : "Lien indirect"}
                        </span>
                      </div>
                      {organized.connectionWithUser.via && (
                        <p className="text-sm text-muted-foreground mt-2 font-sans">
                          {organized.connectionWithUser.description}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-sans text-foreground">
                        {organized.connectionWithUser.description}
                      </p>
                      {organized.connectionWithUser.via && (
                        <p className="text-sm text-muted-foreground mt-2 font-sans">
                          Via le mémorial de {organized.connectionWithUser.via}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : organized.connectionWithUser?.type === "none" ? (
              <div className="bg-muted/50 p-4 rounded-sm">
                <p className="text-muted-foreground font-sans">
                  {organized.connectionWithUser.description}
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
