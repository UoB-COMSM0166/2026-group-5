// Top-level render: composes map, lighting, entities, HUD, and screen overlays.
import { renderMap } from './mapRenderer_p5.js';
import { renderEntities, renderDoorInteractionPrompts, renderButtonInteractionPrompts, renderChestInteractionPrompts } from './entityRenderer_p5.js';
import { renderLightingOverlay, renderUnexploredOverlay } from './lightingRenderer_p5.js';
import { getImage } from '../core/assetLoader.js';
import { setFont, FONTS } from '../utils/fonts.js';

const MESSAGE_MAX_WIDTH = 620;
const MESSAGE_PADDING_X = 18;
const MESSAGE_HEIGHT = 42;
const MESSAGE_ICON_WIDTH = 38;
const MESSAGE_ICON_HEIGHT = 19;
const MESSAGE_ICON_GAP = 12;
const MESSAGE_FONT_SIZE = 11;
const MESSAGE_MIN_FONT_SIZE = 9;

// Compose the full frame: map, entities, lighting, HUD, and screen overlay.
export function renderScene(p, state, overlaySystem) {
  const showWorld = state.screen === 'playing' || state.screen === 'pause';
  if (showWorld) {
    p.push();
    if (state.camera) {
      // Apply zoom from camera center
      const zoom = state.camera.zoom || 1;
      p.translate(0, 0);
      p.scale(zoom);
      p.translate(-state.camera.x, -state.camera.y);
    }
    renderMap(p, state);
    renderLightingOverlay(p, state);
    renderEntities(p, state);
    renderUnexploredOverlay(p, state);
    // Draw world-space UI on top of black mask (E-key prompts)
    renderWorldUi(p, state);
    p.pop();
  } else {
    p.background('#0d1220');
  }

  if (showWorld) {
    renderScreenUi(p, state);
  }
  overlaySystem?.render(p, state);
}

function renderWorldUi(p, state) {
  // Draw world-space UI on top of black mask (E-key prompts for doors, buttons and chests)
  renderDoorInteractionPrompts(p, state.level, state.inventory);
  renderButtonInteractionPrompts(p, state.level);
  renderChestInteractionPrompts(p, state.level);
}

function renderScreenUi(p, state) {
  p.push();
  p.textAlign(p.LEFT, p.TOP);
  setFont(p, 14, FONTS.ui);
  p.noStroke();

  // Chest counter moved to HTML - see index.html

  if (state.ui.message) drawScreenMessage(p, state.ui.message, state.ui.messageIcon);

  if (state.meta.detectedBy) {
    const warnW = 220;
    p.fill(90, 18, 30, 205);
    p.rect(p.width - warnW - 12, 12, warnW, 28, 8);
    p.fill('#fecaca');
    p.textAlign(p.CENTER, p.TOP);
    setFont(p, 14, FONTS.ui);
    p.text(`Detected by: ${state.meta.detectedBy}`, p.width - warnW / 2 - 12, 18);
  }

  p.pop();
}

function drawScreenMessage(p, message, iconPath = null) {
  const hasIcon = Boolean(iconPath);
  const icon = hasIcon ? getImage(iconPath) : null;
  const pulse = getMessagePulse(p);
  const iconW = hasIcon ? MESSAGE_ICON_WIDTH : 0;
  const iconGap = hasIcon ? MESSAGE_ICON_GAP : 0;
  const maxW = Math.min(MESSAGE_MAX_WIDTH, p.width - 32);
  let fontSize = MESSAGE_FONT_SIZE;
  setFont(p, fontSize, FONTS.ui);
  while (
    fontSize > MESSAGE_MIN_FONT_SIZE
    && p.textWidth(message) + iconW + iconGap + MESSAGE_PADDING_X * 2 > maxW
  ) {
    fontSize -= 1;
    setFont(p, fontSize, FONTS.ui);
  }

  const textW = p.textWidth(message);
  const contentW = textW + iconW + iconGap;
  const msgY = 12;
  const centerY = msgY + MESSAGE_HEIGHT / 2;
  const contentX = (p.width - contentW) / 2;

  if (hasIcon) {
    const iconY = centerY - MESSAGE_ICON_HEIGHT / 2 - 3;
    if (icon) {
      p.imageMode(p.CORNER);
      p.push();
      p.tint(255, 244, 214, 70 + pulse * 85);
      p.image(icon, contentX - 1, iconY - 1, MESSAGE_ICON_WIDTH + 2, MESSAGE_ICON_HEIGHT + 2);
      p.pop();
      p.push();
      p.tint(0, 0, 0, 185);
      p.image(icon, contentX + 2, iconY + 2, MESSAGE_ICON_WIDTH, MESSAGE_ICON_HEIGHT);
      p.pop();
      p.image(icon, contentX, iconY, MESSAGE_ICON_WIDTH, MESSAGE_ICON_HEIGHT);
    } else {
      p.stroke(3, 6, 14, 255);
      p.strokeWeight(3);
      p.fill(254, 243, 199);
      p.rect(contentX, iconY, MESSAGE_ICON_WIDTH, MESSAGE_ICON_HEIGHT, 4);
      p.noStroke();
      p.fill(3, 6, 14);
      p.textAlign(p.CENTER, p.CENTER);
      setFont(p, 10, FONTS.ui);
      p.text('Esc', contentX + MESSAGE_ICON_WIDTH / 2, centerY);
      setFont(p, fontSize, FONTS.ui);
    }
    setFont(p, fontSize, FONTS.ui);
    p.textAlign(p.LEFT, p.CENTER);
    drawStrokedText(p, message, contentX + MESSAGE_ICON_WIDTH + MESSAGE_ICON_GAP, centerY, pulse, 'left');
    return;
  }

  setFont(p, fontSize, FONTS.ui);
  p.textAlign(p.CENTER, p.CENTER);
  drawStrokedText(p, message, p.width / 2, centerY, pulse, 'center');
}

function getMessagePulse(p) {
  const now = typeof p.millis === 'function' ? p.millis() : Date.now();
  return 0.2 + (Math.sin(now * 0.006) + 1) * 0.1;
}

function drawStrokedText(p, textValue, x, y, pulse, align = 'left') {
  p.textAlign(align === 'center' ? p.CENTER : p.LEFT, p.CENTER);
  p.stroke(254, 243, 199, 65 + pulse * 85);
  p.strokeWeight(8 + pulse * 2);
  p.fill(254, 243, 199, 90 + pulse * 55);
  p.text(textValue, x, y);
  p.stroke(3, 6, 14, 255);
  p.strokeWeight(5);
  p.fill(255, 247, 214);
  p.text(textValue, x, y);
  p.stroke(201, 45, 89, 150 + pulse * 90);
  p.strokeWeight(1 + pulse * 0.5);
  p.fill(255, 247, 214);
  p.text(textValue, x, y);
  p.noStroke();
}
