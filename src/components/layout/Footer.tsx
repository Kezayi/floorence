import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-memorial-dark text-memorial-dark-foreground">
      <div className="container mx-auto section-padding">
        {/* Mission Statement */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <p className="font-serif text-2xl md:text-3xl font-light italic leading-relaxed">
            "Honorer, Relier et Transmettre"
          </p>
        </div>

        <div className="divider-elegant opacity-20 mb-12" />

        {/* Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-sans text-sm font-medium mb-4 text-memorial-dark-foreground">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-memorial-dark-muted hover:text-memorial-dark-foreground transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/recherche" className="text-sm text-memorial-dark-muted hover:text-memorial-dark-foreground transition-colors">
                  Rechercher
                </Link>
              </li>
              <li>
                <Link to="/creer" className="text-sm text-memorial-dark-muted hover:text-memorial-dark-foreground transition-colors">
                  Créer un espace
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans text-sm font-medium mb-4 text-memorial-dark-foreground">
              Espace personnel
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/compte" className="text-sm text-memorial-dark-muted hover:text-memorial-dark-foreground transition-colors">
                  Mon compte
                </Link>
              </li>
              <li>
                <Link to="/compte/publications" className="text-sm text-memorial-dark-muted hover:text-memorial-dark-foreground transition-colors">
                  Mes publications
                </Link>
              </li>
              <li>
                <Link to="/compte/suivis" className="text-sm text-memorial-dark-muted hover:text-memorial-dark-foreground transition-colors">
                  Mes suivis
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans text-sm font-medium mb-4 text-memorial-dark-foreground">
              À propos
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/a-propos" className="text-sm text-memorial-dark-muted hover:text-memorial-dark-foreground transition-colors">
                  Notre mission
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="text-sm text-memorial-dark-muted hover:text-memorial-dark-foreground transition-colors">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link to="/conditions" className="text-sm text-memorial-dark-muted hover:text-memorial-dark-foreground transition-colors">
                  Conditions d'utilisation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans text-sm font-medium mb-4 text-memorial-dark-foreground">
              Contact
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:contact@floorence.com" className="text-sm text-memorial-dark-muted hover:text-memorial-dark-foreground transition-colors">
                  contact@floorence.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="divider-elegant opacity-20 mb-8" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-memorial-dark-foreground/10 flex items-center justify-center">
              <span className="font-serif text-sm">F</span>
            </div>
            <span className="font-serif text-lg">Floorence</span>
          </div>
          <p className="text-sm text-memorial-dark-muted">
            © {new Date().getFullYear()} Floorence By MNA. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
