import { Link, useLocation } from "react-router-dom";
import { Menu, Search, Home, PlusCircle, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { path: "/", label: "Accueil", icon: Home },
    { path: "/creer", label: "Créer Espace", icon: PlusCircle },
    { path: "/compte", label: "Mon Compte", icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-muted/80 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 md:h-20 gap-4">
          {/* Logo + Tagline */}
          <Link 
            to="/" 
            className="flex flex-col items-start group flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-serif text-lg md:text-xl font-medium">F</span>
              </div>
              <span className="font-serif text-xl md:text-2xl tracking-tight">
                Floorence
              </span>
            </div>
            <span className="font-serif text-xs text-muted-foreground italic ml-10 md:ml-12 -mt-1">
              Aux bons soins des vivants
            </span>
          </Link>

          {/* Search Bar - Center */}
          <div className="flex-1 max-w-md mx-4 hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un défunt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background/80 border border-border/50 rounded text-sm text-foreground placeholder:text-muted-foreground font-sans focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background transition-colors"
              />
            </div>
          </div>

          {/* Hamburger Menu - Right */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 text-foreground hover:bg-background/50 rounded transition-colors"
              aria-label="Menu"
              aria-expanded={isMenuOpen}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-md shadow-lg z-50 animate-fade-in overflow-hidden">
                <nav className="py-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 font-sans text-sm transition-colors ${
                          isActive(item.path)
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un défunt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background/80 border border-border/50 rounded text-sm text-foreground placeholder:text-muted-foreground font-sans focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background transition-colors"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
