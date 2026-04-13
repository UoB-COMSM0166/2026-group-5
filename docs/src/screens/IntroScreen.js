import { Screen } from './Screen.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx, sy } from '../utils/screenLayout.js';
import { SCREEN_STATES } from '../core/gameState.js';

export class IntroScreen extends Screen {
  #skipRequested;
  #introLines;

  constructor() {
    super('intro', 'Press Enter to skip');
    this.#skipRequested = false;
    this.#introLines = [
      { text: 'A motivating story of how ', delay: 0 },
      { text: 'a normie like you', delay: 1400 },
      { text: 'saves the princess from misery.', delay: 2200, gapAfter: 30 },
      { text: 'But who knows,', delay: 4200 },
      { text: "maybe you're her real misery.", delay: 5500, gapAfter: 30 },
      { text: 'Who gave you the confidence to think', delay: 7200 },
      { text: 'that you are the savior, mate?', delay: 9100, gapAfter: 30 },
      { text: 'Nah,', delay: 11500 },
      { text: 'just shut up and play the game.', delay: 12000 }
    ];
  }

  reset() { this.#skipRequested = false; }

  handleKey(key, state, api) {
    if (key === 'Enter') {
      if (this.#skipRequested || (state.screenTimeMs || 0) > 12000) { api.setScreen(SCREEN_STATES.PLAYING); }
      else { this.#skipRequested = true; }
      return true;
    }
    return false;
  }

  render(p, state) {
    if ((state.screenTimeMs || 0) < 50) this.#skipRequested = false;
    const rawElapsed = state.screenTimeMs || 0;
    const elapsed = this.#skipRequested ? 999999 : rawElapsed;
    const t = elapsed * 0.0025;
    const layout = getLayout(p);

    p.push();
    p.noStroke();
    p.fill(5, 5, 15, 240);
    p.rect(0, 0, p.width, p.height);
    p.translate(layout.offsetX, layout.offsetY);
    p.textAlign(p.CENTER, p.CENTER);

    p.fill('#9be7ff');
    setFont(p, Math.max(16, sx(20, layout)), FONTS.title);
    p.text('Introduction', layout.width / 2, sy(10, layout));

    let y = sy(80, layout);
    p.fill('#e0f7ff');
    setFont(p, Math.max(12, sx(14, layout)), FONTS.ui);

    for (const line of this.#introLines) {
      const progress = Math.max(0, Math.min(1, (elapsed - line.delay) / 600));
      if (progress <= 0) continue;
      const fadeIn = progress < 1 ? progress : 1;
      const alpha = 255 * fadeIn;
      p.fill(224, 247, 255, alpha);
      p.text(line.text, layout.width / 2, y);
      y += sy(line.gapAfter ? 36 : 24, layout);
      if (y > layout.height - sy(40, layout)) break;
    }

    if (elapsed > 13000 || this.#skipRequested) {
      const blink = 0.6 + Math.sin(t * 3) * 0.4;
      p.fill(255, 255, 255, 255 * blink);
      setFont(p, Math.max(12, sx(12, layout)), FONTS.ui);
      p.text('Press Enter to start', layout.width / 2, layout.height - sy(30, layout));
    }
    p.pop();
  }
}
