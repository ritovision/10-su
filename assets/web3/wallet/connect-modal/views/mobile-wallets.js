function createLoadingCard(label) {
  return `
    <div class="wallet-mobile-wallets__card wallet-mobile-wallets__card--loading wallet-placeholder" aria-hidden="true">
      <span class="wallet-mobile-wallets__loading-text">${label}</span>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureShell(target) {
  /** @type {HTMLElement | null} */
  let content = target.querySelector("[data-mobile-wallet-content]");
  /** @type {HTMLInputElement | null} */
  let filterInput = target.querySelector("#wallet-mobile-wallet-filter");

  if (content && filterInput) {
    return { content, filterInput };
  }

  target.innerHTML = `
    <div class="wallet-modal__header">
      <h2 id="wallet-mobile-wallets-title">Choose Mobile Wallets</h2>
    </div>
    <p class="wallet-helper" id="wallet-mobile-wallets-helper">
      Pick your wallet app, then open it directly with WalletConnect.
    </p>
    <div class="wallet-mobile-wallets">
      <div class="wallet-mobile-wallets__content" data-mobile-wallet-content></div>
      <div class="wallet-mobile-wallets__footer">
        <label class="wallet-mobile-wallets__filter-label" for="wallet-mobile-wallet-filter">Filter wallets by name:</label>
        <input
          id="wallet-mobile-wallet-filter"
          class="wallet-mobile-wallets__filter-input"
          type="text"
          placeholder="Type a wallet name"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </div>
  `;

  content = target.querySelector("[data-mobile-wallet-content]");
  filterInput = /** @type {HTMLInputElement | null} */ (target.querySelector("#wallet-mobile-wallet-filter"));
  return { content, filterInput };
}

function lockContentHeight(target, content) {
  const currentHeight =
    Math.ceil(content.getBoundingClientRect().height) ||
    content.offsetHeight ||
    Number.parseFloat(window.getComputedStyle(content).minHeight) ||
    0;

  if (!currentHeight) return;

  target.dataset.mobileWalletHeightLocked = "true";
  target.dataset.mobileWalletLockedHeight = String(currentHeight);
  content.style.height = `${currentHeight}px`;
}

function unlockContentHeight(target, content) {
  delete target.dataset.mobileWalletHeightLocked;
  delete target.dataset.mobileWalletLockedHeight;
  content.style.height = "";
}

function syncLockedHeight(target, content) {
  const lockedHeight = target.dataset.mobileWalletLockedHeight;
  if (!lockedHeight) {
    content.style.height = "";
    return;
  }
  content.style.height = `${lockedHeight}px`;
}

function renderLoadingState(content) {
  content.innerHTML = `
    <div class="wallet-mobile-wallets__status">
      <p class="wallet-helper wallet-helper--spaced">Loading Wallets</p>
      <div class="wallet-mobile-wallets__grid" aria-hidden="true">
        ${Array.from({ length: 9 }, () => createLoadingCard("Loading Wallets")).join("")}
      </div>
    </div>
  `;
}

function renderErrorState(content, errorMessage) {
  content.innerHTML = `
    <div class="wallet-mobile-wallets__status">
      <p class="wallet-helper wallet-helper--spaced">${escapeHtml(errorMessage || "Unable to load wallets right now.")}</p>
      <div class="wallet-actions">
        <button class="wallet-btn" type="button" data-mobile-wallet-retry>Retry</button>
      </div>
    </div>
  `;
}

function renderEmptyState(content, filter) {
  const message = filter
    ? "No wallets match that filter."
    : "No compatible mobile wallets were returned.";

  content.innerHTML = `
    <div class="wallet-mobile-wallets__status">
      <p class="wallet-helper wallet-helper--spaced">${message}</p>
    </div>
  `;
}

function isUnsafeIconUrl(url) {
  if (!url || typeof url !== "string") return true;
  const trimmed = url.trim();
  const match = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!match) return false;
  const scheme = match[1].toLowerCase();
  if (scheme === "javascript" || scheme === "vbscript") return true;
  if (scheme === "data") {
    return !/^data:image\/(png|jpe?g|webp|gif|svg\+xml)(;[^,]*)?,/i.test(trimmed);
  }
  return scheme !== "https" && scheme !== "http";
}

/**
 * @param {HTMLElement} target
 * @param {Object} options
 * @param {"idle" | "loading" | "loaded" | "error"} options.status
 * @param {Array<{ id: string, name: string, iconUrl: string }>} options.wallets
 * @param {string} options.filterValue
 * @param {string} [options.errorMessage]
 * @param {string | null} [options.selectedWalletId]
 * @param {string | null} [options.lastUsedWalletId]
 * @param {(walletId: string) => void} options.onSelect
 * @param {() => void} options.onRetry
 * @param {(value: string) => void} options.onFilterChange
 */
export function renderMobileWalletsView(target, options) {
  if (!target) return;
  const {
    status = "idle",
    wallets = [],
    filterValue = "",
    errorMessage = "",
    selectedWalletId = null,
    lastUsedWalletId = null,
    onSelect = () => {},
    onRetry = () => {},
    onFilterChange = () => {},
  } = options || {};
  const { content, filterInput } = ensureShell(target);
  if (!content || !filterInput) return;

  syncLockedHeight(target, content);

  if (filterInput.value !== filterValue) {
    filterInput.value = filterValue;
  }
  filterInput.disabled = status === "loading";

  if (status === "loading" || status === "idle") {
    renderLoadingState(content);
  } else if (status === "error") {
    renderErrorState(content, errorMessage);
  } else if (!wallets.length) {
    renderEmptyState(content, filterValue);
  } else {
    content.innerHTML = `
      <div class="wallet-mobile-wallets__grid" role="list" aria-labelledby="wallet-mobile-wallets-title">
        ${wallets
          .map((wallet) => {
            const cardClasses = [
              "wallet-mobile-wallets__card",
              wallet.id === selectedWalletId ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const badge = wallet.id === lastUsedWalletId
              ? '<span class="wallet-mobile-wallets__badge">Last used</span>'
              : "";

            const icon = wallet.iconUrl && !isUnsafeIconUrl(wallet.iconUrl)
              ? `<img src="${escapeHtml(wallet.iconUrl)}" alt="" class="wallet-mobile-wallets__icon" />`
              : '<span class="wallet-mobile-wallets__icon wallet-mobile-wallets__icon--placeholder" aria-hidden="true"></span>';

            return `
              <button class="${cardClasses}" type="button" data-mobile-wallet-id="${escapeHtml(wallet.id)}" role="listitem">
                <span class="wallet-mobile-wallets__icon-wrap">
                  ${icon}
                </span>
                <span class="wallet-mobile-wallets__name">${escapeHtml(wallet.name)}</span>
                ${badge}
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  const retryButton = /** @type {HTMLButtonElement | null} */ (target.querySelector("[data-mobile-wallet-retry]"));
  if (retryButton) {
    retryButton.onclick = () => {
      onRetry();
    };
  }

  target.querySelectorAll("[data-mobile-wallet-id]").forEach((button) => {
    button.onclick = () => {
      const walletId = button.getAttribute("data-mobile-wallet-id");
      if (walletId) onSelect(walletId);
    };
  });

  filterInput.oninput = (event) => {
    onFilterChange(event.target.value);
  };
  filterInput.onfocus = () => {
    lockContentHeight(target, content);
  };
  filterInput.onblur = () => {
    unlockContentHeight(target, content);
  };
}
