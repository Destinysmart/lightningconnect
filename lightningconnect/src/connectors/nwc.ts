import { SimplePool, finalizeEvent, nip04, getPublicKey } from "nostr-tools";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("invalid hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
import type { Invoice, InvoiceStatus, NwcConnection } from "../types";

const NWC_REQUEST_KIND = 23194;
const NWC_RESPONSE_KIND = 23195;

export function parseNwcUri(uri: string): NwcConnection {
  if (!uri.startsWith("nostr+walletconnect://") && !uri.startsWith("nostrwalletconnect://")) {
    throw new Error("Invalid NWC connection string");
  }
  const cleaned = uri.replace(/^nostr(\+)?walletconnect:\/\//, "");
  const [pubkey, query] = cleaned.split("?");
  const params = new URLSearchParams(query || "");
  const relay = params.get("relay");
  const secret = params.get("secret");
  if (!pubkey || !relay || !secret) {
    throw new Error("NWC string missing relay or secret");
  }
  return {
    type: "nwc",
    connectionString: uri,
    walletPubkey: pubkey,
    relay,
    secret,
  };
}

async function sendNwcRequestOnce<T = unknown>(
  conn: NwcConnection,
  method: string,
  params: Record<string, unknown>,
  timeoutMs: number,
): Promise<T> {
  const pool = new SimplePool();
  const secretBytes = hexToBytes(conn.secret);
  const clientPubkey = getPublicKey(secretBytes);

  const payload = JSON.stringify({ method, params });
  const encrypted = await nip04.encrypt(conn.secret, conn.walletPubkey, payload);

  const event = finalizeEvent(
    {
      kind: NWC_REQUEST_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", conn.walletPubkey]],
      content: encrypted,
    },
    secretBytes,
  );

  const relays = [conn.relay];

  // Ensure relay WS connection is established before publishing.
  try {
    await pool.ensureRelay(conn.relay, { connectionTimeout: 10000 });
  } catch (e) {
    pool.close(relays);
    throw new Error(`Failed to connect to relay ${conn.relay}: ${(e as Error).message}`);
  }

  let sub: { close: () => void } | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    if (timeout) clearTimeout(timeout);
    try {
      sub?.close();
    } catch {
      /* noop */
    }
    try {
      pool.close(relays);
    } catch {
      /* noop */
    }
  };

  const responsePromise = new Promise<T>((resolve, reject) => {
    const filters = [
      {
        kinds: [NWC_RESPONSE_KIND],
        authors: [conn.walletPubkey],
        "#p": [clientPubkey],
        "#e": [event.id],
      },
    ] as unknown as Parameters<typeof pool.subscribeMany>[1];

    sub = pool.subscribeMany(relays, filters, {
      onevent: async (ev) => {
        try {
          const dec = await nip04.decrypt(conn.secret, conn.walletPubkey, ev.content);
          const parsed = JSON.parse(dec) as { result?: T; error?: { message: string } };
          cleanup();
          if (parsed.error) reject(new Error(parsed.error.message));
          else resolve(parsed.result as T);
        } catch (e) {
          cleanup();
          reject(e);
        }
      },
    });

    timeout = setTimeout(() => {
      cleanup();
      reject(new Error("NWC request timed out"));
    }, timeoutMs);
  });

  // Subscription is set up; now publish. Surface publish failures explicitly.
  try {
    const acks = await Promise.allSettled(pool.publish(relays, event));
    if (acks.every((a) => a.status === "rejected")) {
      cleanup();
      throw new Error(
        `Failed to publish NWC request to relay: ${
          (acks[0] as PromiseRejectedResult).reason
        }`,
      );
    }
  } catch (e) {
    cleanup();
    throw e;
  }

  return responsePromise;
}

async function sendNwcRequest<T = unknown>(
  conn: NwcConnection,
  method: string,
  params: Record<string, unknown>,
): Promise<T> {
  try {
    return await sendNwcRequestOnce<T>(conn, method, params, 15000);
  } catch (e) {
    const msg = (e as Error).message.toLowerCase();
    const retryable =
      msg.includes("timed out") ||
      msg.includes("failed to connect") ||
      msg.includes("failed to publish");
    if (!retryable) throw e;
    return await sendNwcRequestOnce<T>(conn, method, params, 30000);
  }
}


export async function makeInvoiceNwc(
  conn: NwcConnection,
  amount: number,
  currency: "BTC" | "USD",
  memo: string,
): Promise<Invoice> {
  let sats = amount;
  if (currency === "USD") {
    const res = await fetch("https://blockchain.info/tobtc?currency=USD&value=1");
    const btcPerUsd = parseFloat(await res.text());
    sats = Math.round(amount * btcPerUsd * 1e8);
  }
  const result = await sendNwcRequest<{
    invoice: string;
    payment_hash: string;
    amount: number;
    created_at: number;
    expires_at: number;
  }>(conn, "make_invoice", {
    amount: sats * 1000,
    description: memo,
  });
  return {
    bolt11: result.invoice,
    paymentHash: result.payment_hash,
    amount: sats,
    memo,
    createdAt: result.created_at ?? Math.floor(Date.now() / 1000),
    expiresAt: result.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };
}

export async function lookupInvoiceNwc(
  conn: NwcConnection,
  paymentHash: string,
): Promise<InvoiceStatus> {
  try {
    const result = await sendNwcRequest<{
      settled_at?: number | null;
      preimage?: string | null;
      state?: string;
      status?: string;
      settled?: boolean;
      paid?: boolean;
    }>(conn, "lookup_invoice", { payment_hash: paymentHash });

    const state = (result.state ?? result.status ?? "").toLowerCase();
    const paidStates = new Set(["settled", "paid", "complete", "completed"]);
    const expiredStates = new Set(["expired", "canceled", "cancelled"]);

    if (
      result.settled === true ||
      result.paid === true ||
      (typeof result.settled_at === "number" && result.settled_at > 0) ||
      (typeof result.preimage === "string" && result.preimage.length > 0) ||
      paidStates.has(state)
    ) {
      return "PAID";
    }
    if (expiredStates.has(state)) return "EXPIRED";
    return "PENDING";
  } catch (e) {
    const msg = (e as Error).message.toLowerCase();
    if (msg.includes("expired")) return "EXPIRED";
    return "PENDING";
  }
}

