import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, Heart, Calendar, Bell, Settings, LogOut, ChevronRight } from "lucide-react";

// Mock user data
const mockUser = {
  fullName: "Amadou Diallo",
  email: "amadou.diallo@email.com",
  phone: "+225 07 00 00 00",
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
                              <h4 className="font-serif text-lg mb-1">{hommage.memorialName}</h4>
                              <p className="text-sm text-muted-foreground font-serif italic line-clamp-2">
                                "{hommage.message}"
                              </p>
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
