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
    this.#menu = { selectedIndex: 0, options: ['START GAME', 'LOAD GAME', 'TUTORIAL'] };
  }

  reset() {
    this.#menu.selectedIndex = 0;
  }

  handleKey(key, state, api) {
    const lower = String(key).toLowerCase();
    if (lower === 'arrowup') { this.#menu.selectedIndex = (this.#menu.selectedIndex - 1 + this.#menu.options.length) % this.#menu.options.length; return true; }
    if (lower === 'arrowdown') { this.#menu.selectedIndex = (this.#menu.selectedIndex + 1) % this.#menu.options.length; return true; }
    if (key === 'Enter') {
      const selected = this.#menu.options[this.#menu.selectedIndex];
      if (selected === 'START GAME') { api.setScreen(SCREEN_STATES.INTRO); api.markMissionStart(); return true; }
      if (selected === 'LOAD GAME') { api.setMessage('No save data', 1.5); return true; }
      if (selected === 'TUTORIAL') { api.setScreen(SCREEN_STATES.TUTORIAL); return true; }
    }
    return false;
  }

  render(p, state) {
    const t = p.millis() * 0.001;
    const layout = getLayout(p);
    const bg = getImage(START_BG);
    const dragon = getImage(DRAGON);
    const titleImg = getImage(TITLE);

    if (bg && bg.width > 0) p.image(bg, 0, 0, p.width, p.height);
    else {
      for (let y = 0; y < p.height; y++) { const inter = p.map(y, 0, p.height, 0, 1); const c = p.lerpColor(p.color('#f09a2c'), p.color('#f5c443'), inter); p.stroke(c); p.line(0, y, p.width, y); }
    }

    p.push();
    p.translate(layout.offsetX, layout.offsetY);
    this.#drawDragon(p, dragon, t, layout);
    this.#drawTitle(p, titleImg, t, layout);
    this.#drawFloatingShapes(p, t, layout);
    this.#drawMenuButtons(p, layout);
    p.pop();
  }

  #drawDragon(p, dragon, t, layout) {
    if (!dragon || dragon.width <= 0) return;
    const floatY = Math.sin(t * 1.5) * sy(8, layout);
    const wingScale = 1 + Math.sin(t * 3) * 0.02;
    const wingOffset = Math.sin(t * 4) * sx(3, layout);
    const w = sx(280, layout);
    const h = sy(280, layout);
    const x = layout.width / 2 - w / 2 + wingOffset;
    const y = sy(60, layout) + floatY;
    p.push();
    p.translate(x + w / 2, y + h / 2);
    p.scale(wingScale, 1);
    p.translate(-w / 2, -h / 2);
    p.image(dragon, 0, 0, w, h);
    p.pop();
  }

  #drawTitle(p, titleImg, t, layout) {
    const titleScale = 1 + Math.sin(t * 2) * 0.015;
    const glowAlpha = 0.3 + Math.sin(t * 3) * 0.2;
    p.push();
    p.translate(layout.width / 2, sy(45, layout));
    p.scale(titleScale);
    if (titleImg && titleImg.width > 0) {
      const tw = sx(360, layout);
      const th = sy(80, layout);
      p.push();
      p.drawingContext.shadowBlur = 20;
      p.drawingContext.shadowColor = `rgba(255, 200, 100, ${glowAlpha})`;
      p.image(titleImg, -tw / 2, -th / 2, tw, th);
      p.pop();
    } else {
      p.fill('#f5c443');
      setFont(p, Math.max(24, sx(32, layout)), FONTS.title);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('STEALTH GAME', 0, 0);
    }
    p.pop();
  }

  #drawFloatingShapes(p, t, layout) {
    p.noStroke();
    for (let i = 0; i < 5; i++) {
      const angle = t * 0.5 + i * Math.PI * 0.4;
      const x = layout.width / 2 + Math.cos(angle) * sx(200, layout);
      const y = sy(200, layout) + Math.sin(angle * 1.3) * sy(30, layout);
      const size = 4 + Math.sin(t * 2 + i) * 2;
      const alpha = 0.3 + Math.sin(t * 3 + i * 0.5) * 0.2;
      p.fill(255, 200, 100, alpha * 255);
      p.circle(x, y, size);
    }
  }

  #drawMenuButtons(p, layout) {
    const btnW = sx(200, layout);
    const btnH = sy(36, layout);
    const startY = sy(280, layout);
    const gap = sy(16, layout);

    p.textAlign(p.CENTER, p.CENTER);
    this.#menu.options.forEach((opt, i) => {
      const y = startY + i * (btnH + gap);
      const isSelected = i === this.#menu.selectedIndex;
      const hoverOffset = isSelected ? Math.sin(p.millis() * 0.008) * 3 : 0;

      if (isSelected) {
        p.fill(245, 196, 67, 230);
        p.drawingContext.shadowBlur = 15;
        p.drawingContext.shadowColor = 'rgba(245, 196, 67, 0.5)';
        p.rect(layout.width / 2 - btnW / 2 + hoverOffset, y, btnW, btnH, 8);
        p.drawingContext.shadowBlur = 0;
        p.fill('#3d2817');
        setFont(p, Math.max(14, sx(16, layout)), FONTS.ui);
      } else {
        p.fill(61, 46, 38, 200);
        p.rect(layout.width / 2 - btnW / 2, y, btnW, btnH, 8);
        p.fill('#e8c39e');
        setFont(p, Math.max(12, sx(14, layout)), FONTS.ui);
      }
      p.text(opt, layout.width / 2 + hoverOffset, y + btnH / 2);
    });
  }
}
