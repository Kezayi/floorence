import { useSEO } from "@/hooks/useSEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Shield, Heart } from "lucide-react";

const sections = [
  {
    title: "Général & Inscription",
    icon: HelpCircle,
    items: [
      {
        q: "Qu'est-ce que Fl∞rence ?",
        a: "Fl∞rence est un espace mémoriel numérique haute fidélité. C'est un sanctuaire sécurisé où les familles peuvent honorer leurs défunts à travers un livre d'or interactif, un arbre de lignage à 9 niveaux et une visualisation unique de leur maillage social.",
      },
      {
        q: "Le service est-il gratuit ?",
        a: "La consultation des mémoriaux et le dépôt d'hommages sont gratuits. Cependant, l'anonymat est proscrit pour garantir la dignité des échanges : la création et la gestion d'un mémorial nécessitent donc une inscription obligatoire.",
      },
      {
        q: "Pourquoi l'anonymat est-il interdit ?",
        a: "Pour préserver la solennité de l'espace et éviter les abus. Chaque contributeur doit être identifié, assurant ainsi aux familles que seuls des hommages authentiques et respectueux sont publiés.",
      },
    ],
  },
  {
    title: "L'Héritage Numérique",
    icon: Shield,
    items: [
      {
        q: "Qu'est-ce qu'un Héritier Numérique ?",
        a: "C'est le « Gardien de la Mémoire ». L'Héritier Numérique est la personne (parent, enfant ou proche désigné) responsable de la gestion du mémorial. Il modère les messages, valide les liens de parenté dans l'arbre de lignage et veille à la pérennité de l'espace.",
      },
      {
        q: "Pourquoi ne puis-je pas voir l'email de l'Héritier Numérique ?",
        a: "Pour protéger les familles contre le spam, le harcèlement ou les tentatives d'arnaque. Fl∞rence applique un protocole « Security Shield » : vous pouvez contacter l'héritier via notre formulaire de contact sécurisé. Votre message lui sera transmis sans que son adresse email personnelle ne vous soit jamais exposée.",
      },
    ],
  },
  {
    title: "Hommages & Évolutions",
    icon: Heart,
    items: [
      {
        q: "Est-ce payant d'allumer un cierge ou de déposer des fleurs ?",
        a: "Actuellement, ces gestes de mémoire sont offerts pour accompagner le lancement de la plateforme. À terme, l'allumage de cierges ou le fleurissement d'un espace seront soumis à une contribution financière symbolique afin de soutenir la maintenance technique à vie des mémoriaux.",
      },
    ],
  },
];

const FAQ = () => {
  useSEO({
    title: "FAQ — Centre d'Aide",
    description: "Retrouvez les réponses à vos questions sur Fl∞rence : inscription, héritage numérique, hommages et sécurité des données.",
  });

  return (
    <>
      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="section-padding bg-muted/30">
          <div className="container mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-4">
              Foire Aux Questions
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Tout ce que vous devez savoir sur Fl∞rence, votre sanctuaire mémoriel sécurisé.
            </p>
          </div>
        </section>

        {/* FAQ Sections */}
        <section className="section-padding">
          <div className="container mx-auto max-w-3xl space-y-12">
            {sections.map((section) => (
              <div key={section.title}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="font-serif text-xl md:text-2xl font-medium text-foreground">
                    {section.title}
                  </h2>
                </div>

                <Accordion type="single" collapsible className="space-y-2">
                  {section.items.map((item, idx) => (
                    <AccordionItem
                      key={idx}
                      value={`${section.title}-${idx}`}
                      className="border border-border/50 rounded-lg px-5 will-change-[height] [contain:content]"
                    >
                      <AccordionTrigger className="text-left font-sans text-base font-medium hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default FAQ;
