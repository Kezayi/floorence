import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractCitedMemorialIds, readRelationSourceIds, type AdminMemorialContext } from "@/lib/adminRelationContext";

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
}

const marker = /\[\[\s*mem\s*:\s*([^\]\r\n]*)(?:\]\]?)?/gi;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
interface Destination { name: string; url: string }
const norm = (v: string) => v.normalize("NFC").toLocaleLowerCase("fr").replace(/\s+/g, " ");

/** Only presentation is transformed. The original SSE answer and source attribution stay intact. */
function citationPlugin(destinations: Map<string, Destination>) {
  return () => (tree: MarkdownNode) => {
    const walk = (parent: MarkdownNode, insideLink = false) => {
      const output: MarkdownNode[] = [];
      for (const child of parent.children ?? []) {
        if (child.type !== "text") {
          if (child.value) child.value = child.value.replace(marker, "");
          walk(child, insideLink || child.type === "link" || child.type === "linkReference");
          output.push(child);
          continue;
        }
        const text = child.value ?? "";
        let cursor = 0;
        for (const match of text.matchAll(marker)) {
          const before = text.slice(cursor, match.index);
          if (before) output.push({ type: "text", value: before });
          const id = match[1].trim().toLowerCase();
          const destination = uuid.test(id) && match[0].endsWith("]]") ? destinations.get(id) : undefined;
          const previous = output.at(-1);
          if (destination && previous && !insideLink) {
            // Name matching locates only the label immediately before THIS UUID; it never resolves identity.
            if (previous.type === "text" && norm(previous.value ?? "").trimEnd().endsWith(norm(destination.name))) {
              const end = previous.value.trimEnd();
              const start = end.length - destination.name.length;
              const prefix = end.slice(0, start);
              if (!prefix || /[\s:;(—–]/.test(prefix.at(-1) ?? "")) {
                previous.value = prefix;
                output.push({ type: "link", url: destination.url, children: [{ type: "text", value: end.slice(start) }] });
              }
            } else if ((previous.type === "text" && !previous.value?.trim()) ||
              previous.type === "strong" || previous.type === "emphasis") {
              const formattedIndex = previous.type === "text" ? output.length - 2 : output.length - 1;
              const formatted = output[formattedIndex];
              if ((formatted?.type === "strong" || formatted?.type === "emphasis") &&
                formatted.children?.length === 1 && norm(formatted.children[0].value ?? "").trim() === norm(destination.name)) {
                output.splice(formattedIndex, 1, { type: "link", url: destination.url, children: [formatted] });
              }
            }
          }
          cursor = (match.index ?? 0) + match[0].length;
        }
        // Streaming: an unfinished marker at the end is never shown to the reader.
        const tail = text.slice(cursor).replace(/\[\[\s*(m(e(m(\s*:[^\]\r\n]*)?)?)?)?$/i, "");
        if (tail) output.push({ type: "text", value: tail });
      }
      if (parent.children) parent.children = output;
    };
    walk(tree);
  };
}

export function RibengaAnswer({ content, candidates = [], sourceIds = [] }: {
  content: string; candidates?: AdminMemorialContext[]; sourceIds?: string[];
}) {
  const ids = extractCitedMemorialIds(content, readRelationSourceIds(sourceIds, candidates)).sort();
  const visible = useQuery({
    queryKey: ["ribenga-answer-visible-citations", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("memorials")
        .select("id, first_name, last_name, slug, share_token")
        .in("id", ids).eq("is_active", true).eq("is_published", true).is("deleted_at", null);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const destinations = new Map<string, Destination>();
  if (!visible.isError) for (const memorial of visible.data ?? []) {
    if (!ids.includes(memorial.id.toLowerCase())) continue;
    const metadata = candidates.find((m) => m.id.toLowerCase() === memorial.id.toLowerCase());
    const path = memorial.share_token ? `/m/${encodeURIComponent(memorial.share_token)}`
      : memorial.slug ? `/memorial/${encodeURIComponent(memorial.slug)}` : null;
    const name = metadata?.name?.trim() || `${memorial.first_name} ${memorial.last_name}`.trim();
    if (name && path) destinations.set(memorial.id.toLowerCase(), { name, url: path });
  }
  return <ReactMarkdown skipHtml remarkPlugins={[citationPlugin(destinations)]}>{content}</ReactMarkdown>;
}