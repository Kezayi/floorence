const AuthVisionPanel = ({ onScrollToForm }: { onScrollToForm?: () => void }) => {
  return (
    <div className="relative flex flex-col justify-center min-h-[70vh] lg:min-h-screen p-8 md:p-12 lg:p-16 xl:p-20"
         style={{ backgroundColor: '#1A1A1A' }}>
      {/* Golden divider — right edge (desktop) / bottom edge (mobile) */}
      <div className="hidden lg:block absolute right-0 top-[8%] bottom-[8%] w-px bg-gradient-to-b from-transparent via-candle-glow/30 to-transparent" />
      <div className="lg:hidden absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-candle-glow/30 to-transparent" />

      <div className="max-w-xl mx-auto lg:mx-0 space-y-8">
        {/* Surtitre — golden */}
        <p className="font-sans text-sm md:text-base tracking-[0.25em] uppercase animate-fade-in"
           style={{ color: 'hsl(var(--candle-glow))' }}>
          Pour ceux qui nous ont façonnés…
        </p>

        {/* Titre principal — off-white */}
        <h1 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] xl:text-5xl font-light leading-tight tracking-tight animate-fade-in"
            style={{ color: '#F5F0EB', animationDelay: '0.15s', animationFillMode: 'both' }}>
          Et pour ceux qui porteront
          <br />
          <span className="italic">leur nom.</span>
        </h1>

        {/* Golden separator */}
        <div className="w-16 h-px animate-fade-in" style={{ backgroundColor: 'hsl(var(--candle-glow) / 0.5)', animationDelay: '0.3s', animationFillMode: 'both' }} />

        {/* Body — light gray, generous line-height */}
        <blockquote className="space-y-5 font-sans text-base md:text-lg leading-relaxed animate-fade-in"
                    style={{ color: '#B0ADA8', animationDelay: '0.4s', animationFillMode: 'both' }}>
          <p className="font-serif italic text-lg md:text-xl" style={{ color: '#8A8680' }}>
            «&nbsp;La perte d'un être cher n'est pas seulement un vide, c'est une transformation. Elle redéfinit nos priorités et donne à la mémoire une dimension sacrée.
          </p>
          <p>
            Floorence est né de cette volonté de transformer le manque en un sanctuaire fertile. C'est un lieu où le souvenir ne s'efface pas, mais s'enracine. Ici, nous tissons le maillage de nos familles pour que, dans cinquante&nbsp;ans, nos enfants sachent encore d'où ils viennent et sur quelles épaules ils ont grandi.
          </p>
          <p className="font-medium" style={{ color: '#D4CFC7' }}>
            Chaque hommage déposé, chaque cierge allumé est un fil que nous tendons entre le passé et l'avenir.
          </p>
          <p>
          Entrez, créez un espace, honorez une vie. Ce sanctuaire est désormais le vôtre.&nbsp;»
          </p>
          <p className="font-serif italic text-xl md:text-2xl pt-4" style={{ color: '#F5F0EB' }}>
            Bienvenu à Floorence.
          </p>
        </blockquote>

        {/* Mobile CTA */}
        {onScrollToForm && (
          <button
            onClick={onScrollToForm}
            className="lg:hidden mt-6 inline-flex items-center gap-2 font-sans text-sm font-medium tracking-wide transition-colors duration-300 animate-fade-in"
            style={{ color: 'hsl(var(--candle-glow) / 0.8)', animationDelay: '0.55s', animationFillMode: 'both' }}
          >
            Accéder à la connexion
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-bounce">
              <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthVisionPanel;
