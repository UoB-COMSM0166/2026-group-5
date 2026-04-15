// Playthrough select: lets the player choose first or second playthrough after the false ending.
import { Screen } from './Screen.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx, sy, centerGroupY } from '../utils/screenLayout.js';
import { SCREEN_STATES } from '../core/gameState.js';

export class PlaythroughSelectScreen extends Screen {
  #selectedIndex;

  constructor() {
    super('playthrough_select', 'Arrow Up / Down to choose, Enter to confirm');
    this.#selectedIndex = 0;
  }

  reset() {
    this.#selectedIndex = 0;
  }

  handleKey(key, state, api) {
    const options = this.#getOptions(state);

    if (key === 'ArrowUp') {
      this.#selectedIndex = (this.#selectedIndex - 1 + options.length) % options.length;
      api.setMessage?.(options[this.#selectedIndex].label, 0.6);
      return true;
    }

    if (key === 'ArrowDown') {
      this.#selectedIndex = (this.#selectedIndex + 1) % options.length;
      api.setMessage?.(options[this.#selectedIndex].label, 0.6);
      return true;
    }

    if (key === 'Enter') {
      const option = options[this.#selectedIndex];
      if (!option.enabled) {
        api.setMessage?.('Complete the first playthrough to unlock this.', 1.2);
        return true;
      }

      option.action(state, api);
      return true;
    }

    return false;
  }

  render(p, state) {
    const t = p.millis() * 0.001;
    const layout = getLayout(p);
    const options = this.#getOptions(state);

    this.#drawBackground(p);
    this.#drawFloatingShapes(p, t, layout);
    this.#drawHeader(p, layout, state);
    this.#drawMenuButtons(p, layout, options);

    const selected = options[this.#selectedIndex];
    state.prompt = selected?.enabled
      ? this.promptText
      : 'Complete the first playthrough to unlock this.';
  }

  #getOptions(state) {
    const secondUnlocked = Boolean(state.story?.secondPlaythroughUnlocked);

    return [
      {
        label: 'FIRST PLAYTHROUGH',
        enabled: true,
        action: (storyState, api) => {
          storyState.story.currentPlaythrough = 1;
          storyState.story.selectedRoute = null;
          storyState.story.introVariant = 'first';
          api.setMessage?.('First playthrough selected', 0.8);
          api.setScreen?.(SCREEN_STATES.INTRO);
        }
      },
      {
        label: secondUnlocked ? 'SECOND PLAYTHROUGH' : 'SECOND PLAYTHROUGH (LOCKED)',
        enabled: secondUnlocked,
        action: (storyState, api) => {
          storyState.story.currentPlaythrough = 2;
          storyState.story.selectedRoute = null;
          storyState.story.introVariant = 'second';
          api.setMessage?.('Second playthrough selected', 0.8);
          api.setScreen?.(SCREEN_STATES.INTRO);
        }
      }
    ];
  }

  #drawBackground(p) {
    for (let y = 0; y < p.height; y += 1) {
      const inter = p.map(y, 0, p.height, 0, 1);
      const c = p.lerpColor(p.color('#f09a2c'), p.color('#f5c443'), inter);
      p.stroke(c);
      p.line(0, y, p.width, y);
    }
  }

  #drawHeader(p, layout, state) {
    p.push();
    p.translate(layout.offsetX, layout.offsetY);
    p.textAlign(p.CENTER, p.CENTER);

    setFont(p, Math.max(16, sx(24, layout)), FONTS.title, 'bold');
    p.fill('#ff4f8d');
    p.text('SELECT PLAYTHROUGH', layout.width / 2 + sx(3, layout), sy(95, layout) + sy(3, layout));
    p.fill('#24327c');
    p.text('SELECT PLAYTHROUGH', layout.width / 2, sy(95, layout));

    p.fill('#fff4d6');
    setFont(p, Math.max(10, sx(11, layout)), FONTS.ui);
    p.text('Choose which run of the story you want to play.', layout.width / 2, sy(145, layout));

    if (!state.story?.secondPlaythroughUnlocked) {
      p.fill('#2a1730');
      setFont(p, Math.max(10, sx(10, layout)), FONTS.ui);
      p.text('Second playthrough unlocks after reaching the first ending.', layout.width / 2, sy(175, layout));
    }

    p.pop();
  }

  #drawFloatingShapes(p, t, layout) {
    p.push();
    p.translate(layout.offsetX, layout.offsetY);
    p.noFill();
    p.stroke('#ff4f8d');
    p.strokeWeight(Math.max(2, sx(4, layout)));

    p.circle(sx(90, layout), sy(85, layout) + Math.sin(t * 1.7) * sy(8, layout), sx(48, layout));

    const triangleY = sy(185, layout) + Math.sin(t * 1.3) * sy(10, layout);
    p.beginShape();
    p.vertex(sx(130, layout), triangleY);
    p.vertex(sx(125, layout), triangleY + sy(40, layout));
    p.vertex(sx(90, layout), triangleY + sy(20, layout));
    p.endShape(p.CLOSE);

    p.push();
    p.translate(sx(860, layout), sy(160, layout) + Math.sin(t * 1.1) * sy(8, layout));
    p.rotate(0.4 + Math.sin(t) * 0.08);
    p.rectMode(p.CENTER);
    p.rect(0, 0, sx(40, layout), sy(40, layout));
    p.rectMode(p.CORNER);
    p.pop();

    p.pop();
  }

  #drawMenuButtons(p, layout, options) {
    const w = sx(320, layout);
    const h = sy(58, layout);
    const gap = sy(24, layout);
    const totalH = options.length * h + (options.length - 1) * gap;
    const startX = layout.offsetX + (layout.width - w) / 2;
    const startY = centerGroupY(0, totalH, layout) + sy(35, layout);

    for (let i = 0; i < options.length; i += 1) {
      const option = options[i];
      const y = startY + i * (h + gap);
      this.#drawButton(p, startX, y, w, h, option.label, i === this.#selectedIndex, option.enabled, layout);
    }
  }

  #drawButton(p, x, y, w, h, text, selected, enabled, layout) {
    p.push();
    p.noStroke();
    p.fill('#24152a');
    p.rect(x + sx(6, layout), y + sy(6, layout), w, h, sx(18, layout));
    p.fill(enabled ? (selected ? '#e73b6e' : '#c92d59') : '#8f6b78');
    p.rect(x, y, w, h, sx(18, layout));
    p.fill(255, 255, 255, enabled ? 35 : 18);
    p.rect(x + sx(4, layout), y + sy(4, layout), w - sx(8, layout), h * 0.35, sx(12, layout));
    p.noFill();
    p.stroke(enabled ? (selected ? '#fff4d6' : '#2a1730') : '#5c4850');
    p.strokeWeight(selected && enabled ? sx(5, layout) : sx(4, layout));
    p.rect(x, y, w, h, sx(18, layout));
    p.noStroke();
    p.fill(enabled ? '#ffd85a' : '#ead7c2');
    p.textAlign(p.CENTER, p.CENTER);
    setFont(p, Math.max(10, sx(14, layout)), FONTS.ui, 'bold');
    p.text(text, x + w / 2, y + h / 2 + sy(1, layout));
    p.pop();
  }
}
