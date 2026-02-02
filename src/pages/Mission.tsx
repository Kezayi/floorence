import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Mission = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-24 md:pt-28 pb-20 md:pb-12">
        <article className="container mx-auto px-4 max-w-3xl">
          {/* Title */}
          <header className="text-center mb-12">
            <h1 className="font-serif text-3xl md:text-4xl mb-4">
              La Mission de FLOORENCE
            </h1>
            <p className="text-muted-foreground font-sans text-sm">
              Préserver la mémoire, honorer les morts, servir les vivants
            </p>
          </header>

          {/* Mission Statement */}
          <div className="bg-secondary/50 border-l-4 border-primary/30 p-6 rounded-r mb-12">
            <p className="font-serif text-xl md:text-2xl text-center italic text-foreground">
              "Offrir aux sociétés humaines une infrastructure numérique digne, sobre et durable pour annoncer la mort, honorer les défunts, préserver la mémoire et rendre visibles les liens entre les vivants, sans jamais exploiter l'émotion ni altérer le sens des gestes."
            </p>
          </div>

          <div className="prose prose-memorial max-w-none space-y-10 font-sans text-foreground/90">
            
            <h2 className="font-serif text-2xl mb-6 text-foreground text-center">
              Déclinaison opérationnelle de la mission
            </h2>

            {/* Section 1 */}
            <section>
              <h3 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                1. Annoncer avec clarté et respect
              </h3>
              <p className="mb-4">
                Permettre la publication d'avis de décès et d'informations d'obsèques dans un cadre :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>lisible,</li>
                <li>fiable,</li>
                <li>non intrusif,</li>
                <li>accessible à tous.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section>
              <h3 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                2. Honorer sans interpréter
              </h3>
              <p className="mb-4">
                Mettre à disposition des gestes symboliques (RIP, cierges, fleurs, recueillement) qui :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>respectent les pratiques culturelles existantes,</li>
                <li>n'impliquent aucune hiérarchie,</li>
                <li>ne sont jamais évalués ou comparés.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h3 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                3. Préserver la mémoire dans le temps
              </h3>
              <p className="mb-4">Conserver durablement :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>les avis,</li>
                <li>les messages,</li>
                <li>les images,</li>
                <li>les souvenirs,</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  Afin que la mémoire d'un défunt ne soit ni éphémère, ni dispersée.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h3 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                4. Rendre visibles les liens humains avec responsabilité
              </h3>
              <p className="mb-4">Permettre aux vivants de :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>se situer dans un maillage mémoriel commun,</li>
                <li>retrouver des liens révélés par un décès,</li>
                <li>comprendre les connexions sans les exposer publiquement.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h3 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                5. Servir les vivants sans pression
              </h3>
              <p className="mb-4">Offrir un espace où :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>le silence est légitime,</li>
                <li>l'absence est respectée,</li>
                <li>l'acte reste libre,</li>
                <li>aucune injonction à agir n'est imposée.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h3 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                6. Garantir une gouvernance éthique et transparente
              </h3>
              <p className="mb-4">Assurer que :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>les données sont protégées,</li>
                <li>les administrateurs sont encadrés,</li>
                <li>chaque action est traçable,</li>
                <li>la plateforme ne dérive jamais vers un réseau social.</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h3 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                7. Assurer la pérennité par un modèle économique juste
              </h3>
              <p className="mb-4">Déployer un modèle économique :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>fondé sur des gestes humains existants,</li>
                <li>sans dépendance institutionnelle initiale,</li>
                <li>garantissant la durabilité technique et mémorielle du service.</li>
              </ul>
            </section>

            {/* Synthesis */}
            <section className="mt-8">
              <h3 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                Mission synthétique
              </h3>
              <div className="bg-memorial-dark text-memorial-dark-foreground p-6 rounded-lg">
                <p className="font-serif text-lg md:text-xl text-center italic">
                  "Préserver la mémoire, honorer les morts et servir les vivants, dans un espace numérique digne, sobre et responsable."
                </p>
              </div>
            </section>

            {/* What the mission forbids */}
            <section className="mt-12 pt-8 border-t border-border">
              <h2 className="font-serif text-xl md:text-2xl mb-6 text-foreground text-center">
                Ce que la mission interdit explicitement
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded text-center">
                  <span className="font-serif text-foreground">Capturer l'attention à tout prix</span>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded text-center">
                  <span className="font-serif text-foreground">Transformer le deuil en engagement</span>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded text-center">
                  <span className="font-serif text-foreground">Mesurer la valeur sociale des individus</span>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded text-center">
                  <span className="font-serif text-foreground">Exploiter la culpabilité ou l'absence</span>
                </div>
              </div>
            </section>

          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default Mission;
