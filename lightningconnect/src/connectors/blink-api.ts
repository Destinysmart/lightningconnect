import type {
  BlinkApiConnection,
  Invoice,
  InvoiceStatus,
} from "../types";

const BLINK_GRAPHQL_URL = "https://api.blink.sv/graphql";

interface GraphQLError {
  message: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

async function blinkGraphql<T>(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(BLINK_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Blink API HTTP ${res.status}`);
  }
  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length > 0) {
    throw new Error(`Blink API: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) {
    throw new Error("Blink API returned no data");
  }
  return json.data;
}

interface MeQuery {
  me: {
    defaultAccount: {
      wallets: Array<{ id: string; walletCurrency: "BTC" | "USD" }>;
    };
  };
}

export async function validateBlinkApiKey(
  apiKey: string,
  walletName?: string,
): Promise<BlinkApiConnection> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error("API key is required");
  if (!trimmed.startsWith("blink_")) {
    throw new Error("Blink API keys start with 'blink_'");
  }
  const data = await blinkGraphql<MeQuery>(
    trimmed,
    `query { me { defaultAccount { wallets { id walletCurrency } } } }`,
  );
  const wallets = data.me?.defaultAccount?.wallets ?? [];
  if (wallets.length === 0) {
    throw new Error("No wallets found on this Blink account");
  }
  const btc = wallets.find((w) => w.walletCurrency === "BTC") ?? wallets[0];
  return {
    type: "blink-api",
    apiKey: trimmed,
    walletId: btc.id,
    walletName: (walletName ?? "").trim() || "My Blink Wallet",
    walletCurrency: btc.walletCurrency,
  };
}

interface InvoiceCreateResponse {
  invoice: {
    paymentRequest: string;
    paymentHash: string;
    satoshis: number;
  } | null;
  errors: GraphQLError[];
}

export async function makeInvoiceBlinkApi(
  conn: BlinkApiConnection,
  amount: number,
  currency: "BTC" | "USD",
  memo: string,
): Promise<Invoice> {
  const isUsd = currency === "USD";
  const query = isUsd
    ? `mutation($i: LnUsdInvoiceCreateInput!) {
         lnUsdInvoiceCreate(input: $i) {
           invoice { paymentRequest paymentHash satoshis }
           errors { message }
         }
       }`
    : `mutation($i: LnInvoiceCreateInput!) {
         lnInvoiceCreate(input: $i) {
           invoice { paymentRequest paymentHash satoshis }
           errors { message }
         }
       }`;

  const input = isUsd
    ? { walletId: conn.walletId, amount: Math.round(amount * 100), memo }
    : { walletId: conn.walletId, amount: Math.round(amount), memo };

  const data = await blinkGraphql<{
    lnInvoiceCreate?: InvoiceCreateResponse;
    lnUsdInvoiceCreate?: InvoiceCreateResponse;
  }>(conn.apiKey, query, { i: input });

  const payload = isUsd ? data.lnUsdInvoiceCreate : data.lnInvoiceCreate;
  if (!payload) throw new Error("Blink API: empty invoice response");
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors.map((e) => e.message).join("; "));
  }
  if (!payload.invoice) throw new Error("Blink API: no invoice returned");

  const now = Math.floor(Date.now() / 1000);
  return {
    bolt11: payload.invoice.paymentRequest,
    paymentHash: payload.invoice.paymentHash,
    amount: payload.invoice.satoshis,
    memo,
    createdAt: now,
    expiresAt: now + 3600,
  };
}

export async function lookupInvoiceBlinkApi(
  conn: BlinkApiConnection,
  paymentHash: string,
): Promise<InvoiceStatus> {
  try {
    const data = await blinkGraphql<{
      lnInvoicePaymentStatus: {
        status: string;
        errors?: GraphQLError[];
      };
    }>(
      conn.apiKey,
      `query($i: LnInvoicePaymentStatusInput!) {
         lnInvoicePaymentStatus(input: $i) {
           status
           errors { message }
         }
       }`,
      { i: { paymentHash } },
    );
    const status = (data.lnInvoicePaymentStatus?.status ?? "").toUpperCase();
    if (status === "PAID") return "PAID";
    if (status === "EXPIRED") return "EXPIRED";
    return "PENDING";
  } catch {
    return "PENDING";
  }
}
