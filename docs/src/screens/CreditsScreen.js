// Credits screen: displays developer group and return-to-title prompt.
import { Screen } from './Screen.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx } from '../utils/screenLayout.js';

const CONFIRM_KEYS = new Set(['Enter', 'e', 'E']);

export class CreditsScreen extends Screen {
  constructor() {
    super('credits', 'Press Enter / E to return to title');
  }

  handleKey(key, state, api) {
    if (CONFIRM_KEYS.has(key)) {
      api.exitToTitle?.();
      return true;
    }
    return false;
  }

  render(p, state) {
    const layout = getLayout(p);

    p.push();
    p.background(0);
    p.translate(layout.offsetX, layout.offsetY);
    p.textAlign(p.CENTER, p.CENTER);

    setFont(p, Math.max(18, sx(22, layout)), FONTS.title, 'bold');
    p.fill(255);
    p.text('GROUP 5', layout.width / 2, layout.height / 2 - 24);

    setFont(p, Math.max(10, sx(12, layout)), FONTS.ui);
    p.fill('#d6d6d6');
    p.text('Press Enter / E to return to title', layout.width / 2, layout.height / 2 + 28);
    p.pop();

    state.prompt = this.promptText;
  }
}
