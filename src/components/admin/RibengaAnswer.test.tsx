import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RibengaAnswer } from "./RibengaAnswer";
import { extractCitedMemorialIds } from "@/lib/adminRelationContext";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const api = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: api }));
const candidates = [{ id: A, name: "Charlotte IGOUWE" }, { id: B, name: "Paul TEST" }];
let rows: Array<{ id: string; slug: string; share_token: string | null }>;
const show = (content: string, sourceIds = [A, B]) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <RibengaAnswer content={content} candidates={candidates} sourceIds={sourceIds} />
  </QueryClientProvider>);

describe("RIBENGA safe canonical citation presentation", () => {
  beforeEach(() => {
    cleanup(); vi.clearAllMocks();
    rows = [{ id: A, slug: "charlotte", share_token: null }, { id: B, slug: "paul", share_token: null }];
    api.from.mockImplementation(() => {
      const chain = { select: vi.fn(), in: vi.fn(), eq: vi.fn(), is: vi.fn(), then: vi.fn() };
      for (const method of ["select", "in", "eq", "is"] as const) chain[method].mockReturnValue(chain);
      chain.then.mockImplementation((resolve) => resolve({ data: rows, error: null }));
      return chain;
    });
  });
  it("links multiple authorized people without displaying internal UUIDs and preserves raw attribution", async () => {
    const raw = `Charlotte IGOUWE [[mem:${A}]], puis **Paul TEST** [[mem:${B}]].`;
    const { container } = show(raw);
    expect(await screen.findByRole("link", { name: "Charlotte IGOUWE" })).toHaveAttribute("href", "/memorial/charlotte");
    expect(await screen.findByRole("link", { name: "Paul TEST" })).toHaveAttribute("href", "/memorial/paul");
    expect(container.textContent).not.toContain("[[mem:");
    expect(container.textContent).not.toContain(A);
    expect(container.textContent).toContain(", puis Paul TEST");
    expect(extractCitedMemorialIds(raw, [A, B])).toEqual([A, B]);
  });
  it("unknown and malformed markers disappear without creating a link", () => {
    const { container } = show(`Charlotte IGOUWE [[mem:${A}]], Paul TEST [[mem:invalid]].`, []);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.textContent).toContain("Charlotte IGOUWE");
    expect(container.textContent).not.toContain("mem:");
    expect(api.from).not.toHaveBeenCalled();
  });
  it("inaccessible memorial stays plain text", async () => {
    rows = [];
    const { container } = show(`Charlotte IGOUWE [[mem:${A}]].`);
    expect(await screen.findByText(/Charlotte IGOUWE/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.textContent).not.toContain(A);
  });
  it("keeps Markdown and ordinary links; never inserts raw HTML or an injected URL", async () => {
    rows[0].slug = "//evil.test/<script>";
    const { container } = show(`Charlotte IGOUWE [[mem:${A}]]. [Guide](https://example.org)\n\n- **Texte**\n\n<script>alert(1)</script>`);
    expect(await screen.findByRole("link", { name: "Charlotte IGOUWE" })).toHaveAttribute("href", "/memorial/%2F%2Fevil.test%2F%3Cscript%3E");
    expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute("href", "https://example.org");
    expect(container.querySelector("strong")?.textContent).toBe("Texte");
    expect(container.querySelector("script")).toBeNull();
  });
  it("hides a partial streaming marker and does not use homonymy to link another label", () => {
    const { container } = show(`Autre personne [[mem:${A}]] ; Charlotte IGOUWE [[mem:000000`, []);
    expect(container.textContent).toContain("Autre personne");
    expect(container.textContent).not.toContain("mem:");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});