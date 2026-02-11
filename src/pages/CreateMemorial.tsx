import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ChevronLeft, ChevronRight, Upload, X, AlertCircle, ShieldAlert, Loader2, CheckCircle } from "lucide-react";
import RelationSelect, { type RelationSelection } from "@/components/memorial/RelationSelect";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkForbiddenName } from "@/lib/forbiddenNames";

type MemorialType = "RECENT" | "PAST" | null;
type Step = 1 | 2 | 3 | 4;

const CreateMemorial = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdminOrMod, loading: roleLoading } = useAdminRole();
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
  });

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
        if (death < birth) {
          newErrors.deathDate = "La date de décès doit être après la naissance";
        }
      }

      if (!formData.funeralDate) {
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

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
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
        }
      });

      if (createError || !createData?.success) {
        console.error('Create memorial error:', createError || createData?.error);
        toast.error(createData?.error || "Erreur lors de la création de l'espace mémoriel");
        setIsSubmitting(false);
        return;
      }

       toast.success("Espace mémoriel créé avec succès !");
       // Navigate to token URL if available, fallback to slug
       const shareToken = createData.memorial.share_token;
       navigate(shareToken ? `/m/${shareToken}` : `/memorial/${createData.memorial.slug}`);

    } catch (error) {
      console.error('Submit error:', error);
      toast.error("Une erreur est survenue");
      setIsSubmitting(false);
    }
  };

  // Upload photo to Supabase Storage (returns public URL)
  const uploadPhotoToStorage = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    
    const fileExt = file.name.split(".").pop();
    const fileName = `new-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("memorial-photos")
      .upload(filePath, file);

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
                        <input
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              birthDate: e.target.value,
                            }))
                          }
                          className={`w-full p-4 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring ${
                            errors.birthDate ? "ring-1 ring-destructive" : ""
                          }`}
                        />
                        <ErrorMessage message={errors.birthDate} />
                      </div>
                      <div>
                        <label className="block text-sm font-sans text-muted-foreground mb-2">
                          Date de décès *
                        </label>
                        <input
                          type="date"
                          value={formData.deathDate}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              deathDate: e.target.value,
                            }))
                          }
                          className={`w-full p-4 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring ${
                            errors.deathDate ? "ring-1 ring-destructive" : ""
                          }`}
                        />
                        <ErrorMessage message={errors.deathDate} />
                      </div>
                    </div>

                    {/* Funeral date and location */}
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
                            <img
                              src={formData.photos[index]}
                              alt=""
                              className="w-full h-full object-cover"
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
                          <img
                            src={formData.photos[0]}
                            alt=""
                            className="w-full h-full object-cover grayscale"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="mb-2">{formData.name || "Nom du défunt"}</h3>
                        <p className="font-sans text-sm text-muted-foreground mb-2">
                          {formData.birthDate} — {formData.deathDate}
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
                            <img
                              src={photo}
                              alt=""
                              className="w-full h-full object-cover grayscale"
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
                         <h4 className="font-sans text-sm font-medium">Bêta gratuite</h4>
                         <p className="text-xs text-muted-foreground">Création d'espace mémoriel offerte</p>
                      </div>
                     </div>
                     <p className="text-sm text-muted-foreground">
                       Durant la phase bêta, la création d'espaces mémoriels est entièrement gratuite. 
                       Profitez-en pour honorer la mémoire de vos proches.
                     </p>
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
                         "Créer l'espace mémoriel"
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
