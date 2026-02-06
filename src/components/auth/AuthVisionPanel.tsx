import { useRef } from 'react';

const AuthVisionPanel = ({ onScrollToForm }: { onScrollToForm?: () => void }) => {
  return (
    <div className="relative flex flex-col justify-center bg-memorial-anthracite text-memorial-anthracite-foreground min-h-[60vh] lg:min-h-screen p-8 md:p-12 lg:p-16 xl:p-20">
      {/* Subtle golden border on the right (desktop) / bottom (mobile) */}
      <div className="hidden lg:block absolute right-0 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-candle-glow/40 to-transparent" />
      <div className="lg:hidden absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-candle-glow/40 to-transparent" />

      <div className="max-w-xl mx-auto lg:mx-0 space-y-8 animate-fade-in">
        {/* Title */}
        <h1 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] xl:text-5xl font-light leading-tight tracking-tight text-memorial-anthracite-foreground">
          Pour nous qui savons...
          <br />
          <span className="italic font-light opacity-80">et pour ceux qui resteront.</span>
        </h1>

        {/* Golden separator */}
        <div className="w-16 h-px bg-candle-glow/60" />

        {/* Body text */}
        <blockquote className="space-y-5 font-sans text-base md:text-lg leading-relaxed opacity-90">
          <p className="font-serif italic text-lg md:text-xl opacity-70">
            «&nbsp;Mes proches, mes amis,
          </p>
          <p>
            Je vous écoute ici non pas comme un concepteur, mais comme quelqu'un qui, comme vous, porte en lui les trésors laissés par ceux que nous avons aimés et perdus. La perte d'un être cher a redéfini notre importance accordée à la mémoire.
          </p>
          <p>
            Floorence est né de cette volonté de transformer notre douleur commune en quelque chose de fertile. C'est un sanctuaire numérique où nos souvenirs sont vivants, où l'on tisse le maillage de nos familles pour que nos enfants sachent, dans 50&nbsp;ans, d'où ils viennent.
          </p>
          <p>
            Vous êtes les premiers à entrer dans ce lieu. Votre regard est le seul qui m'importe pour valider ce projet qui est, désormais, le nôtre.&nbsp;»
          </p>
        </blockquote>

        {/* Mobile CTA to scroll down */}
        {onScrollToForm && (
          <button
            onClick={onScrollToForm}
            className="lg:hidden mt-4 inline-flex items-center gap-2 font-sans text-sm font-medium tracking-wide text-candle-glow/80 hover:text-candle-glow transition-colors duration-300"
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
