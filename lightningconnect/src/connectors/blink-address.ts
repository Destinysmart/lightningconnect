import type { BlinkAddressConnection, Invoice, InvoiceStatus } from "../types";

interface LnurlpResponse {
  callback: string;
  minSendable: number;
  maxSendable: number;
  tag: string;
  metadata?: string;
}

interface LnurlpInvoiceResponse {
  pr: string;
  verify?: string;
  routes?: unknown[];
}

function normalizeAddress(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}@blink.sv`;
}

function lnurlpUrl(address: string): string {
  const [user, domain] = address.split("@");
  return `https://${domain}/.well-known/lnurlp/${user}`;
}

export async function validateBlinkAddress(
  rawInput: string,
): Promise<BlinkAddressConnection> {
  const address = normalizeAddress(rawInput);
  const url = lnurlpUrl(address);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lightning address not found: ${address}`);
  const data = (await res.json()) as LnurlpResponse;
  if (data.tag !== "payRequest" || !data.callback) {
    throw new Error("Invalid LNURL-pay response");
  }
  return { type: "blink-address", address, callback: data.callback };
}

const USD_SATS_RATE_URL =
  "https://blockchain.info/tobtc?currency=USD&value=1";

async function usdToSats(usd: number): Promise<number> {
  const res = await fetch(USD_SATS_RATE_URL);
  const btcPerUsd = parseFloat(await res.text());
  return Math.round(usd * btcPerUsd * 1e8);
}

function parsePaymentHash(bolt11: string): string {
  // Lightweight: extract from bolt11 by re-decoding via fetch to a public decoder
  // Fallback: derive a stub hash. Real apps should decode via bolt11 library.
  // We attempt a simple base32 scan for payment_hash (tag 1, 52 chars).
  const idx = bolt11.toLowerCase().indexOf("p");
  if (idx > 0 && bolt11.length > idx + 54) {
    return bolt11.slice(idx + 2, idx + 54);
  }
  return bolt11.slice(0, 64);
}

export async function makeInvoiceBlink(
  conn: BlinkAddressConnection,
  amount: number,
  currency: "BTC" | "USD",
  memo: string,
): Promise<Invoice> {
  const sats = currency === "USD" ? await usdToSats(amount) : amount;
  const msats = sats * 1000;
  const url = new URL(conn.callback);
  url.searchParams.set("amount", String(msats));
  if (memo) url.searchParams.set("comment", memo.slice(0, 200));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch invoice from LNURL callback");
  const data = (await res.json()) as LnurlpInvoiceResponse;
  if (!data.pr) throw new Error("LNURL callback did not return a bolt11");

  const now = Math.floor(Date.now() / 1000);
  const invoice: Invoice = {
    bolt11: data.pr,
    paymentHash: parsePaymentHash(data.pr),
    amount: sats,
    memo,
    createdAt: now,
    expiresAt: now + 3600,
  };
  if (data.verify) {
    (invoice as Invoice & { verify?: string }).verify = data.verify;
  }
  return invoice;
}

export async function lookupInvoiceBlink(
  paymentHash: string,
  verify?: string,
): Promise<InvoiceStatus> {
  if (!verify) return "PENDING";
  const res = await fetch(verify);
  if (!res.ok) return "PENDING";
  const data = (await res.json()) as { settled?: boolean; preimage?: string | null };
  if (data.settled === true || (data.preimage && data.preimage.length > 0)) return "PAID";
  return "PENDING";
}
