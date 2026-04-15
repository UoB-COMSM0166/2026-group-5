// Tutorial screen: paginated GIF-based tutorial pages with navigation and skip.
import { Screen } from './Screen.js';
import { getImage } from '../core/assetLoader.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx, sy } from '../utils/screenLayout.js';

const TUTORIAL_PAGES = Object.freeze([
  './assets/images/gif/ASDW.gif',
  './assets/images/gif/b.gif',
  './assets/images/gif/c.gif',
  './assets/images/gif/d.gif',
  './assets/images/gif/e.gif',
  './assets/images/gif/f.gif',
  './assets/images/gif/g.gif'
]);

export class TutorialScreen extends Screen {
  #pageIndex;
  #turnDir;
  #turnT;
  #turning;

  constructor() {
    super('tutorial', 'Press ← → to flip pages, Enter to skip');
    this.#pageIndex = 0;
    this.#turnDir = 0;
    this.#turnT = 0;
    this.#turning = false;
  }

  reset() {
    this.#pageIndex = 0;
    this.#turnDir = 0;
    this.#turnT = 0;
    this.#turning = false;
  }

  update(state, deltaTime) {
    if (!this.#turning) return;
    this.#turnT += deltaTime * 4.5;
    if (this.#turnT >= 1) {
      this.#turnT = 0;
      this.#turning = false;
      this.#pageIndex += this.#turnDir;
      if (this.#pageIndex < 0) this.#pageIndex = 0;
      if (this.#pageIndex > TUTORIAL_PAGES.length - 1) this.#pageIndex = TUTORIAL_PAGES.length - 1;
    }
  }

  handleKey(key, state, api) {
    if (this.#turning) return true;
    if (key === 'ArrowLeft' && this.#pageIndex > 0) {
      this.#startTurn(-1);
      return true;
    }
    if (key === 'ArrowRight') {
      if (this.#pageIndex < TUTORIAL_PAGES.length - 1) {
        this.#startTurn(1);
      } else {
        api.restartCurrentStoryRun?.();
        api.setMessage?.('Mission started', 1.2);
      }
      return true;
    }
    if (key === 'Enter') {
      api.restartCurrentStoryRun?.();
      api.setMessage?.('Mission started', 1.2);
      return true;
    }
    return false;
  }

  handleMouse(mouseX, mouseY, p, state, api) {
    const layout = getLayout(p);
    if (this.#turning) return true;

    const x = mouseX - layout.offsetX;
    const y = mouseY - layout.offsetY;
    const tutorialW = sx(760, layout);
    const tutorialH = sy(430, layout);
    const tutorialX = (layout.width - tutorialW) / 2;
    const tutorialY = (layout.height - tutorialH) / 2;
    const btnSize = sy(40, layout);
    const leftBtnX = tutorialX - btnSize - sx(20, layout);
    const rightBtnX = tutorialX + tutorialW + sx(20, layout);
    const btnY = tutorialY + tutorialH / 2 - btnSize / 2;

    if (y >= btnY && y <= btnY + btnSize) {
      if (this.#pageIndex > 0 && x >= leftBtnX && x <= leftBtnX + btnSize) {
        this.#startTurn(-1);
        return true;
      }
      if (x >= rightBtnX && x <= rightBtnX + btnSize) {
        if (this.#pageIndex < TUTORIAL_PAGES.length - 1) {
          this.#startTurn(1);
        } else {
          api.restartCurrentStoryRun?.();
          api.setMessage?.('Mission started', 1.2);
        }
        return true;
      }
    }

    return false;
  }

  #startTurn(dir) {
    if (this.#turning) return;
    this.#turnDir = dir;
    this.#turnT = 0;
    this.#turning = true;
  }

  render(p, state) {
    const layout = getLayout(p);
    const pagePath = TUTORIAL_PAGES[this.#pageIndex];
    const pageImg = getImage(pagePath);

    p.push();
    p.noStroke();
    p.fill(8, 10, 20, 235);
    p.rect(0, 0, p.width, p.height);
    p.translate(layout.offsetX, layout.offsetY);

    const tutorialW = sx(760, layout);
    const tutorialH = sy(430, layout);
    const tutorialX = (layout.width - tutorialW) / 2;
    const tutorialY = (layout.height - tutorialH) / 2;

    p.stroke('#6b4d37');
    p.strokeWeight(2);
    p.fill(20, 24, 35, 250);
    p.rect(tutorialX, tutorialY, tutorialW, tutorialH, 12);

    this.#drawPageContent(p, pageImg, tutorialX, tutorialY, tutorialW, tutorialH, layout);
    this.#drawNavButtons(p, tutorialX, tutorialY, tutorialW, tutorialH, layout);
    this.#drawPageIndicator(p, tutorialX, tutorialY, tutorialW, tutorialH, layout);

    p.fill('#a0a0a0');
    setFont(p, Math.max(10, sx(11, layout)), FONTS.ui);
    p.textAlign(p.CENTER, p.CENTER);
    p.noStroke();
    p.text(
      this.#pageIndex === TUTORIAL_PAGES.length - 1
        ? 'Press → or Enter to start'
        : 'Press ← → to flip pages, Enter to skip',
      layout.width / 2,
      tutorialY + tutorialH + sy(25, layout)
    );
    p.pop();

    state.prompt = this.#pageIndex === TUTORIAL_PAGES.length - 1
      ? 'Press → or Enter to start'
      : this.promptText;
  }

  #drawPageContent(p, pageImg, x, y, w, h, layout) {
    const contentPadding = sx(20, layout);
    const imgMaxW = w - contentPadding * 2;
    const imgMaxH = h - contentPadding * 2;

    if (this.#turning) {
      const progress = this.#turnT;
      const scale = 1 - Math.sin(progress * Math.PI) * 0.1;
      const alpha = 255 * (1 - Math.sin(progress * Math.PI));
      p.push();
      p.translate(x + w / 2, y + h / 2);
      p.scale(scale);
      p.tint(255, alpha);
    }

    if (pageImg && pageImg.width > 0) {
      const scale = Math.min(imgMaxW / pageImg.width, imgMaxH / pageImg.height, 1);
      const imgW = pageImg.width * scale;
      const imgH = pageImg.height * scale;
      const imgX = x + (w - imgW) / 2;
      const imgY = y + (h - imgH) / 2;
      p.image(pageImg, imgX, imgY, imgW, imgH);
    } else {
      p.fill('#606060');
      p.noStroke();
      p.rect(x + contentPadding, y + contentPadding, w - contentPadding * 2, h - contentPadding * 2, 8);
      p.fill('#a0a0a0');
      setFont(p, Math.max(12, sx(14, layout)), FONTS.ui);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(`Tutorial Page ${this.#pageIndex + 1}`, x + w / 2, y + h / 2);
    }

    if (this.#turning) p.pop();
  }

  #drawNavButtons(p, x, y, w, h, layout) {
    const btnSize = sy(40, layout);
    const btnY = y + h / 2 - btnSize / 2;
    const leftBtnX = x - btnSize - sx(20, layout);
    const rightBtnX = x + w + sx(20, layout);

    p.noStroke();
    p.fill(this.#pageIndex > 0 ? '#4a5568' : '#2d3748');
    p.rect(leftBtnX, btnY, btnSize, btnSize, 8);
    p.fill(this.#pageIndex < TUTORIAL_PAGES.length - 1 ? '#4a5568' : '#c92d59');
    p.rect(rightBtnX, btnY, btnSize, btnSize, 8);

    p.fill('#ffffff');
    setFont(p, Math.max(16, sx(20, layout)), FONTS.ui);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('<', leftBtnX + btnSize / 2, btnY + btnSize / 2);
    p.text('>', rightBtnX + btnSize / 2, btnY + btnSize / 2);
  }

  #drawPageIndicator(p, x, y, w, h, layout) {
    const dotSize = sy(8, layout);
    const dotGap = sx(12, layout);
    const totalW = TUTORIAL_PAGES.length * dotSize + (TUTORIAL_PAGES.length - 1) * dotGap;
    const startX = x + (w - totalW) / 2;
    const dotY = y + h - sy(25, layout);

    p.noStroke();
    for (let i = 0; i < TUTORIAL_PAGES.length; i += 1) {
      p.fill(i === this.#pageIndex ? '#f5c443' : '#4a5568');
      p.circle(startX + i * (dotSize + dotGap) + dotSize / 2, dotY, dotSize);
    }
  }
}
