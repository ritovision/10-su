import "@assets/css/main.css";
import "./preview-styles.css";
import type { Preview } from "@storybook/html";

function applyTouchMode(enabled: boolean) {
  if (typeof window === "undefined") return;

  const nav = window.navigator as Navigator & { maxTouchPoints?: number };

  try {
    Object.defineProperty(nav, "maxTouchPoints", {
      configurable: true,
      value: enabled ? 5 : 0
    });
  } catch {
    // Ignore environments where navigator properties are not configurable.
  }

  try {
    if (enabled) {
      Object.defineProperty(window, "ontouchstart", {
        configurable: true,
        value: null
      });
    } else {
      delete (window as Window & { ontouchstart?: unknown }).ontouchstart;
    }
  } catch {
    // Ignore if the host locks touch event globals.
  }
}

if (typeof window !== "undefined") {
  applyTouchMode(false);

  const storyWindow = window as Window & {
    SITE_BASEURL?: string;
    suNormalizeHref?: (href: string) => string;
    SuLeavingModal?: {
      gateLinkNavigation?: (href: string, event?: Event, target?: string) => boolean;
      shouldWarnForUrl?: (_url: URL) => boolean;
      isUrlBlocked?: (_url: URL) => boolean;
      show?: (...args: unknown[]) => void;
    };
    SuBlockedModal?: {
      show?: (...args: unknown[]) => void;
    };
  };

  if (!storyWindow.SITE_BASEURL) {
    storyWindow.SITE_BASEURL = "";
  }

  if (!storyWindow.suNormalizeHref) {
    storyWindow.suNormalizeHref = (href: string) => href;
  }

  if (!storyWindow.SuLeavingModal) {
    storyWindow.SuLeavingModal = {
      gateLinkNavigation: () => true,
      shouldWarnForUrl: () => false,
      isUrlBlocked: () => false,
      show: () => {}
    };
  }

  if (!storyWindow.SuBlockedModal) {
    storyWindow.SuBlockedModal = {
      show: () => {}
    };
  }
}

const preview: Preview = {
  globalTypes: {
    touchMode: {
      name: "Touch UI",
      description: "Toggle touch-capable Storybook rendering for billboard mobile UI",
      toolbar: {
        icon: "mobile",
        items: [
          { value: "off", title: "Touch off" },
          { value: "on", title: "Touch on" }
        ],
        dynamicTitle: true
      }
    }
  },
  initialGlobals: {
    touchMode: "off"
  },
  decorators: [
    (story, context) => {
      applyTouchMode(context.globals.touchMode === "on");
      return story();
    }
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  }
};

export default preview;
