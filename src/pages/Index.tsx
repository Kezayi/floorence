import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemorialCard from "@/components/memorial/MemorialCard";
import { LayoutGrid, Grid3X3, List, Square } from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

// Données de démonstration
const mockMemorials = [
  {
    id: "1",
    slug: "jean-baptiste-kouassi",
    name: "Jean-Baptiste Kouassi",
    birthDate: "12 Mars 1945",
    deathDate: "8 Janvier 2025",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face",
    ripCount: 234,
    candleCount: 89,
    flowerCount: 45,
    type: "RECENT" as const,
  },
  {
    id: "2",
    slug: "marie-therese-bamba",
    name: "Marie-Thérèse Bamba",
    birthDate: "5 Août 1952",
    deathDate: "2 Janvier 2025",
    photoUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop&crop=face",
    ripCount: 567,
    candleCount: 234,
    flowerCount: 123,
    type: "RECENT" as const,
  },
  {
    id: "3",
    slug: "paul-yao-akoto",
    name: "Paul Yao Akoto",
    birthDate: "18 Décembre 1938",
    deathDate: "25 Décembre 2024",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop&crop=face",
    ripCount: 890,
    candleCount: 456,
    flowerCount: 234,
    type: "PAST" as const,
  },
  {
    id: "4",
    slug: "aminata-diallo",
    name: "Aminata Diallo",
    birthDate: "3 Février 1960",
    deathDate: "15 Novembre 2024",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&crop=face",
    ripCount: 432,
    candleCount: 198,
    flowerCount: 87,
    type: "PAST" as const,
  },
  {
    id: "5",
    slug: "kofi-mensah",
    name: "Kofi Mensah",
    birthDate: "22 Juillet 1970",
    deathDate: "3 Janvier 2025",
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop&crop=face",
    ripCount: 156,
    candleCount: 67,
    flowerCount: 34,
    type: "RECENT" as const,
  },
  {
    id: "6",
    slug: "fatou-ndiaye",
    name: "Fatou Ndiaye",
    birthDate: "9 Avril 1985",
    deathDate: "28 Décembre 2024",
    photoUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=600&fit=crop&crop=face",
    ripCount: 789,
    candleCount: 345,
    flowerCount: 167,
    type: "RECENT" as const,
  },
];

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

        {/* Memorial Grid */}
        <section className="px-4 py-6 md:px-8 md:py-10">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl md:text-2xl">Espaces mémoriels</h2>
                <span className="text-sm text-muted-foreground font-sans">
                  {mockMemorials.length} espace{mockMemorials.length > 1 ? "s" : ""}
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
              {mockMemorials.map((memorial, index) => (
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
