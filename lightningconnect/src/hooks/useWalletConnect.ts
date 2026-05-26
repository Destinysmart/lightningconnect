import { create } from "zustand";
import { useEffect, useRef } from "react";
import type {
  Connection,
  ConnectionType,
  Invoice,
  InvoiceStatus,
  WalletInfo,
} from "../types";
import {
  loadConnection,
  saveConnection,
  clearConnection,
} from "../lib/storage";
import {
  makeInvoiceBlink,
  lookupInvoiceBlink,
} from "../connectors/blink-address";
import { makeInvoiceNwc, lookupInvoiceNwc } from "../connectors/nwc";
import {
  makeInvoiceBlinkApi,
  lookupInvoiceBlinkApi,
} from "../connectors/blink-api";
import { watchPayment } from "../lib/paymentWatcher";

interface WidgetState {
  connection: Connection | null;
  hydrated: boolean;
  modalOpen: boolean;
  setConnection: (c: Connection | null) => void;
  setHydrated: (v: boolean) => void;
  setModalOpen: (v: boolean) => void;
}

export const useWidgetStore = create<WidgetState>((set) => ({
  connection: null,
  hydrated: false,
  modalOpen: false,
  setConnection: (c) => set({ connection: c }),
  setHydrated: (v) => set({ hydrated: v }),
  setModalOpen: (v) => set({ modalOpen: v }),
}));

interface InvoiceWithVerify extends Invoice {
  verify?: string;
}

export interface UseWalletConnectOptions {
  onPayment?: (invoice: Invoice) => void;
  onExpiry?: (invoice: Invoice) => void;
  onError?: (error: Error, invoice: Invoice) => void;
  /** Polling interval in ms (default 5000). */
  pollInterval?: number;
}

function lookupFor(
  connection: Connection,
  invoice: InvoiceWithVerify,
): () => Promise<InvoiceStatus> {
  if (connection.type === "blink-address") {
    return () => lookupInvoiceBlink(invoice.paymentHash, invoice.verify);
  }
  if (connection.type === "blink-api") {
    return () => lookupInvoiceBlinkApi(connection, invoice.paymentHash);
  }
  return () => lookupInvoiceNwc(connection, invoice.paymentHash);
}

export function useWalletConnect(options: UseWalletConnectOptions = {}) {
  const {
    connection,
    hydrated,
    setConnection,
    setHydrated,
    setModalOpen,
  } = useWidgetStore();

  // Keep latest callbacks in a ref so already-running watchers see updates
  // without needing to be torn down.
  const optsRef = useRef(options);
  optsRef.current = options;

  // Active watchers keyed by paymentHash. Cleaned up on unmount.
  const watchersRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    if (hydrated) return;
    loadConnection().then((c) => {
      if (c) setConnection(c);
      setHydrated(true);
    });
  }, [hydrated, setConnection, setHydrated]);

  useEffect(() => {
    const map = watchersRef.current;
    return () => {
      map.forEach((cancel) => cancel());
      map.clear();
    };
  }, []);

  const connect = () => setModalOpen(true);

  const disconnect = () => {
    clearConnection();
    setConnection(null);
  };

  const makeInvoice = async (
    amount: number,
    currency: "BTC" | "USD",
    memo: string,
  ): Promise<Invoice> => {
    if (!connection) throw new Error("No wallet connected");
    let invoice: Invoice;
    if (connection.type === "blink-address") {
      invoice = await makeInvoiceBlink(connection, amount, currency, memo);
    } else if (connection.type === "blink-api") {
      invoice = await makeInvoiceBlinkApi(connection, amount, currency, memo);
    } else {
      invoice = await makeInvoiceNwc(connection, amount, currency, memo);
    }

    // Auto-start payment watcher when onPayment is provided.
    if (optsRef.current.onPayment) {
      const lookup = lookupFor(connection, invoice as InvoiceWithVerify);
      const cancel = watchPayment({
        invoice,
        lookup,
        pollInterval: optsRef.current.pollInterval ?? 5000,
        onPayment: (inv) => optsRef.current.onPayment?.(inv),
        onExpiry: (inv) => optsRef.current.onExpiry?.(inv),
        onError: (err, inv) => optsRef.current.onError?.(err, inv),
        onDone: () => {
          watchersRef.current.delete(invoice.paymentHash);
        },
      });
      watchersRef.current.set(invoice.paymentHash, cancel);
    }

    return invoice;
  };

  const lookupInvoice = async (
    paymentHash: string,
    invoice?: InvoiceWithVerify,
  ): Promise<InvoiceStatus> => {
    if (!connection) throw new Error("No wallet connected");
    if (connection.type === "blink-address") {
      return lookupInvoiceBlink(paymentHash, invoice?.verify);
    }
    if (connection.type === "blink-api") {
      return lookupInvoiceBlinkApi(connection, paymentHash);
    }
    return lookupInvoiceNwc(connection, paymentHash);
  };

  const cancelWatch = (invoice: Invoice) => {
    const cancel = watchersRef.current.get(invoice.paymentHash);
    if (cancel) {
      cancel();
      watchersRef.current.delete(invoice.paymentHash);
    }
  };

  const walletInfo: WalletInfo | null = (() => {
    if (!connection) return null;
    if (connection.type === "blink-address") {
      return {
        name: "Blink",
        address: connection.address,
        currency: "BTC" as const,
      };
    }
    if (connection.type === "blink-api") {
      return {
        name: connection.walletName,
        address: `blink_…${connection.apiKey.slice(-4)}`,
        currency: connection.walletCurrency,
      };
    }
    return {
      name: "NWC Wallet",
      address: `${connection.walletPubkey.slice(0, 8)}…`,
      currency: "BTC" as const,
    };
  })();

  return {
    connect,
    disconnect,
    isConnected: !!connection,
    connectionType: (connection?.type ?? null) as ConnectionType | null,
    makeInvoice,
    lookupInvoice,
    cancelWatch,
    walletInfo,
  };
}

export async function persistConnection(c: Connection) {
  await saveConnection(c);
  useWidgetStore.getState().setConnection(c);
}
