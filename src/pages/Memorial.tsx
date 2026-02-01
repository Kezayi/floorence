import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GestureButton from "@/components/memorial/GestureButton";
import GuestbookMessage from "@/components/memorial/GuestbookMessage";
import RelationSelect from "@/components/memorial/RelationSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, Heart, ChevronLeft, Bell, BellOff } from "lucide-react";

// Mock data
const mockMemorial = {
  id: "1",
  slug: "jean-baptiste-kouassi",
  name: "Jean-Baptiste Kouassi",
  birthDate: "12 Mars 1945",
  deathDate: "8 Janvier 2025",
  publishedAt: "10 Janvier 2025",
  author: {
    id: "author-1",
    name: "Marie Kouassi",
    relation: "Sa Fille",
  },
  bio: "Père dévoué, grand-père aimant et homme de foi. Jean-Baptiste a consacré sa vie à sa famille et à sa communauté. Instituteur pendant 35 ans, il a formé des générations d'élèves avec patience et dévouement.",
  photos: [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1000&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=1000&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&h=1000&fit=crop&crop=face",
  ],
  type: "RECENT" as const,
  ripCount: 234,
  candleCount: 89,
  flowerCount: 45,
  enableContributions: true,
  contributionGoal: 500000,
  contributionCurrent: 285000,
  events: [
    {
      id: "e1",
      type: "WAKE",
      date: "15 Janvier 2025",
      time: "14h00 - 22h00",
      location: "Domicile familial, Cocody",
      gps: "5.3364,-4.0266",
    },
    {
      id: "e2",
      type: "BURIAL",
      date: "18 Janvier 2025",
      time: "10h00",
      location: "Église Saint-Paul, Plateau",
      gps: "5.3167,-4.0167",
    },
  ],
  guestbookMessages: [
    {
      id: "m1",
      authorName: "Marie Kouassi",
      relationCategory: "Sa Fille",
      content: "Papa, tu as toujours été mon modèle. Ta sagesse et ta bonté resteront gravées dans mon cœur pour toujours. Repose en paix.",
      createdAt: "2025-01-10T10:30:00Z",
    },
    {
      id: "m2",
      authorName: "Emmanuel Yao",
      relationCategory: "Son Collègue",
      content: "Un homme d'une grande intégrité. Travailler à ses côtés pendant 20 ans fut un honneur. Tu nous manques déjà.",
      createdAt: "2025-01-09T15:45:00Z",
    },
    {
      id: "m3",
      authorName: "Adjoua Bamba",
      relationCategory: "Son Élève",
      content: "Maître Kouassi m'a appris bien plus que les mathématiques. Il m'a appris la persévérance et l'humilité. Merci pour tout.",
      createdAt: "2025-01-09T09:20:00Z",
    },
  ],
};

const eventTypeLabels = {
  WAKE: "Veillée",
  BURIAL: "Inhumation",
  COMMEMORATION: "Commémoration",
};

const Memorial = () => {
  const { slug } = useParams();
  const [isFollowing, setIsFollowing] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [selectedRelation, setSelectedRelation] = useState("");

  // In real app, fetch memorial by slug
  const memorial = mockMemorial;

  const handleRIP = () => {
    console.log("RIP clicked");
  };

  const handleCandle = () => {
    console.log("Candle clicked - would open payment");
  };

  const handleFlower = () => {
    console.log("Flower clicked - would open payment");
  };

  const handleSubmitMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedRelation) return;
    console.log("Submit message:", { messageContent, selectedRelation });
    setMessageContent("");
    setSelectedRelation("");
  };

  const contributionPercentage = Math.round(
    (memorial.contributionCurrent / memorial.contributionGoal) * 100
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-16 md:pt-20">
        {/* Back Link */}
        <div className="container mx-auto px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 pb-12">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Photo Gallery */}
            <div className="relative">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={memorial.photos[0]}
                  alt={`Portrait de ${memorial.name}`}
                  className="w-full h-full object-cover portrait-memorial"
                />
              </div>
              {memorial.photos.length > 1 && (
                <div className="flex gap-2 mt-2">
                  {memorial.photos.slice(1, 3).map((photo, index) => (
                    <div key={index} className="w-16 h-20 overflow-hidden">
                      <img
                        src={photo}
                        alt=""
                        className="w-full h-full object-cover portrait-memorial opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center">
              <div className="animate-fade-in">
                <h1 className="mb-2">{memorial.name}</h1>
                <p className="font-sans text-lg text-muted-foreground mb-4">
                  {memorial.birthDate} — {memorial.deathDate}
                </p>
                
                {/* Publication Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-6 font-sans">
                  <span>Publié le {memorial.publishedAt}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>
                    Par{" "}
                    <Link 
                      to={`/compte/${memorial.author.id}`} 
                      className="text-foreground hover:underline"
                    >
                      {memorial.author.name}
                    </Link>
                    {" "}({memorial.author.relation})
                  </span>
                </div>

                <p className="font-serif text-lg leading-relaxed text-foreground/80 mb-8">
                  {memorial.bio}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-4 mb-8">
                  <button
                    onClick={() => setIsFollowing(!isFollowing)}
                    className={`btn-ghost ${isFollowing ? "bg-muted" : ""}`}
                  >
                    {isFollowing ? (
                      <>
                        <BellOff className="w-4 h-4" />
                        <span>Ne plus suivre</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        <span>Suivre</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Gesture Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <GestureButton
                    type="RIP"
                    count={memorial.ripCount}
                    onClick={handleRIP}
                  />
                  <GestureButton
                    type="CANDLE"
                    count={memorial.candleCount}
                    onClick={handleCandle}
                  />
                  <GestureButton
                    type="FLOWER"
                    count={memorial.flowerCount}
                    onClick={handleFlower}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="divider-elegant" />

        {/* Tabs Content */}
        <section className="container mx-auto px-4 py-12">
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none p-0 h-auto mb-8">
              {memorial.type === "RECENT" ? (
                <>
                  <TabsTrigger
                    value="events"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-sans"
                  >
                    Programme Obsèques
                  </TabsTrigger>
                  {memorial.enableContributions && (
                    <TabsTrigger
                      value="contributions"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-sans"
                    >
                      Contributions
                    </TabsTrigger>
                  )}
                </>
              ) : (
                <>
                  <TabsTrigger
                    value="events"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-sans"
                  >
                    Recueillements
                  </TabsTrigger>
                  <TabsTrigger
                    value="archives"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-sans"
                  >
                    Archives
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="events" className="mt-0">
              <div className="max-w-2xl">
                <h3 className="mb-6">
                  {memorial.type === "RECENT" ? "Programme des obsèques" : "Prochains recueillements"}
                </h3>
                <div className="space-y-6">
                  {memorial.events.map((event) => (
                    <div
                      key={event.id}
                      className="p-6 bg-secondary rounded-sm"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-sans">
                          {eventTypeLabels[event.type as keyof typeof eventTypeLabels]}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-sans">
                            {event.date} à {event.time}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-foreground">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <span className="font-sans">{event.location}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {memorial.enableContributions && (
              <TabsContent value="contributions" className="mt-0">
                <div className="max-w-2xl">
                  <h3 className="mb-4">Aider la famille</h3>
                  <p className="font-serif text-muted-foreground mb-6">
                    Participez aux frais d'obsèques pour soutenir la famille
                    dans cette épreuve difficile.
                  </p>

                  {/* Progress */}
                  <div className="mb-8">
                    <div className="flex justify-between text-sm font-sans mb-2">
                      <span>
                        {memorial.contributionCurrent.toLocaleString("fr-FR")} FCFA
                      </span>
                      <span className="text-muted-foreground">
                        Objectif: {memorial.contributionGoal.toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${contributionPercentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 font-sans">
                      {contributionPercentage}% de l'objectif atteint
                    </p>
                  </div>

                  <button className="btn-memorial w-full md:w-auto">
                    <Heart className="w-4 h-4" />
                    Contribuer
                  </button>
                </div>
              </TabsContent>
            )}

            <TabsContent value="archives" className="mt-0">
              <div className="max-w-2xl">
                <p className="font-serif text-muted-foreground">
                  Les archives photographiques et documents seront bientôt disponibles.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Guestbook - Dark Zone */}
        <section className="dark-zone section-padding">
          <div className="container mx-auto">
            <div className="max-w-2xl">
              <h2 className="text-memorial-dark-foreground mb-2">Livre d'or</h2>
              <p className="font-serif text-memorial-dark-muted mb-8">
                Partagez un souvenir ou un message de soutien à la famille
              </p>

              {/* Message Form */}
              <form onSubmit={handleSubmitMessage} className="mb-12">
                <div className="space-y-4">
                  <RelationSelect
                    value={selectedRelation}
                    onChange={setSelectedRelation}
                  />
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Votre message..."
                    rows={4}
                    className="w-full p-4 bg-memorial-dark border border-memorial-dark-muted/30 text-memorial-dark-foreground placeholder:text-memorial-dark-muted font-serif resize-none focus:outline-none focus:ring-1 focus:ring-memorial-dark-foreground/30"
                  />
                  <button
                    type="submit"
                    disabled={!messageContent.trim() || !selectedRelation}
                    className="btn-memorial bg-memorial-dark-foreground text-memorial-dark hover:bg-memorial-dark-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Publier mon hommage
                  </button>
                </div>
              </form>

              {/* Messages List */}
              <div className="divide-y divide-memorial-dark-muted/20">
                {memorial.guestbookMessages.map((message) => (
                  <GuestbookMessage key={message.id} {...message} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Memorial;
