import type { Meta, StoryObj } from "@storybook/html";
import "@assets/css/main.css";
import "@assets/billboard/billboard.css";
import "@assets/css/index.css";
import "@assets/square-lookup/styles.css";
import { initHomepageBillboard } from "@assets/billboard/wrappers/index-billboard.js";

type Story = StoryObj;

const meta: Meta = {
  title: "NFT/Homepage",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

declare global {
  interface Window {
    SITE_BASEURL?: string;
    suNormalizeHref?: (href: string) => string;
  }
}

type SquarePersonalization = [string, string] | null;
type SquareExtraEntry = [number, number, boolean, number] | null;

const GRID_DIMENSION = 100;
const MAP_ROOT_ID = "sb-nft-map";
const FEED_ROOT_ID = "sb-nft-feed";

let squareDataPromise: Promise<{
  personalizations: SquarePersonalization[];
  extra: SquareExtraEntry[];
}> | null = null;
let homepageBillboardHandle: ReturnType<typeof initHomepageBillboard> | null = null;
let currentMapRoot: HTMLElement | null = null;

function resolveAssetUrl(path: string) {
  if (typeof window === "undefined") return path;
  const base = window.SITE_BASEURL || "";
  if (path.startsWith("/")) {
    return `${base}${path}`;
  }
  return `${base}/${path}`;
}

async function loadSquareData() {
  if (!squareDataPromise) {
    const personalizationsUrl = resolveAssetUrl("/build/squarePersonalizations.json");
    const extraUrl = resolveAssetUrl("/build/squareExtra.json");
    squareDataPromise = Promise.all([fetch(personalizationsUrl), fetch(extraUrl)])
      .then(async ([persRes, extraRes]) => {
        if (!persRes.ok || !extraRes.ok) {
          throw new Error("Failed to fetch board data");
        }
        const [personalizations, extra] = await Promise.all([persRes.json(), extraRes.json()]);
        return { personalizations, extra };
      })
      .catch((error) => {
        squareDataPromise = null;
        throw error;
      });
  }
  return squareDataPromise;
}

function renderMapStory() {
  const boardUrl = resolveAssetUrl("/build/wholeSquare.webp");

  return `
    <div class="page-home" style="padding: 2rem;">
      <article id="${MAP_ROOT_ID}" style="display: grid; gap: 0.75rem; max-width: 1040px; margin: 0 auto; color: #ffd700;">
        <h1 class="home-title">The first <span class="no-break">ERC-721</span> NFT</h1>
        <p style="color: #ffd700;">
          Click an empty square to mint an available Su Square. Clicking an already minted and personalized one will activate its hyperlink.
        </p>
        <div class="map-shell">
          <a id="sb-wheretogo" class="map-container" href="#" target="_blank" rel="noopener noreferrer">
            <div class="map-wrapper">
              <img
                id="sb-theImage"
                class="map-image"
                src="${boardUrl}"
                alt="All Su Squares"
              >
              <div id="sb-position" class="map-position"></div>
              <div id="sb-tooltip" class="map-tooltip" style="color: #ffd700;"></div>
              <div id="sb-electric-fence" class="map-fence"></div>
            </div>
          </a>
        </div>
        <p data-map-status style="text-align:center; color: #ffd700; margin-top: 0.5rem;">
          Loading board data...
        </p>
      </article>
    </div>
  `;
}

function renderFeedStory() {
  return `
    <div class="page-home" style="padding: 2rem;">
      <article class="newly-feed" id="${FEED_ROOT_ID}" style="color: #ffd700;">
        <section class="newly-feed__section">
          <strong class="newly-feed__heading">Newly minted</strong>
          <div class="newly-feed__items" data-feed-minted>
            <p data-feed-placeholder style="margin:0; color: #ffd700;">Loading...</p>
          </div>
        </section>
        <section class="newly-feed__section">
          <strong class="newly-feed__heading">Latest personalized</strong>
          <div class="newly-feed__items" data-feed-personalized>
            <p data-feed-placeholder style="margin:0; color: #ffd700;">Loading...</p>
          </div>
        </section>
      </article>
    </div>
  `;
}

function ensureHomepageBillboard(root: HTMLElement) {
  if (currentMapRoot && !currentMapRoot.isConnected) {
    homepageBillboardHandle?.destroy?.();
    homepageBillboardHandle = null;
    currentMapRoot = null;
  }

  if (homepageBillboardHandle && currentMapRoot === root) {
    return homepageBillboardHandle;
  }

  homepageBillboardHandle?.destroy?.();

  const mapWrapper = root.querySelector<HTMLElement>(".map-wrapper");
  const image = root.querySelector<HTMLImageElement>("#sb-theImage");
  const positionDiv = root.querySelector<HTMLElement>("#sb-position");
  const tooltipDiv = root.querySelector<HTMLElement>("#sb-tooltip");
  const fenceContainer = root.querySelector<HTMLElement>("#sb-electric-fence");
  const linkAnchor = root.querySelector<HTMLAnchorElement>("#sb-wheretogo");

  if (!mapWrapper || !image || !positionDiv || !tooltipDiv || !fenceContainer || !linkAnchor) {
    return null;
  }

  homepageBillboardHandle = initHomepageBillboard({
    mapWrapper,
    image,
    positionDiv,
    tooltipDiv,
    fenceContainer,
    linkAnchor,
    baseurl: window.SITE_BASEURL || "",
    normalizeHref: window.suNormalizeHref || ((href: string) => href),
  });

  currentMapRoot = root;
  return homepageBillboardHandle;
}

function buildFeedItems(
  entries: Array<{ square: number; row: number; col: number }>,
  listEl: HTMLElement | null,
  emptyText: string
) {
  if (!listEl) return;
  listEl.querySelectorAll<HTMLElement>("[data-feed-placeholder]").forEach((node) => node.remove());

  const boardUrl = resolveAssetUrl("/build/wholeSquare.webp");
  if (!entries.length) {
    const emptyState = document.createElement("p");
    emptyState.style.margin = "0";
    emptyState.style.color = "#ffd700";
    emptyState.textContent = emptyText;
    listEl.appendChild(emptyState);
    return;
  }

  entries.forEach(({ square, row, col }) => {
    const item = document.createElement("a");
    item.className = "newly-feed__item";
    item.href = `/square#${square}`;
    item.target = "_blank";
    item.rel = "noopener noreferrer";

    const thumb = document.createElement("span");
    thumb.className = "newly-feed__thumb";
    thumb.style.backgroundImage = `url('${boardUrl}')`;
    thumb.style.backgroundPosition = `${-col * 10}px ${-row * 10}px`;

    const label = document.createElement("p");
    label.textContent = `#${square}`;

    item.appendChild(thumb);
    item.appendChild(label);
    listEl.appendChild(item);
  });
}

function getLatestSquares(extra: SquareExtraEntry[], type: "minted" | "personalized", limit = 5) {
  const comparator =
    type === "minted"
      ? (entry: SquareExtraEntry) => entry?.[0] ?? 0
      : (entry: SquareExtraEntry) => entry?.[1] ?? 0;

  return extra
    .map((entry, index) => {
      if (!entry) return null;
      const [mintedBlock, updatedBlock] = entry;
      if (type === "personalized" && updatedBlock === mintedBlock) {
        return null;
      }
      return {
        square: index + 1,
        row: Math.floor(index / GRID_DIMENSION),
        col: index % GRID_DIMENSION,
        mintedBlock,
        updatedBlock,
        sortKey: comparator(entry),
      };
    })
    .filter(
      (
        entry
      ): entry is {
        square: number;
        row: number;
        col: number;
        mintedBlock: number;
        updatedBlock: number;
        sortKey: number;
      } => Boolean(entry)
    )
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, limit);
}

export const MainMap: Story = {
  render: () => renderMapStory(),
  play: async () => {
    const root = document.getElementById(MAP_ROOT_ID);
    if (!root) return;

    const statusEl = root.querySelector<HTMLElement>("[data-map-status]");
    try {
      const data = await loadSquareData();
      const billboard = ensureHomepageBillboard(root);
      if (!billboard) {
        throw new Error("Failed to initialize homepage billboard story");
      }

      await billboard.setData(data.personalizations, data.extra);
      if (statusEl) {
        statusEl.textContent = "Hover or tap to inspect squares.";
      }
    } catch (error) {
      if (statusEl) {
        statusEl.textContent = "Unable to load board data.";
      }
      // eslint-disable-next-line no-console
      console.error("Storybook homepage map init failed", error);
    }
  },
};

export const NewlyMintedFeed: Story = {
  render: () => renderFeedStory(),
  play: async () => {
    const root = document.getElementById(FEED_ROOT_ID);
    if (!root) return;
    const mintedList = root.querySelector<HTMLElement>("[data-feed-minted]");
    const personalizedList = root.querySelector<HTMLElement>("[data-feed-personalized]");
    try {
      const data = await loadSquareData();
      const mintedSquares = getLatestSquares(data.extra, "minted", 5).map(({ square, row, col }) => ({
        square,
        row,
        col,
      }));
      const personalizedSquares = getLatestSquares(data.extra, "personalized", 5).map(({ square, row, col }) => ({
        square,
        row,
        col,
      }));
      buildFeedItems(mintedSquares, mintedList, "No recent mints found.");
      buildFeedItems(personalizedSquares, personalizedList, "No recent personalizations found.");
    } catch (error) {
      const message = document.createElement("p");
      message.style.margin = "0";
      message.style.color = "#ffd700";
      message.textContent = "Unable to load feed data.";
      mintedList?.appendChild(message.cloneNode(true));
      personalizedList?.appendChild(message);
      // eslint-disable-next-line no-console
      console.error("Storybook feed init failed", error);
    }
  },
};
