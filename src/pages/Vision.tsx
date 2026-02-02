import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Vision = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-24 md:pt-28 pb-20 md:pb-12">
        <article className="container mx-auto px-4 max-w-3xl">
          {/* Title */}
          <header className="text-center mb-12">
            <h1 className="font-serif text-3xl md:text-4xl mb-4">
              La Vision de FLOORENCE
            </h1>
            <p className="text-muted-foreground font-sans text-sm">
              L'infrastructure mémorielle numérique de référence
            </p>
          </header>

          {/* Mission Statement */}
          <div className="bg-secondary/50 border-l-4 border-primary/30 p-6 rounded-r mb-12">
            <p className="font-serif text-xl md:text-2xl text-center italic text-foreground">
              "FLOORENCE ambitionne de devenir l'infrastructure mémorielle numérique de référence, là où les vivants honorent les morts et où la mémoire devient un service durable rendu aux générations."
            </p>
          </div>

          <div className="prose prose-memorial max-w-none space-y-10 font-sans text-foreground/90">
            
            {/* Section 1 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                1. Une vision née d'un constat universel
              </h2>
              <p className="mb-4">
                La mort est universelle. Le deuil est universel. Les gestes qui l'accompagnent — annoncer, se rassembler, honorer, se souvenir — sont anciens, constants et profondément humains.
              </p>
              <p className="mb-4">
                Pourtant, dans le monde numérique contemporain :
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>ces gestes sont soit ignorés,</li>
                <li>soit dilués dans des réseaux sociaux inadaptés,</li>
                <li>soit réduits à des publications éphémères.</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">FLOORENCE part d'un refus clair :</strong> laisser les morts sombrer dans l'oubli numérique.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                2. De la mémoire comme infrastructure, pas comme contenu
              </h2>
              <p className="mb-4 font-serif text-lg italic text-center bg-secondary/30 p-4 rounded">
                "La mémoire n'est pas un contenu à consommer, mais une infrastructure à préserver."
              </p>
              <p className="mb-4">FLOORENCE ne cherche pas à :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>capter l'attention,</li>
                <li>retenir l'utilisateur,</li>
                <li>créer de l'engagement artificiel.</li>
              </ul>
              <p className="mb-4">FLOORENCE cherche à :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>structurer la mémoire,</li>
                <li>rendre les liens visibles sans les juger,</li>
                <li>offrir un lieu stable, transmissible, durable.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                3. Servir les vivants sans exploiter l'émotion
              </h2>
              <p className="mb-4">La vision de FLOORENCE est profondément éthique :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>La plateforme ne pousse jamais à agir.</li>
                <li>Elle ne suggère pas de gestes.</li>
                <li>Elle ne relance pas émotionnellement.</li>
                <li>Elle n'interprète jamais ce que vaut un geste.</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong className="text-foreground">Le silence est reconnu comme une présence possible.</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  L'absence n'est jamais exploitée. FLOORENCE ne remplace pas la conscience humaine. Elle l'accompagne avec retenue.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                4. Rendre visibles les liens sans les hiérarchiser
              </h2>
              <p className="mb-4">Un décès révèle toujours plus que la perte d'une personne :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>il révèle des familles,</li>
                <li>des amitiés,</li>
                <li>des relations parfois oubliées,</li>
                <li>des réseaux humains invisibles.</li>
              </ul>
              <p className="mb-4">La vision de FLOORENCE est de :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>cartographier ces liens avec responsabilité,</li>
                <li>déduire sans exposer,</li>
                <li>montrer sans classer.</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Le maillage relationnel n'est pas un réseau social.</strong> C'est une mémoire relationnelle, au service des vivants.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                5. Une mémoire qui traverse le temps
              </h2>
              <p className="mb-4">FLOORENCE assume une vision longue :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>adoption précoce par les générations les plus digitales,</li>
                <li>usage qui s'étend sur toute une vie,</li>
                <li>transmission de la mémoire aux générations suivantes.</li>
              </ul>
              <p className="mb-4 font-serif text-lg italic text-center bg-secondary/30 p-4 rounded">
                "Ce qui est déposé sur FLOORENCE n'est pas fait pour disparaître dans un fil. C'est fait pour rester."
              </p>
              <p className="mb-4">La mémoire devient :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>consultable,</li>
                <li>transmissible,</li>
                <li>archivable,</li>
                <li>réactivable sans bruit.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                6. Une vision économiquement assumée
              </h2>
              <p className="mb-4">FLOORENCE assume que :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>la mémoire a un coût,</li>
                <li>la conservation a une valeur,</li>
                <li>les gestes symboliques ont toujours eu un prix dans les sociétés humaines.</li>
              </ul>
              <p className="mb-4">Mais :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>le modèle économique reproduit des gestes naturels,</li>
                <li>sans inventer de besoins,</li>
                <li>sans monétiser l'absence ou la culpabilité.</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">La viabilité économique est un moyen de pérennité,</strong> pas une finalité prédatrice.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                7. Une vision ancrée localement, scalable universellement
              </h2>
              <p className="mb-4">FLOORENCE est pensée :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>à partir de réalités culturelles africaines (rituels, obsèques, communauté),</li>
                <li>testée dans des territoires concrets (Gabon, villes pilotes),</li>
                <li>mais fondée sur des comportements humains universels.</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">La vision n'est pas régionale.</strong> L'ancrage est local, la portée est mondiale.
                </p>
              </div>
            </section>

            {/* Section 8 - Synthesis */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                8. En une phrase
              </h2>
              <div className="bg-memorial-dark text-memorial-dark-foreground p-6 rounded-lg">
                <p className="font-serif text-lg md:text-xl text-center italic">
                  "FLOORENCE est l'infrastructure numérique qui permet aux sociétés humaines de ne pas perdre leurs morts, leurs liens et leurs souvenirs dans l'oubli du temps et du numérique."
                </p>
              </div>
            </section>

            {/* Implications */}
            <section className="mt-12 pt-8 border-t border-border">
              <h2 className="font-serif text-xl md:text-2xl mb-6 text-foreground text-center">
                Ce que cette vision implique concrètement
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-secondary/50 p-4 rounded text-center">
                  <span className="font-serif text-foreground">Chaque fonctionnalité doit respecter le silence.</span>
                </div>
                <div className="bg-secondary/50 p-4 rounded text-center">
                  <span className="font-serif text-foreground">Chaque évolution doit renforcer la dignité.</span>
                </div>
                <div className="bg-secondary/50 p-4 rounded text-center">
                  <span className="font-serif text-foreground">Chaque décision technique est une décision éthique.</span>
                </div>
                <div className="bg-secondary/50 p-4 rounded text-center">
                  <span className="font-serif text-foreground">Chaque franc gagné doit garantir la durabilité de la mémoire.</span>
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

export default Vision;
