import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import GesteRituelModal from "./GesteRituelModal";
const mock = vi.hoisted(() => ({ check: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/tributePayment", () => ({ checkTributePaymentDetail: async (...args: unknown[]) => ({ status: await mock.check(...args), message: "Le compte marchand Floorence a un solde insuffisant. Code 2000." }) }));
vi.mock("@/hooks/useMonetization", () => ({ useMonetization: () => ({ data: { prices: { cierge: 700, fleur: 700 } }, refetch: mock.refetch }) }));
beforeEach(() => { cleanup(); vi.clearAllMocks(); mock.refetch.mockResolvedValue({ data: {} }); mock.check.mockResolvedValue("pending"); });
it("shows a failed preparation inside the modal and never reports success", async () => {
 const done = vi.fn();
 render(<GesteRituelModal open onOpenChange={vi.fn()} itemType="cierge" postId="post" onConfirm={vi.fn().mockRejectedValue(new Error("Lien déclaré incompatible"))} onPaymentConfirmed={done} />);
 fireEvent.change(screen.getByLabelText(/Numéro Airtel ou Moov/), { target: { value: "+24177123456" } });
 fireEvent.click(screen.getByRole("button", { name: /Payer/ })); fireEvent.click(await screen.findByRole("button", { name: "Confirmer le paiement" }));
 await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Lien déclaré incompatible"));
 expect(mock.check).not.toHaveBeenCalled(); expect(done).not.toHaveBeenCalled();
});
it("pending payment never completes and reopening does not resend a debit", async () => {
 const confirm = vi.fn().mockResolvedValue({ reference: "FLRTEST" }); const done = vi.fn(); const close = vi.fn();
 const props = { onOpenChange: close, itemType: "cierge" as const, postId: "post", onConfirm: confirm, onPaymentConfirmed: done };
 const view = render(<GesteRituelModal open {...props} />);
 fireEvent.change(screen.getByLabelText(/Numéro Airtel ou Moov/), { target: { value: "+24177123456" } });
 fireEvent.click(screen.getByRole("button", { name: /Payer/ })); fireEvent.click(await screen.findByRole("button", { name: "Confirmer le paiement" }));
 await waitFor(() => expect(mock.check).toHaveBeenCalledWith("FLRTEST"));
 expect(done).not.toHaveBeenCalled();
 view.rerender(<GesteRituelModal open={false} {...props} />);
 view.rerender(<GesteRituelModal open {...props} />);
 expect(confirm).toHaveBeenCalledTimes(1);
 mock.check.mockResolvedValue("success");
 view.rerender(<GesteRituelModal open={false} {...props} />);
 view.rerender(<GesteRituelModal open {...props} />);
 await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
 expect(confirm).toHaveBeenCalledTimes(1); expect(close).toHaveBeenCalledWith(false);
});
it("refuses invalid numbers and sends the national 9-digit form", async () => {
 const confirm = vi.fn().mockResolvedValue({ reference: "EXPLICIT" });
 render(<GesteRituelModal open onOpenChange={vi.fn()} itemType="cierge" postId="post" onConfirm={confirm} />);
 const input = screen.getByLabelText(/Numéro Airtel ou Moov/);
 for (const local of ["011234567", "+33123456789"]) {
   fireEvent.change(input, { target: { value: local } });
   fireEvent.click(screen.getByRole("button", { name: /Payer/ }));
   expect(screen.queryByRole("button", { name: "Confirmer le paiement" })).toBeNull();
   expect(confirm).not.toHaveBeenCalled();
 }
 fireEvent.change(input, { target: { value: "+24166123456" } });
 fireEvent.click(screen.getByRole("button", { name: /Payer/ })); fireEvent.click(await screen.findByRole("button", { name: "Confirmer le paiement" }));
 await waitFor(() => expect(confirm).toHaveBeenCalledWith("066123456"));
});
it("a confirmed Moov failure remains terminal and reopening never sends another debit", async () => {
 mock.check.mockResolvedValue("failed");
 const confirm = vi.fn().mockResolvedValue({ reference: "FLRMOOVFAILED" });
 const done = vi.fn(); const close = vi.fn();
 const props = { onOpenChange: close, itemType: "fleur" as const, postId: "post", onConfirm: confirm, onPaymentConfirmed: done };
 const view = render(<GesteRituelModal open {...props} />);
 fireEvent.change(screen.getByLabelText(/Numéro Airtel ou Moov/), { target: { value: "+24165108829" } });
 fireEvent.click(screen.getByRole("button", { name: /Payer/ })); fireEvent.click(await screen.findByRole("button", { name: "Confirmer le paiement" }));
 await waitFor(() => expect(mock.check).toHaveBeenCalledWith("FLRMOOVFAILED"));
 await waitFor(() => expect(screen.queryByRole("button", { name: /Payer/ })).toBeNull());
 expect(confirm).toHaveBeenCalledWith("065108829");
 expect(done).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
 expect(close).toHaveBeenCalledWith(false);
 view.rerender(<GesteRituelModal open={false} {...props} />);
 view.rerender(<GesteRituelModal open {...props} />);
 await waitFor(() => expect(mock.check).toHaveBeenCalledTimes(2));
 expect(confirm).toHaveBeenCalledTimes(1);
 expect(done).not.toHaveBeenCalled();
});