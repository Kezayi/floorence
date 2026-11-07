import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import SocialIntelligence from "@/pages/admin/SocialIntelligence";
import SocialSearchPalette from "./SocialSearchPalette";

const api = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: api }));
vi.mock("./AdminRelationExplanation", () => ({ AdminRelationExplanation: () => null }));
vi.mock("./RAGetSourceSearch", () => ({ RAGetSourceSearch: () => null }));
vi.mock("@/components/ui/command", () => ({ CommandDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

describe.each(["page", "palette"])("RIBENGA %s concurrent questions", (surface) => {
  beforeEach(() => {
    cleanup(); vi.clearAllMocks();
    api.auth.getSession.mockResolvedValue({ data: { session: { access_token: "fixture" } } });
  });
  it("a delayed old response cannot replace the new answer or stop its loading state", async () => {
    const responses: Array<(response: Response) => void> = [];
    const signals: AbortSignal[] = [];
    vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => {
      signals.push(init.signal as AbortSignal);
      return new Promise<Response>((resolve) => responses.push(resolve));
    }));
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}>
      {surface === "page" ? <SocialIntelligence /> : <SocialSearchPalette externalOpen />}
    </QueryClientProvider></MemoryRouter>);
    const input = screen.getByPlaceholderText("Posez une question sur le maillage social…");
    const ask = async (value: string) => { await act(async () => {
      fireEvent.change(input, { target: { value } }); fireEvent.keyDown(input, { key: "Enter" });
    }); };
    await ask("Première question"); await ask("Deuxième question");
    expect(signals[0]?.aborted).toBe(true);
    const response = (content: string) => new Response(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`);
    await act(async () => { responses[0](response("Ancienne réponse")); });
    expect(screen.queryByText("Ancienne réponse")).not.toBeInTheDocument();
    expect(screen.getByText("Analyse du maillage social en cours…")).toBeInTheDocument();
    await act(async () => { responses[1](response("Nouvelle réponse")); });
    expect(screen.getByText("Nouvelle réponse")).toBeInTheDocument();
  });
  it.each([
    ["empty", "data: [DONE]\n\n"],
    ["interrupted", `data: ${JSON.stringify({ choices: [{ delta: { content: "Réponse partielle" } }] })}\n\n`],
  ])("an %s stream is an error, not a successful answer", async (_kind, stream) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream)));
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}>
      {surface === "page" ? <SocialIntelligence /> : <SocialSearchPalette externalOpen />}
    </QueryClientProvider></MemoryRouter>);
    const input = screen.getByPlaceholderText("Posez une question sur le maillage social…");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Question sans réponse" } }); fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(screen.getByText(/Réponse du moteur vide ou interrompue/)).toBeInTheDocument();
  });
});