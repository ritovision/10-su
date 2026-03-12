const MOBILE_WALLET_STORAGE_KEY = "su.wallet.mobileWallet.lastUsed";
const ACTIVE_MOBILE_WALLET_STORAGE_KEY = "su.wallet.mobileWallet.activeSession";

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   iconUrl: string,
 *   nativeLink: string,
 *   universalLink: string
 * }} MobileWalletOption
 */

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sortByName(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function hasWalletConnectV2Support(wallet) {
  return Array.isArray(wallet?.versions) && wallet.versions.includes("2");
}

function hasEip155Chain(wallet) {
  return Array.isArray(wallet?.chains) && wallet.chains.some((chain) => typeof chain === "string" && chain.startsWith("eip155:"));
}

function hasMobileLink(wallet) {
  return Boolean(safeTrim(wallet?.mobile?.native) || safeTrim(wallet?.mobile?.universal));
}

/**
 * Normalize WalletConnect explorer wallets into a small mobile-wallet shape.
 * @param {{ listings?: Record<string, any> } | null | undefined} payload
 * @returns {MobileWalletOption[]}
 */
export function normalizeExplorerWallets(payload) {
  const listings = payload?.listings;
  if (!listings || typeof listings !== "object") return [];

  return Object.values(listings)
    .filter((wallet) => hasWalletConnectV2Support(wallet) && hasEip155Chain(wallet) && hasMobileLink(wallet))
    .map((wallet) => ({
      id: safeTrim(wallet?.id),
      name: safeTrim(wallet?.name) || "Wallet",
      iconUrl:
        safeTrim(wallet?.image_url?.sm) ||
        safeTrim(wallet?.image_url?.md) ||
        safeTrim(wallet?.image_url?.lg) ||
        "",
      nativeLink: safeTrim(wallet?.mobile?.native),
      universalLink: safeTrim(wallet?.mobile?.universal),
    }))
    .filter((wallet) => wallet.id && wallet.name)
    .sort(sortByName);
}

function isAppleMobileDevice() {
  try {
    if (typeof navigator === "undefined") return false;
    const userAgent = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    return /iPhone|iPad|iPod/i.test(userAgent) || (/Mac/i.test(platform) && maxTouchPoints > 1);
  } catch (_error) {
    return false;
  }
}

function appendWalletConnectUri(baseLink, wcUri) {
  const link = safeTrim(baseLink);
  const uri = safeTrim(wcUri);
  if (!link || !uri) return "";

  const encodedUri = encodeURIComponent(uri);
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(link);
  if (!hasScheme) return "";

  if (/^https?:/i.test(link)) {
    try {
      const url = new URL(link);
      if (!url.search) {
        const basePath = url.pathname.replace(/\/+$/, "");
        url.pathname = basePath.endsWith("/wc") ? basePath : `${basePath || ""}/wc`;
      }
      url.searchParams.set("uri", uri);
      return url.toString();
    } catch (_error) {
      return "";
    }
  }

  const [beforeHash, hash = ""] = link.split("#", 2);
  const [base, query = ""] = beforeHash.split("?", 2);
  const normalizedBase = base.endsWith("://") ? base : base.replace(/\/+$/, "");
  const needsWalletConnectPath = !/\/wc$/i.test(normalizedBase) && !/walletconnect$/i.test(normalizedBase);
  const separator = normalizedBase.endsWith("://") || normalizedBase.endsWith("/") ? "" : "/";
  const path = needsWalletConnectPath ? `${normalizedBase}${separator}wc` : normalizedBase;
  const queryString = query ? `${query}&uri=${encodedUri}` : `uri=${encodedUri}`;
  return `${path}?${queryString}${hash ? `#${hash}` : ""}`;
}

/**
 * Build the preferred wallet-specific launch URL for a WalletConnect URI.
 * @param {MobileWalletOption | null | undefined} wallet
 * @param {string} wcUri
 * @returns {string}
 */
export function buildMobileWalletLaunchUrl(wallet, wcUri) {
  if (!wallet || !wcUri) return "";
  const preferUniversal = isAppleMobileDevice();
  const candidates = preferUniversal
    ? [wallet.universalLink, wallet.nativeLink]
    : [wallet.nativeLink, wallet.universalLink];

  for (const candidate of candidates) {
    const url = appendWalletConnectUri(candidate, wcUri);
    if (url) return url;
  }
  return "";
}

function isStoredWalletShape(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      typeof value.nativeLink === "string" &&
      typeof value.universalLink === "string"
  );
}

function normalizeStoredWallet(value) {
  return {
    id: safeTrim(value.id),
    name: safeTrim(value.name) || "Wallet",
    iconUrl: safeTrim(value.iconUrl),
    nativeLink: safeTrim(value.nativeLink),
    universalLink: safeTrim(value.universalLink),
  };
}

function readWalletFromStorage(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isStoredWalletShape(parsed)) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return normalizeStoredWallet(parsed);
  } catch (_error) {
    try {
      localStorage.removeItem(storageKey);
    } catch (_innerError) {
      /* ignore storage errors */
    }
    return null;
  }
}

function writeWalletToStorage(storageKey, wallet) {
  if (!wallet) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(normalizeStoredWallet(wallet)));
  } catch (_error) {
    /* ignore storage errors */
  }
}

function clearWalletFromStorage(storageKey) {
  try {
    localStorage.removeItem(storageKey);
  } catch (_error) {
    /* ignore storage errors */
  }
}

/**
 * Read the stored chooser wallet. Malformed values are ignored and cleared.
 * @returns {MobileWalletOption | null}
 */
export function readStoredMobileWallet() {
  return readWalletFromStorage(MOBILE_WALLET_STORAGE_KEY);
}

/**
 * Persist the last chooser-selected wallet. WalletConnect URIs are never stored.
 * @param {MobileWalletOption | null | undefined} wallet
 */
export function writeStoredMobileWallet(wallet) {
  writeWalletToStorage(MOBILE_WALLET_STORAGE_KEY, wallet);
}

export function clearStoredMobileWallet() {
  clearWalletFromStorage(MOBILE_WALLET_STORAGE_KEY);
}

/**
 * Read the chooser-scoped launcher wallet for the current WalletConnect session.
 * @returns {MobileWalletOption | null}
 */
export function readActiveMobileWallet() {
  return readWalletFromStorage(ACTIVE_MOBILE_WALLET_STORAGE_KEY);
}

/**
 * Persist the launcher wallet for the currently active WalletConnect session.
 * @param {MobileWalletOption | null | undefined} wallet
 */
export function writeActiveMobileWallet(wallet) {
  writeWalletToStorage(ACTIVE_MOBILE_WALLET_STORAGE_KEY, wallet);
}

export function clearActiveMobileWallet() {
  clearWalletFromStorage(ACTIVE_MOBILE_WALLET_STORAGE_KEY);
}

/**
 * Match a stored wallet to the freshly fetched explorer list.
 * @param {MobileWalletOption[]} wallets
 * @returns {MobileWalletOption | null}
 */
export function resolveStoredMobileWallet(wallets) {
  const stored = readStoredMobileWallet();
  if (!stored) return null;
  const match = wallets.find((wallet) => wallet.id === stored.id);
  if (!match) {
    clearStoredMobileWallet();
    return null;
  }
  return match;
}
