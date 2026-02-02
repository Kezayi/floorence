import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GestureButton from "@/components/memorial/GestureButton";
import GuestbookPost, { GuestbookPostData } from "@/components/memorial/GuestbookPost";
import GuestbookForm from "@/components/memorial/GuestbookForm";
import InferredRelationships from "@/components/memorial/InferredRelationships";
import ShareButtons from "@/components/memorial/ShareButtons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, Heart, ChevronLeft, ChevronRight, Bell, BellOff, Info } from "lucide-react";
import { calculateAge, getMemorialType } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mock data - type is now calculated dynamically
const mockMemorialData = {
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
  // New guestbook structure with gestures per post
  guestbookPosts: [
    {
      id: "m1",
      authorId: "user-1",
      authorName: "Marie Kouassi",
      relationCategory: "Sa Fille",
      content: "Papa, tu as toujours été mon modèle. Ta sagesse et ta bonté resteront gravées dans mon cœur pour toujours. Repose en paix.",
      photos: [
        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=300&fit=crop",
      ],
      createdAt: "2025-01-10T10:30:00Z",
      candleCount: 5,
      flowerCount: 2,
    },
    {
      id: "m2",
      authorId: "user-2",
      authorName: "Emmanuel Yao",
      relationCategory: "Son Collègue",
      content: "Un homme d'une grande intégrité. Travailler à ses côtés pendant 20 ans fut un honneur. Tu nous manques déjà.",
      photos: [],
      createdAt: "2025-01-09T15:45:00Z",
      candleCount: 3,
      flowerCount: 1,
    },
    {
      id: "m3",
      authorId: "user-3",
      authorName: "Adjoua Bamba",
      relationCategory: "Son Élève",
      content: "Maître Kouassi m'a appris bien plus que les mathématiques. Il m'a appris la persévérance et l'humilité. Merci pour tout.",
      photos: [
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop",
      ],
      createdAt: "2025-01-09T09:20:00Z",
      candleCount: 2,
      flowerCount: 0,
    },
  ] as GuestbookPostData[],
};

const eventTypeLabels = {
  WAKE: "Veillée",
  BURIAL: "Inhumation",
  COMMEMORATION: "Commémoration",
};

// Add computed type to memorial
const mockMemorial = {
  ...mockMemorialData,
  type: getMemorialType(mockMemorialData.deathDate),
};

const Memorial = () => {
  const { slug } = useParams();
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [guestbookPosts, setGuestbookPosts] = useState<GuestbookPostData[]>(
    mockMemorial.guestbookPosts
  );

  // Simulate current user - in real app, get from auth context
  const currentUserId = "user-current";
  
  // Check if current user has already posted
  const userHasPosted = guestbookPosts.some(
    (post) => post.authorId === currentUserId
  );

  // In real app, fetch memorial by slug
  const memorial = mockMemorial;

  // Calculate totals from all posts
  // Note: 1 post = 1 RIP automatiquement
  const totals = useMemo(() => {
    return guestbookPosts.reduce(
      (acc, post) => ({
        ripCount: acc.ripCount + 1, // Chaque post vaut 1 RIP
        candleCount: acc.candleCount + post.candleCount,
        flowerCount: acc.flowerCount + post.flowerCount,
      }),
      { ripCount: 0, candleCount: 0, flowerCount: 0 }
    );
  }, [guestbookPosts]);

  const handleAddCandles = (postId: string, count: number) => {
    // In real app, this would call Ebilling API first
    console.log(`Payment for ${count} candles on post ${postId} - calling Ebilling API...`);
    setGuestbookPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, candleCount: post.candleCount + count }
          : post
      )
    );
  };

  const handleAddFlowers = (postId: string, count: number) => {
    // In real app, this would call Ebilling API first
    console.log(`Payment for ${count} flowers on post ${postId} - calling Ebilling API...`);
    setGuestbookPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, flowerCount: post.flowerCount + count }
          : post
      )
    );
  };

  const handleSubmitPost = (data: {
    content: string;
    relationCategory: string;
    photos: string[];
    candleCount: number;
    flowerCount: number;
  }) => {
    const newPost: GuestbookPostData = {
      id: `m${Date.now()}`,
      authorId: currentUserId,
      authorName: "Utilisateur Connecté", // In real app, get from auth
      relationCategory: data.relationCategory,
      content: data.content,
      photos: data.photos,
      createdAt: new Date().toISOString(),
      candleCount: data.candleCount,
      flowerCount: data.flowerCount,
    };
    setGuestbookPosts((prev) => [newPost, ...prev]);
  };

  // Convert posts to messages format for InferredRelationships
  const messagesForRelationships = guestbookPosts.map((post) => ({
    authorName: post.authorName,
    relationCategory: post.relationCategory,
  }));

  const contributionPercentage = Math.round(
    (memorial.contributionCurrent / memorial.contributionGoal) * 100
  );

  // Gesture button handlers (for header summary - non-interactive display)
  const handleRIPSummary = () => {
    // Scroll to guestbook
    document.querySelector(".dark-zone")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCandleSummary = () => {
    if (!userHasPosted) {
      alert("Vous devez d'abord publier un message dans le livre d'or pour allumer des cierges.");
      return;
    }
    document.querySelector(".dark-zone")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFlowerSummary = () => {
    if (!userHasPosted) {
      alert("Vous devez d'abord publier un message dans le livre d'or pour déposer des fleurs.");
      return;
    }
    document.querySelector(".dark-zone")?.scrollIntoView({ behavior: "smooth" });
  };

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
              <div className="aspect-[3/4] overflow-hidden relative group">
                <img
                  src={memorial.photos[currentPhotoIndex]}
                  alt={`Portrait de ${memorial.name}`}
                  className="w-full h-full object-cover portrait-memorial transition-opacity duration-300"
                />
                
                {/* Navigation Arrows */}
                {memorial.photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentPhotoIndex((prev) => 
                        prev === 0 ? memorial.photos.length - 1 : prev - 1
                      )}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 rounded-full"
                      aria-label="Photo précédente"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentPhotoIndex((prev) => 
                        prev === memorial.photos.length - 1 ? 0 : prev + 1
                      )}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 rounded-full"
                      aria-label="Photo suivante"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                    
                    {/* Photo Counter */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-sm font-sans">
                      {currentPhotoIndex + 1} / {memorial.photos.length}
                    </div>
                  </>
                )}
              </div>
              
              {/* Thumbnails */}
              {memorial.photos.length > 1 && (
                <div className="flex gap-2 mt-2">
                  {memorial.photos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`w-16 h-20 overflow-hidden transition-all ${
                        index === currentPhotoIndex 
                          ? "ring-2 ring-primary opacity-100" 
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={photo}
                        alt=""
                        className="w-full h-full object-cover portrait-memorial"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center">
              <div className="animate-fade-in">
                <h1 className="mb-2">
                  {memorial.name}
                  {(() => {
                    const age = calculateAge(memorial.birthDate, memorial.deathDate);
                    return age !== null ? (
                      <span className="text-muted-foreground font-normal text-2xl md:text-3xl ml-3">
                        ({age} ans)
                      </span>
                    ) : null;
                  })()}
                </h1>
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
                <div className="flex items-center gap-3 mb-8 flex-wrap">
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
                  
                  <ShareButtons
                    url={`${window.location.origin}/memorial/${memorial.slug}`}
                    title={`Hommage à ${memorial.name}`}
                    description={memorial.bio}
                  />
                </div>

                {/* Gesture Buttons - Summary with totals */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <span>Hommages reçus</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Ces compteurs représentent la somme de tous les gestes 
                          laissés par les visiteurs dans le livre d'or.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <GestureButton
                      type="RIP"
                      count={totals.ripCount}
                      onClick={handleRIPSummary}
                    />
                    <GestureButton
                      type="CANDLE"
                      count={totals.candleCount}
                      onClick={handleCandleSummary}
                      disabled={!userHasPosted}
                    />
                    <GestureButton
                      type="FLOWER"
                      count={totals.flowerCount}
                      onClick={handleFlowerSummary}
                      disabled={!userHasPosted}
                    />
                  </div>
                  {!userHasPosted && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <Info className="w-3 h-3 inline mr-1" />
                      Publiez un message dans le livre d'or pour allumer des cierges ou déposer des fleurs.
                    </p>
                  )}
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
              <GuestbookForm onSubmit={handleSubmitPost} />

              {/* Inferred Relationships */}
              <InferredRelationships messages={messagesForRelationships} />

              {/* Posts List */}
              <div className="divide-y divide-memorial-dark-muted/20">
                {guestbookPosts.map((post) => (
                  <GuestbookPost
                    key={post.id}
                    post={post}
                    isOwner={post.authorId === currentUserId}
                    onAddCandles={handleAddCandles}
                    onAddFlowers={handleAddFlowers}
                  />
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
