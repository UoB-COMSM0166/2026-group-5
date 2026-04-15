import { getImage } from '../core/assetLoader.js';

const POPUP_DURATION = 1.8;
const FLOAT_HEIGHT = 22;
const ICON_PATHS = {
  key: './assets/images/adapted/interactives/key3232.png',
  note: './assets/images/sprites/note.png'
};

const popups = [];

// show floating icon when chest opens
export function spawnLootPopup(lootType, worldX, worldY, tileSize) {
  popups.push({
    type: lootType,
    x: worldX,
    baseY: worldY - 4,
    timer: POPUP_DURATION,
    size: tileSize * 1.6
  });
}

export function updateLootPopups(deltaTime) {
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].timer -= deltaTime;
    if (popups[i].timer <= 0) popups.splice(i, 1);
  }
}

export function renderLootPopups(p) {
  for (const pop of popups) {
    const progress = 1 - pop.timer / POPUP_DURATION;
    // fade in first 15%, sustain, fade out last 25%
    let alpha;
    if (progress < 0.15) alpha = progress / 0.15;
    else if (progress > 0.75) alpha = (1 - progress) / 0.25;
    else alpha = 1;

    const floatY = pop.baseY - progress * FLOAT_HEIGHT;
    const iconSize = pop.size;
    const cx = pop.x;
    const cy = floatY;

    // glow
    const pulse = (Math.sin(progress * Math.PI * 5) + 1) * 0.5;
    const glowR = iconSize * 0.6 + pulse * 4;
    const isKey = pop.type === 'key';

    p.push();
    p.noStroke();
    for (let i = 3; i >= 1; i--) {
      const r = glowR + i * 5;
      const a = alpha * (40 - i * 8);
      if (isKey) p.fill(255, 210, 50, a);
      else p.fill(170, 210, 255, a);
      p.ellipse(cx, cy, r * 2, r * 2);
    }

    // icon
    const iconPath = ICON_PATHS[pop.type];
    const img = iconPath ? getImage(iconPath) : null;
    if (img) {
      p.push();
      p.tint(255, 255, 255, alpha * 255);
      p.image(img, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize);
      p.pop();
    } else {
      // fallback: colored circle with letter
      if (isKey) p.fill(255, 210, 50, alpha * 220);
      else p.fill(170, 210, 255, alpha * 220);
      p.ellipse(cx, cy, iconSize * 0.6, iconSize * 0.6);
      p.fill(0, 0, 0, alpha * 200);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(Math.max(8, iconSize * 0.35));
      p.text(isKey ? 'K' : 'N', cx, cy);
    }

    // text label
    const label = isKey ? 'KEY' : 'NOTE';
    const fontSize = Math.max(7, iconSize * 0.28);
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(fontSize);
    p.fill(0, 0, 0, alpha * 160);
    p.text(label, cx + 1, cy + iconSize / 2 + 3);
    if (isKey) p.fill(255, 230, 120, alpha * 255);
    else p.fill(200, 230, 255, alpha * 255);
    p.text(label, cx, cy + iconSize / 2 + 2);

    p.pop();
  }
}

export function clearLootPopups() {
  popups.length = 0;
}
