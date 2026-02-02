import { Link } from "react-router-dom";
import { SearchResult, SearchableMemorial } from "@/lib/searchWithRelations";
import { User, Heart, BookOpen, Link2, ChevronRight, FileText } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  memorials: SearchableMemorial[];
  onClose: () => void;
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
  // Si la personne recherchée est un défunt
  isDeceased: boolean;
  deceasedMemorial?: {
    id: string;
    name: string;
    slug: string;
    photo?: string;
  };
  // Si la personne recherchée est un auteur
  authorName: string;
  publications: AuthorPublications[];
  guestbookEntries: AuthorGuestbookEntry[];
  // Lien avec l'utilisateur connecté
  connectionWithUser?: {
    type: "direct" | "indirect" | "none";
    description: string;
    via?: string;
  };
}

const organizeResultsByPerson = (
  query: string,
  memorials: SearchableMemorial[],
  currentUserName?: string
): OrganizedResults => {
  const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const publications: AuthorPublications[] = [];
  const guestbookEntries: AuthorGuestbookEntry[] = [];
  let authorName = query;
  let isDeceased = false;
  let deceasedMemorial: OrganizedResults["deceasedMemorial"];

  for (const memorial of memorials) {
    const memorialNameNormalized = memorial.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Vérifier si la recherche correspond à un défunt
    if (memorialNameNormalized.includes(normalizedQuery)) {
      isDeceased = true;
      deceasedMemorial = {
        id: memorial.id,
        name: memorial.name,
        slug: memorial.slug,
        photo: memorial.photos[0],
      };
      authorName = memorial.name;
    }

    // Vérifier si l'auteur du mémorial correspond
    const authorNameNormalized = memorial.author.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (authorNameNormalized.includes(normalizedQuery)) {
      authorName = memorial.author.name;
      publications.push({
        memorialId: memorial.id,
        memorialName: memorial.name,
        memorialSlug: memorial.slug,
        photo: memorial.photos[0],
        relation: memorial.author.relation,
      });
    }

    // Vérifier les messages du livre d'or
    for (const message of memorial.guestbookMessages) {
      const msgAuthorNormalized = message.authorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (msgAuthorNormalized.includes(normalizedQuery)) {
        authorName = message.authorName;
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
    
    // Vérifier si l'utilisateur et la personne recherchée ont contribué aux mêmes mémoriaux
    for (const memorial of memorials) {
      const allContributors = [
        memorial.author.name,
        ...memorial.guestbookMessages.map(m => m.authorName)
      ];
      
      const queryPersonInMemorial = allContributors.some(name => 
        name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedQuery)
      );
      
      const userInMemorial = allContributors.some(name =>
        name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(userNameNormalized)
      );

      if (queryPersonInMemorial && userInMemorial) {
        // Trouver les relations respectives
        const queryPersonRelation = memorial.guestbookMessages.find(m => 
          m.authorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedQuery)
        )?.relationCategory || (memorial.author.name.toLowerCase().includes(normalizedQuery) ? memorial.author.relation : undefined);
        
        const userRelation = memorial.guestbookMessages.find(m =>
          m.authorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(userNameNormalized)
        )?.relationCategory || (memorial.author.name.toLowerCase().includes(userNameNormalized) ? memorial.author.relation : undefined);

        if (queryPersonRelation && userRelation) {
          connectionWithUser = {
            type: "indirect",
            description: `Vous êtes ${userRelation} et ${authorName} est ${queryPersonRelation} de ${memorial.name}`,
            via: memorial.name,
          };
          break;
        }
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
    isDeceased,
    deceasedMemorial,
    authorName,
    publications,
    guestbookEntries,
    connectionWithUser,
  };
};

const SearchResults = ({ results, query, memorials, onClose }: SearchResultsProps) => {
  const { user } = useAuth();
  
  // Pour l'instant, on utilise le nom du profil utilisateur (à connecter avec le vrai profil)
  const currentUserName = user?.email?.split("@")[0]; // Temporaire - utiliser le display_name du profil

  const organized = useMemo(
    () => organizeResultsByPerson(query, memorials, currentUserName),
    [query, memorials, currentUserName]
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

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="font-serif text-lg text-foreground">
          Résultats pour "{organized.authorName}"
        </h3>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          {results.length} résultat{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* 1. Si c'est un défunt - afficher uniquement le mémorial */}
      {organized.isDeceased && organized.deceasedMemorial && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <Heart className="w-4 h-4" />
            <h4 className="font-sans text-sm font-medium uppercase tracking-wide">
              Espace Mémorial
            </h4>
          </div>
          <Link
            to={`/memorial/${organized.deceasedMemorial.slug}`}
            onClick={onClose}
            className="flex items-center gap-4 p-3 rounded-sm bg-secondary/50 hover:bg-secondary transition-colors group"
          >
            <div className="w-14 h-16 overflow-hidden rounded-sm bg-muted shrink-0">
              {organized.deceasedMemorial.photo && (
                <img
                  src={organized.deceasedMemorial.photo}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                {organized.deceasedMemorial.name}
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
      {organized.publications.length > 0 && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <FileText className="w-4 h-4" />
            <h4 className="font-sans text-sm font-medium uppercase tracking-wide">
              Publications ({organized.publications.length})
            </h4>
          </div>
          <p className="text-xs text-muted-foreground font-sans mb-3">
            Espaces mémoriels créés par {organized.authorName}
          </p>
          <div className="space-y-2">
            {organized.publications.map((pub) => (
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
      {organized.guestbookEntries.length > 0 && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <BookOpen className="w-4 h-4" />
            <h4 className="font-sans text-sm font-medium uppercase tracking-wide">
              Messages Livre d'Or ({organized.guestbookEntries.length})
            </h4>
          </div>
          <p className="text-xs text-muted-foreground font-sans mb-3">
            Contributions de {organized.authorName} aux livres d'or
          </p>
          <div className="space-y-3">
            {organized.guestbookEntries.map((entry, idx) => (
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
      <div className="p-4 bg-secondary/30">
        <div className="flex items-center gap-2 mb-3 text-primary">
          <Link2 className="w-4 h-4" />
          <h4 className="font-sans text-sm font-medium uppercase tracking-wide">
            Votre lien avec {organized.authorName}
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
        ) : organized.connectionWithUser ? (
          <div className={`p-3 rounded-sm ${
            organized.connectionWithUser.type === "indirect" 
              ? "bg-green-500/10 border border-green-500/20" 
              : "bg-muted/50"
          }`}>
            {organized.connectionWithUser.type === "indirect" ? (
              <>
                <p className="text-sm font-sans text-foreground">
                  {organized.connectionWithUser.description}
                </p>
                {organized.connectionWithUser.via && (
                  <p className="text-xs text-muted-foreground mt-1 font-sans">
                    Via le mémorial de {organized.connectionWithUser.via}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground font-sans">
                {organized.connectionWithUser.description}
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
    </div>
  );
};

export default SearchResults;
