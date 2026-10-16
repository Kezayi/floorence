import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-footer text-footer-foreground border-t border-champagne/30">
      <div className="container mx-auto section-padding">
        {/* Mission Statement */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <p className="font-serif text-2xl md:text-3xl font-normal leading-relaxed">
            Honorer, Relier et Transmettre
          </p>
        </div>

        <div className="premium-ornament justify-center mb-12" aria-hidden="true"><span className="text-sm">✦</span></div>

        {/* Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div>
            <h4 className="font-serif text-lg font-normal mb-4 text-footer-foreground">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-footer-muted hover:text-footer-foreground transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/recherche" className="text-sm text-footer-muted hover:text-footer-foreground transition-colors">
                  Rechercher
                </Link>
              </li>
              <li>
                <Link to="/creer" className="text-sm text-footer-muted hover:text-footer-foreground transition-colors">
                  Créer un espace
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg font-normal mb-4 text-footer-foreground">
              Espace personnel
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/compte" className="text-sm text-footer-muted hover:text-footer-foreground transition-colors">
                  Mon compte
                </Link>
              </li>
              <li>
                <Link to="/communaute" className="text-sm text-footer-muted hover:text-footer-foreground transition-colors">
                  Communauté
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg font-normal mb-4 text-footer-foreground">
              À propos
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/a-propos" className="text-sm text-footer-muted hover:text-footer-foreground transition-colors">
                  Notre vision
                </Link>
              </li>
              <li>
                <Link to="/mission" className="text-sm text-footer-muted hover:text-footer-foreground transition-colors">
                  Notre mission
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg font-normal mb-4 text-footer-foreground">
              Aide & Support
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/faq" className="text-sm text-footer-muted hover:text-footer-foreground transition-colors">
                  Foire aux Questions
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="text-sm text-footer-muted hover:text-footer-foreground transition-colors">
                  Protection des données
                </Link>
              </li>
              <li>
                <Link to="/conditions" className="text-sm text-footer-muted hover:text-footer-foreground transition-colors">
                  Conditions d'utilisation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg font-normal mb-4 text-footer-foreground">
              Contact
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:contact@floorence.org" className="text-sm text-footer-muted hover:text-footer-foreground transition-colors">
                  contact@floorence.org
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="divider-elegant opacity-20 mb-8" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border border-champagne/50 flex items-center justify-center">
              <span className="font-serif text-sm">F</span>
            </div>
            <span className="font-serif text-lg">Floorence</span>
          </div>
          <p className="text-sm text-footer-muted">
            © {new Date().getFullYear()} Floorence By{" "}
            <a href="https://www.linkedin.com/in/michelngwaayi/" target="_blank" rel="noopener noreferrer" className="underline hover:text-footer-foreground transition-colors">MNA</a>
            . Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
