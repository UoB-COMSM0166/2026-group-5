import { getImage } from '../core/assetLoader.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx, sy } from '../utils/screenLayout.js';
import { SCREEN_STATES } from '../core/gameState.js';

const TUTORIAL_PAGES = [
  './assets/images/gif/ASDW.gif',
  './assets/images/gif/b.gif',
  './assets/images/gif/c.gif',
  './assets/images/gif/d.gif',
  './assets/images/gif/e.gif',
  './assets/images/gif/f.gif',
  './assets/images/gif/g.gif'
];

function getTutorialUi(state) {
  state.ui.tutorial ??= { pageIndex: 0, turnDir: 0, turnT: 0, turning: false };
  return state.ui.tutorial;
}

export function resetTutorialScreen(state) {
  const tutorial = getTutorialUi(state);
  tutorial.pageIndex = 0;
  tutorial.turnDir = 0;
  tutorial.turnT = 0;
  tutorial.turning = false;
}

export function updateTutorialScreen(state, deltaTime) {
  const tutorial = getTutorialUi(state);
  if (!tutorial.turning) return;
  tutorial.turnT += deltaTime * 4.5;
  if (tutorial.turnT >= 1) {
    tutorial.turnT = 0;
    tutorial.turning = false;
    tutorial.pageIndex += tutorial.turnDir;
    if (tutorial.pageIndex < 0) tutorial.pageIndex = 0;
    if (tutorial.pageIndex > TUTORIAL_PAGES.length - 1) tutorial.pageIndex = TUTORIAL_PAGES.length - 1;
  }
}

export function drawTutorialScreen(p, state) {
  const layout = getLayout(p);
  const tutorial = getTutorialUi(state);
  const pagePath = TUTORIAL_PAGES[tutorial.pageIndex];
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
  p.strokeWeight(Math.max(2, sx(3, layout)));
  p.fill('#efe2c8');
  p.rect(tutorialX, tutorialY, tutorialW, tutorialH, sx(16, layout));

  p.stroke(120, 90, 70, 100);
  p.line(tutorialX + tutorialW / 2, tutorialY + sy(18, layout), tutorialX + tutorialW / 2, tutorialY + tutorialH - sy(18, layout));

  const frameX = tutorialX + sx(75, layout);
  const frameY = tutorialY + sy(25, layout);
  const frameW = sx(600, layout);
  const frameH = sy(400, layout);

  p.noStroke();
  p.fill(255, 255, 255, 55);
  p.rect(frameX, frameY, frameW, frameH, sx(8, layout));

  let visualScaleX = 1;
  if (tutorial.turning) {
    visualScaleX = Math.max(0.08, Math.abs(Math.cos(tutorial.turnT * Math.PI)));
  }

  p.push();
  p.translate(frameX + frameW / 2, frameY + frameH / 2);
  p.scale(visualScaleX, 1);

  if (pageImg && pageImg.width > 0) {
    const ratio = pageImg.width / pageImg.height;
    let drawW = frameW;
    let drawH = drawW / ratio;
    if (drawH > frameH) {
      drawH = frameH;
      drawW = drawH * ratio;
    }
    p.image(pageImg, -drawW / 2, -drawH / 2, drawW, drawH);
  }

  p.pop();

  setFont(p, Math.max(10, sx(12, layout)), FONTS.ui);
  p.fill('#4b2f24');
  p.textAlign(p.CENTER, p.CENTER);
  p.text(`${tutorial.pageIndex + 1} / ${TUTORIAL_PAGES.length}`, layout.width / 2, tutorialY + tutorialH - sy(24, layout));

  drawArrowButton(p, tutorialX + sx(34, layout), tutorialY + tutorialH / 2, sx(42, layout), '<', tutorial.pageIndex === 0);
  drawArrowButton(p, tutorialX + tutorialW - sx(34, layout), tutorialY + tutorialH / 2, sx(42, layout), '>', tutorial.pageIndex === TUTORIAL_PAGES.length - 1);

  const btnW = sx(150, layout);
  const btnH = sy(36, layout);
  const btnX = tutorialX + tutorialW - btnW - sx(18, layout);
  const btnY = tutorialY + sy(14, layout);

  p.noStroke();
  p.fill('#c92d59');
  p.rect(btnX, btnY, btnW, btnH, sx(10, layout));
  p.fill('#fff4d6');
  setFont(p, Math.max(9, sx(10, layout)), FONTS.ui, 'bold');
  p.text(tutorial.pageIndex === TUTORIAL_PAGES.length - 1 ? 'START GAME' : 'SKIP', btnX + btnW / 2, btnY + btnH / 2);

  p.pop();

  state.prompt = 'Click arrows or press ← → to turn pages';
}

function drawArrowButton(p, cx, cy, size, label, disabled = false) {
  p.push();
  p.rectMode(p.CENTER);
  p.noStroke();
  p.fill(disabled ? '#7b7b7b' : '#c92d59');
  p.rect(cx, cy, size, size, 10);
  p.fill('#fff4d6');
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(size * 0.46);
  p.text(label, cx, cy);
  p.rectMode(p.CORNER);
  p.pop();
}

export function handleTutorialScreenKey(key, state, api) {
  const tutorial = getTutorialUi(state);
  if (tutorial.turning) return true;

  if (key === 'ArrowLeft' && tutorial.pageIndex > 0) {
    tutorial.turning = true;
    tutorial.turnDir = -1;
    tutorial.turnT = 0;
    return true;
  }

  if (key === 'ArrowRight' || key === 'Enter') {
    if (tutorial.pageIndex < TUTORIAL_PAGES.length - 1) {
      tutorial.turning = true;
      tutorial.turnDir = 1;
      tutorial.turnT = 0;
    } else {
      api?.markMissionStart?.();
      api?.setScreen?.(SCREEN_STATES.PLAYING);
      api?.setMessage?.('Mission started', 1.2);
    }
    return true;
  }

  return false;
}

export function handleTutorialScreenMouse(mx, my, p, state, api) {
  const layout = getLayout(p);
  const tutorial = getTutorialUi(state);
  if (tutorial.turning) return true;

  const x = mx - layout.offsetX;
  const y = my - layout.offsetY;

  const tutorialW = sx(760, layout);
  const tutorialH = sy(430, layout);
  const tutorialX = (layout.width - tutorialW) / 2;
  const tutorialY = (layout.height - tutorialH) / 2;

  const left = { cx: tutorialX + sx(34, layout), cy: tutorialY + tutorialH / 2, r: sx(26, layout) };
  const right = { cx: tutorialX + tutorialW - sx(34, layout), cy: tutorialY + tutorialH / 2, r: sx(26, layout) };

  const btnW = sx(150, layout);
  const btnH = sy(36, layout);
  const btnX = tutorialX + tutorialW - btnW - sx(18, layout);
  const btnY = tutorialY + sy(14, layout);

  if (hitCircle(x, y, left.cx, left.cy, left.r) && tutorial.pageIndex > 0) {
    tutorial.turning = true;
    tutorial.turnDir = -1;
    tutorial.turnT = 0;
    return true;
  }

  if (hitCircle(x, y, right.cx, right.cy, right.r)) {
    if (tutorial.pageIndex < TUTORIAL_PAGES.length - 1) {
      tutorial.turning = true;
      tutorial.turnDir = 1;
      tutorial.turnT = 0;
    } else {
      api?.markMissionStart?.();
      api?.setScreen?.(SCREEN_STATES.PLAYING);
      api?.setMessage?.('Mission started', 1.2);
    }
    return true;
  }

  if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
    api?.markMissionStart?.();
    api?.setScreen?.(SCREEN_STATES.PLAYING);
    api?.setMessage?.('Mission started', 1.2);
    return true;
  }

  return true;
}

function hitCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}