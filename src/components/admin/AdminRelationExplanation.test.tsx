import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AdminRelationExplanation } from "./AdminRelationExplanation";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const R = "00000000-0000-4000-8000-000000000001";
const api = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
const graphs = vi.hoisted(() => ({ fetchAdminContextRelationGraph: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: api }));
vi.mock("@/lib/resolvedGraphs", () => graphs);
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "synthetic-member" } }) }));
const memorial = (id: string, name: string) => ({ id, first_name: name, last_name: "Test", slug: name, photo_url: null, photos: null });
const mount = (candidates: Array<{ id: string; name: string }>) => render(
  <MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <AdminRelationExplanation candidates={candidates} />
  </QueryClientProvider></MemoryRouter>
);
const choose = async () => {
  await waitFor(() => expect(within(screen.getByLabelText("Depuis le mémorial")).getByRole("option", { name: /Alpha Test/ })).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText("Depuis le mémorial"), { target: { value: A } });
  fireEvent.change(screen.getByLabelText("Vers le mémorial"), { target: { value: B } });
};

describe("Mounted explanation — synthetic isolated checks, no backend calls", () => {
  beforeEach(() => {
    cleanup(); vi.clearAllMocks();
    const chain = { select: vi.fn(), in: vi.fn(), eq: vi.fn(), is: vi.fn(), then: vi.fn() };
    for (const method of ["select", "in", "eq", "is"] as const) chain[method].mockReturnValue(chain);
    chain.then.mockImplementation((resolve) => resolve({ data: [memorial(A, "Alpha"), memorial(B, "Beta")], error: null }));
    api.from.mockReturnValue(chain);
    graphs.fetchAdminContextRelationGraph.mockResolvedValue({ memorials: [memorial(A, "Alpha"), memorial(B, "Beta")], edges: [{ aId: A, bId: B, relationId: R, label: "Frère" }] });
    api.rpc.mockResolvedValue({ data: [{ relation_id: R, confirmations: 2 }], error: null });
  });
  it("without canonical context renders fallback and makes no lookup", () => {
    mount([]);
    expect(screen.getByText(/Source canonique non disponible/)).toBeInTheDocument();
    expect(api.from).not.toHaveBeenCalled();
    expect(graphs.fetchAdminContextRelationGraph).not.toHaveBeenCalled();
  });
  it("only loads a path after explicit UUID selection, with real panel and per-ID counts", async () => {
    mount([{ id: A, name: "Ignored" }, { id: B, name: "Ignored" }]);
    expect(graphs.fetchAdminContextRelationGraph).not.toHaveBeenCalled();
    await choose();
    expect(await screen.findByText("Confirmé par 2 membres")).toBeInTheDocument();
    expect(graphs.fetchAdminContextRelationGraph).toHaveBeenCalledWith(A, B, [A, B]);
    expect(api.rpc).toHaveBeenCalledWith("get_relation_confirmation_counts", { p_relation_ids: [R] });
    expect(screen.getByRole("link", { name: /Alpha Test/ })).toHaveAttribute("href", "/memorial/Alpha");
  });
  it("missing counter row stays unavailable, never becomes zero or confirmed", async () => {
    api.rpc.mockResolvedValue({ data: [], error: null });
    mount([{ id: A, name: "Alpha" }, { id: B, name: "Beta" }]);
    await choose();
    expect(await screen.findByText("Confirmations indisponibles")).toBeInTheDocument();
    expect(screen.queryByText(/Confirmé par/)).not.toBeInTheDocument();
  });
  it("insufficient graph explicitly renders an unsubstantiated path", async () => {
    graphs.fetchAdminContextRelationGraph.mockResolvedValue({ memorials: [], edges: [] });
    mount([{ id: A, name: "Alpha" }, { id: B, name: "Beta" }]);
    await choose();
    expect(await screen.findByText(/Chemin non étayé entre les deux sources/)).toBeInTheDocument();
    expect(api.rpc).not.toHaveBeenCalled();
  });
});
describe("Automatic paths from structured server sources — synthetic", () => {
  const C = "00000000-0000-4000-8000-00000000000c";
  const setVisible = (rows: unknown[]) => {
    const chain = { select: vi.fn(), in: vi.fn(), eq: vi.fn(), is: vi.fn(), then: vi.fn() };
    for (const m of ["select", "in", "eq", "is"] as const) chain[m].mockReturnValue(chain);
    chain.then.mockImplementation((resolve) => resolve({ data: rows, error: null }));
    api.from.mockReturnValue(chain);
  };
  const mountA = (candidates: Array<{ id: string; name: string }>, sourceIds: string[]) => render(
    <MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminRelationExplanation candidates={candidates} sourceIds={sourceIds} />
    </QueryClientProvider></MemoryRouter>);
  beforeEach(() => {
    cleanup(); vi.clearAllMocks();
    setVisible([memorial(A, "Alpha"), memorial(B, "Beta")]);
    graphs.fetchAdminContextRelationGraph.mockResolvedValue({ memorials: [memorial(A, "Alpha"), memorial(B, "Beta")], edges: [{ aId: A, bId: B, relationId: R, label: "Frère" }] });
    api.rpc.mockResolvedValue({ data: [{ relation_id: R, confirmations: 2 }], error: null });
  });
  const ctx = [{ id: A, name: "x" }, { id: B, name: "y" }, { id: C, name: "z" }];
  it("2 cited authorized UUIDs → path loaded automatically, no selection", async () => {
    mountA(ctx, [A, B]);
    expect(await screen.findByText("Confirmé par 2 membres")).toBeInTheDocument();
    expect(graphs.fetchAdminContextRelationGraph).toHaveBeenCalledWith(A, B, [A, B]);
    expect(screen.getByText(/ne prouvent pas les affirmations/)).toBeInTheDocument();
  });
  it("1 cited UUID → no path, explicit message", async () => {
    mountA(ctx, [A]);
    expect(await screen.findByText(/Un seul mémorial identifié/)).toBeInTheDocument();
    expect(graphs.fetchAdminContextRelationGraph).not.toHaveBeenCalled();
  });
  it("0 UUID (names only) → aucun chemin étayé, no name join", () => {
    mountA(ctx, []);
    expect(screen.getByText(/aucun chemin étayé/)).toBeInTheDocument();
    expect(graphs.fetchAdminContextRelationGraph).not.toHaveBeenCalled();
  });
  it("UUID not in server context is ignored", () => {
    mountA([{ id: A, name: "x" }], [A, B]);
    expect(graphs.fetchAdminContextRelationGraph).not.toHaveBeenCalled();
  });
  it("cited but inaccessible memorial is excluded from paths", async () => {
    mountA(ctx, [A, C]);
    expect(await screen.findByText(/Un seul mémorial identifié et accessible/)).toBeInTheDocument();
    expect(screen.getByText(/1 mémorial\(aux\) identifié\(s\) non accessible/)).toBeInTheDocument();
    expect(graphs.fetchAdminContextRelationGraph).not.toHaveBeenCalled();
  });
  it("secondary tools are placed after the automatic result, collapsed", async () => {
    mountA(ctx, [A, B]);
    const summary = screen.getByText("Explorer une relation précise");
    const auto = screen.getByText("Chemins relationnels de cette réponse");
    expect(auto.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(summary.closest("details")).not.toHaveAttribute("open");
  });
});

describe("Question-oriented declared relation — synthetic", () => {
  const P = "00000000-0000-4000-8000-0000000000aa", J = "00000000-0000-4000-8000-0000000000bb", H = "00000000-0000-4000-8000-0000000000cc";
  const setup = (mems: unknown[], rels: unknown[]) => {
    api.from.mockImplementation((table: string) => {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {};
      for (const m of ["select", "in", "eq", "is", "or"]) chain[m] = vi.fn(() => chain);
      chain.then = vi.fn((resolve) => resolve({ data: table === "memorials" ? mems : rels, error: null }));
      return chain;
    });
  };
  const rel = (type: string, a: string, b: string, id = R) => ({ id, relation_type: type, memorial_id_1: a, memorial_id_2: b, status: "accepted" });
  const ask = (question: string, ids = [P, J]) => render(
    <MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminRelationExplanation candidates={ids.map((id) => ({ id, name: "x" }))} sourceIds={ids} question={question} />
    </QueryClientProvider></MemoryRouter>);
  const box = () => screen.findByLabelText("Réponse orientée selon la question");
  beforeEach(() => {
    cleanup(); vi.clearAllMocks();
    graphs.fetchAdminContextRelationGraph.mockResolvedValue({ memorials: [], edges: [] });
    api.rpc.mockResolvedValue({ data: [{ relation_id: R, confirmations: 3 }], error: null });
  });
  const mems = [memorial(P, "Paul"), memorial(J, "Jacques")];
  it("A puis B : Paul est déclaré fils de Jacques, confirmations distinctes", async () => {
    setup(mems, [rel("Fils", P, J)]);
    ask("Quel lien entre Paul Test et Jacques Test ?");
    const b = await box();
    expect(await within(b).findByText(/Paul Test est déclaré fils de Jacques Test\./)).toBeInTheDocument();
    expect(within(b).queryByText(/père/)).toBeNull();
    expect(within(b).getByText(/confirmé par 3 membres \(sans certification\)/)).toBeInTheDocument();
  });
  it("B puis A : Jacques est déclaré(e) parent de Paul (sexe non stocké)", async () => {
    setup(mems, [rel("Fils", P, J)]);
    ask("Quel lien entre Jacques Test et Paul Test ?");
    expect(await within(await box()).findByText(/Jacques Test est déclaré\(e\) parent de Paul Test\./)).toBeInTheDocument();
  });
  it("Père stocké : Jacques est déclaré père de Paul", async () => {
    setup(mems, [rel("Père", J, P)]);
    ask("quelle relation entre Jacques Test et Paul Test");
    expect(await within(await box()).findByText(/Jacques Test est déclaré père de Paul Test\./)).toBeInTheDocument();
  });
  it("homonymes : aucune réponse orientée", async () => {
    setup([...mems, memorial(H, "Paul")], [rel("Fils", P, J)]);
    ask("Quel lien entre Paul Test et Jacques Test ?", [P, J, H]);
    await screen.findAllByText(/Paul Test/);
    expect(screen.queryByLabelText("Réponse orientée selon la question")).toBeNull();
  });
  it("aucun lien / non accepté : état neutre", async () => {
    setup(mems, [{ ...rel("Fils", P, J), status: "pending" }]);
    ask("Quel lien entre Paul Test et Jacques Test ?");
    expect(await within(await box()).findByText(/Aucun lien direct déclaré entre Paul Test et Jacques Test/)).toBeInTheDocument();
  });
  it("contradiction : les deux liens restent affichés, signalés", async () => {
    setup(mems, [rel("Fils", P, J), rel("Frère", P, J, "00000000-0000-4000-8000-000000000002")]);
    ask("Quel lien entre Paul Test et Jacques Test ?");
    const b = await box();
    expect(await within(b).findByText(/Plusieurs liens déclarés coexistent/)).toBeInTheDocument();
    expect(within(b).getByText(/déclaré fils de/)).toBeInTheDocument();
    expect(within(b).getByText(/déclaré frère de/)).toBeInTheDocument();
  });
});
