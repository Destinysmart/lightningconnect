import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { watchPayment } from "./paymentWatcher";
import type { Invoice, InvoiceStatus } from "../types";

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  bolt11: "lnbc1",
  paymentHash: "h1",
  amount: 1000,
  memo: "test",
  createdAt: Math.floor(Date.now() / 1000),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

async function flush() {
  // Allow queued microtasks (the async lookup) to settle.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("watchPayment", () => {
  it("fires onPayment exactly once even with multiple PAID polls", async () => {
    const lookup = vi.fn<[], Promise<InvoiceStatus>>().mockResolvedValue("PAID");
    const onPayment = vi.fn();
    watchPayment({
      invoice: makeInvoice(),
      lookup,
      onPayment,
      pollInterval: 1000,
    });
    await flush();
    // Advance plenty of poll cycles.
    vi.advanceTimersByTime(5000);
    await flush();
    expect(onPayment).toHaveBeenCalledTimes(1);
  });

  it("fires onExpiry when lookup returns EXPIRED", async () => {
    const lookup = vi
      .fn<[], Promise<InvoiceStatus>>()
      .mockResolvedValue("EXPIRED");
    const onExpiry = vi.fn();
    watchPayment({
      invoice: makeInvoice(),
      lookup,
      onPayment: vi.fn(),
      onExpiry,
      pollInterval: 1000,
    });
    await flush();
    expect(onExpiry).toHaveBeenCalledTimes(1);
  });

  it("fires onExpiry when invoice.expiresAt is past", async () => {
    const onExpiry = vi.fn();
    const onPayment = vi.fn();
    const lookup = vi
      .fn<[], Promise<InvoiceStatus>>()
      .mockResolvedValue("PENDING");
    watchPayment({
      invoice: makeInvoice({ expiresAt: Math.floor(Date.now() / 1000) - 10 }),
      lookup,
      onPayment,
      onExpiry,
      pollInterval: 1000,
    });
    await flush();
    expect(onExpiry).toHaveBeenCalledTimes(1);
    expect(onPayment).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("cancel() stops polling and prevents callbacks", async () => {
    let resolved: InvoiceStatus = "PENDING";
    const lookup = vi.fn(async () => resolved);
    const onPayment = vi.fn();
    const cancel = watchPayment({
      invoice: makeInvoice(),
      lookup,
      onPayment,
      pollInterval: 1000,
    });
    await flush();
    cancel();
    resolved = "PAID";
    vi.advanceTimersByTime(5000);
    await flush();
    expect(onPayment).not.toHaveBeenCalled();
  });

  it("respects custom pollInterval", async () => {
    const lookup = vi
      .fn<[], Promise<InvoiceStatus>>()
      .mockResolvedValue("PENDING");
    watchPayment({
      invoice: makeInvoice(),
      lookup,
      onPayment: vi.fn(),
      pollInterval: 250,
    });
    await flush();
    // 1 immediate call
    expect(lookup.mock.calls.length).toBeGreaterThanOrEqual(1);
    // Advance to next tick and let it resolve
    vi.advanceTimersByTime(250);
    await flush();
    expect(lookup.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Advance again
    vi.advanceTimersByTime(250);
    await flush();
    expect(lookup.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("calls onError but keeps polling on lookup failure", async () => {
    let n = 0;
    const lookup = vi.fn(async (): Promise<InvoiceStatus> => {
      n++;
      if (n === 1) throw new Error("net");
      return "PAID";
    });
    const onError = vi.fn();
    const onPayment = vi.fn();
    watchPayment({
      invoice: makeInvoice(),
      lookup,
      onPayment,
      onError,
      pollInterval: 100,
    });
    await flush();
    vi.advanceTimersByTime(500);
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onPayment).toHaveBeenCalledTimes(1);
  });

  it("onDone fires once when watcher stops", async () => {
    const onDone = vi.fn();
    const lookup = vi.fn<[], Promise<InvoiceStatus>>().mockResolvedValue("PAID");
    watchPayment({
      invoice: makeInvoice(),
      lookup,
      onPayment: vi.fn(),
      onDone,
      pollInterval: 1000,
    });
    await flush();
    vi.advanceTimersByTime(3000);
    await flush();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
