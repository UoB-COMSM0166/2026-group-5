// Lose screen: "GAME OVER" with shaking effect and retry prompt.
import { Screen } from './Screen.js';
import { getImage } from '../core/assetLoader.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx, sy } from '../utils/screenLayout.js';
import { SCREEN_STATES } from '../core/gameState.js';

const CAPTURED = './assets/images/screens/lose/captured.png';
const CONFIRM_KEYS = new Set(['Enter', 'e', 'E']);

export class LoseScreen extends Screen {
  constructor() {
    super('lose', 'Press Enter / E to retry');
  }

  handleKey(key, state, api) {
    if (CONFIRM_KEYS.has(key)) {
      if (api.restartCurrentStoryRun) api.restartCurrentStoryRun();
      else api.restartLevel?.();
      return true;
    }
    return false;
  }

  render(p, state) {
    const now = p.millis();
    const t = now * 0.02;
    const layout = getLayout(p);
    const blinkAlpha = 0.6 + Math.sin(t * 0.7) * 0.4;
    const enterDuration = 100;
    const elapsed = state.screenTimeMs || 0;
    const enter = Math.min(elapsed / enterDuration, 1);

    p.push();
    p.noStroke();
    p.fill(49, 34, 42, 240 * enter);
    p.rect(0, 0, p.width, p.height);
    p.pop();

    p.push();
    p.translate(layout.offsetX, layout.offsetY);
    const contentY = (1 - enter) * sy(20, layout);
    const contentScale = 0.96 + enter * 0.04;
    p.translate(layout.width / 2, layout.height / 2 + contentY);
    p.scale(contentScale);
    p.translate(-layout.width / 2, -layout.height / 2);

    this.#drawCaptured(p, getImage(CAPTURED), t, layout);

    p.textAlign(p.CENTER, p.CENTER);
    const shakeX = Math.sin(t * 2.8) * sx(1.5, layout) * enter;
    const shakeY = Math.cos(t * 2.1) * sy(1.2, layout) * enter;

    setFont(p, Math.max(18, sx(22, layout)), FONTS.title);
    p.fill(60, 0, 0, 230);
    p.text('GAME OVER', layout.width / 2 + sx(2, layout), sy(120, layout) + sy(2, layout));
    p.fill('#ff8080');
    p.text('GAME OVER', layout.width / 2 + shakeX, sy(120, layout) + shakeY);

    p.fill('#ffdada');
    setFont(p, Math.max(12, sx(18, layout)), FONTS.ui);
    p.text('Your journey ends here.', layout.width / 2, sy(195, layout));

    p.fill(255, 255, 255, 255 * enter * blinkAlpha);
    setFont(p, Math.max(12, sx(12, layout)), FONTS.ui);
    p.text('Press Enter / E to retry', layout.width / 2, sy(265, layout));
    p.pop();
  }

  #drawCaptured(p, captured, _t, layout) {
    if (!captured || captured.width <= 0) return;
    const w = sx(300, layout);
    const h = sy(300, layout);
    const x = layout.width / 2 - w / 2;
    const y = sy(270, layout);
    p.image(captured, x, y, w, h);
  }
}
