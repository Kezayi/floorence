import { useState, useEffect } from "react";

interface Citation {
  text: string;
  source: string;
}

const CITATIONS: Citation[] = [
  { text: "Ce que nous faisons dans la vie résonne dans l'éternité.", source: "Gladiator (2000)" },
  { text: "Personne ne meurt vraiment tant que son nom est prononcé.", source: "Terry Pratchett" },
  { text: "La mort n'est pas l'obscurité, c'est une lampe qui s'éteint car le jour se lève.", source: "Rabindranath Tagore" },
  { text: "On ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux.", source: "Antoine de Saint-Exupéry" },
  { text: "Le souvenir est le parfum de l'âme.", source: "George Sand" },
  { text: "Ceux que nous aimons ne nous quittent jamais vraiment.", source: "J.K. Rowling" },
  { text: "La mémoire est le miroir où nous regardons les absents.", source: "Joseph Joubert" },
  { text: "Mourir, c'est changer de corps comme l'acteur change de costume.", source: "Plotin" },
  { text: "Les morts ne sont pas des absents, ce sont des invisibles.", source: "Victor Hugo" },
  { text: "Souviens-toi de moi, et je vivrai pour toujours.", source: "Coco (2017)" },
  { text: "Il n'y a de mort que l'oubli.", source: "Proverbe africain" },
  { text: "La vie des morts consiste à survivre dans l'esprit des vivants.", source: "Cicéron" },
  { text: "Ce n'est pas la fin, c'est le début d'autre chose.", source: "Interstellar (2014)" },
  { text: "On meurt deux fois : la première en cessant de vivre, la seconde en cessant d'être aimé.", source: "Proverbe malgache" },
  { text: "Chaque homme dans sa nuit s'en va vers sa lumière.", source: "Victor Hugo" },
  { text: "Après tout, la mort n'est que la prochaine grande aventure.", source: "J.K. Rowling" },
  { text: "Le deuil est le prix que nous payons pour l'amour.", source: "Reine Elizabeth II" },
  { text: "L'amour ne disparaît jamais. La mort ne peut pas le tuer.", source: "Mitch Albom" },
  { text: "Nous sommes les histoires que nous racontons sur ceux que nous avons perdus.", source: "Joan Didion" },
  { text: "Là où il y a de l'amour, il n'y a pas de mort.", source: "Gandhi" },
  { text: "La mort d'un homme est une tragédie. Chaque vie est un univers.", source: "Wiesel" },
  { text: "Les liens du sang sont éternels. Ils traversent même la mort.", source: "Proverbe gabonais" },
  { text: "Tant qu'on se souvient de quelqu'un, cette personne est vivante.", source: "Proverbe japonais" },
  { text: "Les arbres les plus profondément enracinés sont ceux qui ont résisté aux plus grandes tempêtes.", source: "Proverbe bantou" },
];

const WisdomBanner = () => {
  const [quote, setQuote] = useState<Citation>(() => {
    const hourIndex = new Date().getHours();
    const dayOffset = new Date().getDate();
    return CITATIONS[(hourIndex + dayOffset) % CITATIONS.length];
  });

  useEffect(() => {
    const updateQuote = () => {
      const hourIndex = new Date().getHours();
      const dayOffset = new Date().getDate();
      setQuote(CITATIONS[(hourIndex + dayOffset) % CITATIONS.length]);
    };

    const timer = setInterval(updateQuote, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="w-full py-5 px-6 bg-memorial-dark/60 border-y border-border/30">
      <div className="container mx-auto flex flex-col items-center justify-center gap-2">
        <p className="font-serif text-sm md:text-base italic text-foreground/80 text-center leading-relaxed max-w-2xl">
          « {quote.text} »
        </p>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-sans">
          — {quote.source}
        </span>
      </div>
    </section>
  );
};

export default WisdomBanner;
