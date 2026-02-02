import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Conditions = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-24 md:pt-28 pb-20 md:pb-12">
        <article className="container mx-auto px-4 max-w-3xl">
          {/* Title */}
          <header className="text-center mb-12">
            <h1 className="font-serif text-3xl md:text-4xl mb-4">
              Conditions Générales d'Utilisation
            </h1>
            <p className="text-muted-foreground font-sans text-sm">
              Dernière mise à jour : Février 2026
            </p>
          </header>

          <div className="prose prose-memorial max-w-none space-y-10 font-sans text-foreground/90">
            
            {/* Section 1 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                1. Nature du service
              </h2>
              <p className="mb-4">
                FLOORENCE est une plateforme mémorielle numérique permettant :
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>la publication d'avis de décès,</li>
                <li>la création d'espaces mémoriels,</li>
                <li>l'expression de gestes symboliques (RIP, cierges, fleurs),</li>
                <li>la conservation des souvenirs,</li>
                <li>la visualisation responsable des liens humains autour d'un défunt.</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">FLOORENCE n'est pas :</strong> un réseau social, une plateforme de communication interpersonnelle, un service de divertissement, ni un outil d'optimisation émotionnelle.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                2. Principe fondamental : neutralité et non-interprétation
              </h2>
              <p className="mb-4">FLOORENCE s'interdit :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>toute interprétation des gestes posés par les utilisateurs,</li>
                <li>toute hiérarchisation sociale ou symbolique,</li>
                <li>toute comparaison entre personnes,</li>
                <li>toute suggestion de comportement.</li>
              </ul>
              <p>
                Les gestes (RIP, cierges, fleurs, messages, recueillements) sont libres, ont une valeur strictement symbolique, et ne sont jamais commentés, évalués ou qualifiés par la plateforme.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                3. Accès et création d'un espace mémoriel
              </h2>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>La consultation d'un espace mémoriel peut se faire sans création de compte.</li>
                <li>La création d'un espace mémoriel est réservée à un auteur identifié.</li>
                <li>Un seul auteur est reconnu par espace mémoriel.</li>
                <li>L'auteur désigne obligatoirement un héritier numérique.</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">L'auteur est responsable :</strong> des informations publiées, des mises à jour, et de l'activation des modules optionnels (contributions, recueillement).
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                4. Types d'avis de décès
              </h2>
              <p className="mb-4">Deux types d'avis existent :</p>
              <ol className="list-decimal pl-6 space-y-2 mb-4">
                <li><strong>Décès récent</strong> (obsèques à venir)</li>
                <li><strong>Décès passé</strong> (archive mémorielle)</li>
              </ol>
              <p>
                Le choix du type conditionne les modules visibles, les informations demandées et les fonctionnalités accessibles.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                5. Livre d'or et contenus utilisateurs
              </h2>
              <p className="mb-4">
                Les utilisateurs peuvent publier un message de condoléances, éventuellement accompagné de cierges et/ou de fleurs.
              </p>
              <p className="mb-4">Pour publier un message, l'utilisateur doit fournir :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>un email valide,</li>
                <li>un numéro de téléphone,</li>
                <li>un lien déclaré avec le défunt.</li>
              </ul>
              <p className="font-medium">Règles strictes :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>pas de réponse aux messages,</li>
                <li>pas de modification par un tiers,</li>
                <li>pas de classement ou de mise en avant.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                6. Gestes symboliques et paiement
              </h2>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Le RIP est gratuit.</li>
                <li>Les cierges et fleurs sont payants.</li>
                <li>Les paiements sont réalisés via Mobile Money ou moyens équivalents.</li>
                <li>Les frais de transaction sont supportés par l'utilisateur.</li>
              </ul>
              <p>
                Les gestes n'impliquent aucun droit, n'accordent aucun statut et ne créent aucune obligation morale ou sociale.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                7. Contributions aux obsèques
              </h2>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Les contributions financières sont optionnelles.</li>
                <li>Elles sont activées uniquement par l'auteur de l'espace.</li>
                <li>Les fonds sont reversés intégralement à la famille.</li>
                <li>FLOORENCE n'est qu'un intermédiaire technique.</li>
              </ul>
              <p>
                Les contributions sont automatiquement désactivées après la date d'inhumation, donnent lieu à un message de remerciement automatique, et n'impliquent aucun avantage particulier pour le contributeur.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                8. Recueillement
              </h2>
              <p className="mb-4">Le recueillement est :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>un événement mémoriel ponctuel,</li>
                <li>initié uniquement par la famille proche,</li>
                <li>limité en fréquence,</li>
                <li>payant.</li>
              </ul>
              <p>
                FLOORENCE ne suggère jamais un recueillement, n'en multiplie pas artificiellement la portée, et n'effectue aucune relance après l'événement.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                9. Fonction "Suivre"
              </h2>
              <p className="mb-4">
                Il est possible de suivre un défunt, non une personne. Les notifications sont strictement factuelles :
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>mise à jour du programme,</li>
                <li>création d'un recueillement,</li>
                <li>date importante atteinte.</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  Aucune notification émotionnelle ou commerciale n'est envoyée.
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                10. Maillage relationnel
              </h2>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Les utilisateurs peuvent déclarer leur lien avec le défunt.</li>
                <li>FLOORENCE peut déduire des liens indirects simples et logiques.</li>
                <li>La visibilité des liens est strictement contrôlée.</li>
              </ul>
              <p>
                Les liens ne constituent pas une preuve juridique, ne sont pas des données officielles d'état civil, et peuvent être contestés ou retirés.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                11. Rôle et limites de FLOORENCE
              </h2>
              <p className="mb-4">FLOORENCE :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>n'est pas juge de la vérité historique ou familiale,</li>
                <li>n'arbitre pas les conflits de mémoire,</li>
                <li>n'impose aucune version officielle d'une vie ou d'un décès.</li>
              </ul>
              <p>Elle peut :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>masquer un contenu manifestement abusif,</li>
                <li>suspendre un compte en cas de violation grave,</li>
                <li>coopérer avec les autorités si la loi l'exige.</li>
              </ul>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                12. Responsabilité des utilisateurs
              </h2>
              <p className="mb-4">Chaque utilisateur est responsable :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>des informations qu'il publie,</li>
                <li>du respect de la dignité des défunts et des familles,</li>
                <li>du respect des lois locales en vigueur.</li>
              </ul>
              <p>
                Toute utilisation abusive, frauduleuse ou attentatoire peut entraîner la suppression du contenu, voire l'exclusion du service.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                13. Protection des données
              </h2>
              <p className="mb-4">Les données collectées sont :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>strictement nécessaires au service,</li>
                <li>jamais revendues,</li>
                <li>jamais exploitées à des fins publicitaires.</li>
              </ul>
              <p className="italic text-muted-foreground">
                Le silence et l'inactivité sont reconnus comme des états légitimes. (Détaillé dans la Politique de Confidentialité associée)
              </p>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                14. Évolution du service
              </h2>
              <p className="mb-4">FLOORENCE peut faire évoluer le service :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>sans remettre en cause ses principes fondateurs,</li>
                <li>sans transformer la plateforme en réseau social,</li>
                <li>sans altérer la neutralité des gestes.</li>
              </ul>
              <p>
                Toute évolution substantielle donne lieu à information des utilisateurs.
              </p>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                15. Acceptation des CGU
              </h2>
              <p>
                L'utilisation de FLOORENCE implique l'acceptation pleine et entière des CGU, ainsi que le respect de leur esprit autant que de leur lettre.
              </p>
            </section>

            {/* Summary */}
            <section className="mt-12 pt-8 border-t border-border">
              <h2 className="font-serif text-xl md:text-2xl mb-6 text-foreground text-center">
                En résumé
              </h2>
              <p className="text-center mb-6 text-muted-foreground">
                Les CGU de FLOORENCE reposent sur 5 piliers :
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div className="bg-secondary/50 p-4 rounded">
                  <span className="font-serif text-lg text-foreground">Dignité</span>
                </div>
                <div className="bg-secondary/50 p-4 rounded">
                  <span className="font-serif text-lg text-foreground">Neutralité</span>
                </div>
                <div className="bg-secondary/50 p-4 rounded">
                  <span className="font-serif text-lg text-foreground">Sobriété</span>
                </div>
                <div className="bg-secondary/50 p-4 rounded">
                  <span className="font-serif text-lg text-foreground">Responsabilité</span>
                </div>
                <div className="bg-secondary/50 p-4 rounded col-span-2 md:col-span-1">
                  <span className="font-serif text-lg text-foreground">Refus de la marchandisation</span>
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

export default Conditions;
