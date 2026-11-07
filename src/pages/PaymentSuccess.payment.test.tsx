import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PaymentSuccess from "./PaymentSuccess";
const mock = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock("@/lib/tributePayment", () => ({ checkTributePayment: mock.check }));
vi.mock("@/components/layout/Header", () => ({ default: () => null }));
vi.mock("@/components/layout/Footer", () => ({ default: () => null }));
beforeEach(() => { cleanup(); sessionStorage.clear(); vi.clearAllMocks(); });
it("no reference never claims payment success", async () => {
 render(<MemoryRouter><PaymentSuccess /></MemoryRouter>);
 await waitFor(() => expect(screen.getByText(/Référence absente/)).toBeInTheDocument());
 expect(mock.check).not.toHaveBeenCalled();
});
it("pending operator response never claims success", async () => {
 mock.check.mockResolvedValue("pending");
 render(<MemoryRouter initialEntries={["/paiement-succes?reference=FLRTEST"]}><PaymentSuccess /></MemoryRouter>);
 await waitFor(() => expect(screen.getByText("Paiement non confirmé")).toBeInTheDocument());
 expect(screen.queryByText("Paiement confirmé")).toBeNull();
});