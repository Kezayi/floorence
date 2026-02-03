import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ChevronLeft, ChevronRight, Upload, X, AlertCircle, ShieldAlert, CreditCard, Info, Loader2 } from "lucide-react";
import RelationSelect from "@/components/memorial/RelationSelect";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isFuture, parseISO, isValid } from "date-fns";

type MemorialType = "RECENT" | "PAST" | null;
type Step = 1 | 2 | 3 | 4;

const CreateMemorial = () => {
  const navigate = useNavigate();
  const { isAdminOrMod, loading: roleLoading } = useAdminRole();
  const { data: settings, isLoading: settingsLoading } = useSystemSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [memorialType, setMemorialType] = useState<MemorialType>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    photos: [] as string[],
  });

  const steps = [
    { number: 1, title: "Type d'espace" },
    { number: 2, title: "Informations" },
    { number: 3, title: "Photos" },
    { number: 4, title: "Confirmation" },
  ];

  // Determine if funeral is in the future (higher price) or past (lower price)
  const isFuneralInFuture = useMemo(() => {
    if (!formData.funeralDate) return null;
    try {
      const funeralDateParsed = parseISO(formData.funeralDate);
      return isValid(funeralDateParsed) && isFuture(funeralDateParsed);
    } catch {
      return null;
    }
  }, [formData.funeralDate]);

  // Get the appropriate creation price based on funeral date
  const creationPrice = useMemo(() => {
    if (!settings) return 0;
    // RECENT type: check if funeral is in future or past
    if (memorialType === "RECENT" && isFuneralInFuture !== null) {
      return isFuneralInFuture 
        ? settings.memorial_price_future.amount 
        : settings.memorial_price_past.amount;
    }
    // PAST type: always use past price
    if (memorialType === "PAST") {
      return settings.memorial_price_past.amount;
    }
    return 0;
  }, [settings, memorialType, isFuneralInFuture]);

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

      // Funeral date required for RECENT type
      if (memorialType === "RECENT" && !formData.funeralDate) {
        newErrors.funeralDate = "La date des obsèques est obligatoire pour un décès récent";
      }

      if (!formData.authorRelation) {
        newErrors.authorRelation = "Votre lien avec le défunt est obligatoire";
      }

      if (formData.bio.length > 1000) {
        newErrors.bio = "La biographie ne doit pas dépasser 1000 caractères";
      }

      // Heir email is now required
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

  const handleSubmit = () => {
    console.log("Submit memorial:", { memorialType, ...formData });
    // Would redirect to payment
    navigate("/");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (formData.photos.length >= 3) return;
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, photos: "Seules les images sont acceptées" }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photos: "La taille maximum est de 5 Mo par image" }));
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData((prev) => ({
            ...prev,
            photos: [...prev.photos, event.target!.result as string],
          }));
          setErrors((prev) => {
            const { photos, ...rest } = prev;
            return rest;
          });
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
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

                    {/* Funeral date and location - for RECENT type */}
                    {memorialType === "RECENT" && (
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
                          
                          {/* Pricing indicator */}
                          {formData.funeralDate && isFuneralInFuture !== null && (
                            <div className="mt-2 p-2 rounded-sm text-xs font-sans flex items-center gap-2 bg-primary/10 text-primary">
                              <CreditCard className="w-3 h-3" />
                              Création : {creationPrice.toLocaleString("fr-FR")} FCFA
                              {isFuneralInFuture && (
                                <span className="text-muted-foreground ml-1">(obsèques à venir)</span>
                              )}
                            </div>
                          )}
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

                    <div>
                      <label className="block text-sm font-sans text-muted-foreground mb-2">
                        Votre lien avec le défunt *
                      </label>
                      <RelationSelect
                        value={formData.authorRelation}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, authorRelation: value }))
                        }
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
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>
                              L'héritier numérique pourra reprendre la gestion de cet espace mémoriel 
                              si vous n'êtes plus en mesure de le faire. Cette désignation est obligatoire.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
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

              {/* Step 3: Photos */}
              {currentStep === 3 && (
                <div className="animate-fade-in">
                  <h1 className="text-center mb-4">Photos du défunt</h1>
                  <p className="text-center font-serif text-muted-foreground mb-12">
                    Ajoutez jusqu'à 3 photos pour illustrer l'espace mémoriel
                  </p>

                  {/* Hidden file input */}
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
                            className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-full h-full justify-center"
                          >
                            <Upload className="w-6 h-6" />
                            <span className="text-xs font-sans">Ajouter</span>
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
                      className="btn-memorial"
                    >
                      Continuer
                      <ChevronRight className="w-4 h-4" />
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
                    <h4 className="font-sans text-sm font-medium mb-4">
                      Récapitulatif du paiement
                    </h4>
                    
                    {settingsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="font-sans text-sm">
                            Publication de l'avis
                            {memorialType === "RECENT" && isFuneralInFuture && (
                              <span className="text-muted-foreground ml-1">(obsèques futures)</span>
                            )}
                            {memorialType === "RECENT" && isFuneralInFuture === false && (
                              <span className="text-muted-foreground ml-1">(obsèques passées)</span>
                            )}
                          </span>
                          <span className="font-sans font-medium">{creationPrice.toLocaleString("fr-FR")} FCFA</span>
                        </div>
                        <div className="flex justify-between items-center py-4">
                          <span className="font-sans font-medium">Total</span>
                          <span className="font-serif text-xl">{creationPrice.toLocaleString("fr-FR")} FCFA</span>
                        </div>
                      </>
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
                    <button onClick={handleSubmit} className="btn-memorial" disabled={settingsLoading}>
                      Procéder au paiement
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
