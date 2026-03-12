import type { Meta, StoryObj } from "@storybook/html";
import "@assets/css/main.css";
import "@assets/web3/wallet/base/modal-shell.css";
import "@assets/web3/wallet/connect-modal/views/list.css";
import "@assets/web3/wallet/connect-modal/views/connecting.css";
import "@assets/web3/wallet/connect-modal/views/mobile-wallets.css";
import "@assets/web3/wallet/connect-modal/views/qr.css";
import { createModalShell } from "@assets/web3/wallet/base/modal-shell.js";
import { renderListView } from "@assets/web3/wallet/connect-modal/views/list.js";
import { renderConnectingView } from "@assets/web3/wallet/connect-modal/views/connecting.js";
import { renderMobileWalletsView } from "@assets/web3/wallet/connect-modal/views/mobile-wallets.js";
import { renderErrorView } from "@assets/web3/wallet/connect-modal/views/error.js";
import { renderCanceledView } from "@assets/web3/wallet/connect-modal/views/canceled.js";
import { renderQrView } from "@assets/web3/wallet/connect-modal/views/qr.js";
import { CONNECTING_VARIANT } from "@assets/web3/wallet/connect-modal/constants.js";
import { openInfoModal } from "@assets/web3/wallet/info-modal/index.js";

type ConnectorsPreset = "default" | "minimal" | "walletConnectOnly";
type ConnectModalView = "list" | "connecting" | "mobileWallets" | "qr" | "error" | "canceled";
type MobileWalletStatus = "loading" | "loaded" | "error";

interface ConnectModalStoryArgs {
  connectorsPreset?: ConnectorsPreset;
  showMobileWalletChooser?: boolean;
  lastUsedMobileWalletName?: string;
  connectingVariant?: typeof CONNECTING_VARIANT[keyof typeof CONNECTING_VARIANT];
  hasUri?: boolean;
  qrUri?: string;
  copied?: boolean;
  errorMessage?: string;
  mobileWalletStatus?: MobileWalletStatus;
  mobileWalletFilter?: string;
  mobileWalletErrorMessage?: string;
  selectedMobileWalletId?: string;
  lastUsedMobileWalletId?: string;
}

const meta: Meta = {
  title: "Web3/ConnectModal Views",
  tags: ["autodocs"],
};

const shellId = "sb-connect-modal-shell";
const connectShell = createModalShell({ id: shellId });

const defaultArgs: Required<ConnectModalStoryArgs> = {
  connectorsPreset: "default",
  showMobileWalletChooser: true,
  lastUsedMobileWalletName: "MetaMask",
  connectingVariant: CONNECTING_VARIANT.DEFAULT,
  hasUri: true,
  qrUri: "wc:example@1?bridge=https%3A%2F%2Fbridge.walletconnect.org&key=123",
  copied: false,
  errorMessage: "Something went wrong while connecting.",
  mobileWalletStatus: "loaded",
  mobileWalletFilter: "",
  mobileWalletErrorMessage: "Unable to load wallets right now.",
  selectedMobileWalletId: "",
  lastUsedMobileWalletId: "metaMask",
};

const iconsBase = () =>
  typeof window !== "undefined" ? `${window.location.origin}${window.SITE_BASEURL || ""}` : "";

function buildConnectors(preset: ConnectorsPreset) {
  const base = iconsBase();
  const icons = {
    ethereum: `${base}/assets/images/ethereum_logo.png`,
    wallet: `${base}/assets/images/logo-su-squares.png`,
  };
  const list = [
    {
      id: "metaMask",
      name: "MetaMask",
      ready: true,
      icon: icons.ethereum,
    },
    {
      id: "walletConnect",
      name: "WalletConnect",
      ready: true,
      icon: icons.wallet,
    },
    {
      id: "rainbow",
      ready: true,
      _eip6963: {
        uuid: "rainbow-1",
        name: "Rainbow",
        icon: icons.wallet,
      },
    },
  ];
  if (preset === "minimal") return list.slice(0, 1);
  if (preset === "walletConnectOnly") return [list[1]];
  return list;
}

function buildMobileWallets() {
  const base = iconsBase();
  const walletIcon = `${base}/assets/images/logo-su-squares.png`;
  const ethereumIcon = `${base}/assets/images/ethereum_logo.png`;
  return [
    { id: "metaMask", name: "MetaMask", iconUrl: ethereumIcon },
    { id: "trust", name: "Trust Wallet", iconUrl: walletIcon },
    { id: "rainbow", name: "Rainbow", iconUrl: walletIcon },
    { id: "coinbase", name: "Coinbase Wallet", iconUrl: ethereumIcon },
    { id: "uniswap", name: "Uniswap Wallet", iconUrl: walletIcon },
    { id: "zerion", name: "Zerion", iconUrl: ethereumIcon },
  ];
}

function filterMobileWallets(filterValue: string) {
  const filter = filterValue.trim().toLowerCase();
  const wallets = buildMobileWallets();
  if (!filter) return wallets;
  return wallets.filter((wallet) => wallet.name.toLowerCase().includes(filter));
}

function showConnectView(view: ConnectModalView, args: ConnectModalStoryArgs) {
  const shell = connectShell;
  shell.hide();
  const target = shell.content;
  const resolvedArgs = { ...defaultArgs, ...args };

  const renderMobileWalletStory = (storyArgs: Required<ConnectModalStoryArgs>) => {
    renderMobileWalletsView(target, {
      status: storyArgs.mobileWalletStatus,
      wallets: storyArgs.mobileWalletStatus === "loaded" ? filterMobileWallets(storyArgs.mobileWalletFilter) : [],
      filterValue: storyArgs.mobileWalletFilter,
      errorMessage: storyArgs.mobileWalletErrorMessage,
      selectedWalletId: storyArgs.selectedMobileWalletId || null,
      lastUsedWalletId: storyArgs.lastUsedMobileWalletId || null,
      onSelect: (walletId) => {
        // eslint-disable-next-line no-console
        console.log("Mobile wallet selected:", walletId);
        renderMobileWalletStory({ ...storyArgs, selectedMobileWalletId: walletId });
      },
      onRetry: () => {
        // eslint-disable-next-line no-console
        console.log("Retry mobile wallet load");
        renderMobileWalletStory({ ...storyArgs, mobileWalletStatus: "loaded" });
      },
      onFilterChange: (value) => {
        renderMobileWalletStory({ ...storyArgs, mobileWalletFilter: value });
      },
    });
  };

  switch (view) {
    case "connecting":
      target.innerHTML = "";
      shell.setAria({
        labelledBy: "wallet-connecting-title",
        describedBy: "wallet-connecting-helper",
      });
      shell.setBackHandler(null);
      renderConnectingView(target, {
        variant: resolvedArgs.connectingVariant,
        hasUri: resolvedArgs.hasUri,
        onCancel: () => shell.hide(),
        onOpenWallet: () => {
          // eslint-disable-next-line no-console
          console.log("Open wallet clicked");
        },
        onShowQr: () => showConnectView("qr", args),
      });
      break;
    case "mobileWallets":
      shell.setAria({
        labelledBy: "wallet-mobile-wallets-title",
        describedBy: "wallet-mobile-wallets-helper",
      });
      shell.setBackHandler(() => showConnectView("list", args));
      renderMobileWalletStory(resolvedArgs);
      break;
    case "qr":
      target.innerHTML = "";
      shell.setAria({
        labelledBy: "wallet-qr-title",
      });
      shell.setBackHandler(() => showConnectView("list", args));
      renderQrView(
        target,
        {
          qrUri: resolvedArgs.qrUri,
          copied: resolvedArgs.copied,
        },
        {
          onCopy: () => {
            // eslint-disable-next-line no-console
            console.log("Copy QR clicked");
          },
          onOpenWallet: () => {
            // eslint-disable-next-line no-console
            console.log("Open wallet from QR");
          },
        }
      );
      break;
    case "error":
      target.innerHTML = "";
      shell.setAria({
        labelledBy: "wallet-error-title",
        describedBy: "wallet-error-message",
      });
      shell.setBackHandler(null);
      renderErrorView(target, {
        message: resolvedArgs.errorMessage,
        onBack: () => showConnectView("list", args),
      });
      break;
    case "canceled":
      target.innerHTML = "";
      shell.setAria({
        labelledBy: "wallet-canceled-title",
        describedBy: "wallet-canceled-message",
      });
      shell.setBackHandler(null);
      renderCanceledView(target, () => showConnectView("list", args));
      break;
    case "list":
    default:
      target.innerHTML = "";
      shell.setAria({
        labelledBy: "wallet-connect-title",
        describedBy: "wallet-connect-helper",
      });
      shell.setBackHandler(null);
      renderListView(target, {
        connectors: buildConnectors(resolvedArgs.connectorsPreset),
        showMobileWalletChooser: resolvedArgs.showMobileWalletChooser,
        lastUsedMobileWallet: resolvedArgs.lastUsedMobileWalletName
          ? { name: resolvedArgs.lastUsedMobileWalletName }
          : null,
        onSelect: (connector) => {
          // eslint-disable-next-line no-console
          console.log("Connector selected:", connector);
        },
        onOpenMobileWalletChooser: () => {
          showConnectView("mobileWallets", args);
        },
        onOpenInfo: () => {
          let reopened = false;
          const reopen = () => {
            if (reopened) return;
            reopened = true;
            showConnectView("list", args);
          };
          shell.hide();
          openInfoModal(reopen).finally(reopen);
        },
      });
      break;
  }
  shell.show();
}

export default meta;

type ListStory = StoryObj<ConnectModalStoryArgs>;

export const ListView: ListStory = {
  args: {
    connectorsPreset: "default",
    showMobileWalletChooser: true,
    lastUsedMobileWalletName: "MetaMask",
  },
  argTypes: {
    connectorsPreset: {
      control: { type: "inline-radio" },
      options: ["default", "minimal", "walletConnectOnly"],
    },
    showMobileWalletChooser: {
      control: { type: "boolean" },
    },
    lastUsedMobileWalletName: {
      control: { type: "text" },
    },
  },
  render: (args) => {
    showConnectView("list", args);
    return `<div style="min-height:1px;"></div>`;
  },
};

export const MobileWalletsView: ListStory = {
  args: {
    mobileWalletStatus: "loaded",
    mobileWalletFilter: "",
    mobileWalletErrorMessage: defaultArgs.mobileWalletErrorMessage,
    selectedMobileWalletId: "metaMask",
    lastUsedMobileWalletId: "metaMask",
  },
  argTypes: {
    mobileWalletStatus: {
      control: { type: "inline-radio" },
      options: ["loaded", "loading", "error"],
    },
    mobileWalletFilter: {
      control: { type: "text" },
    },
    mobileWalletErrorMessage: {
      control: { type: "text" },
    },
    selectedMobileWalletId: {
      control: { type: "select" },
      options: ["", "metaMask", "trust", "rainbow", "coinbase", "uniswap", "zerion"],
    },
    lastUsedMobileWalletId: {
      control: { type: "select" },
      options: ["", "metaMask", "trust", "rainbow", "coinbase", "uniswap", "zerion"],
    },
  },
  render: (args) => {
    showConnectView("mobileWallets", args);
    return `<div style="min-height:1px;"></div>`;
  },
};

export const ConnectingView: ListStory = {
  args: {
    connectingVariant: CONNECTING_VARIANT.DEFAULT,
    hasUri: true,
  },
  argTypes: {
    connectingVariant: {
      control: { type: "inline-radio" },
      options: [CONNECTING_VARIANT.DEFAULT, CONNECTING_VARIANT.WALLETCONNECT],
    },
    hasUri: {
      control: { type: "boolean" },
    },
  },
  render: (args) => {
    showConnectView("connecting", args);
    return `<div style="min-height:1px;"></div>`;
  },
};

export const QrView: ListStory = {
  args: {
    qrUri: defaultArgs.qrUri,
    copied: false,
  },
  argTypes: {
    qrUri: {
      control: { type: "text" },
    },
    copied: {
      control: { type: "boolean" },
    },
  },
  render: (args) => {
    showConnectView("qr", args);
    return `<div style="min-height:1px;"></div>`;
  },
};

export const ErrorView: ListStory = {
  args: {
    errorMessage: defaultArgs.errorMessage,
  },
  argTypes: {
    errorMessage: {
      control: { type: "text" },
    },
  },
  render: (args) => {
    showConnectView("error", args);
    return `<div style="min-height:1px;"></div>`;
  },
};

export const CanceledView: ListStory = {
  render: () => {
    showConnectView("canceled", {});
    return `<div style="min-height:1px;"></div>`;
  },
};
