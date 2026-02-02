import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, Heart, Calendar, Bell, Settings, LogOut, ChevronRight, Flame, Flower2 } from "lucide-react";
import { FlameIcon, ChrysanthemumIcon } from "@/components/memorial/MemorialIcons";

// Mock user data
const mockUser = {
  fullName: "Amadou Diallo",
  email: "amadou.diallo@email.com",
  phone: "+225 07 00 00 00",
  credibilityScore: 15,
};

const mockPublications = [
  {
    id: "1",
    name: "Jean-Baptiste Kouassi",
    slug: "jean-baptiste-kouassi",
    createdAt: "2025-01-08",
    isPaid: true,
    isPublished: true,
  },
];

const mockHommages = [
  {
    id: "1",
    memorialName: "Marie-Thérèse Bamba",
    slug: "marie-therese-bamba",
    message: "Une femme d'exception qui a marqué notre communauté...",
    createdAt: "2025-01-09",
    relation: "Son Ami(e)",
  },
  {
    id: "2",
    memorialName: "Marcus James Washington",
    slug: "marcus-james-washington",
    message: "Pastor Washington a toujours eu un mot gentil pour chacun...",
    createdAt: "2025-01-15",
    relation: "Son Voisin(e)",
  },
];

const mockContributions = [
  {
    id: "c1",
    memorialName: "Marcus James Washington",
    slug: "marcus-james-washington",
    type: "CANDLE" as const,
    quantity: 5,
    amount: 2500,
    createdAt: "2025-01-20",
  },
  {
    id: "c2",
    memorialName: "Gloria Mae Johnson",
    slug: "gloria-mae-johnson",
    type: "FLOWER" as const,
    quantity: 3,
    amount: 3000,
    createdAt: "2025-01-18",
  },
  {
    id: "c3",
    memorialName: "Jaylen Christopher Davis",
    slug: "jaylen-christopher-davis",
    type: "CANDLE" as const,
    quantity: 10,
    amount: 5000,
    createdAt: "2025-01-15",
  },
  {
    id: "c4",
    memorialName: "Patricia Ann Thompson",
    slug: "patricia-ann-thompson",
    type: "FLOWER" as const,
    quantity: 2,
    amount: 2000,
    createdAt: "2025-01-12",
  },
];

const mockRecueillements = [
  {
    id: "1",
    memorialName: "Paul Yao Akoto",
    slug: "paul-yao-akoto",
    eventType: "COMMEMORATION",
    eventDate: "25 Décembre 2025",
  },
];

const mockSuivis = [
  {
    id: "1",
    name: "Jean-Baptiste Kouassi",
    slug: "jean-baptiste-kouassi",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: "2",
    name: "Marie-Thérèse Bamba",
    slug: "marie-therese-bamba",
    photoUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face",
  },
];

// Calculate totals
const totalContributions = mockContributions.reduce((sum, c) => sum + c.amount, 0);
const totalCandles = mockContributions.filter(c => c.type === "CANDLE").reduce((sum, c) => sum + c.quantity, 0);
const totalFlowers = mockContributions.filter(c => c.type === "FLOWER").reduce((sum, c) => sum + c.quantity, 0);

const Account = () => {
  const [activeTab, setActiveTab] = useState("profil");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-16 md:pt-20">
        <section className="section-padding">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-4xl mb-2">Mon compte</h1>
              <p className="font-sans text-muted-foreground mb-8">
                Gérez vos espaces mémoriels et vos hommages
              </p>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Mobile Tabs */}
                <TabsList className="flex md:hidden w-full bg-secondary p-1 rounded-sm mb-6 overflow-x-auto">
                  <TabsTrigger value="profil" className="flex-1 text-xs px-2">
                    Profil
                  </TabsTrigger>
                  <TabsTrigger value="publications" className="flex-1 text-xs px-2">
                    Publications
                  </TabsTrigger>
                  <TabsTrigger value="hommages" className="flex-1 text-xs px-2">
                    Hommages
                  </TabsTrigger>
                  <TabsTrigger value="contributions" className="flex-1 text-xs px-2">
                    Gestes
                  </TabsTrigger>
                  <TabsTrigger value="suivis" className="flex-1 text-xs px-2">
                    Suivis
                  </TabsTrigger>
                </TabsList>

                <div className="grid md:grid-cols-[240px_1fr] gap-8">
                  {/* Desktop Sidebar */}
                  <aside className="hidden md:block">
                    <nav className="space-y-1">
                      <button
                        onClick={() => setActiveTab("profil")}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left font-sans text-sm transition-colors rounded-sm ${
                          activeTab === "profil"
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <User className="w-4 h-4" />
                        Profil
                      </button>
                      <button
                        onClick={() => setActiveTab("publications")}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left font-sans text-sm transition-colors rounded-sm ${
                          activeTab === "publications"
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        Mes publications
                      </button>
                      <button
                        onClick={() => setActiveTab("hommages")}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left font-sans text-sm transition-colors rounded-sm ${
                          activeTab === "hommages"
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <Heart className="w-4 h-4" />
                        Mes hommages
                      </button>
                      <button
                        onClick={() => setActiveTab("contributions")}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left font-sans text-sm transition-colors rounded-sm ${
                          activeTab === "contributions"
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <Flame className="w-4 h-4" />
                        Mes gestes
                      </button>
                      <button
                        onClick={() => setActiveTab("recueillements")}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left font-sans text-sm transition-colors rounded-sm ${
                          activeTab === "recueillements"
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                        Mes recueillements
                      </button>
                      <button
                        onClick={() => setActiveTab("suivis")}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left font-sans text-sm transition-colors rounded-sm ${
                          activeTab === "suivis"
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                        Mes suivis
                      </button>

                      <div className="pt-4 mt-4 border-t border-border">
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-left font-sans text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm">
                          <Settings className="w-4 h-4" />
                          Paramètres
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-left font-sans text-sm text-destructive hover:bg-destructive/10 rounded-sm">
                          <LogOut className="w-4 h-4" />
                          Déconnexion
                        </button>
                      </div>
                    </nav>
                  </aside>

                  {/* Content */}
                  <div className="min-h-[400px]">
                    <TabsContent value="profil" className="mt-0">
                      <div className="bg-card border border-border rounded-sm p-6">
                        <h3 className="mb-6">Informations personnelles</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-sans text-muted-foreground mb-1">
                              Nom complet
                            </label>
                            <input
                              type="text"
                              defaultValue={mockUser.fullName}
                              className="w-full p-3 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-sans text-muted-foreground mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              defaultValue={mockUser.email}
                              className="w-full p-3 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-sans text-muted-foreground mb-1">
                              Téléphone
                            </label>
                            <input
                              type="tel"
                              defaultValue={mockUser.phone}
                              className="w-full p-3 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <button className="btn-memorial mt-4">
                            Enregistrer les modifications
                          </button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="publications" className="mt-0">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3>Mes publications</h3>
                          <Link to="/creer" className="btn-ghost text-sm">
                            + Créer un espace
                          </Link>
                        </div>
                        {mockPublications.length > 0 ? (
                          mockPublications.map((pub) => (
                            <Link
                              key={pub.id}
                              to={`/memorial/${pub.slug}`}
                              className="block bg-card border border-border rounded-sm p-4 hover:border-foreground/20 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-serif text-lg">{pub.name}</h4>
                                  <p className="text-sm text-muted-foreground font-sans">
                                    Créé le {new Date(pub.createdAt).toLocaleDateString("fr-FR")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`px-2 py-1 text-xs font-sans ${
                                      pub.isPublished
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {pub.isPublished ? "Publié" : "Brouillon"}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <p className="text-muted-foreground font-serif py-8 text-center">
                            Vous n'avez pas encore créé d'espace mémoriel
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="hommages" className="mt-0">
                      <div className="space-y-4">
                        <h3 className="mb-4">Mes hommages</h3>
                        {mockHommages.length > 0 ? (
                          mockHommages.map((hommage) => (
                            <Link
                              key={hommage.id}
                              to={`/memorial/${hommage.slug}`}
                              className="block bg-card border border-border rounded-sm p-4 hover:border-foreground/20 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="font-serif text-lg mb-1">{hommage.memorialName}</h4>
                                  <p className="text-sm text-muted-foreground font-serif italic line-clamp-2">
                                    "{hommage.message}"
                                  </p>
                                </div>
                                <span className="px-2 py-1 bg-muted text-xs font-sans shrink-0">
                                  {hommage.relation}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground font-sans mt-2">
                                {new Date(hommage.createdAt).toLocaleDateString("fr-FR")}
                              </p>
                            </Link>
                          ))
                        ) : (
                          <p className="text-muted-foreground font-serif py-8 text-center">
                            Vous n'avez pas encore laissé d'hommage
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="contributions" className="mt-0">
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-2">Mes gestes symboliques</h3>
                          <p className="text-sm text-muted-foreground font-sans mb-6">
                            Historique de vos cierges et fleurs déposés
                          </p>
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-secondary p-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <FlameIcon size={20} className="text-amber-500" />
                            </div>
                            <p className="font-serif text-2xl font-medium">{totalCandles}</p>
                            <p className="text-xs text-muted-foreground font-sans">Cierges</p>
                          </div>
                          <div className="bg-secondary p-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <ChrysanthemumIcon size={20} className="text-green-600" />
                            </div>
                            <p className="font-serif text-2xl font-medium">{totalFlowers}</p>
                            <p className="text-xs text-muted-foreground font-sans">Fleurs</p>
                          </div>
                          <div className="bg-secondary p-4 text-center">
                            <p className="font-serif text-2xl font-medium mb-2">
                              {totalContributions.toLocaleString("fr-FR")}
                            </p>
                            <p className="text-xs text-muted-foreground font-sans">FCFA dépensés</p>
                          </div>
                        </div>

                        {/* Contributions List */}
                        {mockContributions.length > 0 ? (
                          <div className="space-y-3">
                            {mockContributions.map((contrib) => (
                              <Link
                                key={contrib.id}
                                to={`/memorial/${contrib.slug}`}
                                className="flex items-center gap-4 bg-card border border-border rounded-sm p-4 hover:border-foreground/20 transition-colors"
                              >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  contrib.type === "CANDLE" ? "bg-amber-500/20" : "bg-green-600/20"
                                }`}>
                                  {contrib.type === "CANDLE" ? (
                                    <FlameIcon size={20} className="text-amber-500" />
                                  ) : (
                                    <ChrysanthemumIcon size={20} className="text-green-600" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-serif text-base">{contrib.memorialName}</h4>
                                  <p className="text-xs text-muted-foreground font-sans">
                                    {contrib.quantity} {contrib.type === "CANDLE" ? "cierge(s)" : "fleur(s)"} • {new Date(contrib.createdAt).toLocaleDateString("fr-FR")}
                                  </p>
                                </div>
                                <span className="font-sans text-sm font-medium">
                                  {contrib.amount.toLocaleString("fr-FR")} FCFA
                                </span>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground font-serif py-8 text-center">
                            Vous n'avez pas encore fait de geste symbolique
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="recueillements" className="mt-0">
                      <div className="space-y-4">
                        <h3 className="mb-4">Mes recueillements</h3>
                        {mockRecueillements.length > 0 ? (
                          mockRecueillements.map((event) => (
                            <Link
                              key={event.id}
                              to={`/memorial/${event.slug}`}
                              className="block bg-card border border-border rounded-sm p-4 hover:border-foreground/20 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-serif text-lg">{event.memorialName}</h4>
                                  <p className="text-sm text-muted-foreground font-sans">
                                    {event.eventDate}
                                  </p>
                                </div>
                                <span className="px-2 py-1 bg-secondary text-xs font-sans">
                                  {event.eventType}
                                </span>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <p className="text-muted-foreground font-serif py-8 text-center">
                            Aucun recueillement prévu
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="suivis" className="mt-0">
                      <div className="space-y-4">
                        <h3 className="mb-4">Mes suivis</h3>
                        {mockSuivis.length > 0 ? (
                          mockSuivis.map((suivi) => (
                            <Link
                              key={suivi.id}
                              to={`/memorial/${suivi.slug}`}
                              className="flex items-center gap-4 bg-card border border-border rounded-sm p-4 hover:border-foreground/20 transition-colors"
                            >
                              <div className="w-12 h-12 rounded-full overflow-hidden">
                                <img
                                  src={suivi.photoUrl}
                                  alt=""
                                  className="w-full h-full object-cover grayscale"
                                />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-serif text-lg">{suivi.name}</h4>
                              </div>
                              <Bell className="w-4 h-4 text-muted-foreground" />
                            </Link>
                          ))
                        ) : (
                          <p className="text-muted-foreground font-serif py-8 text-center">
                            Vous ne suivez aucun espace mémoriel
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </div>
              </Tabs>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Account;
