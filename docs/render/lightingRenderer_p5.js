// Lighting overlay: per-tile darkness, player reveal glow, button glow, room debug.
import { getTileDarkness } from '../systems/lightingSystem.js';

function drawTileDarkness(p, level) {
  const tile = level.settings.baseTile;
  const matrix = level.roomSystem.matrix || [];
  p.noStroke();
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      const darkness = getTileDarkness(level, x, y);
      if (darkness <= 0) continue;
      p.fill(0, 0, 0, darkness * 255);
      p.rect(x * tile, y * tile, tile, tile);
    }
  }
}

// Unexplored room overlay (drawn on top of everything)
export function renderUnexploredOverlay(p, state) {
  const level = state.level;
  if (!level) return;

  const tile = level.settings.baseTile;
  const matrix = level.roomSystem.matrix || [];
  const roomSystem = level.roomSystem;
  const now = performance.now();
  const fadeDuration = level.settings.unexploredFadeDuration ?? 1500;

  p.noStroke();
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      const roomId = matrix[y][x];
      if (roomId <= 1) continue;

      const room = roomSystem.rooms.get(roomId);
      if (!room) continue;

      if (room.explored) {
        if (!room.exploredAt) continue;
        const elapsed = now - room.exploredAt;
        if (elapsed >= fadeDuration) continue;

        const progress = elapsed / fadeDuration;
        const baseOpacity = level.settings.unexploredOpacity ?? 255;
        const opacity = Math.floor(baseOpacity * (1 - progress));
        if (opacity <= 0) continue;

        p.fill(0, 0, 0, opacity);
      } else {
        const opacity = level.settings.unexploredOpacity ?? 255;
        p.fill(0, 0, 0, opacity);
      }

      const px = Math.floor(x * tile);
      const py = Math.floor(y * tile);
      p.rect(px, py, tile + 1, tile + 1);
    }
  }
  
  if (state.debug.showExploration) {
    p.noFill();
    p.stroke(255, 0, 255, 120);
    p.strokeWeight(2);
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        const roomId = matrix[y][x];
        if (roomId <= 1) continue;
        const explored = roomSystem.isExplored(roomId);
        if (!explored) {
          p.rect(x * tile, y * tile, tile, tile);
        }
      }
    }
    p.strokeWeight(1);
  }
}

function drawPlayerReveal(p, level) {
  const roomId = level.roomSystem.getActorRoomId(level.player);
  if (level.roomSystem.isLit(roomId)) return;
  const cx = level.player.x + level.player.w / 2;
  const cy = level.player.y + level.player.h / 2;
  const maxR = (level.settings.baseTile || 16) * 4.6;
  p.noStroke();
  for (let i = 7; i >= 1; i -= 1) {
    const t = i / 7;
    const r = maxR * t;
    p.fill(255, 244, 200, 11 * (1 - t));
    p.circle(cx, cy, r * 2);
  }
}

function drawRoomDebug(p, level) {
  const tile = level.settings.baseTile;
  const matrix = level.roomSystem.matrix || [];
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(9);
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      const roomId = matrix[y][x] || 1;
      if (roomId <= 1) continue;
      p.noFill();
      p.stroke(96, 165, 250, 60);
      p.rect(x * tile, y * tile, tile, tile);
      p.noStroke();
      p.fill(191, 219, 254, 80);
      p.text(String(roomId), x * tile + tile / 2, y * tile + tile / 2 + 1);
    }
  }
}

function drawButtonsGlow(p, level) {
  for (const button of level.roomSystem.buttons) {
    if (!(button.responseGlow > 0.01)) continue;
    p.noFill();
    p.stroke(250, 204, 21, 120 * button.responseGlow);
    p.circle(button.centerX, button.centerY, 18 + button.responseGlow * 12);
    p.noStroke();
  }
}

export function renderLightingOverlay(p, state) {
  const level = state.level;
  if (!level) return;
  drawTileDarkness(p, level);
  drawPlayerReveal(p, level);
  drawButtonsGlow(p, level);
  if (state.debug.showRooms) drawRoomDebug(p, level);
}
