import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Loader2, History, Clock, ChevronLeft, X, Brain, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { calculateAge } from "@/lib/dateUtils";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-search`;

interface HistoryEntry {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
}

interface MemorialPerson {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  birth_date: string | null;
  death_date: string | null;
  is_demo: boolean | null;
  total_posts: number | null;
}

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

const SUGGESTIONS = [
  "Qui sont les personnes les plus impliquées émotionnellement ?",
  "Qui présenter à la famille directe du défunt ?",
  "Quels sont les relais de confiance dans le maillage ?",
  "Résume le cercle social du défunt le plus actif",
];

/* ── Memorial portrait strip ────────────────────────────────────── */

function PersonCard({ person }: { person: MemorialPerson }) {
  const age =
    person.birth_date && person.death_date
      ? calculateAge(person.birth_date, person.death_date)
      : null;

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[72px] max-w-[80px]">
      <div className="relative w-14 h-14 rounded-full overflow-hidden bg-muted border border-border/60 shadow-sm">
        {person.photo_url ? (
          <img
            src={person.photo_url}
            alt={`${person.first_name} ${person.last_name}`}
            className="w-full h-full object-cover grayscale-[30%]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
            <User className="w-5 h-5" />
          </div>
        )}
        {person.is_demo && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-accent border border-background" title="Démo" />
        )}
      </div>
      <div className="text-center leading-tight">
        <p className="text-[11px] font-medium text-foreground truncate w-full">
          {person.first_name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate w-full">
          {person.last_name}
        </p>
        {age !== null && (
          <p className="text-[10px] text-muted-foreground/70">{age} ans</p>
        )}
      </div>
    </div>
  );
}

function MemorialStrip({ people }: { people: MemorialPerson[] }) {
  if (!people.length) return null;
  return (
    <div className="mb-6">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-3">
        Personnes concernées
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {people.map((p) => (
          <PersonCard key={p.id} person={p} />
        ))}
      </div>
      <div className="mt-3 border-b border-border/40" />
    </div>
  );
}

/* ── Styled markdown prose ──────────────────────────────────────── */

function StyledAnswer({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <div className="relative">
      <article
        className="
          prose prose-neutral dark:prose-invert max-w-none
          prose-headings:font-serif prose-headings:tracking-tight prose-headings:text-foreground
          prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h2:border-b prose-h2:border-border/30 prose-h2:pb-2
          prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
          prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground/85 prose-p:mb-4
          prose-li:text-sm prose-li:leading-relaxed prose-li:text-foreground/85 prose-li:mb-1.5
          prose-ul:my-3 prose-ol:my-3
          prose-strong:text-foreground prose-strong:font-semibold
          prose-em:text-muted-foreground
          prose-blockquote:border-l-2 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
          prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-hr:border-border/30 prose-hr:my-6
        "
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse rounded-sm ml-0.5 -mb-0.5" />
      )}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */

const SocialIntelligence = () => {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [memorials, setMemorials] = useState<MemorialPerson[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch memorial people on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("memorials")
        .select("id, first_name, last_name, photo_url, birth_date, death_date, is_demo, total_posts")
        .eq("is_active", true)
        .eq("is_published", true)
        .order("total_posts", { ascending: false, nullsFirst: false })
        .limit(30);
      if (data) setMemorials(data as MemorialPerson[]);
    })();
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("social_search_history")
      .select("id, question, answer, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data as HistoryEntry[]) || []);
    setHistoryLoading(false);
  }, []);

  const submitQuestion = useCallback(async (q: string) => {
    if (q.trim().length < 3) return;
    setShowHistory(false);
    setSelectedEntry(null);
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

  const openHistory = useCallback(() => {
    setShowHistory(true);
    setSelectedEntry(null);
    loadHistory();
  }, [loadHistory]);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-3">
            <Brain className="w-7 h-7 text-primary" />
            Intelligence Sociale
          </h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide">
            Moteur de recherche RAG · Maillage social
          </p>
        </div>
        {!showHistory && !selectedEntry && (
          <button
            onClick={openHistory}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md border border-border/60"
          >
            <History className="w-3.5 h-3.5" />
            Historique
          </button>
        )}
        {(showHistory || selectedEntry) && (
          <button
            onClick={() => { setShowHistory(false); setSelectedEntry(null); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Retour
          </button>
        )}
      </div>

      {/* Search input */}
      {!showHistory && !selectedEntry && (
        <div className="flex items-center border border-border/60 rounded-lg px-4 bg-card mb-8 shadow-sm">
          <Search className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
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
            className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="min-h-[40vh]">
        {/* ── History list ── */}
        {showHistory && !selectedEntry && (
          <div className="space-y-2">
            <h2 className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-4">
              20 dernières recherches
            </h2>
            {historyLoading && (
              <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Chargement…</span>
              </div>
            )}
            {!historyLoading && history.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-12">Aucune recherche enregistrée</p>
            )}
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent/50 transition-colors border border-border/30 flex items-start gap-3"
              >
                <Clock className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/60 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{entry.question}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{timeAgo(entry.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Selected history entry ── */}
        {selectedEntry && (
          <div className="space-y-6">
            <div className="bg-muted/30 rounded-lg p-5 border border-border/20">
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-2">Question posée</p>
              <p className="text-sm font-serif font-medium leading-relaxed">{selectedEntry.question}</p>
              <p className="text-[10px] text-muted-foreground/50 mt-2">{timeAgo(selectedEntry.created_at)}</p>
            </div>

            <MemorialStrip people={memorials} />

            {selectedEntry.answer ? (
              <StyledAnswer content={selectedEntry.answer} isStreaming={false} />
            ) : (
              <p className="text-xs text-muted-foreground italic">Réponse non enregistrée</p>
            )}
            <button
              onClick={() => {
                const q = selectedEntry.question;
                setSelectedEntry(null);
                setShowHistory(false);
                setQuery(q);
                submitQuestion(q);
              }}
              className="text-[11px] text-primary/80 hover:text-primary hover:underline transition-colors"
            >
              ↻ Reposer cette question
            </button>
          </div>
        )}

        {/* ── Main search view ── */}
        {!showHistory && !selectedEntry && (
          <>
            {error && (
              <div className="rounded-lg bg-destructive/5 border border-destructive/15 p-4 text-xs text-destructive mb-6">
                {error}
              </div>
            )}

            {isLoading && !answer && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground py-16">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs tracking-wide">Analyse du maillage social en cours…</span>
              </div>
            )}

            {(answer || isLoading) && (
              <div className="space-y-0">
                <MemorialStrip people={memorials} />
                <StyledAnswer content={answer} isStreaming={isLoading} />
              </div>
            )}

            {!answer && !isLoading && !error && (
              <div className="space-y-6">
                {/* Show memorial strip on idle too */}
                <MemorialStrip people={memorials} />

                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium mb-3">
                    Suggestions de questions
                  </p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setQuery(s);
                        submitQuestion(s);
                      }}
                      className="w-full text-left px-4 py-3.5 rounded-lg text-sm hover:bg-accent/50 transition-colors border border-border/30 text-foreground/80"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SocialIntelligence;
