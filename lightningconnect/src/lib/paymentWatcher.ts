import type { Invoice, InvoiceStatus } from "../types";

export interface WatcherOptions {
  invoice: Invoice;
  lookup: () => Promise<InvoiceStatus>;
  onPayment: (invoice: Invoice) => void;
  onExpiry?: (invoice: Invoice) => void;
  onError?: (error: Error, invoice: Invoice) => void;
  pollInterval?: number;
  /** Internal — called once when the watcher stops for any reason. */
  onDone?: () => void;
}

/**
 * Polls `lookup` every `pollInterval` ms until the invoice is PAID, EXPIRED,
 * or its `expiresAt` timestamp has passed. Fires the corresponding callback
 * exactly once and stops polling. Returns a cancel function.
 */
export function watchPayment(options: WatcherOptions): () => void {
  const {
    invoice,
    lookup,
    onPayment,
    onExpiry,
    onError,
    pollInterval = 5000,
    onDone,
  } = options;

  let fired = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let inflight = false;

  const stop = () => {
    if (fired) return;
    fired = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    onDone?.();
  };

  const firePayment = () => {
    if (fired) return;
    const cb = onPayment;
    stop();
    cb(invoice);
  };

  const fireExpiry = () => {
    if (fired) return;
    const cb = onExpiry;
    stop();
    cb?.(invoice);
  };

  const tick = async () => {
    if (fired || inflight) return;
    if (
      invoice.expiresAt &&
      Math.floor(Date.now() / 1000) >= invoice.expiresAt
    ) {
      fireExpiry();
      return;
    }
    inflight = true;
    try {
      const status = await lookup();
      if (fired) return;
      if (status === "PAID") firePayment();
      else if (status === "EXPIRED") fireExpiry();
    } catch (e) {
      if (!fired) onError?.(e as Error, invoice);
    } finally {
      inflight = false;
    }
  };

  // Kick off an immediate check, then schedule.
  void tick();
  timer = setInterval(tick, pollInterval);

  return stop;
}
