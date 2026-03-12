import { isTouchDevice } from "./billboard-utils.js";

export const DEFAULT_BILLBOARD_TOUCH_HINT =
  "Pinch to zoom, drag to pan, double tap Squares to activate";
export const DEFAULT_BILLBOARD_RESET_TEXT = "Reset zoom";

function applyColor(element, color) {
  if (!element || !color) return;
  element.style.color = color;
  element.style.borderColor = color;
}

export function attachMobilePanZoomUi(options = {}) {
  const {
    wrapper,
    uiMount,
    onReset,
    hintText = DEFAULT_BILLBOARD_TOUCH_HINT,
    resetText = DEFAULT_BILLBOARD_RESET_TEXT,
    hintColor,
    resetColor,
  } = options;

  if (!wrapper || !uiMount || !isTouchDevice()) {
    return {
      onZoomChange() {},
      restore() {},
      destroy() {},
      elements: { hint: null, resetButton: null },
    };
  }

  let isZoomed = false;
  let hasPanzoomStarted = false;

  const hint = document.createElement("div");
  hint.className = "billboard__panzoom-hint";
  hint.textContent = hintText;
  hint.setAttribute("aria-hidden", "true");
  applyColor(hint, hintColor);

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "billboard__panzoom-reset";
  resetButton.textContent = resetText;
  applyColor(resetButton, resetColor);

  function sync() {
    const showOverlay = hasPanzoomStarted || isZoomed;
    hint.classList.toggle("is-hidden", showOverlay);
    resetButton.classList.toggle("is-visible", showOverlay);
  }

  function handleTouchMove(event) {
    if (!hasPanzoomStarted && event.touches.length >= 2) {
      hasPanzoomStarted = true;
      sync();
    }
  }

  function handleResetClick() {
    hasPanzoomStarted = false;
    isZoomed = false;
    if (typeof onReset === "function") {
      onReset();
    }
    sync();
  }

  wrapper.appendChild(hint);
  uiMount.appendChild(resetButton);
  wrapper.addEventListener("touchmove", handleTouchMove, { passive: true });
  resetButton.addEventListener("click", handleResetClick);
  sync();

  return {
    onZoomChange(nextZoomed) {
      isZoomed = Boolean(nextZoomed);
      sync();
    },
    restore() {
      hasPanzoomStarted = false;
      isZoomed = false;
      sync();
    },
    destroy() {
      wrapper.removeEventListener("touchmove", handleTouchMove);
      resetButton.removeEventListener("click", handleResetClick);
      hint.remove();
      resetButton.remove();
    },
    elements: { hint, resetButton },
  };
}
