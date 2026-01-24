import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ChevronLeft, ChevronRight, Upload, X } from "lucide-react";

type MemorialType = "RECENT" | "PAST" | null;
type Step = 1 | 2 | 3 | 4;

const CreateMemorial = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [memorialType, setMemorialType] = useState<MemorialType>(null);
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    deathDate: "",
    bio: "",
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

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = () => {
    console.log("Submit memorial:", { memorialType, ...formData });
    // Would redirect to payment
    navigate("/");
  };

  const handlePhotoUpload = () => {
    // Mock photo upload
    const mockUrl = `https://images.unsplash.com/photo-${Date.now()}?w=400&h=600&fit=crop`;
    if (formData.photos.length < 3) {
      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, mockUrl],
      }));
    }
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

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
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-sans text-sm ${
                        currentStep >= step.number
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.number}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-12 h-px mx-2 ${
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
                      onClick={() => setMemorialType("RECENT")}
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
                      onClick={() => setMemorialType("PAST")}
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

                  <div className="mt-12 flex justify-center">
                    <button
                      onClick={handleNext}
                      disabled={!memorialType}
                      className="btn-memorial disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="w-full p-4 bg-secondary border-0 font-serif text-lg focus:outline-none focus:ring-1 focus:ring-ring"
                      />
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
                          className="w-full p-4 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
                        />
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
                          className="w-full p-4 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
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
                        className="w-full p-4 bg-secondary border-0 font-serif resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>

                    <div className="pt-4 border-t border-border">
                      <label className="block text-sm font-sans text-muted-foreground mb-2">
                        Email de l'héritier numérique (optionnel)
                      </label>
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
                        className="w-full p-4 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
                      />
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
                      disabled={!formData.name || !formData.birthDate || !formData.deathDate}
                      className="btn-memorial disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[0, 1, 2].map((index) => (
                      <div
                        key={index}
                        className="aspect-[3/4] bg-secondary border border-dashed border-border flex items-center justify-center relative"
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
                              className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handlePhotoUpload}
                            className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Upload className="w-6 h-6" />
                            <span className="text-xs font-sans">Ajouter</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-center text-sm text-muted-foreground font-sans mb-12">
                    La première photo sera utilisée comme portrait principal
                  </p>

                  <div className="flex justify-between">
                    <button onClick={handleBack} className="btn-ghost">
                      <ChevronLeft className="w-4 h-4" />
                      Retour
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={formData.photos.length === 0}
                      className="btn-memorial disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <div>
                        <h3 className="mb-2">{formData.name || "Nom du défunt"}</h3>
                        <p className="font-sans text-sm text-muted-foreground mb-2">
                          {formData.birthDate} — {formData.deathDate}
                        </p>
                        <span className="inline-block px-2 py-1 bg-primary text-primary-foreground text-xs font-sans">
                          {memorialType === "RECENT" ? "Décès récent" : "Mémoire passée"}
                        </span>
                      </div>
                    </div>

                    {formData.bio && (
                      <p className="mt-6 font-serif text-foreground/80 italic line-clamp-3">
                        "{formData.bio}"
                      </p>
                    )}
                  </div>

                  <div className="border border-border p-6 mb-8">
                    <h4 className="font-sans text-sm font-medium mb-4">
                      Récapitulatif du paiement
                    </h4>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="font-sans text-sm">Publication de l'avis</span>
                      <span className="font-sans font-medium">10 000 FCFA</span>
                    </div>
                    <div className="flex justify-between items-center py-4">
                      <span className="font-sans font-medium">Total</span>
                      <span className="font-serif text-xl">10 000 FCFA</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button onClick={handleBack} className="btn-ghost">
                      <ChevronLeft className="w-4 h-4" />
                      Retour
                    </button>
                    <button onClick={handleSubmit} className="btn-memorial">
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
