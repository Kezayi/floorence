import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import GuestbookForm from "./GuestbookForm";

const mock = vi.hoisted(() => ({ invoke: vi.fn(), modal: {} as Record<string, unknown>, check: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "account" } }) }));
vi.mock("@/hooks/useProfile", () => ({ useProfile: () => ({ profile: {}, loading: false, isProfileComplete: true }) }));
vi.mock("@/hooks/useAdminRole", () => ({ useAdminRole: () => ({ isAdminOrMod: false }) }));
vi.mock("@/hooks/useMonetization", () => ({ useMonetization: () => ({ data: { prices: { cierge: 700, fleur: 700 } } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mock.invoke } } }));
vi.mock("./GesteRituelModal", () => ({ default: (props: Record<string, unknown>) => { mock.modal = props; return null; } }));
vi.mock("./TemplateSelector", () => ({ default: () => null }));
vi.mock("./AITributeGenerator", () => ({ default: () => null }));
vi.mock("./ResidenceCountrySelect", () => ({ default: () => null }));
vi.mock("./RelationSelect", () => ({ default: () => null }));

describe("sealed tribute and mixed payment", () => {
  beforeEach(() => { cleanup(); vi.clearAllMocks(); mock.invoke.mockResolvedValue({ data: { success: true, reference: "FLRTEST" }, error: null }); });
  it("uses a late sealed link for every subsequent submission and bills both gestures", async () => {
    const submit = vi.fn().mockResolvedValue({ success: true, postId: "post" });
    const view = render(<GuestbookForm memorialId="mem" onSubmit={submit} />);
    view.rerender(<GuestbookForm memorialId="mem" onSubmit={submit} lockedRelation={{ link: "Sa Petite-fille", category: "Famille directe" }} />);
    fireEvent.change(screen.getByPlaceholderText(/Partagez un souvenir/), { target: { value: "Un souvenir durable" } });
    fireEvent.change(screen.getByLabelText("Nombre de cierges"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Nombre de fleurs"), { target: { value: "1" } });
    const confirm = mock.modal.onConfirm as (phone: string) => Promise<unknown>;
    await confirm("077123456");
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ relationLink: "Sa Petite-fille", relationCategory: "Famille directe", candleCount: 1, flowerCount: 1 }));
    expect(mock.invoke).toHaveBeenCalledWith("ebilling", expect.objectContaining({ body: expect.objectContaining({ post_id: "post", candle_count: 1, flower_count: 1 }) }));
    expect(screen.queryByText("Votre message a été déposé avec respect")).toBeNull();
    expect(screen.getByPlaceholderText(/Partagez un souvenir/)).toHaveValue("Un souvenir durable");
  });
  it("failed preparation never requests payment", async () => {
    render(<GuestbookForm memorialId="mem" onSubmit={vi.fn().mockResolvedValue({ success: false })} />);
    await expect((mock.modal.onConfirm as (phone: string) => Promise<unknown>)("077123456")).rejects.toThrow();
    expect(mock.invoke).not.toHaveBeenCalled();
  });
  it("retry reuses the prepared tribute rather than creating another post", async () => {
    const submit = vi.fn().mockResolvedValue({ success: true, postId: "post" });
    mock.invoke.mockResolvedValueOnce({ data: { error: "Opérateur indisponible" } });
    render(<GuestbookForm memorialId="mem" onSubmit={submit} />);
    const confirm = mock.modal.onConfirm as (phone: string) => Promise<unknown>;
    await expect(confirm("077123456")).rejects.toThrow("Opérateur indisponible");
    await confirm("077123456");
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it("blocks payment while the canonical relation is loading", async () => {
    const submit = vi.fn(); render(<GuestbookForm memorialId="mem" onSubmit={submit} relationLoading />);
    await expect((mock.modal.onConfirm as (phone: string) => Promise<unknown>)("077123456")).rejects.toThrow(/Vérification/);
    expect(submit).not.toHaveBeenCalled(); expect(mock.invoke).not.toHaveBeenCalled();
  });
});