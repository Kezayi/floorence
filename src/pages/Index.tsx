import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemorialCard from "@/components/memorial/MemorialCard";
import { Search } from "lucide-react";
import { useState } from "react";

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

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMemorials = mockMemorials.filter((memorial) =>
    memorial.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-16 md:pt-20">
        {/* Hero Section */}
        <section className="section-padding text-center">
          <div className="max-w-3xl mx-auto animate-fade-in">
            <h1 className="mb-6">
              Honorer la mémoire
              <br />
              <span className="text-muted-foreground">de ceux qui nous ont quittés</span>
            </h1>
            <p className="text-memorial font-serif text-muted-foreground mb-10 max-w-2xl mx-auto">
              Un espace de recueillement numérique pour préserver le souvenir
              et accompagner le deuil avec dignité.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un défunt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-secondary border-0 text-foreground placeholder:text-muted-foreground font-sans text-base focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </section>

        <div className="divider-elegant" />

        {/* Memorial Grid */}
        <section className="section-padding">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl">Espaces mémoriels</h2>
              <span className="text-sm text-muted-foreground font-sans">
                {filteredMemorials.length} espace{filteredMemorials.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredMemorials.map((memorial, index) => (
                <div
                  key={memorial.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <MemorialCard {...memorial} />
                </div>
              ))}
            </div>

            {filteredMemorials.length === 0 && (
              <div className="text-center py-20">
                <p className="font-serif text-xl text-muted-foreground">
                  Aucun espace mémoriel trouvé
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-secondary section-padding">
          <div className="container mx-auto text-center max-w-2xl">
            <h2 className="mb-4">Créer un espace mémoriel</h2>
            <p className="font-serif text-lg text-muted-foreground mb-8">
              Rendez hommage à un proche disparu en créant un espace dédié
              à sa mémoire. Un lieu de recueillement pour tous ceux qui l'ont aimé.
            </p>
            <a href="/creer" className="btn-memorial">
              Créer un espace
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
