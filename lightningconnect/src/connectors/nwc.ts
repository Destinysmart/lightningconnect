import { SimplePool, finalizeEvent, nip04, getPublicKey } from "nostr-tools";
import { hexToBytes } from "@noble/hashes/utils";
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

async function sendNwcRequest<T = unknown>(
  conn: NwcConnection,
  method: string,
  params: Record<string, unknown>,
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

  const responsePromise = new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      sub.close();
      reject(new Error("NWC request timed out"));
    }, 15000);

    const filter = {
      kinds: [NWC_RESPONSE_KIND],
      authors: [conn.walletPubkey],
      "#p": [clientPubkey],
      "#e": [event.id],
    };
    const sub = pool.subscribeMany(
      relays,
      [filter as Parameters<typeof pool.subscribeMany>[1][number]],
      {
        onevent: async (ev) => {
          try {
            const dec = await nip04.decrypt(conn.secret, conn.walletPubkey, ev.content);
            const parsed = JSON.parse(dec) as { result?: T; error?: { message: string } };
            clearTimeout(timeout);
            sub.close();
            if (parsed.error) reject(new Error(parsed.error.message));
            else resolve(parsed.result as T);
          } catch (e) {
            clearTimeout(timeout);
            sub.close();
            reject(e);
          }
        },
      },
    );
  });

  await Promise.all(pool.publish(relays, event));
  return responsePromise;
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
    const result = await sendNwcRequest<{ settled_at?: number; preimage?: string }>(
      conn,
      "lookup_invoice",
      { payment_hash: paymentHash },
    );
    if (result.settled_at || result.preimage) return "PAID";
    return "PENDING";
  } catch (e) {
    const msg = (e as Error).message.toLowerCase();
    if (msg.includes("expired")) return "EXPIRED";
    return "PENDING";
  }
}
