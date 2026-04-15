// Start screen: title, animated background, and "Press Enter" prompt.
import { Screen } from './Screen.js';
import { getImage } from '../core/assetLoader.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx, sy } from '../utils/screenLayout.js';
import { SCREEN_STATES } from '../core/gameState.js';

const START_BG = './assets/images/original/drawings/start_bg.png';
const DRAGON = './assets/images/original/npcs/dragon/dragon.png';
const TITLE = './assets/images/original/drawings/title_logo.png';

export class StartScreen extends Screen {
  #menu;

  constructor() {
    super('start', 'Arrow Up / Down to choose, Enter to confirm');
    this.#menu = {
      selectedIndex: 0,
      options: ['START GAME', 'LOAD GAME', 'TUTORIAL']
    };
  }

  reset() {
    this.#menu.selectedIndex = 0;
  }

  handleKey(key, state, api) {
    if (key === 'ArrowUp') {
      this.#menu.selectedIndex =
        (this.#menu.selectedIndex - 1 + this.#menu.options.length) % this.#menu.options.length;
      api.setMessage?.(this.#menu.options[this.#menu.selectedIndex], 0.6);
      return true;
    }

    if (key === 'ArrowDown') {
      this.#menu.selectedIndex = (this.#menu.selectedIndex + 1) % this.#menu.options.length;
      api.setMessage?.(this.#menu.options[this.#menu.selectedIndex], 0.6);
      return true;
    }

    if (key === 'Enter') {
      const option = this.#menu.options[this.#menu.selectedIndex];
      if (option === 'START GAME') {
        api.setScreen?.(SCREEN_STATES.PLAYTHROUGH_SELECT);
      } else if (option === 'TUTORIAL') {
        state.story.currentPlaythrough = 1;
        state.story.selectedRoute = null;
        state.story.introVariant = 'first';
        api.loadStoryLevel?.('map1');
        api.setScreen?.(SCREEN_STATES.TUTORIAL);
        api.setMessage?.('Tutorial opened', 0.8);
      } else {
        api.setMessage?.(`${option} is not available yet`, 1.1);
      }
      return true;
    }

    return false;
  }

  render(p, state) {
    const t = p.millis() * 0.001;
    const layout = getLayout(p);
    const bg = getImage(START_BG);
    const dragon = getImage(DRAGON);
    const titleImg = getImage(TITLE);

    if (bg && bg.width > 0) {
      p.image(bg, 0, 0, p.width, p.height);
    } else {
      for (let y = 0; y < p.height; y += 1) {
        const inter = p.map(y, 0, p.height, 0, 1);
        const c = p.lerpColor(p.color('#f09a2c'), p.color('#f5c443'), inter);
        p.stroke(c);
        p.line(0, y, p.width, y);
      }
    }

    p.push();
    p.translate(layout.offsetX, layout.offsetY);
    this.#drawDragon(p, dragon, t, layout);
    this.#drawTitle(p, titleImg, t, layout);
    this.#drawFloatingShapes(p, t, layout);
    this.#drawMenuButtons(p, layout);
    p.pop();

    state.prompt = this.promptText;
  }

  #drawDragon(p, dragon, t, layout) {
    if (!dragon || dragon.width <= 0) return;
    const floatY = Math.sin(t * 2) * sy(2, layout);
    const w = sx(600, layout);
    const h = sy(600, layout);
    p.image(dragon, sx(-50, layout), layout.height - h + sy(140, layout) + floatY, w, h);
  }

  #drawTitle(p, titleImg, t, layout) {
    const pulse = 1 + Math.sin(t * 1.6) * 0.005;
    const x = sx(330, layout);
    const y = sy(0, layout);
    const w = sx(550, layout);
    const h = sy(210, layout);

    if (titleImg && titleImg.width > 0) {
      p.push();
      p.translate(x + w / 2, y + h / 2);
      p.scale(pulse, pulse);
      p.imageMode(p.CENTER);
      p.image(titleImg, 0, 0, w, h);
      p.imageMode(p.CORNER);
      p.pop();
      return;
    }

    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    const centerX = layout.width / 2;
    const baseY = sy(110, layout) + Math.sin(t * 2) * sy(4, layout);
    setFont(p, Math.max(16, sx(34, layout)), FONTS.title, 'bold');
    p.fill('#ff4f8d');
    p.text('ESCAPE:', centerX + sx(4, layout), baseY + sy(4, layout));
    p.fill('#24327c');
    p.text('ESCAPE:', centerX, baseY);
    setFont(p, Math.max(28, sx(64, layout)), FONTS.title, 'bold');
    p.fill('#ff4f8d');
    p.text('OH DEAR', centerX + sx(5, layout), baseY + sy(83, layout));
    p.fill('#24327c');
    p.text('OH DEAR', centerX, baseY + sy(78, layout));
    p.pop();
  }

  #drawFloatingShapes(p, t, layout) {
    p.push();
    p.noFill();
    p.stroke('#ff4f8d');
    p.strokeWeight(Math.max(2, sx(4, layout)));
    p.circle(sx(70, layout), sy(60, layout) + Math.sin(t * 1.7) * sy(8, layout), sx(48, layout));

    const triangleY = sy(150, layout) + Math.sin(t * 1.3) * sy(10, layout);
    p.beginShape();
    p.vertex(sx(110, layout), triangleY);
    p.vertex(sx(105, layout), triangleY + sy(40, layout));
    p.vertex(sx(70, layout), triangleY + sy(20, layout));
    p.endShape(p.CLOSE);

    p.push();
    p.translate(sx(860, layout), sy(200, layout) + Math.sin(t * 1.1) * sy(8, layout));
    p.rotate(0.4 + Math.sin(t) * 0.08);
    p.rectMode(p.CENTER);
    p.rect(0, 0, sx(40, layout), sy(40, layout));
    p.rectMode(p.CORNER);
    p.pop();

    p.pop();
  }

  #drawMenuButtons(p, layout) {
    const startX = sx(560, layout);
    const startY = sy(330, layout);
    const w = sx(250, layout);
    const h = sy(58, layout);
    const gap = sy(24, layout);

    for (let i = 0; i < this.#menu.options.length; i += 1) {
      const y = startY + i * (h + gap);
      this.#drawButton(p, startX, y, w, h, this.#menu.options[i], i === this.#menu.selectedIndex, layout);
    }
  }

  #drawButton(p, x, y, w, h, text, selected, layout) {
    p.push();
    p.noStroke();
    p.fill('#24152a');
    p.rect(x + sx(6, layout), y + sy(6, layout), w, h, sx(18, layout));
    p.fill(selected ? '#e73b6e' : '#c92d59');
    p.rect(x, y, w, h, sx(18, layout));
    p.fill(255, 255, 255, 35);
    p.rect(x + sx(4, layout), y + sy(4, layout), w - sx(8, layout), h * 0.35, sx(12, layout));
    p.noFill();
    p.stroke(selected ? '#fff4d6' : '#2a1730');
    p.strokeWeight(selected ? sx(5, layout) : sx(4, layout));
    p.rect(x, y, w, h, sx(18, layout));
    p.noStroke();
    p.fill('#ffd85a');
    p.textAlign(p.CENTER, p.CENTER);
    setFont(p, Math.max(12, sx(18, layout)), FONTS.ui, 'bold');
    p.text(text, x + w / 2, y + h / 2 + sy(1, layout));
    p.pop();
  }
}
