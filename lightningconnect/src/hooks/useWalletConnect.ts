import { create } from "zustand";
import { useEffect } from "react";
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

export function useWalletConnect() {
  const {
    connection,
    hydrated,
    setConnection,
    setHydrated,
    setModalOpen,
  } = useWidgetStore();

  useEffect(() => {
    if (hydrated) return;
    loadConnection().then((c) => {
      if (c) setConnection(c);
      setHydrated(true);
    });
  }, [hydrated, setConnection, setHydrated]);

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
    if (connection.type === "blink-address") {
      return makeInvoiceBlink(connection, amount, currency, memo);
    }
    if (connection.type === "blink-api") {
      return makeInvoiceBlinkApi(connection, amount, currency, memo);
    }
    return makeInvoiceNwc(connection, amount, currency, memo);
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
    walletInfo,
  };
}

export async function persistConnection(c: Connection) {
  await saveConnection(c);
  useWidgetStore.getState().setConnection(c);
}
