import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Sparkles, X, Loader2, History, Clock, ChevronLeft, Users } from "lucide-react";
import { CommandDialog } from "@/components/ui/command";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Hard-coded URL pour bypasser tout problème de variable d'environnement
const CHAT_URL = "https://vxuueidrzrnfglfilmnh.supabase.co/functions/v1/social-search";

interface HistoryEntry {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
}

interface MemorialMeta {
  name: string;
  photo: string | null;
  slug: string | null;
}

interface UsageData {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

async function streamQuestion(
  question: string,
  onDelta: (text: string) => void,
  onMeta: (meta: Record<string, MemorialMeta>) => void,
  onUsage: (usage: UsageData) => void,
  signal: AbortSignal
) {
  // Zero-Trust: récupération session fraîche
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("AUTH_REQUIRED");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    "X-Client-Info": "lovable-social-search",
  };


  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ question }),
    signal,
  });
  if (!resp.ok) {
    const errData = await resp.json().catch(() => null);
    const msg = errData?.message || errData?.error || `Erreur ${resp.status} — ${resp.statusText}`;
    console.error('[RAG] Error response:', resp.status, msg);
    throw new Error(msg);
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
        if (parsed.type === "memorial_meta" && parsed.memorials) {
          onMeta(parsed.memorials);
          continue;
        }
        if (parsed.type === "usage" && parsed.usage) {
          onUsage(parsed.usage);
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

/** Extract mentioned memorial names from the answer to display their photos */
function findMentionedMemorials(
  answer: string,
  meta: Record<string, MemorialMeta>
): MemorialMeta[] {
  const found: MemorialMeta[] = [];
  const seen = new Set<string>();
  for (const [id, m] of Object.entries(meta)) {
    if (!seen.has(m.name) && answer.includes(m.name)) {
      found.push(m);
      seen.add(m.name);
    }
  }
  return found.slice(0, 8); // max 8 portraits
}

/** Memorial portrait strip shown above the answer */
const MemorialStrip = ({ memorials, onNavigate }: { memorials: MemorialMeta[]; onNavigate: (slug: string) => void }) => {
  if (memorials.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-border/50">
      {memorials.map((m) => (
        <Tooltip key={m.name}>
          <TooltipTrigger asChild>
            <button
              onClick={() => m.slug && onNavigate(`/memorial/${m.slug}`)}
              className="flex items-center gap-1.5 bg-muted/50 rounded-full pl-0.5 pr-2.5 py-0.5 hover:ring-2 hover:ring-primary transition-all cursor-pointer group"
            >
              <Avatar className="w-6 h-6">
                {m.photo && (
                  <AvatarImage
                    src={m.photo}
                    alt={m.name}
                    className="object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-600 animate-in fade-in duration-500"
                  />
                )}
                <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-serif">
                  {m.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] font-serif text-foreground/80 truncate max-w-[100px]">
                {m.name}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {m.name}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

interface SocialSearchPaletteProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

const SocialSearchPalette = ({ externalOpen, onExternalOpenChange }: SocialSearchPaletteProps = {}) => {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = onExternalOpenChange ?? setInternalOpen;
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [memorialMeta, setMemorialMeta] = useState<Record<string, MemorialMeta>>({});
  const [usage, setUsage] = useState<UsageData | null>(null);
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

  const reset = useCallback(() => {
    setQuery("");
    setAnswer("");
    setError(null);
    setIsLoading(false);
    setShowHistory(false);
    setSelectedEntry(null);
    setMemorialMeta({});
    setUsage(null);
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
    setShowHistory(false);
    setSelectedEntry(null);
    setIsLoading(true);
    setAnswer("");
    setError(null);
    setMemorialMeta({});
    setUsage(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamQuestion(q, setAnswer, setMemorialMeta, setUsage, controller.signal);
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

  const mentionedMemorials = answer ? findMentionedMemorials(answer, memorialMeta) : [];

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <div className="flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              {(showHistory || selectedEntry) && (
                <button
                  onClick={() => { setShowHistory(false); setSelectedEntry(null); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {showHistory ? "Historique des recherches" : selectedEntry ? "Résultat archivé" : "RIBENGA — Maillage RAG"}
              </span>
            </div>
            {!showHistory && !selectedEntry && (
              <button
                onClick={openHistory}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                Historique
              </button>
            )}
          </div>

          {/* Search input (hidden in history/detail views) */}
          {!showHistory && !selectedEntry && (
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
          )}

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-4 max-h-[60vh]">
            {/* ── History list ── */}
            {showHistory && !selectedEntry && (
              <div className="space-y-1">
                {historyLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Chargement…</span>
                  </div>
                )}
                {!historyLoading && history.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune recherche enregistrée</p>
                )}
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent transition-colors border border-border/30 flex items-start gap-3"
                  >
                    <Clock className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
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
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-md p-3">
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
                    setSelectedEntry(null);
                    setShowHistory(false);
                    setQuery(selectedEntry.question);
                    submitQuestion(selectedEntry.question);
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
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive space-y-2">
                    <p>{error === "AUTH_REQUIRED" ? "Authentification requise. Veuillez vous connecter." : error}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setError(null); submitQuestion(query); }}
                        className="text-xs font-medium underline hover:no-underline"
                      >
                        ↻ Réessayer
                      </button>
                      {(error === "AUTH_REQUIRED" || error.toLowerCase().includes("expired") || error.includes("403") || error.includes("401") || error.toLowerCase().includes("jwt") || error.toLowerCase().includes("autoris")) && (
                        <button
                          onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = "/auth";
                          }}
                          className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 transition-colors"
                        >
                          🔄 Réinitialiser la Session
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {isLoading && !answer && (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Analyse du maillage social en cours…</span>
                  </div>
                )}

                {answer && (
                  <div>
                    {/* Memorial portrait strip */}
                    <MemorialStrip memorials={mentionedMemorials} onNavigate={(path) => { handleOpenChange(false); navigate(path); }} />

                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{answer}</ReactMarkdown>
                      {isLoading && (
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded-sm ml-0.5" />
                      )}
                    </div>

                    {/* Token usage badge */}
                    {usage && !isLoading && (
                      <div className="flex justify-end mt-3 pt-2 border-t border-border/30">
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                          Consommation : {((usage.total_tokens || ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0))) / 1000).toFixed(1)}k tokens
                        </span>
                      </div>
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
              </>
            )}
          </div>
        </div>
      </CommandDialog>
  );
};

export default SocialSearchPalette;
