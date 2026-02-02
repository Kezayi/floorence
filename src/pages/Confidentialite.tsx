import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Confidentialite = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-24 md:pt-28 pb-20 md:pb-12">
        <article className="container mx-auto px-4 max-w-3xl">
          {/* Title */}
          <header className="text-center mb-12">
            <h1 className="font-serif text-3xl md:text-4xl mb-4">
              Politique de Confidentialité
            </h1>
            <p className="text-muted-foreground font-sans text-sm">
              Conforme RGPD & principes de protection des données en Afrique centrale – CEMAC
            </p>
          </header>

          <div className="prose prose-memorial max-w-none space-y-10 font-sans text-foreground/90">
            
            {/* Section 1 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                1. Identité du responsable de traitement
              </h2>
              <p className="mb-4">
                FLOORENCE est une plateforme mémorielle numérique exploitée par :
              </p>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r mb-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">FLOORENCE</strong><br />
                  [forme juridique à compléter]<br />
                  [adresse à compléter]<br />
                  [contact email dédié]
                </p>
              </div>
              <p>
                FLOORENCE agit en qualité de Responsable de traitement au sens du Règlement Général sur la Protection des Données (RGPD – UE 2016/679) et des principes équivalents en vigueur dans les États de la CEMAC.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                2. Principes généraux de traitement
              </h2>
              <p className="mb-4">FLOORENCE applique les principes suivants :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Licéité, loyauté et transparence</li>
                <li>Finalité déterminée et limitée</li>
                <li>Minimisation des données</li>
                <li>Exactitude</li>
                <li>Limitation de la conservation</li>
                <li>Intégrité et confidentialité</li>
                <li>Responsabilité (accountability)</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  Les données ne sont <strong className="text-foreground">jamais</strong> collectées à des fins publicitaires, marketing ou de profilage.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                3. Catégories de données traitées
              </h2>
              
              <h3 className="font-serif text-lg mb-3 text-foreground">3.1 Données relatives aux défunts</h3>
              <p className="mb-4">Traitées sur la base de l'initiative des familles ou proches :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Nom et prénom</li>
                <li>Photographies</li>
                <li>Dates de naissance et de décès</li>
                <li>Avis de décès</li>
                <li>Informations liées aux obsèques</li>
              </ul>
              <p className="text-sm italic text-muted-foreground mb-6">
                ⚠️ Ces données ne constituent pas des données d'état civil officielles.
              </p>

              <h3 className="font-serif text-lg mb-3 text-foreground">3.2 Données relatives aux utilisateurs</h3>
              <p className="mb-4">Lors d'une interaction (message, geste, contribution), FLOORENCE peut collecter :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Nom ou prénom déclaré</li>
                <li>Adresse email</li>
                <li>Numéro de téléphone</li>
                <li>Lien déclaré avec le défunt</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r mb-6">
                <p className="text-sm text-muted-foreground">
                  Ces données sont <strong className="text-foreground">invisibles publiquement</strong>, utilisées uniquement pour la gestion du service et la traçabilité.
                </p>
              </div>

              <h3 className="font-serif text-lg mb-3 text-foreground">3.3 Données financières</h3>
              <p className="mb-4">Dans le cadre des paiements (cierges, fleurs, contributions) :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>FLOORENCE ne traite aucune donnée bancaire sensible.</li>
                <li>Les transactions sont opérées par des prestataires certifiés (Mobile Money, cartes).</li>
                <li>FLOORENCE reçoit uniquement : un identifiant de transaction, un statut de paiement, un montant.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                4. Finalités du traitement
              </h2>
              <p className="mb-4">Les données sont traitées exclusivement pour :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>créer et afficher des espaces mémoriels,</li>
                <li>permettre l'expression de gestes symboliques,</li>
                <li>gérer les contributions financières,</li>
                <li>assurer la sécurité, la traçabilité et la résolution des litiges,</li>
                <li>respecter les obligations légales et comptables.</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-destructive/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">❌ Aucune donnée n'est utilisée pour :</strong> le ciblage, la publicité, la revente, l'analyse comportementale.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                5. Base légale du traitement
              </h2>
              <p className="mb-4">Les traitements reposent sur :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>le consentement explicite de l'utilisateur,</li>
                <li>l'exécution du service demandé,</li>
                <li>les obligations légales applicables (sécurité, comptabilité).</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                6. Visibilité et accès aux données
              </h2>
              
              <h3 className="font-serif text-lg mb-3 text-foreground">6.1 Données publiques</h3>
              <ul className="list-disc pl-6 space-y-2 mb-6">
                <li>Avis de décès</li>
                <li>Messages du livre d'or</li>
                <li>Compteurs globaux de gestes</li>
              </ul>

              <h3 className="font-serif text-lg mb-3 text-foreground">6.2 Données privées</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Emails</li>
                <li>Numéros de téléphone</li>
                <li>Montants individuels</li>
                <li>Liens relationnels détaillés</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  Ces données ne sont accessibles <strong className="text-foreground">ni au public, ni aux autres utilisateurs</strong>.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                7. Maillage relationnel et données sensibles
              </h2>
              <p className="mb-4">Les liens humains déclarés ou déduits :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>sont des déclarations subjectives,</li>
                <li>ne constituent aucune preuve juridique,</li>
                <li>sont visibles uniquement par les personnes concernées.</li>
              </ul>
              <p>Ils ne font l'objet d'aucun profilage, d'aucune exploitation algorithmique.</p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                8. Conservation des données
              </h2>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Les données sont conservées tant que l'espace mémoriel existe.</li>
                <li>Les utilisateurs peuvent demander la suppression de leurs données ou le retrait de leurs contributions.</li>
              </ul>
              <p className="text-sm italic text-muted-foreground">
                Certaines données (journaux, transactions) peuvent être conservées plus longtemps pour des obligations légales ou la prévention de la fraude.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                9. Droits des personnes concernées
              </h2>
              <p className="mb-4">Conformément au RGPD et aux principes CEMAC, chaque personne dispose de :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>droit d'accès,</li>
                <li>droit de rectification,</li>
                <li>droit à l'effacement,</li>
                <li>droit à la limitation,</li>
                <li>droit d'opposition,</li>
                <li>droit à la portabilité (le cas échéant).</li>
              </ul>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  Les demandes peuvent être adressées à : <strong className="text-foreground">[email dédié]</strong>
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                10. Principe du silence et absence de sollicitation
              </h2>
              <p className="mb-4">FLOORENCE reconnaît le silence, l'inactivité et le retrait comme des choix légitimes.</p>
              <div className="bg-secondary/50 border-l-4 border-primary/30 p-4 rounded-r">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Aucune relance automatique ou émotionnelle n'est pratiquée.</strong>
                </p>
              </div>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                11. Accès administratif et gouvernance
              </h2>
              <p className="mb-4">Les administrateurs :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>sont soumis à un manifeste de gouvernance,</li>
                <li>disposent d'accès strictement limités,</li>
                <li>voient leurs actions journalisées de manière immuable.</li>
              </ul>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                12. Sécurité des données
              </h2>
              <p className="mb-4">FLOORENCE met en œuvre :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>des accès sécurisés,</li>
                <li>des bases chiffrées,</li>
                <li>des identifiants non séquentiels (UUID),</li>
                <li>des sauvegardes protégées.</li>
              </ul>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                13. Transfert de données hors zone
              </h2>
              <p className="mb-4">
                Les données peuvent être hébergées hors du pays de l'utilisateur, dans des infrastructures conformes aux standards internationaux de sécurité et de protection des données.
              </p>
              <p className="font-medium">Aucun transfert n'est effectué à des fins commerciales.</p>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                14. Modification de la politique
              </h2>
              <p className="mb-4">Cette politique peut évoluer pour :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>respecter le cadre légal,</li>
                <li>améliorer la protection des utilisateurs.</li>
              </ul>
              <p className="font-medium">Les principes fondateurs de FLOORENCE demeurent inchangés.</p>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="font-serif text-xl md:text-2xl mb-4 text-foreground">
                15. Contact
              </h2>
              <p>
                Toute question relative à la confidentialité peut être adressée à : <strong>[email dédié]</strong>
              </p>
            </section>

            {/* Conclusion */}
            <section className="mt-12 pt-8 border-t border-border">
              <h2 className="font-serif text-xl md:text-2xl mb-6 text-foreground text-center">
                Conclusion
              </h2>
              <div className="text-center space-y-4">
                <p className="italic text-muted-foreground">
                  Dans FLOORENCE,<br />
                  la mémoire est visible,<br />
                  les relations sont respectées,<br />
                  les personnes restent protégées.
                </p>
                <p className="font-serif text-lg text-foreground">
                  La confidentialité n'est pas une contrainte technique.<br />
                  C'est une condition de la dignité.
                </p>
              </div>
            </section>

          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default Confidentialite;
