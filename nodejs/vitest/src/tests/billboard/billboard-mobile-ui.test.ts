import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@billboard/billboard-utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@billboard/billboard-utils.js')>();
  return {
    ...actual,
    isTouchDevice: vi.fn(() => false)
  };
});

import { attachMobilePanZoomUi } from '@billboard/billboard-mobile-ui.js';
import * as utils from '@billboard/billboard-utils.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('billboard-mobile-ui', () => {
  it('does nothing on non-touch devices', () => {
    vi.mocked(utils.isTouchDevice).mockReturnValue(false);

    const wrapper = document.createElement('div');
    const uiMount = document.createElement('div');
    document.body.append(wrapper, uiMount);

    const controller = attachMobilePanZoomUi({ wrapper, uiMount });

    expect(controller.elements.hint).toBeNull();
    expect(controller.elements.resetButton).toBeNull();
    expect(wrapper.children).toHaveLength(0);
    expect(uiMount.children).toHaveLength(0);
  });

  it('shows hint first, then swaps to reset after the first pinch and restores on reset', () => {
    vi.mocked(utils.isTouchDevice).mockReturnValue(true);

    const wrapper = document.createElement('div');
    const uiMount = document.createElement('div');
    document.body.append(wrapper, uiMount);

    const onReset = vi.fn();
    const controller = attachMobilePanZoomUi({
      wrapper,
      uiMount,
      onReset,
      hintText: 'Pinch to zoom, drag to pan, double tap Squares to activate'
    });

    const { hint, resetButton } = controller.elements;

    expect(hint).not.toBeNull();
    expect(resetButton).not.toBeNull();
    expect(hint?.textContent).toBe(
      'Pinch to zoom, drag to pan, double tap Squares to activate'
    );
    expect(hint?.classList.contains('is-hidden')).toBe(false);
    expect(resetButton?.classList.contains('is-visible')).toBe(false);

    const touchMove = new Event('touchmove', { bubbles: true });
    Object.defineProperty(touchMove, 'touches', {
      configurable: true,
      value: [{ clientX: 10, clientY: 10 }, { clientX: 20, clientY: 20 }]
    });
    wrapper.dispatchEvent(touchMove);

    expect(hint?.classList.contains('is-hidden')).toBe(true);
    expect(resetButton?.classList.contains('is-visible')).toBe(true);

    resetButton?.click();

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(hint?.classList.contains('is-hidden')).toBe(false);
    expect(resetButton?.classList.contains('is-visible')).toBe(false);

    controller.destroy();
    expect(wrapper.children).toHaveLength(0);
    expect(uiMount.children).toHaveLength(0);
  });
});
