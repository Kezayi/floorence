import { Link } from "react-router-dom";
import { SearchResult, SearchableMemorial } from "@/lib/searchWithRelations";
import { User, Heart, BookOpen, Link2, ChevronRight, FileText, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  memorials: SearchableMemorial[];
  onClose: () => void;
}

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
    via?: string;
  };
}

// Trouve toutes les personnes correspondant à la recherche
const findAllMatchingPersons = (
  query: string,
  memorials: SearchableMemorial[]
): PersonMatch[] => {
  const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matches: PersonMatch[] = [];
  const seen = new Set<string>();

  for (const memorial of memorials) {
    const memorialNameNormalized = memorial.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Défunts
    if (memorialNameNormalized.includes(normalizedQuery)) {
      const key = `deceased-${memorial.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({
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

    // Auteur du mémorial
    const authorNameNormalized = memorial.author.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (authorNameNormalized.includes(normalizedQuery)) {
      const key = `author-${memorial.author.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({
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

    // Auteurs du livre d'or
    for (const message of memorial.guestbookMessages) {
      const msgAuthorNormalized = message.authorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (msgAuthorNormalized.includes(normalizedQuery)) {
        const key = `guestbook-${message.authorName}-${memorial.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({
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

  return matches;
};

const organizeResultsForPerson = (
  person: PersonMatch,
  memorials: SearchableMemorial[],
  currentUserName?: string
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

  // Pour un auteur, chercher toutes ses contributions
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

  // Calculer le lien avec l'utilisateur connecté
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
        connectionWithUser = {
          type: "indirect",
          description: `Vous êtes ${userContrib.relation} et ${person.name} est ${personContrib.relation} de ${memorial.name}`,
          via: memorial.name,
        };
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

const SearchResults = ({ results, query, memorials, onClose }: SearchResultsProps) => {
  const { user } = useAuth();
  const [selectedPerson, setSelectedPerson] = useState<PersonMatch | null>(null);
  
  const currentUserName = user?.email?.split("@")[0];

  const matchingPersons = useMemo(
    () => findAllMatchingPersons(query, memorials),
    [query, memorials]
  );

  const organized = useMemo(
    () => selectedPerson ? organizeResultsForPerson(selectedPerson, memorials, currentUserName) : null,
    [selectedPerson, memorials, currentUserName]
  );

  if (results.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground font-sans">
          Aucun résultat pour "{query}"
        </p>
      </div>
    );
  }

  // Si plusieurs personnes correspondent, afficher la liste de désambiguïsation
  if (matchingPersons.length > 1 && !selectedPerson) {
    return (
      <div className="max-h-[70vh] overflow-y-auto">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Users className="w-4 h-4" />
            <h3 className="font-serif text-lg text-foreground">
              Plusieurs résultats pour "{query}"
            </h3>
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
              <div className="w-12 h-14 overflow-hidden rounded-sm bg-muted shrink-0">
                {person.photo && (
                  <img
                    src={person.photo}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-serif text-foreground group-hover:text-primary transition-colors">
                    {person.name}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-sans rounded ${
                    person.type === "deceased" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {person.type === "deceased" ? "Défunt" : "Auteur"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-sans truncate">
                  {person.type === "deceased" 
                    ? "Espace mémorial" 
                    : `${person.relation} de ${person.memorialName}`
                  }
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Si une seule personne ou une personne sélectionnée, afficher les détails
  const displayPerson = selectedPerson || matchingPersons[0];
  const displayOrganized = organized || organizeResultsForPerson(displayPerson, memorials, currentUserName);

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      {/* Header avec bouton retour si sélection */}
      <div className="p-4 border-b border-border bg-muted/30">
        {selectedPerson && matchingPersons.length > 1 && (
          <button
            onClick={() => setSelectedPerson(null)}
            className="text-sm text-primary hover:underline font-sans mb-2 flex items-center gap-1"
          >
            ← Retour aux résultats
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-10 h-12 overflow-hidden rounded-sm bg-muted shrink-0">
            {displayPerson.photo && (
              <img
                src={displayPerson.photo}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div>
            <h3 className="font-serif text-lg text-foreground">
              {displayOrganized.authorName}
            </h3>
            <span className={`inline-block px-2 py-0.5 text-xs font-sans rounded ${
              displayPerson.type === "deceased" 
                ? "bg-primary/10 text-primary" 
                : "bg-secondary text-muted-foreground"
            }`}>
              {displayPerson.type === "deceased" ? "Défunt" : "Auteur"}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Si c'est un défunt - afficher uniquement le mémorial */}
      {displayOrganized.isDeceased && displayOrganized.deceasedMemorial && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <Heart className="w-4 h-4" />
            <h4 className="font-sans text-sm font-medium uppercase tracking-wide">
              Espace Mémorial
            </h4>
          </div>
          <Link
            to={`/memorial/${displayOrganized.deceasedMemorial.slug}`}
            onClick={onClose}
            className="flex items-center gap-4 p-3 rounded-sm bg-secondary/50 hover:bg-secondary transition-colors group"
          >
            <div className="w-14 h-16 overflow-hidden rounded-sm bg-muted shrink-0">
              {displayOrganized.deceasedMemorial.photo && (
                <img
                  src={displayOrganized.deceasedMemorial.photo}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                {displayOrganized.deceasedMemorial.name}
              </p>
              <p className="text-sm text-muted-foreground font-sans">
                Accéder à l'espace mémorial
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </div>
      )}

      {/* 2. Publications (Mémoriaux créés par cette personne) */}
      {displayOrganized.publications.length > 0 && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <FileText className="w-4 h-4" />
            <h4 className="font-sans text-sm font-medium uppercase tracking-wide">
              Publications ({displayOrganized.publications.length})
            </h4>
          </div>
          <p className="text-xs text-muted-foreground font-sans mb-3">
            Espaces mémoriels créés par {displayOrganized.authorName}
          </p>
          <div className="space-y-2">
            {displayOrganized.publications.map((pub) => (
              <Link
                key={pub.memorialId}
                to={`/memorial/${pub.memorialSlug}`}
                onClick={onClose}
                className="flex items-center gap-3 p-2 rounded-sm hover:bg-muted/50 transition-colors group"
              >
                <div className="w-10 h-12 overflow-hidden rounded-sm bg-muted shrink-0">
                  {pub.photo && (
                    <img
                      src={pub.photo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-foreground group-hover:text-primary transition-colors truncate">
                    {pub.memorialName}
                  </p>
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-sans rounded">
                    {pub.relation}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 3. Messages dans le Livre d'Or */}
      {displayOrganized.guestbookEntries.length > 0 && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <BookOpen className="w-4 h-4" />
            <h4 className="font-sans text-sm font-medium uppercase tracking-wide">
              Messages Livre d'Or ({displayOrganized.guestbookEntries.length})
            </h4>
          </div>
          <p className="text-xs text-muted-foreground font-sans mb-3">
            Contributions de {displayOrganized.authorName} aux livres d'or
          </p>
          <div className="space-y-3">
            {displayOrganized.guestbookEntries.map((entry, idx) => (
              <Link
                key={`${entry.memorialId}-${idx}`}
                to={`/memorial/${entry.memorialSlug}`}
                onClick={onClose}
                className="block p-3 rounded-sm bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-primary" />
                  </div>
                  <span className="font-serif text-sm text-foreground group-hover:text-primary transition-colors">
                    {entry.memorialName}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs px-1.5 py-0.5 bg-secondary text-muted-foreground rounded font-sans">
                    {entry.relationCategory}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-serif italic line-clamp-2 ml-8">
                  "{entry.content}"
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 4. Lien avec l'utilisateur connecté */}
      {!displayOrganized.isDeceased && (
        <div className="p-4 bg-secondary/30">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <Link2 className="w-4 h-4" />
            <h4 className="font-sans text-sm font-medium uppercase tracking-wide">
              Votre lien avec {displayOrganized.authorName}
            </h4>
          </div>
          
          {!user ? (
            <div className="p-3 rounded-sm bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground font-sans">
                Connectez-vous pour voir vos liens avec cette personne
              </p>
              <Link
                to="/auth"
                onClick={onClose}
                className="inline-block mt-2 text-sm text-primary hover:underline font-sans"
              >
                Se connecter
              </Link>
            </div>
          ) : displayOrganized.connectionWithUser ? (
            <div className={`p-3 rounded-sm ${
              displayOrganized.connectionWithUser.type === "indirect" 
                ? "bg-green-500/10 border border-green-500/20" 
                : "bg-muted/50"
            }`}>
              {displayOrganized.connectionWithUser.type === "indirect" ? (
                <>
                  <p className="text-sm font-sans text-foreground">
                    {displayOrganized.connectionWithUser.description}
                  </p>
                  {displayOrganized.connectionWithUser.via && (
                    <p className="text-xs text-muted-foreground mt-1 font-sans">
                      Via le mémorial de {displayOrganized.connectionWithUser.via}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground font-sans">
                  {displayOrganized.connectionWithUser.description}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-sm bg-muted/50">
              <p className="text-sm text-muted-foreground font-sans">
                Complétez votre profil pour découvrir vos liens familiaux
              </p>
              <Link
                to="/account"
                onClick={onClose}
                className="inline-block mt-2 text-sm text-primary hover:underline font-sans"
              >
                Modifier mon profil
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
