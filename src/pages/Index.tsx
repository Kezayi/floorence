import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemorialCard from "@/components/memorial/MemorialCard";
import SearchBar from "@/components/search/SearchBar";
import { LayoutGrid, Grid3X3, List, Square } from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SearchableMemorial } from "@/lib/searchWithRelations";

// Données de démonstration enrichies avec les auteurs du livre d'or
const mockMemorials: SearchableMemorial[] = [
  {
    id: "1",
    slug: "jean-baptiste-kouassi",
    name: "Jean-Baptiste Kouassi",
    birthDate: "12 Mars 1945",
    deathDate: "8 Janvier 2025",
    bio: "Père dévoué, grand-père aimant et homme de foi.",
    photos: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face"],
    type: "RECENT" as const,
    author: {
      id: "author-1",
      name: "Marie Kouassi",
      relation: "Sa Fille",
    },
    guestbookMessages: [
      { id: "m1", authorName: "Marie Kouassi", relationCategory: "Sa Fille", content: "Papa, tu nous manques." },
      { id: "m2", authorName: "Emmanuel Yao", relationCategory: "Son Collègue", content: "Un grand homme." },
      { id: "m3", authorName: "Adjoua Bamba", relationCategory: "Son Élève", content: "Merci pour tout." },
      { id: "m4", authorName: "Pierre Kouassi", relationCategory: "Son Fils", content: "Repose en paix papa." },
    ],
  },
  {
    id: "2",
    slug: "marie-therese-bamba",
    name: "Marie-Thérèse Bamba",
    birthDate: "5 Août 1952",
    deathDate: "2 Janvier 2025",
    bio: "Mère aimante et femme de cœur.",
    photos: ["https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop&crop=face"],
    type: "RECENT" as const,
    author: {
      id: "author-2",
      name: "Adjoua Bamba",
      relation: "Sa Fille",
    },
    guestbookMessages: [
      { id: "m5", authorName: "Adjoua Bamba", relationCategory: "Sa Fille", content: "Maman, tu es dans mon cœur." },
      { id: "m6", authorName: "Kouadio Bamba", relationCategory: "Son Fils", content: "Merci pour tout maman." },
      { id: "m7", authorName: "Yao Bamba", relationCategory: "Son Époux", content: "Mon amour éternel." },
    ],
  },
  {
    id: "3",
    slug: "paul-yao-akoto",
    name: "Paul Yao Akoto",
    birthDate: "18 Décembre 1938",
    deathDate: "25 Décembre 2024",
    bio: "Homme de sagesse et de paix.",
    photos: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop&crop=face"],
    type: "PAST" as const,
    author: {
      id: "author-3",
      name: "Emmanuel Yao",
      relation: "Son Fils",
    },
    guestbookMessages: [
      { id: "m8", authorName: "Emmanuel Yao", relationCategory: "Son Fils", content: "Tu restes mon modèle." },
      { id: "m9", authorName: "Awa Yao", relationCategory: "Sa Fille", content: "Papa adoré." },
    ],
  },
  {
    id: "4",
    slug: "aminata-diallo",
    name: "Aminata Diallo",
    birthDate: "3 Février 1960",
    deathDate: "15 Novembre 2024",
    bio: "Une vie dédiée aux autres.",
    photos: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&crop=face"],
    type: "PAST" as const,
    author: {
      id: "author-4",
      name: "Fatou Diallo",
      relation: "Sa Nièce",
    },
    guestbookMessages: [
      { id: "m10", authorName: "Fatou Diallo", relationCategory: "Sa Nièce", content: "Tantine, tu nous manques." },
      { id: "m11", authorName: "Marie Kouassi", relationCategory: "Son Ami(e)", content: "Une amie précieuse." },
    ],
  },
  {
    id: "5",
    slug: "kofi-mensah",
    name: "Kofi Mensah",
    birthDate: "22 Juillet 1970",
    deathDate: "3 Janvier 2025",
    bio: "Artiste et visionnaire.",
    photos: ["https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop&crop=face"],
    type: "RECENT" as const,
    author: {
      id: "author-5",
      name: "Ama Mensah",
      relation: "Son Épouse",
    },
    guestbookMessages: [
      { id: "m12", authorName: "Ama Mensah", relationCategory: "Son Épouse", content: "Mon amour à jamais." },
      { id: "m13", authorName: "Kwame Mensah", relationCategory: "Son Fils", content: "Papa, ton art vit en nous." },
    ],
  },
  {
    id: "6",
    slug: "fatou-ndiaye",
    name: "Fatou Ndiaye",
    birthDate: "9 Avril 1985",
    deathDate: "28 Décembre 2024",
    bio: "Étoile partie trop tôt.",
    photos: ["https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=600&fit=crop&crop=face"],
    type: "RECENT" as const,
    author: {
      id: "author-6",
      name: "Oumar Ndiaye",
      relation: "Son Frère",
    },
    guestbookMessages: [
      { id: "m14", authorName: "Oumar Ndiaye", relationCategory: "Son Frère", content: "Ma sœur adorée." },
      { id: "m15", authorName: "Aissatou Ndiaye", relationCategory: "Sa Sœur", content: "Tu restes dans nos cœurs." },
    ],
  },
];

// Données pour les cartes mémorielles
const memorialCards = mockMemorials.map(m => ({
  id: m.id,
  slug: m.slug,
  name: m.name,
  birthDate: m.birthDate,
  deathDate: m.deathDate,
  photoUrl: m.photos[0],
  ripCount: Math.floor(Math.random() * 900) + 100,
  candleCount: Math.floor(Math.random() * 400) + 50,
  flowerCount: Math.floor(Math.random() * 200) + 30,
  type: m.type,
}));

type ViewMode = "grid-4" | "grid-3" | "grid-2" | "list";

const Index = () => {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("grid-4");

  // Set default view mode based on device
  useEffect(() => {
    if (isMobile) {
      setViewMode("list");
    } else {
      setViewMode("grid-4");
    }
  }, [isMobile]);

  const getGridClass = () => {
    switch (viewMode) {
      case "grid-4":
        return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      case "grid-3":
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      case "grid-2":
        return "grid-cols-1 md:grid-cols-2";
      case "list":
        return "grid-cols-1";
      default:
        return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-20 md:pt-24">
        {/* Search Bar */}
        <section className="px-4 py-4 md:px-8 md:py-6">
          <div className="container mx-auto">
            <SearchBar memorials={mockMemorials} className="max-w-xl" />
          </div>
        </section>

        {/* Memorial Grid */}
        <section className="px-4 py-6 md:px-8 md:py-10">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl md:text-2xl">Espaces mémoriels</h2>
                <span className="text-sm text-muted-foreground font-sans">
                  {memorialCards.length} espace{memorialCards.length > 1 ? "s" : ""}
                </span>
              </div>
              
              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-secondary p-1 rounded">
                <button
                  onClick={() => setViewMode("grid-4")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "grid-4" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grille 4 colonnes"
                  title="Grille compacte"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid-3")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "grid-3" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grille 3 colonnes"
                  title="Grille standard"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid-2")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "grid-2" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grille 2 colonnes"
                  title="Grille large"
                >
                  <Square className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "list" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Liste"
                  title="Vue liste"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={`grid ${getGridClass()} gap-4 md:gap-6`}>
              {memorialCards.map((memorial, index) => (
                <div
                  key={memorial.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <MemorialCard {...memorial} variant={viewMode === "list" ? "list" : "card"} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Spacer for mobile bottom nav */}
      <div className="h-16 md:hidden" />

      <Footer />
    </div>
  );
};

export default Index;
