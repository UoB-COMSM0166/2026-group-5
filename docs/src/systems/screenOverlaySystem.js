// Screen overlay: dispatches screen rendering via ScreenManager.
import { SCREEN_STATES } from '../core/gameState.js';
import { ScreenManager } from '../screens/ScreenManager.js';

export class ScreenOverlaySystem {
  #screenManager;

  constructor() {
    this.#screenManager = new ScreenManager();
  }

  get screenManager() { return this.#screenManager; }

  update(state, deltaTime) {
    const targetAlpha = state.screen === 'playing' ? 0 : 0.18;
    state.ui.overlayAlpha += (targetAlpha - state.ui.overlayAlpha) * Math.min(1, deltaTime * 6);
    if (state.ui.messageTimer > 0) {
      state.ui.messageTimer = Math.max(0, state.ui.messageTimer - deltaTime);
      if (state.ui.messageTimer === 0) state.ui.message = '';
    }
    state.ui.flashAlpha = Math.max(0, state.ui.flashAlpha - deltaTime * 1.8);
    this.#screenManager.update(state.screen, state, deltaTime);
  }

  flash(state, alpha = 0.35) {
    state.ui.flashAlpha = Math.max(state.ui.flashAlpha, alpha);
  }

  render(p, state) {
    this.#screenManager.render(state.screen, p, state);

    if (state.screen === SCREEN_STATES.PLAYING || state.screen === SCREEN_STATES.PAUSE) {
      if (state.ui.vignette > 0) {
        p.noStroke();
        p.fill(0, 0, 0, 60);
        p.rect(0, 0, p.width, 28);
        p.rect(0, p.height - 28, p.width, 28);
      }
      if (state.ui.overlayAlpha > 0.01) {
        p.noStroke();
        p.fill(0, 0, 0, 255 * state.ui.overlayAlpha);
        p.rect(0, 0, p.width, p.height);
      }
      if (state.ui.flashAlpha > 0.01) {
        p.noStroke();
        p.fill(255, 255, 255, 255 * state.ui.flashAlpha);
        p.rect(0, 0, p.width, p.height);
      }
    }
  }
}
