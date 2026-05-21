import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateBlinkApiKey,
  makeInvoiceBlinkApi,
  lookupInvoiceBlinkApi,
} from "./blink-api";
import type { BlinkApiConnection } from "../types";

const API_KEY = "blink_testkey1234";

const CONN: BlinkApiConnection = {
  type: "blink-api",
  apiKey: API_KEY,
  walletId: "wallet-btc-1",
  walletName: "My Blink Wallet",
  walletCurrency: "BTC",
};

type FetchArgs = Parameters<typeof fetch>;
type Body = { query: string; variables?: Record<string, unknown> };

function mockFetch(handler: (body: Body) => unknown) {
  const fn = vi.fn(async (..._args: FetchArgs) => {
    const init = _args[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Body;
    const result = handler(body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  // @ts-expect-error override
  globalThis.fetch = fn;
  return fn;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("validateBlinkApiKey", () => {
  it("picks the BTC wallet and returns a connection", async () => {
    mockFetch(() => ({
      data: {
        me: {
          defaultAccount: {
            wallets: [
              { id: "usd-1", walletCurrency: "USD" },
              { id: "btc-1", walletCurrency: "BTC" },
            ],
          },
        },
      },
    }));
    const conn = await validateBlinkApiKey(API_KEY, "  Hot Wallet  ");
    expect(conn).toEqual({
      type: "blink-api",
      apiKey: API_KEY,
      walletId: "btc-1",
      walletName: "Hot Wallet",
      walletCurrency: "BTC",
    });
  });

  it("defaults wallet name when none provided", async () => {
    mockFetch(() => ({
      data: {
        me: {
          defaultAccount: {
            wallets: [{ id: "btc-1", walletCurrency: "BTC" }],
          },
        },
      },
    }));
    const conn = await validateBlinkApiKey(API_KEY);
    expect(conn.walletName).toBe("My Blink Wallet");
  });

  it("throws on GraphQL errors", async () => {
    mockFetch(() => ({ errors: [{ message: "Invalid API key" }] }));
    await expect(validateBlinkApiKey(API_KEY)).rejects.toThrow(/Invalid API key/);
  });

  it("throws when no wallets exist", async () => {
    mockFetch(() => ({
      data: { me: { defaultAccount: { wallets: [] } } },
    }));
    await expect(validateBlinkApiKey(API_KEY)).rejects.toThrow(/No wallets/i);
  });

  it("rejects keys without the blink_ prefix", async () => {
    await expect(validateBlinkApiKey("xxx_nope")).rejects.toThrow(/blink_/);
  });
});

describe("makeInvoiceBlinkApi", () => {
  it("BTC path calls lnInvoiceCreate with sats", async () => {
    const fn = mockFetch((body) => {
      expect(body.query).toMatch(/lnInvoiceCreate/);
      expect(body.variables).toEqual({
        i: { walletId: "wallet-btc-1", amount: 1500, memo: "coffee" },
      });
      return {
        data: {
          lnInvoiceCreate: {
            invoice: {
              paymentRequest: "lnbc1btc",
              paymentHash: "h-btc",
              satoshis: 1500,
            },
            errors: [],
          },
        },
      };
    });
    const inv = await makeInvoiceBlinkApi(CONN, 1500, "BTC", "coffee");
    expect(fn).toHaveBeenCalledOnce();
    expect(inv.bolt11).toBe("lnbc1btc");
    expect(inv.paymentHash).toBe("h-btc");
    expect(inv.amount).toBe(1500);
    expect(inv.expiresAt).toBeGreaterThan(inv.createdAt);
  });

  it("USD path calls lnUsdInvoiceCreate with cents", async () => {
    mockFetch((body) => {
      expect(body.query).toMatch(/lnUsdInvoiceCreate/);
      expect(body.variables).toEqual({
        i: { walletId: "wallet-btc-1", amount: 250, memo: "tip" }, // $2.50 → 250 cents
      });
      return {
        data: {
          lnUsdInvoiceCreate: {
            invoice: {
              paymentRequest: "lnbc1usd",
              paymentHash: "h-usd",
              satoshis: 420,
              expiresAt: null,
            },
            errors: [],
          },
        },
      };
    });
    const inv = await makeInvoiceBlinkApi(CONN, 2.5, "USD", "tip");
    expect(inv.bolt11).toBe("lnbc1usd");
    expect(inv.amount).toBe(420);
  });

  it("surfaces invoice errors[]", async () => {
    mockFetch(() => ({
      data: {
        lnInvoiceCreate: {
          invoice: null,
          errors: [{ message: "insufficient permissions" }],
        },
      },
    }));
    await expect(makeInvoiceBlinkApi(CONN, 100, "BTC", "")).rejects.toThrow(
      /insufficient permissions/,
    );
  });

  it("throws on top-level GraphQL errors", async () => {
    mockFetch(() => ({ errors: [{ message: "auth failed" }] }));
    await expect(makeInvoiceBlinkApi(CONN, 100, "BTC", "")).rejects.toThrow(
      /auth failed/,
    );
  });
});

describe("lookupInvoiceBlinkApi", () => {
  it.each([
    ["PAID", "PAID"],
    ["paid", "PAID"],
  ])("maps status=%s → %s", async (input, expected) => {
    mockFetch(() => ({
      data: { lnInvoicePaymentStatus: { status: input } },
    }));
    expect(await lookupInvoiceBlinkApi(CONN, "h")).toBe(expected);
  });

  it("maps PENDING → PENDING", async () => {
    mockFetch(() => ({
      data: { lnInvoicePaymentStatus: { status: "PENDING" } },
    }));
    expect(await lookupInvoiceBlinkApi(CONN, "h")).toBe("PENDING");
  });

  it("maps EXPIRED → EXPIRED", async () => {
    mockFetch(() => ({
      data: { lnInvoicePaymentStatus: { status: "EXPIRED" } },
    }));
    expect(await lookupInvoiceBlinkApi(CONN, "h")).toBe("EXPIRED");
  });

  it("unknown status → PENDING (never hardcoded PAID)", async () => {
    mockFetch(() => ({
      data: { lnInvoicePaymentStatus: { status: "WEIRD" } },
    }));
    expect(await lookupInvoiceBlinkApi(CONN, "h")).toBe("PENDING");
  });

  it("GraphQL errors → PENDING (does not throw)", async () => {
    mockFetch(() => ({ errors: [{ message: "internal" }] }));
    expect(await lookupInvoiceBlinkApi(CONN, "h")).toBe("PENDING");
  });

  it("network failure → PENDING", async () => {
    // @ts-expect-error override
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    });
    expect(await lookupInvoiceBlinkApi(CONN, "h")).toBe("PENDING");
  });
});
