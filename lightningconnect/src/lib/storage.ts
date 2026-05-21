import type { Connection } from "../types";

const STORAGE_KEY = "lightningconnect:v1";
const FP_KEY = "lightningconnect:fp";

function getFingerprint(): string {
  if (typeof window === "undefined") return "ssr-fingerprint";
  let fp = localStorage.getItem(FP_KEY);
  if (fp) return fp;
  const seed = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    Math.random().toString(36).slice(2),
  ].join("|");
  fp = btoa(seed).slice(0, 32);
  localStorage.setItem(FP_KEY, fp);
  return fp;
}

async function getKey(): Promise<CryptoKey> {
  const fp = getFingerprint();
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(fp),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("lightningconnect-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptConnection(conn: Connection): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(conn));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.stringify({ iv: b64(iv.buffer), ct: b64(ct) });
}

export async function decryptConnection(payload: string): Promise<Connection> {
  const key = await getKey();
  const { iv, ct } = JSON.parse(payload);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv) },
    key,
    unb64(ct),
  );
  return JSON.parse(new TextDecoder().decode(pt));
}

export async function saveConnection(conn: Connection): Promise<void> {
  if (typeof window === "undefined") return;
  const enc = await encryptConnection(conn);
  localStorage.setItem(STORAGE_KEY, enc);
}

export async function loadConnection(): Promise<Connection | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return await decryptConnection(raw);
  } catch {
    return null;
  }
}

export function clearConnection(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export async function exportConnection(): Promise<string | null> {
  const c = await loadConnection();
  return c ? btoa(JSON.stringify(c)) : null;
}

export async function importConnection(token: string): Promise<void> {
  const conn = JSON.parse(atob(token)) as Connection;
  await saveConnection(conn);
}
