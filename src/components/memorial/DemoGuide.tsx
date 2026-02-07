import { Flame, Flower2, GitBranch, Info } from "lucide-react";

const DemoGuide = () => {
  return (
    <div className="container mx-auto px-4 pb-6">
      <div className="relative overflow-hidden rounded-sm border border-[hsl(var(--candle-glow)/0.2)] bg-gradient-to-r from-[hsl(var(--candle-glow)/0.05)] to-transparent p-5 md:p-6">
        {/* Decorative glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[hsl(var(--candle-glow)/0.08)] blur-2xl" />

        <div className="relative flex gap-3 md:gap-4">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--candle-glow)/0.15)] flex items-center justify-center">
              <Info className="w-4 h-4 text-[hsl(var(--candle-glow))]" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-base md:text-lg text-foreground">
              Espace de démonstration
            </h3>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed">
              Cet espace mémoriel est un exemple pour vous permettre d'explorer les fonctionnalités de Floorence. Découvrez comment honorer la mémoire d'un proche :
            </p>

            <div className="flex flex-wrap gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Flame className="w-4 h-4 text-[hsl(var(--gesture-candle))]" />
                <span>Allumer des cierges</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Flower2 className="w-4 h-4 text-[hsl(var(--gesture-flower))]" />
                <span>Déposer des fleurs</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <GitBranch className="w-4 h-4 text-foreground/60" />
                <span>Tisser le maillage familial</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoGuide;
