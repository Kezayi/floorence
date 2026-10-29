import ResidenceCountrySelect from "@/components/memorial/ResidenceCountrySelect";
import CivilitySelect from "@/components/account/CivilitySelect";
import { canCompleteIdentity, isCivility, type Civility } from '../../supabase/functions/_shared/civility';
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getRelationWithDeceased } from "@/lib/relationshipInference";
import { inferGender } from "@/lib/genderInference";
import { validateDisplayName } from "@/lib/forbiddenNames";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, Heart, LogOut, ChevronRight, Flame, Loader2, AlertCircle, Share2, Receipt } from "lucide-react";
import AvatarUpload from "@/components/account/AvatarUpload";
import FamilyIdentityAttestation from "@/components/account/FamilyIdentityAttestation";
import PendingMemorialCard, { type PendingMemorial, type MemorialTx } from "@/components/account/PendingMemorialCard";
import { ChrysanthemumIcon } from "@/components/memorial/MemorialIcons";
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
  candle_count: number;
  flower_count: number;
  memorial?: {
    first_name: string;
    last_name: string;
    slug: string;
    share_token: string | null;
  };
}

interface Memorial {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  created_at: string;
  is_active: boolean;
  is_published: boolean;
}


const Account = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, completeProfile, updateProfile, isProfileComplete, refetch: refetchProfile } = useProfile();
  
  const [activeTab, setActiveTab] = useState("profil");
  const [showCompleteProfileDialog, setShowCompleteProfileDialog] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [civility, setCivility] = useState<Civility | null>(null);
  const [residenceCountry, setResidenceCountry] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Data states
  const [myPosts, setMyPosts] = useState<GuestbookPost[]>([]);
  const [myMemorials, setMyMemorials] = useState<Memorial[]>([]);
  const [myTransactions, setMyTransactions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [pendingMemorials, setPendingMemorials] = useState<PendingMemorial[]>([]);
  const [memorialTxByMemorial, setMemorialTxByMemorial] = useState<Record<string, MemorialTx>>({});
  const [reloadKey, setReloadKey] = useState(0);

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
      setCivility(isCivility(profile.civility) ? profile.civility : null);
      setResidenceCountry(profile.residence_country_code ?? null);
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
            candle_count,
            flower_count,
            memorials:memorial_id (
              first_name,
              last_name,
              slug,
              share_token
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Fetch user's created memorials
        const { data: memorials } = await supabase
          .from('memorials')
          .select('id, first_name, last_name, slug, created_at, is_active, is_published, birth_date, death_date, funeral_date, funeral_location, biography, photos, photo_url, default_photo_index')
          .eq('created_by', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        // Fetch user's payment transactions
        const { data: transactions } = await supabase
          .from('payment_transactions')
          .select('id, amount, currency, payment_type, status, created_at, ebilling_reference, metadata, memorial_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });


        // Transform posts data to match interface
        const transformedPosts: GuestbookPost[] = (posts || []).map((post: any) => ({
          id: post.id,
          memorial_id: post.memorial_id,
          content: post.content,
          relation_category: post.relation_category,
          created_at: post.created_at,
          candle_count: post.candle_count || 0,
          flower_count: post.flower_count || 0,
          memorial: post.memorials ? {
            first_name: post.memorials.first_name,
            last_name: post.memorials.last_name,
            slug: post.memorials.slug,
            share_token: post.memorials.share_token,
          } : undefined,
        }));

        setMyPosts(transformedPosts);
        const all = memorials || [];
        setMyMemorials(all.filter((m) => m.is_published));
        setPendingMemorials(all.filter((m) => !m.is_published) as PendingMemorial[]);
        // G1-FIX8-C: memorial-level payment state, aligned with the server guard in ebilling
        // (any pending/success tx blocks a new attempt). Priority: success > pending > latest resolved.
        const txMap: Record<string, MemorialTx> = {};
        // G1-FIX9: a timeout with unknown operator status still blocks (unless closed locally: no operator bill).
        const rank = (s: string, m?: any) => (s === 'success' ? 3 : s === 'pending' ? 2 : s === 'timeout' && m?.local_closure !== 'no_operator_bill' ? 1 : 0);
        (transactions || []).forEach((t: any) => {
          if (t.payment_type !== 'memorial' || !t.memorial_id) return;
          const cur = txMap[t.memorial_id];
          // transactions are ordered desc: keep the first of the highest rank
          if (!cur || rank(t.status, t.metadata) > rank(cur.status, (cur as any).metadata)) txMap[t.memorial_id] = t;
        });
        setMemorialTxByMemorial(txMap);
        setMyTransactions(transactions || []);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchUserData();
  }, [user, reloadKey]);

  const handleCompleteProfile = async () => {
    if (!canCompleteIdentity(profile?.civility_required ?? false, civility)) {
      toast.error("Veuillez choisir votre civilité");
      return;
    }
    if (!profile?.avatar_url) {
      toast.error("Veuillez ajouter une photo de profil");
      return;
    }

    const nameError = validateDisplayName(displayName);
    if (nameError) {
      toast.error(nameError);
      return;
    }

    setIsSaving(true);
    const result = await completeProfile({
      display_name: displayName.trim(),
      phone: phone.trim() || undefined,
      civility: civility ?? undefined,
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
    const nameError = validateDisplayName(displayName);
    if (nameError) {
      toast.error(nameError);
      return;
    }

    setIsSaving(true);
    const result = await updateProfile({
      display_name: displayName.trim(),
      phone: phone.trim() || undefined,
      residence_country_code: residenceCountry,
      civility: civility ?? undefined,
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
              {isCivility(profile?.civility) && profile?.display_name && (
                <p className="font-sans text-foreground mb-2">{profile.civility} {profile.display_name}</p>
              )}
              <p className="font-sans text-muted-foreground mb-8">
                Gérez vos espaces mémoriels et vos hommages
              </p>

              {/* Profile incomplete warning */}
              {isProfileComplete && !isCivility(profile?.civility) && (
                <div className="mb-6 border border-border p-4">
                  <p>Veuillez renseigner votre civilité dans votre profil. Vos services restent accessibles.</p>
                </div>
              )}
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
                  <TabsTrigger value="transactions" className="flex-1 text-xs px-2">
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
                        onClick={() => setActiveTab("transactions")}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left font-sans text-sm transition-colors rounded-sm ${
                          activeTab === "transactions"
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <Receipt className="w-4 h-4" />
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
                        <div className="space-y-6">
                          <CivilitySelect id="profile-civility" value={civility} onChange={setCivility} required={profile?.civility_required} />
                          {/* Avatar Upload */}
                          {user && (
                            <AvatarUpload
                              userId={user.id}
                              currentAvatarUrl={profile?.avatar_url || null}
                              displayName={profile?.display_name || null}
                              onAvatarUpdated={() => { void refetchProfile(); }}
                            />
                          )}

                          <div className="border-t border-border pt-4" />

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
                          <ResidenceCountrySelect id="profile-residence-country" label="Pays de résidence (facultatif, privé)" value={residenceCountry} onChange={setResidenceCountry} />
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
                        ) : myMemorials.length > 0 || pendingMemorials.length > 0 ? (
                          <>
                          {pendingMemorials.map((m) => (
                            <PendingMemorialCard
                              key={m.id}
                              memorial={m}
                              lastTx={memorialTxByMemorial[m.id] ?? null}
                              onChanged={() => setReloadKey((k) => k + 1)}
                            />
                          ))}
                          {myMemorials.map((memorial) => (
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
                          ))}
                          </>
                        ) : (
                          <p className="text-muted-foreground font-serif py-8 text-center">
                            Vous n'avez pas encore créé d'espace mémoriel
                          </p>
                        )}
                        {user && <FamilyIdentityAttestation userId={user.id} />}
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
                          myPosts.map((post) => {
                            const memorialName = post.memorial 
                              ? `${post.memorial.first_name} ${post.memorial.last_name}`
                              : "Mémorial";
                            const memorialUrl = `${window.location.origin}/memorial/${post.memorial?.slug || post.memorial_id}`;
                            const shareText = `Je viens de déposer un hommage et des pensées pieuses pour ${memorialName} sur Fl∞rence. Rejoignez-nous pour honorer sa mémoire : ${memorialUrl}`;

                            const handleShareWhatsApp = (e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
                            };

                            const handleShareFacebook = (e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(memorialUrl)}&quote=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer,width=600,height=400");
                            };

                            const handleShareNative = async (e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (navigator.share) {
                                try {
                                  await navigator.share({ title: `Hommage à ${memorialName}`, text: shareText, url: memorialUrl });
                                } catch { /* user cancelled */ }
                              } else {
                                handleShareWhatsApp(e);
                              }
                            };

                            return (
                              <div
                                key={post.id}
                                className="bg-card border border-border rounded-sm p-4"
                              >
                                <Link to={`/memorial/${post.memorial?.slug || post.memorial_id}`} className="block hover:opacity-80 transition-opacity">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <h4 className="font-serif text-lg mb-1">{memorialName}</h4>
                                      <p className="text-sm text-muted-foreground font-serif italic line-clamp-2">
                                        &ldquo;{post.content}&rdquo;
                                      </p>
                                    </div>
                                    <span className="text-xs font-sans italic text-muted-foreground shrink-0">
                                      {getRelationWithDeceased(post.relation_category, post.memorial ? inferGender(post.memorial.first_name) : undefined)}
                                    </span>
                                  </div>
                                </Link>

                                {/* Gestures + Share row */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                                  <div className="flex items-center gap-4">
                                    <p className="text-xs text-muted-foreground font-sans">
                                      {new Date(post.created_at).toLocaleDateString("fr-FR")}
                                    </p>
                                    {post.candle_count > 0 && (
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Flame className="w-3.5 h-3.5" style={{ color: 'hsl(var(--gesture-candle))' }} />
                                        {post.candle_count}
                                      </span>
                                    )}
                                    {post.flower_count > 0 && (
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <ChrysanthemumIcon size={14} />
                                        {post.flower_count}
                                      </span>
                                    )}
                                  </div>

                                  {/* Share buttons */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={handleShareWhatsApp}
                                      className="p-1.5 rounded-sm hover:bg-muted transition-colors"
                                      aria-label="Partager sur WhatsApp"
                                      title="WhatsApp"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground hover:text-[#25D366] transition-colors">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={handleShareFacebook}
                                      className="p-1.5 rounded-sm hover:bg-muted transition-colors"
                                      aria-label="Partager sur Facebook"
                                      title="Facebook"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground hover:text-[#1877F2] transition-colors">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={handleShareNative}
                                      className="p-1.5 rounded-sm hover:bg-muted transition-colors"
                                      aria-label="Partager mon hommage"
                                      title="Partager"
                                    >
                                      <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-muted-foreground font-serif py-8 text-center">
                            Vous n'avez pas encore laissé d'hommage
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="transactions" className="mt-0">
                      <div className="space-y-4">
                        <h3 className="mb-4">Mes gestes rituels</h3>
                        {loadingData ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : myTransactions.length > 0 ? (
                          myTransactions.map((tx) => {
                            const meta = tx.metadata as Record<string, any> | null;
                            const mode = meta?.mode || "inconnu";
                            const isFree = tx.amount === 0;
                            const statusLabel = tx.status === "SUCCESS" ? "Confirmé" : tx.status === "FAILED" ? "Échoué" : "En attente";
                            const statusColor = tx.status === "SUCCESS" ? "text-emerald-600" : tx.status === "FAILED" ? "text-destructive" : "text-amber-500";
                            const itemLabel = tx.payment_type === "cierge" ? "Cierge" : tx.payment_type === "fleur" ? "Fleur" : tx.payment_type;

                            return (
                              <div key={tx.id} className="bg-card border border-border rounded-sm p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                                      {tx.payment_type === "cierge" ? (
                                        <Flame className="w-4 h-4" style={{ color: 'hsl(var(--gesture-candle))' }} />
                                      ) : (
                                        <ChrysanthemumIcon size={16} />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium font-sans">{itemLabel} × {meta?.quantity || 1}</p>
                                      <p className="text-xs text-muted-foreground font-sans">
                                        {new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold font-sans">
                                      {isFree ? "Offert" : `${tx.amount} ${tx.currency}`}
                                    </p>
                                    <p className={`text-xs font-sans ${statusColor}`}>{statusLabel}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-muted-foreground font-serif py-8 text-center">
                            Vous n'avez pas encore effectué de geste rituel
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
              Pour interagir sur Floorence, veuillez compléter vos informations personnelles et ajouter une photo de profil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <CivilitySelect id="complete-civility" value={civility} onChange={setCivility} required={profile?.civility_required} />
            {/* Avatar Upload in dialog */}
            {user && (
              <div>
                <label className="block text-sm font-sans text-muted-foreground mb-2">
                  Photo de profil *
                </label>
                <AvatarUpload
                  userId={user.id}
                  currentAvatarUrl={profile?.avatar_url || null}
                  displayName={displayName || profile?.display_name || null}
                  onAvatarUpdated={() => { void refetchProfile(); }}
                />
                {!profile?.avatar_url && (
                  <p className="text-xs text-destructive mt-1 font-sans">
                    Une photo de profil est requise pour valider votre inscription.
                  </p>
                )}
              </div>
            )}
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
              disabled={isSaving || !displayName.trim() || !profile?.avatar_url || !canCompleteIdentity(profile?.civility_required ?? false, civility)}
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
