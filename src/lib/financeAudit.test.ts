import { describe, it, expect } from "vitest";
import { failureIssue, filterAudit, operatorHealth } from "./financeAudit";

const tx = (status: string, operator: string, d: string, extra = {}) => ({ status, operator, date_libreville: d, ...extra });

describe("financeAudit", () => {
  it("translates PVit code 2000 on a failed transaction", () => {
    const i = failureIssue({ status: "failed", last_api_response: '{"status_code":2000}' });
    expect(i?.code).toBe("2000");
  });
  it("shows no cause for successful transactions", () => {
    expect(failureIssue({ status: "success", last_api_response: '{"status_code":2000}' })).toBeNull();
  });
  it("filters by operator and type", () => {
    const rows = [tx("success", "AIRTEL_MONEY", "2026-11-01", { payment_type: "cierge" }), tx("failed", "MOOV_MONEY", "2026-11-01", { payment_type: "fleur" })];
    expect(filterAudit(rows, "MOOV_MONEY", "all")).toHaveLength(1);
    expect(filterAudit(rows, "all", "cierge")[0].operator).toBe("AIRTEL_MONEY");
  });
  it("flags an outage after 3 consecutive failures, separately per operator", () => {
    const rows = [
      tx("failed", "MOOV_MONEY", "2026-11-03"), tx("timeout", "MOOV_MONEY", "2026-11-02"), tx("failed", "MOOV_MONEY", "2026-11-01"),
      tx("success", "AIRTEL_MONEY", "2026-11-03"),
    ];
    expect(operatorHealth(rows, "MOOV_MONEY")).toMatchObject({ rate: 0, outage: true, consecutiveFailures: 3 });
    expect(operatorHealth(rows, "AIRTEL_MONEY")).toMatchObject({ rate: 100, outage: false });
  });
  it("does not flag an outage with only 2 failures after a success", () => {
    const rows = [tx("failed", "MOOV_MONEY", "2026-11-03"), tx("failed", "MOOV_MONEY", "2026-11-02"), tx("success", "MOOV_MONEY", "2026-11-01")];
    expect(operatorHealth(rows, "MOOV_MONEY").outage).toBe(false);
  });
});
