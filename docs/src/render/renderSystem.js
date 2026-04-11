// Top-level render: composes map, lighting, entities, HUD, and screen overlays.
import { getAssetState, getImage } from '../core/assetLoader.js';
import { SPRITE_PATHS } from './spriteCatalog.js';
import { renderMap } from './mapRenderer_p5.js';
import { renderEntities, renderDoorInteractionPrompts, renderButtonInteractionPrompts } from './entityRenderer_p5.js';
import { renderLightingOverlay, renderUnexploredOverlay } from './lightingRenderer_p5.js';
import { renderPauseScreen } from '../states/pauseScreen.js';

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
  if (state.screen === 'pause') renderPauseScreen(p, state);
  if (state.debug.showCamera && state.camera) renderCameraDebug(p, state);
  overlaySystem?.render(p, state);
}

function renderWorldUi(p, state) {
  // Draw world-space UI on top of black mask (E-key prompts for doors and buttons)
  renderDoorInteractionPrompts(p, state.level);
  renderButtonInteractionPrompts(p, state.level);
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

  if (state.debug.showCamera || state.debug.showCollision || state.debug.showRooms) {
    const assets = getAssetState();
    const debugLines = [
      `Time: ${(state.meta.elapsedMs / 1000).toFixed(1)}s`,
      `Assets: ${assets.imageCount}/${assets.requestedCount}${assets.failedCount ? ` fb ${assets.failedCount}` : ''}`,
      `Track: ${state.audio.currentTrack || '-'}${state.audio.muted ? ' (muted)' : ''}`,
      `Camera: ${Math.round(state.camera?.x || 0)}, ${Math.round(state.camera?.y || 0)} Z:${state.camera?.zoom?.toFixed(2) || '1.00'}`,
      'R restart | 1 2 3 map | B/C/G debug | P/Esc pause | M mute | Wheel zoom'
    ];
    const dbgW = Math.min(440, p.width - 24);
    const dbgH = 104;
    p.fill(8, 15, 28, 150);
    p.rect(12, 12, dbgW, dbgH, 10);
    p.fill('#93c5fd');
    p.textAlign(p.LEFT, p.TOP);
    debugLines.forEach((line, idx) => {
      p.text(line, 24, 22 + idx * 18);
    });
  }

  p.pop();
}

function renderCameraDebug(p, state) {
  const camera = state.camera;
  if (!camera) return;
  p.push();
  p.noFill();
  p.stroke(96, 165, 250);
  p.rect(1, 1, p.width - 2, p.height - 2);
  
  // Show dead zone with zoom consideration
  const effectiveDeadZoneX = camera.deadZoneX / camera.zoom;
  const effectiveDeadZoneY = camera.deadZoneY / camera.zoom;
  const effectiveWidth = camera.width / camera.zoom;
  const effectiveHeight = camera.height / camera.zoom;
  p.stroke(248, 113, 113, 160);
  p.rect(effectiveDeadZoneX, effectiveDeadZoneY, effectiveWidth - effectiveDeadZoneX * 2, effectiveHeight - effectiveDeadZoneY * 2);
  
  // Show zoom level
  p.fill(96, 165, 250);
  p.noStroke();
  p.textAlign(p.LEFT, p.TOP);
  p.text(`Zoom: ${camera.zoom.toFixed(2)}x`, 10, p.height - 25);
  p.pop();
}
