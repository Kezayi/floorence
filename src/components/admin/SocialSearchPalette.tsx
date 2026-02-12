import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Sparkles, X, Loader2 } from "lucide-react";
import { CommandDialog } from "@/components/ui/command";
import ReactMarkdown from "react-markdown";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-search`;

async function streamQuestion(
  question: string,
  onDelta: (text: string) => void,
  signal: AbortSignal
) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ question }),
    signal,
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => null);
    throw new Error(errData?.error || `Erreur ${resp.status}`);
  }
  if (!resp.body) throw new Error("Pas de réponse du serveur");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") return;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onDelta(fullText);
        }
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
}

const SUGGESTIONS = [
  "Qui sont les personnes les plus impliquées émotionnellement ?",
  "Qui présenter à la famille directe du défunt ?",
  "Quels sont les relais de confiance dans le maillage ?",
  "Résume le cercle social du défunt le plus actif",
];

const SocialSearchPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setAnswer("");
    setError(null);
    setIsLoading(false);
    abortRef.current?.abort();
  }, []);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      setOpen(v);
      if (!v) reset();
    },
    [reset]
  );

  const submitQuestion = useCallback(async (q: string) => {
    if (q.trim().length < 3) return;
    setIsLoading(true);
    setAnswer("");
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamQuestion(q, setAnswer, controller.signal);
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message || "Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-muted-foreground text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        <span className="hidden md:inline">Intelligence Sociale</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <div className="flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Intelligence Sociale — Maillage RAG
            </span>
          </div>

          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Posez une question sur le maillage social…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitQuestion(query);
                }
              }}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-4 max-h-[60vh]">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {isLoading && !answer && (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Analyse du maillage social en cours…</span>
              </div>
            )}

            {answer && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{answer}</ReactMarkdown>
                {isLoading && (
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded-sm ml-0.5" />
                )}
              </div>
            )}

            {!answer && !isLoading && !error && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">
                  Suggestions de questions
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuery(s);
                      submitQuestion(s);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors border border-border/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CommandDialog>
    </>
  );
};

export default SocialSearchPalette;
