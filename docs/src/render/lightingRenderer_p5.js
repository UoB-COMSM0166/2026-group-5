// Lighting overlay: per-tile darkness, player reveal glow, button glow.
import { getTileDarkness } from '../systems/lightingSystem.js';

// Overlay dark rectangles on unlit tiles (viewport-culled for performance).
function drawTileDarkness(p, level, camera) {
  const tile = level.settings.baseTile;
  const matrix = level.roomSystem.matrix || [];
  if (!matrix.length) return;

  // Get visible tile bounds for culling
  const mapWidth = matrix[0]?.length || 0;
  const mapHeight = matrix.length;
  const bounds = camera.getVisibleTileBounds(tile, mapWidth, mapHeight);

  p.noStroke();
  for (let y = bounds.startRow; y < bounds.endRow; y += 1) {
    for (let x = bounds.startCol; x < bounds.endCol; x += 1) {
      const darkness = getTileDarkness(level, x, y);
      if (darkness <= 0) continue;
      p.fill(0, 0, 0, darkness * 255);
      p.rect(x * tile, y * tile, tile, tile);
    }
  }
}

// Draw gradient outline around room masks (0.5 tile width, inner=mask color to outer=transparent)
function drawRoomGradientOutline(p, level, matrix, roomSystem) {
  const tile = level.settings.baseTile;
  const outlineWidth = tile * 0.5;
  const baseOpacity = (level.settings.unexploredOpacity ?? 255) / 255;

  // Collect all room edge tiles
  const roomEdges = new Map(); // roomId -> Set of edge tile keys

  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      const roomId = matrix[y][x];
      if (roomId <= 1) continue;

      const room = roomSystem.rooms.get(roomId);
      if (!room || room.explored) continue;

      // Check if this tile is on the edge (adjacent to different room or empty)
      const isEdge = (
        (y === 0 || matrix[y - 1][x] !== roomId) ||
        (y === matrix.length - 1 || matrix[y + 1][x] !== roomId) ||
        (x === 0 || matrix[y][x - 1] !== roomId) ||
        (x === matrix[y].length - 1 || matrix[y][x + 1] !== roomId)
      );

      if (isEdge) {
        if (!roomEdges.has(roomId)) roomEdges.set(roomId, new Set());
        roomEdges.get(roomId).add(`${x},${y}`);
      }
    }
  }

  // Draw gradient outline for each room (reduced steps for performance)
  p.noStroke();
  const steps = 3; // Reduced from 8 to 3 for better performance

  for (const [roomId, edgeTiles] of roomEdges) {
    for (const tileKey of edgeTiles) {
      const [tx, ty] = tileKey.split(',').map(Number);
      const px = tx * tile;
      const py = ty * tile;

      // Draw gradient layers from inside out (inner=touching mask, outer=transparent)
      for (let i = 0; i <= steps; i++) {
        const t = i / steps; // 0.0 = inner (touching mask, full opacity), 1.0 = outer (transparent)
        const alpha = baseOpacity * (1 - t) * 255; // Fade from inner to transparent
        const offset = outlineWidth * t; // Expand outward from mask edge

        p.fill(0, 0, 0, alpha);

        // Check which edges need outline and draw only those sides
        const top = ty === 0 || matrix[ty - 1][tx] !== roomId;
        const bottom = ty === matrix.length - 1 || matrix[ty + 1][tx] !== roomId;
        const left = tx === 0 || matrix[ty][tx - 1] !== roomId;
        const right = tx === matrix[ty].length - 1 || matrix[ty][tx + 1] !== roomId;

        // Draw outline rectangles for each exposed edge (all touching the mask at inner layer)
        if (top) {
          p.rect(px, py - offset - outlineWidth / steps, tile, outlineWidth / steps + 1);
        }
        if (bottom) {
          p.rect(px, py + tile + offset, tile, outlineWidth / steps + 1);
        }
        if (left) {
          p.rect(px - offset - outlineWidth / steps, py, outlineWidth / steps + 1, tile);
        }
        if (right) {
          p.rect(px + tile + offset, py, outlineWidth / steps + 1, tile);
        }
      }
    }
  }
}

// Fog-of-war overlay hiding rooms the player has not yet visited (viewport-culled).
export function renderUnexploredOverlay(p, state) {
  const level = state.level;
  if (!level) return;
  const camera = state.camera;
  if (!camera) return;

  const tile = level.settings.baseTile;
  const matrix = level.roomSystem.matrix || [];
  if (!matrix.length) return;
  const roomSystem = level.roomSystem;
  const now = performance.now();
  const fadeDuration = level.settings.unexploredFadeDuration ?? 1500;

  // Get visible tile bounds for culling
  const mapWidth = matrix[0].length;
  const mapHeight = matrix.length;
  const bounds = camera.getVisibleTileBounds(tile, mapWidth, mapHeight);

  // Draw gradient outline first (behind the mask)
  drawRoomGradientOutline(p, level, matrix, roomSystem);

  p.noStroke();
  for (let y = bounds.startRow; y < bounds.endRow; y += 1) {
    for (let x = bounds.startCol; x < bounds.endCol; x += 1) {
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

}

// Draw a radial glow around the player in dark rooms.
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

// Animate a glow ring on buttons that were recently toggled.
function drawButtonsGlow(p, level) {
  for (const button of level.roomSystem.buttons) {
    if (!(button.responseGlow > 0.01)) continue;
    p.noFill();
    p.stroke(250, 204, 21, 120 * button.responseGlow);
    p.circle(button.centerX, button.centerY, 18 + button.responseGlow * 12);
    p.noStroke();
  }
}

// Compose all lighting effects: tile darkness, player reveal, button glow.
export function renderLightingOverlay(p, state) {
  const level = state.level;
  if (!level) return;
  const camera = state.camera;
  if (!camera) return;
  drawTileDarkness(p, level, camera);
  drawPlayerReveal(p, level);
  drawButtonsGlow(p, level);
}
