import { getAssetState } from '../core/assetLoader.js';
import { renderMap } from './mapRenderer_p5.js';
import { renderEntities } from './entityRenderer_p5.js';
import { renderLightingOverlay } from './lightingRenderer_p5.js';
import { renderPauseScreen } from '../states/pauseScreen.js';

export function renderScene(p, state, overlaySystem) {
  const showWorld = state.screen === 'playing' || state.screen === 'pause';
  if (showWorld) {
    p.push();
    if (state.camera) p.translate(-state.camera.x, -state.camera.y);
    renderMap(p, state);
    renderEntities(p, state);
    renderLightingOverlay(p, state);
    p.pop();
  } else {
    p.background('#0d1220');
  }

  if (showWorld) {
    renderHud(p, state);
  }
  if (state.screen === 'pause') renderPauseScreen(p, state);
  if (state.debug.showCamera && state.camera) renderCameraDebug(p, state);
  overlaySystem?.render(p, state);
}

function renderHud(p, state) {
  p.push();
  p.textAlign(p.LEFT, p.TOP);
  p.textSize(14);
  p.noStroke();

  const compactLines = [
    `Chests: ${state.meta.collected}/${state.meta.target}`,
    `Objective: ${state.meta.objective || '-'}`,
    `Prompt: ${state.prompt || '-'}`,
    `Extract: ${state.meta.exitDistanceText || '-'}`
  ];

  const panelX = 12;
  const panelY = p.height - 104;
  const panelW = Math.min(420, p.width - 24);
  const panelH = 88;
  p.fill(8, 15, 28, 165);
  p.rect(panelX, panelY, panelW, panelH, 10);

  p.fill('#ffffff');
  compactLines.forEach((line, idx) => {
    p.text(line, panelX + 12, panelY + 10 + idx * 18);
  });

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

  if (state.debug.showCamera || state.debug.showCollision || state.debug.showRooms || state.debug.showVision) {
    const assets = getAssetState();
    const debugLines = [
      `Time: ${(state.meta.elapsedMs / 1000).toFixed(1)}s`,
      `Assets: ${assets.imageCount}/${assets.requestedCount}${assets.failedCount ? ` fb ${assets.failedCount}` : ''}`,
      `Track: ${state.audio.currentTrack || '-'}${state.audio.muted ? ' (muted)' : ''}`,
      `Camera: ${Math.round(state.camera?.x || 0)}, ${Math.round(state.camera?.y || 0)}`,
      'R restart | 1 2 map | B/C/V/G debug | P/Esc pause | M mute'
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
  p.stroke(248, 113, 113, 160);
  p.rect(camera.deadZoneX, camera.deadZoneY, p.width - camera.deadZoneX * 2, p.height - camera.deadZoneY * 2);
  p.pop();
}
