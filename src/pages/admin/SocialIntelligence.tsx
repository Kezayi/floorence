import { useState, useCallback, useRef } from "react";
import { Search, Loader2, History, Clock, ChevronLeft, X, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { AdminRelationExplanation } from "@/components/admin/AdminRelationExplanation";
import { readAdminMemorialContext, type AdminMemorialContext } from "@/lib/adminRelationContext";
import { RAGetSourceSearch } from "@/components/admin/RAGetSourceSearch";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-search`;

interface HistoryEntry {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
}

async function streamQuestion(
  question: string,
  onDelta: (text: string) => void,
  onContext: (context: AdminMemorialContext[]) => void,
  signal: AbortSignal
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Session expirée — veuillez vous reconnecter pour interroger le moteur.");
  }

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ question }),
    signal,
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => null);
    const detail = errData?.error || errData?.message;
    if (resp.status === 401) {
      throw new Error("Session expirée — veuillez vous reconnecter pour interroger le moteur.");
    }
    if (resp.status === 403) {
      throw new Error("Accès refusé — ce moteur est réservé aux administrateurs et modérateurs.");
    }
    if (resp.status >= 500) {
      throw new Error(`Le moteur est momentanément indisponible${detail ? ` (${detail})` : ""}. Réessayez dans un instant.`);
    }
    throw new Error(detail || `Erreur ${resp.status}`);
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
        if (parsed.type === "memorial_meta") {
          onContext(readAdminMemorialContext(parsed.memorials));
          continue;
        }
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

/* ── Styled markdown prose ──────────────────────────────────────── */

function StyledAnswer({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <div className="relative">
      <article
        className="
          max-w-none text-sm leading-[1.85] text-foreground/85 font-sans
          [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:tracking-tight
          [&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-border/25
          [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2
          [&_p]:mb-5 [&_p]:leading-[1.85]
          [&_ul]:my-4 [&_ul]:pl-5 [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:marker:text-muted-foreground/40
          [&_ol]:my-4 [&_ol]:pl-5 [&_ol]:space-y-2 [&_ol]:list-decimal [&_ol]:marker:text-muted-foreground/40
          [&_li]:leading-[1.75] [&_li]:pl-1
          [&_strong]:font-semibold [&_strong]:text-foreground
          [&_em]:text-muted-foreground [&_em]:not-italic [&_em]:text-[13px]
          [&_blockquote]:border-l-2 [&_blockquote]:border-primary/20 [&_blockquote]:pl-4 [&_blockquote]:my-5 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
          [&_hr]:border-border/20 [&_hr]:my-8
          [&_code]:text-xs [&_code]:bg-muted/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
        "
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
      {isStreaming && (
        <span className="inline-block w-1.5 h-5 bg-primary/50 animate-pulse rounded-full ml-0.5 -mb-1" />
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
  const [context, setContext] = useState<AdminMemorialContext[]>([]);
  const abortRef = useRef<AbortController | null>(null);

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
    setContext([]);
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamQuestion(q, setAnswer, setContext, controller.signal);
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
      <RAGetSourceSearch />
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-3">
            <Brain className="w-7 h-7 text-primary" />
            RIBENGA
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
        <div className="flex items-center border border-[hsl(0_60%_25%/0.25)] rounded-lg px-4 bg-card mb-8 shadow-sm">
          <div className="mr-3 w-7 h-7 rounded-full bg-admin-burgundy flex items-center justify-center shrink-0">
            <Search className="h-3.5 w-3.5 text-white" />
          </div>
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

            <AdminRelationExplanation key={selectedEntry.id} candidates={[]} />

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
              <div>
                <StyledAnswer content={answer} isStreaming={isLoading} />
                {answer && !isLoading && <AdminRelationExplanation key={query} candidates={context} />}
              </div>
            )}

            {!answer && !isLoading && !error && (
              <div className="space-y-6">

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
