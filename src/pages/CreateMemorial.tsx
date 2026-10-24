import Photo from "@/components/ui/Photo";
import { preparePhotoUpload } from "@/lib/preparePhotoUpload";
import GeoLandsFields from "@/components/memorial/GeoLandsFields";
import { EMPTY_GEO, normalizeGeo, type GeoLands } from "@/lib/geoLands";
import { isObituaryPromoActive } from "@/lib/obituaryPromo";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ChevronLeft, ChevronRight, Upload, X, AlertCircle, ShieldAlert, Loader2, CheckCircle, Bell, BellOff } from "lucide-react";
import RelationSelect, { type RelationSelection } from "@/components/memorial/RelationSelect";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkForbiddenName } from "@/lib/forbiddenNames";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateMaskedInput } from "@/components/ui/DateMaskedInput";
import { formatDateFrench } from "@/lib/dateUtils";
import { useMonetization } from "@/hooks/useMonetization";
import { classifyMemorialForDisplay } from "@/lib/memorialPricing";

type MemorialType = "RECENT" | "PAST" | null;
type Step = 1 | 2 | 3 | 4;

const CreateMemorial = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdminOrMod, loading: roleLoading } = useAdminRole();
  const { data: systemSettings } = useSystemSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [memorialType, setMemorialType] = useState<MemorialType>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    deathDate: "",
    funeralDate: "",
    funeralLocation: "",
    bio: "",
    authorRelation: "",
    heirEmail: "",
    enableContributions: false,
    photos: [] as string[], // Storage URLs (not base64)
    notificationFrequency: null as string | null, // null = use admin default
    notificationStartDay: null as number | null,
    notificationEndDay: null as number | null,
  });
  const [geo, setGeo] = useState<GeoLands>(EMPTY_GEO);

  // G1-FIX7: active tariff for the computed category (server re-checks everything).
  const { data: monetization } = useMonetization();
  const [payerPhone, setPayerPhone] = useState("");
  const [createdMemorial, setCreatedMemorial] = useState<{ id: string; slug: string; share_token?: string } | null>(null);
  const [paymentState, setPaymentState] = useState<{ status: "pending" | "failed" | "timeout"; reference?: string; message?: string; checkoutUrl?: string } | null>(null);
  const displayCategory = classifyMemorialForDisplay(formData.deathDate, formData.funeralDate);
  const displayPrice = systemSettings && displayCategory
    ? (displayCategory === "future" ? systemSettings.memorial_price_future.amount : systemSettings.memorial_price_past.amount)
    : null;
  const promoDisplay = displayCategory === "future" && !!systemSettings && isObituaryPromoActive(systemSettings.obituary_free_campaign);
  const requiresPaymentDisplay = !promoDisplay && (displayPrice ?? 0) > 0;



  const steps = [
    { number: 1, title: "Type d'espace" },
    { number: 2, title: "Informations" },
    { number: 3, title: "Photos" },
    { number: 4, title: "Confirmation" },
  ];

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!memorialType) {
        newErrors.memorialType = "Veuillez choisir un type d'espace";
      }
    }

    if (step === 2) {
      if (!formData.name.trim()) {
        newErrors.name = "Le nom est obligatoire";
      } else if (formData.name.trim().length < 3) {
        newErrors.name = "Le nom doit contenir au moins 3 caractères";
      } else if (formData.name.trim().length > 100) {
        newErrors.name = "Le nom ne doit pas dépasser 100 caractères";
      }

      if (!formData.birthDate) {
        newErrors.birthDate = "La date de naissance est obligatoire";
      }

      if (!formData.deathDate) {
        newErrors.deathDate = "La date de décès est obligatoire";
      }

      if (formData.birthDate && formData.deathDate) {
        const birth = new Date(formData.birthDate);
        const death = new Date(formData.deathDate);
        if (death <= birth) {
          newErrors.deathDate = "La date de décès doit être strictement postérieure à la date de naissance";
        }
      }

      // Funeral date required only if death date is in the past or today
      const deathIsInFuture = formData.deathDate && new Date(formData.deathDate) > new Date();
      if (!deathIsInFuture && !formData.funeralDate) {
        newErrors.funeralDate = "La date des obsèques est obligatoire";
      }

      if (!formData.authorRelation) {
        newErrors.authorRelation = "Votre lien avec le défunt est obligatoire";
      }

      if (formData.bio.length > 1000) {
        newErrors.bio = "La biographie ne doit pas dépasser 1000 caractères";
      }

      if (!formData.heirEmail) {
        newErrors.heirEmail = "L'email de l'héritier numérique est obligatoire";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.heirEmail)) {
        newErrors.heirEmail = "Format d'email invalide";
      }
    }

    if (step === 3) {
      if (formData.photos.length === 0) {
        newErrors.photos = "Au moins une photo est requise";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setErrors({});
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const goToMemorial = (m: { share_token?: string; slug: string }) =>
    navigate(m.share_token ? `/m/${m.share_token}` : `/memorial/${m.slug}`);

  // G1-FIX7: poll the existing check-status route until a terminal state.
  const pollPayment = async (reference: string, memorial: { share_token?: string; slug: string }) => {
    for (let i = 0; i < 36; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const { data } = await supabase.functions.invoke("ebilling", { body: { action: "check-status", reference } });
      if (data?.status === "success") {
        toast.success("Paiement confirmé — espace mémoriel publié");
        goToMemorial(memorial);
        return;
      }
      if (data?.status === "failed" || data?.status === "expired" || data?.status === "cancelled") {
        setPaymentState({ status: "failed", reference, message: data?.message });
        setIsSubmitting(false);
        return;
      }
    }
    setPaymentState({ status: "timeout", reference, message: "Délai dépassé. Votre espace reste non publié ; vous pouvez réessayer." });
    setIsSubmitting(false);
  };

  const startMemorialPayment = async (memorial: { id: string; share_token?: string; slug: string }) => {
    const { data, error } = await supabase.functions.invoke("ebilling", {
      body: { memorial_id: memorial.id, item_type: "memorial", quantity: 1, phone: payerPhone.replace(/\s+/g, "") },
    });
    if (error || !data?.success) {
      setPaymentState({ status: "failed", message: data?.error || "Le paiement n'a pas pu être initié. Votre espace n'est pas publié." });
      setIsSubmitting(false);
      return;
    }
    setPaymentState({ status: "pending", reference: data.reference, message: data.message, checkoutUrl: data.checkout_url });
    pollPayment(data.reference, memorial);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (requiresPaymentDisplay && !/^\+?\d{8,15}$/.test(payerPhone.replace(/\s+/g, ""))) {
      setErrors({ payerPhone: "Numéro Mobile Money requis" });
      return;
    }

    // Retry after a failed payment: memorial already exists (unpublished).
    if (createdMemorial) {
      setIsSubmitting(true);
      await startMemorialPayment(createdMemorial);
      return;
    }

    // Validate user profile name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user?.id)
      .single();

    if (profile?.display_name) {
      const forbidden = checkForbiddenName(profile.display_name);
      if (forbidden) {
        toast.error("Veuillez mettre à jour votre profil avec votre vrai nom avant de créer un espace mémoriel.");
        navigate("/compte");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const nameParts = formData.name.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "";

      const { data: createData, error: createError } = await supabase.functions.invoke('create-memorial', {
        body: {
          firstName,
          lastName,
          birthDate: formData.birthDate,
          deathDate: formData.deathDate,
          funeralDate: formData.funeralDate || undefined,
          funeralLocation: formData.funeralLocation || undefined,
          biography: formData.bio || undefined,
          authorRelation: formData.authorRelation,
          heirEmail: formData.heirEmail,
          enableContributions: formData.enableContributions,
          photoUrl: formData.photos[0] || undefined,
          photos: formData.photos,
          notificationFrequency: formData.notificationFrequency || undefined,
          notificationStartDay: formData.notificationStartDay ?? undefined,
          notificationEndDay: formData.notificationEndDay ?? undefined,
          geo: normalizeGeo(geo),
        }
      });

      if (createError || !createData?.success) {
        console.error('Create memorial error:', createError || createData?.error);
        toast.error(createData?.error || "Erreur lors de la création de l'espace mémoriel");
        setIsSubmitting(false);
        return;
      }

      const memorial = createData.memorial;
      if (createData.requires_payment) {
        setCreatedMemorial(memorial);
        toast.message(`Espace enregistré, non publié. Paiement de ${Number(createData.price).toLocaleString("fr-FR")} XAF requis.`);
        await startMemorialPayment(memorial);
        return;
      }

      toast.success("Espace mémoriel créé et publié !");
      goToMemorial(memorial);

    } catch (error) {
      console.error('Submit error:', error);
      toast.error("Une erreur est survenue");
      setIsSubmitting(false);
    }
  };

  // Upload photo to Supabase Storage (returns public URL)
  const uploadPhotoToStorage = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    
    const prepared = await preparePhotoUpload(file);
    const fileExt = prepared.name.split(".").pop();
    const fileName = `new-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("memorial-photos")
      .upload(filePath, prepared);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from("memorial-photos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 3 - formData.photos.length;
    if (remainingSlots <= 0) {
      toast.error("Maximum 3 photos autorisées");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploadingPhoto(true);

    for (const file of filesToUpload) {
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, photos: "Seules les images sont acceptées" }));
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photos: "La taille maximum est de 5 Mo par image" }));
        continue;
      }

      const url = await uploadPhotoToStorage(file);
      if (url) {
        setFormData((prev) => ({
          ...prev,
          photos: [...prev.photos, url],
        }));
        setErrors((prev) => {
          const { photos, ...rest } = prev;
          return rest;
        });
      } else {
        toast.error("Erreur lors de l'upload de la photo");
      }
    }

    setIsUploadingPhoto(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const ErrorMessage = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <p className="flex items-center gap-1 text-destructive text-xs font-sans mt-1">
        <AlertCircle className="w-3 h-3" />
        {message}
      </p>
    );
  };

  // Block admins/moderators from creating memorials
  if (!roleLoading && isAdminOrMod) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-16 md:pt-20">
          <section className="section-padding">
            <div className="container mx-auto">
              <div className="max-w-lg mx-auto text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8 text-muted-foreground" />
                </div>
                <h1 className="mb-4">Accès restreint</h1>
                <p className="font-serif text-muted-foreground mb-8">
                  En tant qu'administrateur ou modérateur, vous ne pouvez pas créer d'espace mémoriel avec ce compte.
                  Veuillez utiliser un compte personnel.
                </p>
                <button onClick={() => navigate("/")} className="btn-memorial">
                  Retour à l'accueil
                </button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-16 md:pt-20">
        <section className="section-padding">
          <div className="container mx-auto">
            <div className="max-w-2xl mx-auto">
              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-2 mb-12">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-sans text-sm transition-all ${
                        currentStep >= step.number
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.number}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-12 h-px mx-2 transition-all ${
                          currentStep > step.number ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Type */}
              {currentStep === 1 && (
                <div className="animate-fade-in">
                  <h1 className="text-center mb-4">Type d'espace mémoriel</h1>
                  <p className="text-center font-serif text-muted-foreground mb-12">
                    Choisissez le type d'espace adapté à votre situation
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <button
                      onClick={() => {
                        setMemorialType("RECENT");
                        setErrors({});
                      }}
                      className={`p-8 border text-left transition-all ${
                        memorialType === "RECENT"
                          ? "border-primary bg-secondary"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <h3 className="mb-2">Décès récent</h3>
                      <p className="font-sans text-sm text-muted-foreground">
                        Pour un décès récent avec obsèques à venir.
                        Inclut le programme des cérémonies et les contributions.
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setMemorialType("PAST");
                        setErrors({});
                      }}
                      className={`p-8 border text-left transition-all ${
                        memorialType === "PAST"
                          ? "border-primary bg-secondary"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <h3 className="mb-2">Mémoire passée</h3>
                      <p className="font-sans text-sm text-muted-foreground">
                        Pour honorer la mémoire d'un proche disparu.
                        Permet d'organiser des recueillements commémoratifs.
                      </p>
                    </button>
                  </div>

                  <ErrorMessage message={errors.memorialType} />

                  <div className="mt-12 flex justify-center">
                    <button
                      onClick={handleNext}
                      className="btn-memorial"
                    >
                      Continuer
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Information */}
              {currentStep === 2 && (
                <div className="animate-fade-in">
                  <h1 className="text-center mb-4">Informations du défunt</h1>
                  <p className="text-center font-serif text-muted-foreground mb-12">
                    Ces informations seront visibles sur l'espace mémoriel
                  </p>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-sans text-muted-foreground mb-2">
                        Nom complet du défunt *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Prénom et Nom"
                        className={`w-full p-4 bg-secondary border-0 font-serif text-lg focus:outline-none focus:ring-1 focus:ring-ring ${
                          errors.name ? "ring-1 ring-destructive" : ""
                        }`}
                      />
                      <ErrorMessage message={errors.name} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-sans text-muted-foreground mb-2">
                          Date de naissance *
                        </label>
                        <DateMaskedInput
                          value={formData.birthDate}
                          onChange={(val) =>
                            setFormData((prev) => ({ ...prev, birthDate: val }))
                          }
                          hasError={!!errors.birthDate}
                        />
                        <ErrorMessage message={errors.birthDate} />
                      </div>
                      <div>
                        <label className="block text-sm font-sans text-muted-foreground mb-2">
                          Date de décès *
                        </label>
                        <DateMaskedInput
                          value={formData.deathDate}
                          onChange={(val) =>
                            setFormData((prev) => ({ ...prev, deathDate: val }))
                          }
                          hasError={!!errors.deathDate}
                        />
                        <ErrorMessage message={errors.deathDate} />
                      </div>
                    </div>

                    {/* Funeral date and location — hidden if death date is in the future */}
                    {!(formData.deathDate && new Date(formData.deathDate) > new Date()) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div>
                        <label className="block text-sm font-sans text-muted-foreground mb-2">
                          Date des obsèques *
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.funeralDate}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              funeralDate: e.target.value,
                            }))
                          }
                          className={`w-full p-4 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring ${
                            errors.funeralDate ? "ring-1 ring-destructive" : ""
                          }`}
                        />
                        <ErrorMessage message={errors.funeralDate} />
                        <p className="text-xs text-muted-foreground mt-1">
                          Si la date n'est pas encore fixée, veuillez saisir une date indicative. Elle pourra être modifiée plus tard.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-sans text-muted-foreground mb-2">
                          Lieu des obsèques
                        </label>
                        <input
                          type="text"
                          value={formData.funeralLocation}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              funeralLocation: e.target.value,
                            }))
                          }
                          placeholder="Église, cimetière, domicile..."
                          className="w-full p-4 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </div>
                    )}

                    <GeoLandsFields value={geo} onChange={setGeo} />

                    <div>
                      <label className="block text-sm font-sans text-muted-foreground mb-2">
                        Votre lien avec le défunt *
                      </label>
                      <RelationSelect
                        value={formData.authorRelation}
                        onChange={(sel: RelationSelection) =>
                          setFormData((prev) => ({ ...prev, authorRelation: sel.link }))
                        }
                        variant="light"
                      />
                      <ErrorMessage message={errors.authorRelation} />
                    </div>

                    <div>
                      <label className="block text-sm font-sans text-muted-foreground mb-2">
                        Biographie / Hommage
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bio: e.target.value }))
                        }
                        placeholder="Quelques mots sur la vie du défunt..."
                        rows={5}
                        className={`w-full p-4 bg-secondary border-0 font-serif resize-none focus:outline-none focus:ring-1 focus:ring-ring ${
                          errors.bio ? "ring-1 ring-destructive" : ""
                        }`}
                      />
                      <div className="flex justify-between mt-1">
                        <ErrorMessage message={errors.bio} />
                        <span className="text-xs text-muted-foreground font-sans">
                          {formData.bio.length}/1000
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="block text-sm font-sans text-muted-foreground">
                          Email de l'héritier numérique *
                        </label>
                      </div>
                       <p className="text-xs text-muted-foreground mb-2">
                         L'héritier numérique pourra reprendre la gestion de cet espace mémoriel si vous n'êtes plus en mesure de le faire.
                       </p>
                      <input
                        type="email"
                        value={formData.heirEmail}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            heirEmail: e.target.value,
                          }))
                        }
                        placeholder="email@exemple.com"
                        className={`w-full p-4 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring ${
                          errors.heirEmail ? "ring-1 ring-destructive" : ""
                        }`}
                      />
                      <ErrorMessage message={errors.heirEmail} />
                      <p className="text-xs text-muted-foreground mt-2 font-sans">
                        Cette personne pourra gérer l'espace après validation par l'administrateur
                      </p>
                    </div>

                    {memorialType === "RECENT" && (
                      <div className="pt-4 border-t border-border">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.enableContributions}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                enableContributions: e.target.checked,
                              }))
                            }
                            className="w-5 h-5 rounded-sm border-border"
                          />
                          <span className="font-sans text-sm">
                            Activer les contributions pour les frais d'obsèques
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="mt-12 flex justify-between">
                    <button onClick={handleBack} className="btn-ghost">
                      <ChevronLeft className="w-4 h-4" />
                      Retour
                    </button>
                    <button
                      onClick={handleNext}
                      className="btn-memorial"
                    >
                      Continuer
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Photos — Upload direct to Storage */}
              {currentStep === 3 && (
                <div className="animate-fade-in">
                  <h1 className="text-center mb-4">Photos du défunt</h1>
                  <p className="text-center font-serif text-muted-foreground mb-12">
                    Ajoutez jusqu'à 3 photos pour illustrer l'espace mémoriel
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {[0, 1, 2].map((index) => (
                      <div
                        key={index}
                        className={`aspect-[3/4] bg-secondary border border-dashed flex items-center justify-center relative transition-all ${
                          errors.photos ? "border-destructive" : "border-border"
                        }`}
                      >
                        {formData.photos[index] ? (
                          <>
                            <Photo
                              src={formData.photos[index]}
                              alt={`Portrait de ${formData.name || "la personne défunte"}`}
                              targetWidth={300}
                            />
                            <button
                              onClick={() => removePhoto(index)}
                              className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            {index === 0 && (
                              <span className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-0.5 font-sans">
                                Principal
                              </span>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingPhoto}
                            className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-full h-full justify-center"
                          >
                            {isUploadingPhoto ? (
                              <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                              <>
                                <Upload className="w-6 h-6" />
                                <span className="text-xs font-sans">Ajouter</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <ErrorMessage message={errors.photos} />

                  <p className="text-center text-sm text-muted-foreground font-sans mb-12 mt-4">
                    Formats acceptés : JPG, PNG, WEBP • Taille max : 5 Mo par image
                  </p>

                  <div className="flex justify-between">
                    <button onClick={handleBack} className="btn-ghost">
                      <ChevronLeft className="w-4 h-4" />
                      Retour
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={isUploadingPhoto}
                      className="btn-memorial"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Upload en cours...
                        </>
                      ) : (
                        <>
                          Continuer
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === 4 && (
                <div className="animate-fade-in">
                  <h1 className="text-center mb-4">Confirmation</h1>
                  <p className="text-center font-serif text-muted-foreground mb-12">
                    Vérifiez les informations avant de procéder au paiement
                  </p>

                  <div className="bg-secondary p-8 mb-8">
                    <div className="flex items-start gap-6">
                      {formData.photos[0] && (
                        <div className="w-24 h-32 flex-shrink-0">
                          <Photo
                            src={formData.photos[0]}
                            alt={`Portrait de ${formData.name || "la personne défunte"}`}
                            tone="memorial" targetWidth={200}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="mb-2">{formData.name || "Nom du défunt"}</h3>
                        <p className="font-sans text-sm text-muted-foreground mb-2">
                          {formatDateFrench(formData.birthDate)} — {formatDateFrench(formData.deathDate)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-block px-2 py-1 bg-primary text-primary-foreground text-xs font-sans">
                            {memorialType === "RECENT" ? "Décès récent" : "Mémoire passée"}
                          </span>
                          <span className="inline-block px-2 py-1 bg-muted text-muted-foreground text-xs font-sans">
                            Par {formData.authorRelation}
                          </span>
                        </div>
                      </div>
                    </div>

                    {formData.bio && (
                      <p className="mt-6 font-serif text-foreground/80 italic line-clamp-3">
                        "{formData.bio}"
                      </p>
                    )}

                    {formData.photos.length > 1 && (
                      <div className="mt-4 flex gap-2">
                        {formData.photos.slice(1).map((photo, index) => (
                          <div key={index} className="w-12 h-16">
                            <Photo
                              src={photo}
                              alt={`Portrait de ${formData.name || "la personne défunte"}`}
                              tone="memorial" targetWidth={200}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-border p-6 mb-8">
                     <div className="flex items-center gap-3 mb-4">
                       <CheckCircle className="w-6 h-6 text-primary" />
                       <div>
                         <h4 className="font-sans text-sm font-medium">
                           {displayCategory === "future" ? "Nouveau décès" : displayCategory === "past" ? "Publication historique" : "Publication"}
                         </h4>
                         <p className="text-xs text-muted-foreground">
                           {displayPrice === null
                             ? "Tarif en cours de chargement…"
                             : requiresPaymentDisplay
                               ? `${displayPrice.toLocaleString("fr-FR")} XAF`
                               : promoDisplay
                                 ? `0 XAF — publication de l'avis offerte (au lieu de ${(displayPrice ?? 0).toLocaleString("fr-FR")} XAF). Cierges et fleurs restent payants.`
                                 : "Publication offerte"}
                         </p>
                      </div>
                     </div>
                     <p className="text-sm text-muted-foreground">
                       {requiresPaymentDisplay
                         ? "L'espace sera publié dès la confirmation de votre paiement mobile (Airtel Money ou Moov Money). Le tarif définitif est vérifié au moment du paiement."
                         : "L'espace sera publié immédiatement après sa création."}
                     </p>

                     {requiresPaymentDisplay && !paymentState && (
                       <div className="mt-4">
                         <Label htmlFor="memorial-payer-phone" className="text-xs">Numéro Mobile Money</Label>
                         <Input
                           id="memorial-payer-phone"
                           inputMode="tel"
                           placeholder="24107XXXXXXX"
                           value={payerPhone}
                           onChange={(e) => setPayerPhone(e.target.value)}
                           className="mt-1"
                         />
                         {errors.payerPhone && <p className="text-xs text-destructive mt-1">{errors.payerPhone}</p>}
                       </div>
                     )}

                     {paymentState && (
                       <div className="mt-4 text-sm" role="status" aria-live="polite">
                         {paymentState.status === "pending" && (
                           <p className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{paymentState.message || "Paiement en attente. Validez sur votre téléphone."}</p>
                         )}
                         {(paymentState.status === "failed" || paymentState.status === "timeout") && (
                           <div>
                             <p className="text-destructive">{paymentState.message || "Le paiement n'a pas abouti. Votre espace n'est pas publié."}</p>
                             <button type="button" className="btn-ghost mt-2" onClick={() => setPaymentState(null)}>Réessayer le paiement</button>
                           </div>
                         )}
                         {paymentState.checkoutUrl && paymentState.status === "pending" && (
                           <a href={paymentState.checkoutUrl} target="_blank" rel="noreferrer" className="underline text-xs mt-2 inline-block">Finaliser via le portail de paiement</a>
                         )}
                       </div>
                     )}
                  </div>

                  {/* Notification Preferences */}
                  <div className="border border-border p-6 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <Bell className="w-5 h-5 text-primary" />
                      <div>
                        <h4 className="font-sans text-sm font-medium">Paramètres de la Mémoire</h4>
                        <p className="text-xs text-muted-foreground">
                          Contrôlez la fréquence des rappels pour cet espace
                        </p>
                      </div>
                    </div>

                    <RadioGroup
                      value={formData.notificationFrequency || 'default'}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          notificationFrequency: val === 'default' ? null : val,
                        }))
                      }
                      className="space-y-2"
                    >
                      <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="default" id="notif-default" className="mt-0.5" />
                        <div>
                          <Label htmlFor="notif-default" className="font-sans text-sm font-medium cursor-pointer">
                            Par défaut ({systemSettings?.notification_frequency.frequency === 'weekly_saturday' ? 'Hebdo samedi' : systemSettings?.notification_frequency.frequency === 'monthly_window' ? 'Fenêtre mensuelle' : systemSettings?.notification_frequency.frequency === 'none' ? 'Aucune' : 'Immédiat'})
                          </Label>
                          <p className="text-xs text-muted-foreground">Les réglages de la PME iNTERFACE s'appliquent</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="weekly_saturday" id="notif-weekly" className="mt-0.5" />
                        <div>
                          <Label htmlFor="notif-weekly" className="font-sans text-sm font-medium cursor-pointer">
                            Hebdomadaire (samedi)
                          </Label>
                          <p className="text-xs text-muted-foreground">Digest chaque samedi matin</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="monthly_window" id="notif-monthly" className="mt-0.5" />
                        <div>
                          <Label htmlFor="notif-monthly" className="font-sans text-sm font-medium cursor-pointer">
                            Fenêtre mensuelle
                          </Label>
                          <p className="text-xs text-muted-foreground">Rappels pendant la période de paie</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="none" id="notif-none" className="mt-0.5" />
                        <div className="flex items-center gap-2">
                          <div>
                            <Label htmlFor="notif-none" className="font-sans text-sm font-medium cursor-pointer flex items-center gap-1.5">
                              <BellOff className="w-3.5 h-3.5" />
                              Silence total
                            </Label>
                            <p className="text-xs text-muted-foreground">Aucune notification — sanctuaire de recueillement volontaire</p>
                          </div>
                        </div>
                      </div>
                    </RadioGroup>

                    {formData.notificationFrequency === 'monthly_window' && (
                      <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                        <p className="text-xs font-sans text-muted-foreground font-medium">Période d'envoi mensuelle</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Du jour</Label>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              value={formData.notificationStartDay ?? 25}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  notificationStartDay: parseInt(e.target.value) || 25,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Au jour</Label>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              value={formData.notificationEndDay ?? 5}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  notificationEndDay: parseInt(e.target.value) || 5,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Heir email reminder */}
                  <div className="bg-muted/50 p-4 rounded-sm mb-8">
                    <p className="text-sm font-sans">
                      <strong>Héritier numérique désigné :</strong> {formData.heirEmail}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cette personne recevra un email pour confirmer son rôle d'héritier numérique.
                    </p>
                  </div>

                  <div className="flex justify-between">
                    <button onClick={handleBack} className="btn-ghost">
                      <ChevronLeft className="w-4 h-4" />
                      Retour
                    </button>
                    <button 
                      onClick={handleSubmit} 
                      className="btn-memorial" 
                       disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Création en cours...
                        </>
                      ) : (
                         requiresPaymentDisplay ? (createdMemorial ? "Relancer le paiement" : "Créer et payer") : "Créer l'espace mémoriel"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CreateMemorial;
