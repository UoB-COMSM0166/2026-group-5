// Top-level render: composes map, lighting, entities, HUD, and screen overlays.
import { renderMap } from './mapRenderer_p5.js';
import { renderEntities, renderDoorInteractionPrompts, renderButtonInteractionPrompts, renderChestInteractionPrompts } from './entityRenderer_p5.js';
import { renderLightingOverlay, renderUnexploredOverlay } from './lightingRenderer_p5.js';

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
  p.textSize(14);
  p.noStroke();

  // Chest counter moved to HTML - see index.html

  if (state.ui.message) {
    const msgW = Math.min(420, p.width - 32);
    const msgX = (p.width - msgW) / 2;
    p.fill(8, 15, 28, 190);
    p.rect(msgX, 12, msgW, 28, 8);
    p.fill('#fef3c7');
    p.textAlign(p.CENTER, p.TOP);
    p.text(state.ui.message, p.width / 2, 18);
  }

  if (state.meta.detectedBy) {
    const warnW = 220;
    p.fill(90, 18, 30, 205);
    p.rect(p.width - warnW - 12, 12, warnW, 28, 8);
    p.fill('#fecaca');
    p.textAlign(p.CENTER, p.TOP);
    p.text(`Detected by: ${state.meta.detectedBy}`, p.width - warnW / 2 - 12, 18);
  }

  p.pop();
}


