import { createStore } from "../base/store.js";
import { CONNECTING_VARIANT } from "./constants.js";

const initialState = {
  view: /** @type {"list" | "mobileWallets" | "qr" | "connecting" | "error" | "canceled"} */ ("list"),
  qrUri: "",
  copied: false,
  connectingVariant: CONNECTING_VARIANT.DEFAULT,
  errorMessage: "",
  walletConnectFlow: /** @type {"generic" | "chooser"} */ ("generic"),
  mobileWalletsStatus: /** @type {"idle" | "loading" | "loaded" | "error"} */ ("idle"),
  mobileWallets: /** @type {Array<any>} */ ([]),
  mobileWalletFilter: "",
  mobileWalletError: "",
  selectedMobileWallet: null,
  lastUsedMobileWallet: null,
};

export function createConnectStore() {
  return createStore(initialState);
}

export { initialState as connectInitialState };
