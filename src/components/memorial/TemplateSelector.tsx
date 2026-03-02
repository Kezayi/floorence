import { useState, useEffect, useMemo } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  content: string;
  category: string;
  tone: string;
  relation: string | null;
}

const THEME_LABELS: Record<string, string> = {
  solennel: "Solennel",
  familial: "Familial",
  religieux: "Religieux",
};

const THEME_ORDER = ["solennel", "familial", "religieux"];

/** Pick n random elements from an array (Fisher-Yates partial shuffle) */
function randomSample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
    result.push(copy[i]);
  }
  return result;
}

interface TemplateSelectorProps {
  onSelect: (text: string) => void;
  defuntName?: string;
}

const TemplateSelector = ({ onSelect, defuntName }: TemplateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [activeTheme, setActiveTheme] = useState("solennel");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  // Random sample seed — changes each time user opens the selector
  const [sampleSeed, setSampleSeed] = useState(0);

  useEffect(() => {
    if (!open || allTemplates.length > 0) return;
    setLoading(true);
    supabase
      .from("guestbook_templates")
      .select("id, content, category, tone, relation")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setAllTemplates(data as Template[]);
        setLoading(false);
      });
  }, [open, allTemplates.length]);

  // Build a random sample of 5 per theme each time sampleSeed changes
  const sampledByTheme = useMemo(() => {
    const map: Record<string, Template[]> = {};
    for (const theme of THEME_ORDER) {
      const pool = allTemplates.filter((t) => t.category === theme);
      map[theme] = randomSample(pool, 5);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTemplates, sampleSeed]);

  const filtered = sampledByTheme[activeTheme] || [];

  const handlePrev = () =>
    setCurrentIndex((i) => (i === 0 ? filtered.length - 1 : i - 1));
  const handleNext = () =>
    setCurrentIndex((i) => (i === filtered.length - 1 ? 0 : i + 1));

  const handleThemeChange = (theme: string) => {
    setActiveTheme(theme);
    setCurrentIndex(0);
  };

  const handleSelect = () => {
    const template = filtered[currentIndex];
    if (!template) return;

    // {{name}} replacement
    let text = template.content;
    if (defuntName) {
      text = text.replace(/\{\{name\}\}/gi, defuntName);
    }
    onSelect(text);
    setOpen(false);

    // Track usage (fire-and-forget, no await)
    supabase.rpc("increment_template_usage" as any, { p_template_id: template.id }).then(() => {});
  };

  const handleOpen = () => {
    setSampleSeed((s) => s + 1); // re-shuffle on each open
    setOpen(true);
  };

  const currentContent = filtered[currentIndex]?.content || "";
  const displayContent = defuntName
    ? currentContent.replace(/\{\{name\}\}/gi, defuntName)
    : currentContent;

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 text-sm font-sans text-muted-foreground hover:text-foreground bg-white border border-[hsl(0,0%,82%)] rounded-sm hover:bg-muted/40 transition-colors"
      >
        <BookOpen className="w-4 h-4" />
        Besoin d'aide pour écrire ?
      </button>
    );
  }

  return (
    <div className="bg-white border border-[hsl(0,0%,82%)] rounded-sm p-5 space-y-4 animate-fade-in">
      {/* Theme tabs */}
      <div className="flex gap-2">
        {THEME_ORDER.map((theme) => (
          <button
            key={theme}
            type="button"
            onClick={() => handleThemeChange(theme)}
            className={`px-3 py-1.5 text-xs font-sans rounded-sm transition-colors ${
              activeTheme === theme
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {THEME_LABELS[theme]}
          </button>
        ))}
      </div>

      {/* Carousel */}
      {loading ? (
        <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
          Aucun modèle disponible
        </div>
      ) : (
        <div className="relative">
          <div className="min-h-[80px] flex items-center px-10">
            <p className="font-serif text-sm text-foreground/80 italic leading-relaxed text-center w-full">
              &ldquo;{displayContent}&rdquo;
            </p>
          </div>

          {filtered.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 p-1.5 rounded-sm hover:bg-muted/60 transition-colors"
                aria-label="Modèle précédent"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-sm hover:bg-muted/60 transition-colors"
                aria-label="Modèle suivant"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-2">
            {filtered.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentIndex ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground font-sans transition-colors"
        >
          Fermer
        </button>
        <button
          type="button"
          onClick={handleSelect}
          disabled={filtered.length === 0}
          className="px-4 py-2 text-xs font-sans bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Utiliser ce modèle
        </button>
      </div>
    </div>
  );
};

export default TemplateSelector;
