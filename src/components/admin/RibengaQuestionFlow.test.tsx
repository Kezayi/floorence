import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import SocialIntelligence from "@/pages/admin/SocialIntelligence";
import SocialSearchPalette from "./SocialSearchPalette";
import { computeIspFacts, summarizeIsp } from "../../../supabase/functions/_shared/isp";
import { ispIdentityFilter } from "../../../supabase/functions/_shared/civility";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const R = "00000000-0000-4000-8000-000000000001";
const api = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), auth: { getSession: vi.fn() } }));
const graphs = vi.hoisted(() => ({ fetchAdminContextRelationGraph: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: api }));
vi.mock("@/lib/resolvedGraphs", () => graphs);
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "isolated-user" } }) }));
vi.mock("@/components/ui/command", () => ({ CommandDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("./RAGetSourceSearch", () => ({ RAGetSourceSearch: () => <div>Sources secondaires</div> }));
const memorial = (id: string) => ({ id, first_name: id === A ? "Alpha" : "Beta", last_name: "Test", slug: id, photo_url: null });

describe.each(["page", "palette"])("Question libre %s — services entièrement interceptés", (surface) => {
  let sourceIds: string[];
  let rows: ReturnType<typeof memorial>[];
  beforeEach(() => {
    cleanup(); vi.clearAllMocks();
    sourceIds = [A, B]; rows = [memorial(A), memorial(B)];
    api.auth.getSession.mockResolvedValue({ data: { session: { access_token: "synthetic-not-a-credential" } } });
    api.from.mockImplementation(() => {
      const chain = { select: vi.fn(), in: vi.fn(), eq: vi.fn(), is: vi.fn(), then: vi.fn() };
      for (const key of ["select", "in", "eq", "is"] as const) chain[key].mockReturnValue(chain);
      chain.then.mockImplementation((resolve) => resolve({ data: rows, error: null }));
      return chain;
    });
    api.rpc.mockResolvedValue({ data: [{ relation_id: R, confirmations: 2 }], error: null });
    graphs.fetchAdminContextRelationGraph.mockResolvedValue({ memorials: rows, edges: [{ aId: A, bId: B, relationId: R, label: "Lien déclaré" }] });
    vi.stubGlobal("fetch", vi.fn(async () => {
      const events = [
        { type: "memorial_meta", memorials: { [A]: { name: "Homonyme" }, [B]: { name: "Homonyme" } } },
        { type: "relation_sources", memorial_ids: sourceIds, valid: true },
        { choices: [{ delta: { content: "Réponse du moteur, sans citation UUID." } }] },
      ];
      return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n", { status: 200 });
    }));
  });
  const ask = async () => {
    render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {surface === "page" ? <SocialIntelligence /> : <SocialSearchPalette externalOpen />}
    </QueryClientProvider></MemoryRouter>);
    const input = screen.getByPlaceholderText("Posez une question sur le maillage social…");
    fireEvent.change(input, { target: { value: "Quels liens sont déclarés ?" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByText("Réponse du moteur, sans citation UUID.");
  };
  it("two sourced UUIDs load a real path without any manual selection", async () => {
    await ask();
    expect(await screen.findByText("Confirmé par 2 membres")).toBeInTheDocument();
    expect(graphs.fetchAdminContextRelationGraph).toHaveBeenCalledWith(A, B, [A, B]);
    expect(screen.getByLabelText("Depuis le mémorial")).toHaveValue("");
  });
  it("submits the actual ISP question and renders server-calculated synthetic SSE facts", async () => {
    const question = "Quelle sympathie potentielle pour Iris Test autour de Alpha Test ?";
    const [fact] = computeIspFacts([{ memorial_id: A, user_id: "fictional-account", author_name: "Iris Test", relation_category: "autres", candle_count: 1, flower_count: 1 }]);
    expect(fact).toMatchObject({ G: 2, T: 2, C: 5, E: 10, isp: 55 });
    const answer = `Iris Test : ISP = ${fact.isp?.toFixed(4)}. Signal potentiel, non certifié. Alpha Test [[mem:${A}]]`;
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect(JSON.parse(String(init.body))).toEqual({ question });
      const events = [
        { type: "memorial_meta", memorials: { [A]: { name: "Alpha Test" } } },
        { type: "relation_sources", memorial_ids: [A], valid: true },
        { choices: [{ delta: { content: answer.slice(0, 30) } }] },
        { choices: [{ delta: { content: answer.slice(30) } }] },
      ];
      return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n");
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {surface === "page" ? <SocialIntelligence /> : <SocialSearchPalette externalOpen />}
    </QueryClientProvider></MemoryRouter>);
    const input = screen.getByPlaceholderText("Posez une question sur le maillage social…");
    fireEvent.change(input, { target: { value: question } });
    fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByText(/ISP = 55\.0000/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("link", { name: "Alpha Test" })).toHaveAttribute("href", `/memorial/${A}`);
    expect(document.body.textContent).not.toContain(A);
    expect(document.body.textContent).not.toContain("[[mem:");
  });
  it("filtered natural ISP question keeps submitted order and server winner through stream", async () => {
    const question = "Quelle femme avec le plus fort ISP autour de Alpha Test ?";
    const facts = computeIspFacts([
      { memorial_id: A, user_id: "woman", author_name: "Iris Test", relation_category: "famille_directe", candle_count: 1, flower_count: 0 },
      { memorial_id: A, user_id: "man", author_name: "Paul Test", relation_category: "autres", candle_count: 9, flower_count: 0 },
    ], { identityFilter: ispIdentityFilter(question), civilities: new Map([["woman", "Mme"], ["man", "M."]]) });
    const summary = summarizeIsp(facts, A);
    expect(summary).toMatchObject({ leaders: ["Iris Test"], max: 0.1 });
    const answer = `Plus fort ISP femmes : Iris Test — ISP = 0.1000. Alpha Test [[mem:${A}]]`;
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect(JSON.parse(String(init.body))).toEqual({ question });
      return new Response([
        { type: "relation_sources", memorial_ids: [A], valid: true },
        { choices: [{ delta: { content: answer.slice(0, 20) } }] },
        { choices: [{ delta: { content: answer.slice(20) } }] },
      ].map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n");
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {surface === "page" ? <SocialIntelligence /> : <SocialSearchPalette externalOpen />}
    </QueryClientProvider></MemoryRouter>);
    const input = screen.getByPlaceholderText("Posez une question sur le maillage social…");
    fireEvent.change(input, { target: { value: question } }); fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByText(/Iris Test — ISP = 0.1000/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain("Paul Test");
    expect(document.body.textContent).not.toContain(A);
  });
  it("one UUID keeps answer and explains missing path", async () => {
    sourceIds = [A]; await ask();
    await screen.findByText(/Un seul mémorial identifié/);
    expect(graphs.fetchAdminContextRelationGraph).not.toHaveBeenCalled();
  });
  it("names only never create canonical paths", async () => {
    sourceIds = []; await ask();
    await screen.findByText(/Aucune source pertinente/);
    expect(graphs.fetchAdminContextRelationGraph).not.toHaveBeenCalled();
  });
  it("no accepted path preserves answer with explicit fallback", async () => {
    graphs.fetchAdminContextRelationGraph.mockResolvedValue({ memorials: rows, edges: [] });
    await ask();
    await screen.findByText(/Chemin non étayé entre les deux sources/);
    expect(api.rpc).not.toHaveBeenCalled();
  });
  it("inaccessible UUID is excluded before graph lookup", async () => {
    rows = [memorial(A)]; await ask();
    await screen.findByText(/Un seul mémorial identifié/);
    expect(graphs.fetchAdminContextRelationGraph).not.toHaveBeenCalled();
  });
  it("manual exploration is secondary on both surfaces, existing source search follows on page", async () => {
    await ask();
    await waitFor(() => expect(screen.getByText("Explorer une relation précise")).toBeInTheDocument());
    const answer = screen.getByText("Réponse du moteur, sans citation UUID.");
    const paths = screen.getByText("Chemins relationnels de cette réponse");
    const manual = screen.getByText("Explorer une relation précise");
    expect(answer.compareDocumentPosition(paths) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(paths.compareDocumentPosition(manual) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(manual.closest("details")).not.toHaveAttribute("open");
    if (surface === "page") expect(manual.compareDocumentPosition(screen.getByText("Recherche dans les sources")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    if (surface === "page") {
      const header = screen.getByRole("heading", { name: "RIBENGA" });
      const input = screen.getByPlaceholderText("Posez une question sur le maillage social…");
      const search = screen.getByText("Recherche dans les sources");
      expect(header.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(input.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(search.closest("details")).not.toHaveAttribute("open");
      expect(search.closest("details")?.parentElement).toBe(header.closest('[aria-label="RIBENGA"]'));
    }
  });
});