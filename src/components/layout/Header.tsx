import { Link, useLocation } from "react-router-dom";
import { Menu, Home, PlusCircle, User, LogIn, LogOut, Bell } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SearchBar from "@/components/search/SearchBar";
import NotificationBell from "./NotificationBell";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();

  // Menu items selon l'état de connexion
  const navItems = user
    ? [
        { path: "/", label: "Accueil", icon: Home },
        { path: "/creer", label: "Créer", icon: PlusCircle },
        { path: "/compte", label: "Compte", icon: User },
      ]
    : [
        { path: "/", label: "Accueil", icon: Home },
        { path: "/creer", label: "Créer", icon: PlusCircle },
        { path: "/auth", label: "Connexion", icon: LogIn },
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

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-admin-burgundy/90 backdrop-blur-sm border-b border-white/10 text-white">
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
            <div className="flex-1 max-w-md mx-4">
              <SearchBar />
            </div>

            {/* Notification Bell + Hamburger Menu - Desktop Only */}
            <div className="hidden md:flex items-center gap-2">
              <NotificationBell />
              
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
                    
                    {/* Déconnexion - uniquement si connecté */}
                    {user && (
                      <div className="border-t border-border mt-2 pt-2">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-4 py-3 font-sans text-sm text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Déconnexion
                        </button>
                      </div>
                    )}
                  </nav>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Navigation - Mobile Only (TikTok style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black border-t border-white/10 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                  active
                    ? "text-white"
                    : "text-gray-400"
                }`}
              >
                <Icon className={`w-6 h-6 ${active ? "stroke-[2.5px]" : "stroke-[1.5px]"}`} />
                <span className={`text-xs mt-1 font-sans ${active ? "font-medium" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Header;
