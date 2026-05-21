import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock nostr-tools -------------------------------------------------------
//
// We simulate a wallet that:
//   - acknowledges publish() with a relay OK
//   - immediately fires back a kind-23195 response event built from a fixture
//     keyed by request method ("make_invoice" | "lookup_invoice")
//
// nip04.encrypt/decrypt are stubbed as identity so the "ciphertext" travelling
// through the connector is just JSON we can inspect.

type NwcResponse = { result?: unknown; error?: { message: string } };

const fixtures: {
  make_invoice: NwcResponse | null;
  lookup_invoice: NwcResponse | null;
} = { make_invoice: null, lookup_invoice: null };

const publishLog: { method: string; params: unknown }[] = [];

function setMakeInvoice(r: NwcResponse) {
  fixtures.make_invoice = r;
}
function setLookupInvoice(r: NwcResponse) {
  fixtures.lookup_invoice = r;
}

vi.mock("nostr-tools", () => {
  class SimplePool {
    private handlers: Array<(ev: { id: string; kind: number; content: string }) => void> = [];
    async ensureRelay() {
      return {};
    }
    subscribeMany(
      _relays: string[],
      _filters: unknown,
      opts: { onevent: (ev: { id: string; kind: number; content: string }) => void },
    ) {
      this.handlers.push(opts.onevent);
      return { close: () => {} };
    }
    publish(_relays: string[], event: { id: string; content: string }) {
      // Decode the request the connector sent so we know which fixture to use.
      const req = JSON.parse(event.content) as { method: string; params: unknown };
      publishLog.push(req);
      const fx = fixtures[req.method as "make_invoice" | "lookup_invoice"];
      if (fx) {
        // Fire async to mimic a real relay round-trip.
        queueMicrotask(() => {
          for (const h of this.handlers) {
            h({ id: "resp-" + event.id, kind: 23195, content: JSON.stringify(fx) });
          }
        });
      }
      return [Promise.resolve("ok")];
    }
    close() {}
  }

  return {
    SimplePool,
    finalizeEvent: (tpl: Record<string, unknown>) => ({
      id: "evt-" + Math.random().toString(36).slice(2, 10),
      ...tpl,
    }),
    getPublicKey: () => "c".repeat(64),
    nip04: {
      encrypt: async (_sk: string, _pk: string, msg: string) => msg,
      decrypt: async (_sk: string, _pk: string, msg: string) => msg,
    },
  };
});

// ---- System under test ------------------------------------------------------

import { makeInvoiceNwc, lookupInvoiceNwc, parseNwcUri } from "./nwc";

const CONN = parseNwcUri(
  "nostr+walletconnect://" +
    "b".repeat(64) +
    "?relay=wss%3A%2F%2Frelay.coinos.io&secret=" +
    "a".repeat(64),
);

beforeEach(() => {
  fixtures.make_invoice = null;
  fixtures.lookup_invoice = null;
  publishLog.length = 0;
});

// ---- make_invoice variants --------------------------------------------------

describe("makeInvoiceNwc — Coinos response variants", () => {
  it("accepts NIP-47 canonical { invoice, payment_hash }", async () => {
    setMakeInvoice({
      result: {
        invoice: "lnbc1canonical",
        payment_hash: "hash-canonical",
        amount: 5000_000,
        created_at: 1700000000,
        expires_at: 1700003600,
      },
    });
    const inv = await makeInvoiceNwc(CONN, 5000, "BTC", "memo");
    expect(inv.bolt11).toBe("lnbc1canonical");
    expect(inv.paymentHash).toBe("hash-canonical");
    expect(inv.amount).toBe(5000);
    expect(inv.createdAt).toBe(1700000000);
    expect(inv.expiresAt).toBe(1700003600);
  });

  it("accepts legacy { payment_request, hash } Coinos shape", async () => {
    setMakeInvoice({
      result: {
        payment_request: "lnbc1legacy",
        hash: "hash-legacy",
      },
    });
    const inv = await makeInvoiceNwc(CONN, 1000, "BTC", "x");
    expect(inv.bolt11).toBe("lnbc1legacy");
    expect(inv.paymentHash).toBe("hash-legacy");
  });

  it("accepts { bolt11, payment_hash } shape", async () => {
    setMakeInvoice({
      result: { bolt11: "lnbc1bolt", payment_hash: "h-bolt" },
    });
    const inv = await makeInvoiceNwc(CONN, 1000, "BTC", "x");
    expect(inv.bolt11).toBe("lnbc1bolt");
    expect(inv.paymentHash).toBe("h-bolt");
  });

  it("throws a descriptive error when bolt11 is missing", async () => {
    setMakeInvoice({ result: { payment_hash: "h-only" } });
    await expect(makeInvoiceNwc(CONN, 1000, "BTC", "x")).rejects.toThrow(
      /unexpected shape/i,
    );
  });

  it("propagates wallet-side errors", async () => {
    setMakeInvoice({ error: { message: "insufficient balance" } });
    await expect(makeInvoiceNwc(CONN, 1000, "BTC", "x")).rejects.toThrow(
      /insufficient balance/,
    );
  });

  it("sends amount in millisats and includes the memo", async () => {
    setMakeInvoice({ result: { invoice: "lnbc1x", payment_hash: "h" } });
    await makeInvoiceNwc(CONN, 1234, "BTC", "coffee");
    const req = publishLog.find((p) => p.method === "make_invoice");
    expect(req?.params).toMatchObject({
      amount: 1234 * 1000,
      description: "coffee",
    });
  });
});

// ---- lookup_invoice variants ------------------------------------------------

describe("lookupInvoiceNwc — Coinos response variants", () => {
  it("returns PAID for settled=true", async () => {
    setLookupInvoice({ result: { settled: true } });
    expect(await lookupInvoiceNwc(CONN, "h")).toBe("PAID");
  });

  it("returns PAID for paid=true", async () => {
    setLookupInvoice({ result: { paid: true } });
    expect(await lookupInvoiceNwc(CONN, "h")).toBe("PAID");
  });

  it("returns PAID when settled_at is a positive timestamp", async () => {
    setLookupInvoice({ result: { settled_at: 1700000000 } });
    expect(await lookupInvoiceNwc(CONN, "h")).toBe("PAID");
  });

  it("returns PAID when preimage is present", async () => {
    setLookupInvoice({ result: { preimage: "deadbeef" } });
    expect(await lookupInvoiceNwc(CONN, "h")).toBe("PAID");
  });

  it.each(["settled", "paid", "complete", "completed"])(
    "returns PAID for state=%s",
    async (state) => {
      setLookupInvoice({ result: { state } });
      expect(await lookupInvoiceNwc(CONN, "h")).toBe("PAID");
    },
  );

  it("returns PENDING for an unpaid invoice (settled_at null, no preimage)", async () => {
    setLookupInvoice({
      result: { settled_at: null, preimage: null, state: "pending" },
    });
    expect(await lookupInvoiceNwc(CONN, "h")).toBe("PENDING");
  });

  it("returns PENDING for empty/unknown response", async () => {
    setLookupInvoice({ result: {} });
    expect(await lookupInvoiceNwc(CONN, "h")).toBe("PENDING");
  });

  it.each(["expired", "canceled", "cancelled"])(
    "returns EXPIRED for state=%s",
    async (state) => {
      setLookupInvoice({ result: { state } });
      expect(await lookupInvoiceNwc(CONN, "h")).toBe("EXPIRED");
    },
  );

  it("never hard-codes PAID — generic OK with no settled signal is PENDING", async () => {
    setLookupInvoice({ result: { status: "ok" } });
    expect(await lookupInvoiceNwc(CONN, "h")).toBe("PENDING");
  });

  it("maps an 'expired' wallet error to EXPIRED", async () => {
    setLookupInvoice({ error: { message: "invoice expired" } });
    expect(await lookupInvoiceNwc(CONN, "h")).toBe("EXPIRED");
  });

  it("maps a generic wallet error to PENDING (not PAID)", async () => {
    setLookupInvoice({ error: { message: "internal error" } });
    expect(await lookupInvoiceNwc(CONN, "h")).toBe("PENDING");
  });
});
