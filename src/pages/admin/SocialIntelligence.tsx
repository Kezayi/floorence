import { useState, useCallback, useRef } from "react";
import { Search, Sparkles, Loader2, History, Clock, ChevronLeft, X, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

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

const SocialIntelligence = () => {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            Intelligence Sociale
          </h1>
          <p className="text-muted-foreground mt-1 font-sans">
            Moteur de recherche RAG sur le maillage social
          </p>
        </div>
        {!showHistory && !selectedEntry && (
          <button
            onClick={openHistory}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md border border-border"
          >
            <History className="w-4 h-4" />
            Historique
          </button>
        )}
        {(showHistory || selectedEntry) && (
          <button
            onClick={() => { setShowHistory(false); setSelectedEntry(null); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>
        )}
      </div>

      {/* Search input (hidden in history/detail views) */}
      {!showHistory && !selectedEntry && (
        <div className="flex items-center border border-border rounded-lg px-4 bg-card mb-6">
          <Search className="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
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
            className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="min-h-[40vh]">
        {/* ── History list ── */}
        {showHistory && !selectedEntry && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              20 dernières recherches
            </h2>
            {historyLoading && (
              <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Chargement…</span>
              </div>
            )}
            {!historyLoading && history.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">Aucune recherche enregistrée</p>
            )}
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors border border-border/50 flex items-start gap-3"
              >
                <Clock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{entry.question}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(entry.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Selected history entry ── */}
        {selectedEntry && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Question posée</p>
              <p className="text-sm font-medium">{selectedEntry.question}</p>
              <p className="text-xs text-muted-foreground mt-1">{timeAgo(selectedEntry.created_at)}</p>
            </div>
            {selectedEntry.answer ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{selectedEntry.answer}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Réponse non enregistrée</p>
            )}
            <button
              onClick={() => {
                const q = selectedEntry.question;
                setSelectedEntry(null);
                setShowHistory(false);
                setQuery(q);
                submitQuestion(q);
              }}
              className="text-xs text-primary hover:underline"
            >
              ↻ Reposer cette question
            </button>
          </div>
        )}

        {/* ── Main search view ── */}
        {!showHistory && !selectedEntry && (
          <>
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive mb-4">
                {error}
              </div>
            )}

            {isLoading && !answer && (
              <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
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
                    className="w-full text-left px-4 py-3 rounded-lg text-sm hover:bg-accent hover:text-accent-foreground transition-colors border border-border/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SocialIntelligence;
