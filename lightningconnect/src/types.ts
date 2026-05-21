export type ConnectionType = "blink-address" | "nwc" | "blink-api";

export interface BlinkAddressConnection {
  type: "blink-address";
  address: string;
  callback: string;
}

export interface NwcConnection {
  type: "nwc";
  connectionString: string;
  walletPubkey: string;
  relay: string;
  secret: string;
}

export interface BlinkApiConnection {
  type: "blink-api";
  apiKey: string;
  walletId: string;
  walletName: string;
  walletCurrency: "BTC" | "USD";
}

export type Connection =
  | BlinkAddressConnection
  | NwcConnection
  | BlinkApiConnection;

export interface Invoice {
  bolt11: string;
  paymentHash: string;
  amount: number;
  memo: string;
  createdAt: number;
  expiresAt: number;
}

export type InvoiceStatus = "PAID" | "PENDING" | "EXPIRED";

export interface WalletInfo {
  name: string;
  address: string;
  currency: "BTC" | "USD";
}

export interface Theme {
  primary?: string;
  background?: string;
  foreground?: string;
  border?: string;
  radius?: string;
  muted?: string;
}
