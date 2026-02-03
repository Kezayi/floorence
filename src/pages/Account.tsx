import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getRelationWithDeceased } from "@/lib/relationshipInference";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, Heart, Calendar, Bell, Settings, LogOut, ChevronRight, Flame, Loader2, AlertCircle } from "lucide-react";
import { FlameIcon, ChrysanthemumIcon } from "@/components/memorial/MemorialIcons";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface GuestbookPost {
  id: string;
  memorial_id: string;
  content: string;
  relation_category: string;
  created_at: string;
  memorial?: {
    first_name: string;
    last_name: string;
    slug: string;
  };
}

interface Memorial {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  created_at: string;
  is_active: boolean;
}

interface PaymentTransaction {
  id: string;
  amount: number;
  payment_type: string;
  status: string;
  created_at: string;
  metadata: {
    candleCount?: number;
    flowerCount?: number;
    memorialName?: string;
  } | null;
}

const Account = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, completeProfile, updateProfile, isProfileComplete } = useProfile();
  
  const [activeTab, setActiveTab] = useState("profil");
  const [showCompleteProfileDialog, setShowCompleteProfileDialog] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Data states
  const [myPosts, setMyPosts] = useState<GuestbookPost[]>([]);
  const [myMemorials, setMyMemorials] = useState<Memorial[]>([]);
  const [myTransactions, setMyTransactions] = useState<PaymentTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Check if profile needs completion
  useEffect(() => {
    if (profile && !isProfileComplete) {
      setShowCompleteProfileDialog(true);
    }
  }, [profile, isProfileComplete]);

  // Populate form with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  // Fetch user's data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      setLoadingData(true);
      try {
        // Fetch user's guestbook posts with memorial info
        const { data: posts } = await supabase
          .from('guestbook_posts')
          .select(`
            id,
            memorial_id,
            content,
            relation_category,
            created_at,
            memorials:memorial_id (
              first_name,
              last_name,
              slug
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Fetch user's created memorials
        const { data: memorials } = await supabase
          .from('memorials')
          .select('id, first_name, last_name, slug, created_at, is_active')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        // Fetch user's payment transactions
        const { data: transactions } = await supabase
          .from('payment_transactions')
          .select('id, amount, payment_type, status, created_at, metadata')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        // Transform posts data to match interface
        const transformedPosts: GuestbookPost[] = (posts || []).map((post: any) => ({
          id: post.id,
          memorial_id: post.memorial_id,
          content: post.content,
          relation_category: post.relation_category,
          created_at: post.created_at,
          memorial: post.memorials ? {
            first_name: post.memorials.first_name,
            last_name: post.memorials.last_name,
            slug: post.memorials.slug,
          } : undefined,
        }));

        setMyPosts(transformedPosts);
        setMyMemorials(memorials || []);
        setMyTransactions((transactions || []) as PaymentTransaction[]);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleCompleteProfile = async () => {
    if (!displayName.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }

    setIsSaving(true);
    const result = await completeProfile({
      display_name: displayName.trim(),
      phone: phone.trim() || undefined,
    });
    setIsSaving(false);

    if (result.success) {
      toast.success("Profil complété avec succès !");
      setShowCompleteProfileDialog(false);
    } else {
      toast.error("Erreur lors de la mise à jour du profil");
    }
  };

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }

    setIsSaving(true);
    const result = await updateProfile({
      display_name: displayName.trim(),
      phone: phone.trim() || undefined,
    });
    setIsSaving(false);

    if (result.success) {
      toast.success("Profil mis à jour avec succès !");
    } else {
      toast.error("Erreur lors de la mise à jour du profil");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Calculate contribution totals
  const totalAmount = myTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalCandles = myTransactions.reduce((sum, t) => sum + (t.metadata?.candleCount || 0), 0);
  const totalFlowers = myTransactions.reduce((sum, t) => sum + (t.metadata?.flowerCount || 0), 0);

  // Show loading state
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

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

              {/* Profile incomplete warning */}
              {!isProfileComplete && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">Profil incomplet</p>
                    <p className="text-sm text-muted-foreground">
                      Veuillez compléter votre profil pour pouvoir interagir sur la plateforme.
                    </p>
                    <Button 
                      onClick={() => setShowCompleteProfileDialog(true)} 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                    >
                      Compléter mon profil
                    </Button>
                  </div>
                </div>
              )}

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

                      <div className="pt-4 mt-4 border-t border-border">
                        <button 
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left font-sans text-sm text-destructive hover:bg-destructive/10 rounded-sm"
                        >
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
                              Nom complet *
                            </label>
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder="Votre nom complet"
                              className="w-full p-3 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-sans text-muted-foreground mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={user?.email || ""}
                              disabled
                              className="w-full p-3 bg-secondary/50 border-0 font-sans text-muted-foreground cursor-not-allowed"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              L'email ne peut pas être modifié
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-sans text-muted-foreground mb-1">
                              Téléphone
                            </label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+225 XX XX XX XX XX"
                              className="w-full p-3 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <Button 
                            onClick={handleUpdateProfile} 
                            disabled={isSaving}
                            className="mt-4"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enregistrement...
                              </>
                            ) : (
                              "Enregistrer les modifications"
                            )}
                          </Button>
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
                        {loadingData ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : myMemorials.length > 0 ? (
                          myMemorials.map((memorial) => (
                            <Link
                              key={memorial.id}
                              to={`/memorial/${memorial.slug}`}
                              className="block bg-card border border-border rounded-sm p-4 hover:border-foreground/20 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-serif text-lg">
                                    {memorial.first_name} {memorial.last_name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground font-sans">
                                    Créé le {new Date(memorial.created_at).toLocaleDateString("fr-FR")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`px-2 py-1 text-xs font-sans ${
                                      memorial.is_active
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {memorial.is_active ? "Publié" : "Brouillon"}
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
                        {loadingData ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : myPosts.length > 0 ? (
                          myPosts.map((post) => (
                            <Link
                              key={post.id}
                              to={`/memorial/${post.memorial?.slug || post.memorial_id}`}
                              className="block bg-card border border-border rounded-sm p-4 hover:border-foreground/20 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="font-serif text-lg mb-1">
                                    {post.memorial 
                                      ? `${post.memorial.first_name} ${post.memorial.last_name}`
                                      : "Mémorial"
                                    }
                                  </h4>
                                  <p className="text-sm text-muted-foreground font-serif italic line-clamp-2">
                                    "{post.content}"
                                  </p>
                                </div>
                                <span className="px-2 py-1 bg-muted text-xs font-sans shrink-0">
                                  {getRelationWithDeceased(post.relation_category)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground font-sans mt-2">
                                {new Date(post.created_at).toLocaleDateString("fr-FR")}
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
                              {totalAmount.toLocaleString("fr-FR")}
                            </p>
                            <p className="text-xs text-muted-foreground font-sans">FCFA dépensés</p>
                          </div>
                        </div>

                        {/* Transactions List */}
                        {loadingData ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : myTransactions.length > 0 ? (
                          <div className="space-y-3">
                            {myTransactions.map((transaction) => (
                              <div
                                key={transaction.id}
                                className="bg-card border border-border rounded-sm p-4"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex gap-1">
                                      {(transaction.metadata?.candleCount || 0) > 0 && (
                                        <FlameIcon size={18} className="text-amber-500" />
                                      )}
                                      {(transaction.metadata?.flowerCount || 0) > 0 && (
                                        <ChrysanthemumIcon size={18} className="text-green-600" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-sans text-sm">
                                        {transaction.metadata?.candleCount ? `${transaction.metadata.candleCount} cierge(s)` : ''}
                                        {transaction.metadata?.candleCount && transaction.metadata?.flowerCount ? ' + ' : ''}
                                        {transaction.metadata?.flowerCount ? `${transaction.metadata.flowerCount} fleur(s)` : ''}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(transaction.created_at).toLocaleDateString("fr-FR")}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="font-medium text-sm">
                                    {transaction.amount.toLocaleString("fr-FR")} FCFA
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground font-serif py-8 text-center">
                            Vous n'avez pas encore fait de geste symbolique
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </div>
              </Tabs>

              {/* Mobile sign out button */}
              <div className="md:hidden mt-8 pt-4 border-t border-border">
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-sm font-sans"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Complete Profile Dialog */}
      <Dialog open={showCompleteProfileDialog} onOpenChange={setShowCompleteProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Complétez votre profil</DialogTitle>
            <DialogDescription>
              Pour interagir sur Floorence, veuillez compléter vos informations personnelles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-sans text-muted-foreground mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre nom complet"
                className="w-full p-3 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring rounded-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-sans text-muted-foreground mb-1">
                Téléphone (optionnel)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+225 XX XX XX XX XX"
                className="w-full p-3 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring rounded-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCompleteProfile}
              disabled={isSaving || !displayName.trim()}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Valider mon profil"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Account;
