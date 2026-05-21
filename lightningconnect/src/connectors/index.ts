export {
  validateBlinkAddress,
  makeInvoiceBlink,
  lookupInvoiceBlink,
} from "./blink-address";
export { parseNwcUri, makeInvoiceNwc, lookupInvoiceNwc } from "./nwc";
export {
  validateBlinkApiKey,
  makeInvoiceBlinkApi,
  lookupInvoiceBlinkApi,
} from "./blink-api";

import {
  validateBlinkAddress,
  makeInvoiceBlink,
  lookupInvoiceBlink,
} from "./blink-address";
import { parseNwcUri, makeInvoiceNwc, lookupInvoiceNwc } from "./nwc";
import {
  validateBlinkApiKey,
  makeInvoiceBlinkApi,
  lookupInvoiceBlinkApi,
} from "./blink-api";

export const blinkAddressConnector = {
  validate: validateBlinkAddress,
  makeInvoice: makeInvoiceBlink,
  lookupInvoice: lookupInvoiceBlink,
};

export const nwcConnector = {
  parse: parseNwcUri,
  makeInvoice: makeInvoiceNwc,
  lookupInvoice: lookupInvoiceNwc,
};

export const blinkApiConnector = {
  validate: validateBlinkApiKey,
  makeInvoice: makeInvoiceBlinkApi,
  lookupInvoice: lookupInvoiceBlinkApi,
};
