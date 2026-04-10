// Entity renderer: draws doors, chests, buttons, NPCs, player, footsteps.
import { getImage } from '../core/assetLoader.js';
import { SPRITE_PATHS, resolveCharacterSprite } from './spriteCatalog.js';
import { isRectVisible } from '../systems/cameraSystem.js';
import { ensureAnimState, getFrameRect } from '../systems/animationSystem.js';
import { getInteractionPrompt } from '../systems/interactionSystem.js';


function drawDirectionalWithFixedHeight(p, img, x, y, anchorW, anchorH, fixedH = 32, bob = 0) {
  if (!img) return false;
  const ratio = (img.width && img.height) ? img.width / img.height : 1;
  const drawH = fixedH;
  const drawW = Math.max(1, drawH * ratio);
  const drawX = x + anchorW / 2 - drawW / 2;
  const drawY = y + anchorH - drawH;
  p.push();
  p.translate(0, bob || 0);
  p.image(img, drawX, drawY, drawW, drawH);
  p.pop();
  return true;
}

function drawResolvedCharacter(p, descriptor, entity, x, y, w, h, fillColor) {
  const anim = ensureAnimState(entity, { facing: entity.facing || 'down', frameCount: 4, variant: entity.characterVariant || 'default' });
  const sheet = descriptor?.sheet ? getImage(descriptor.sheet) : null;
  if (sheet) {
    const rect = getFrameRect(sheet, anim, { frameCount: 4, rows: 4 });
    p.push();
    p.translate(0, anim.bob || 0);
    p.image(sheet, x, y, w, h, rect.sx, rect.sy, rect.sw, rect.sh);
    p.pop();
    return true;
  }

  const directional = descriptor?.directional?.[anim.facing || 'down'] ? getImage(descriptor.directional[anim.facing || 'down']) : null;
  if (directional) {
    return drawDirectionalWithFixedHeight(p, directional, x, y, w, h, 32, anim.bob || 0);
  }

  const fallbackSheet = descriptor?.fallbackSheet ? getImage(descriptor.fallbackSheet) : null;
  if (fallbackSheet) {
    const rect = getFrameRect(fallbackSheet, anim, { frameCount: 4, rows: 4 });
    p.push();
    p.translate(0, anim.bob || 0);
    p.image(fallbackSheet, x, y, w, h, rect.sx, rect.sy, rect.sw, rect.sh);
    p.pop();
    return true;
  }

  const fallbackSingle = descriptor?.fallbackSingle ? getImage(descriptor.fallbackSingle) : null;
  if (fallbackSingle) {
    p.push();
    p.translate(0, anim.bob || 0);
    p.image(fallbackSingle, x, y, w, h);
    p.pop();
    return true;
  }

  p.push();
  p.translate(0, anim.bob || 0);
  p.noStroke();
  p.fill(fillColor);
  p.rect(x, y, w, h, 3);
  p.fill(255, 255, 255, 60);
  if (anim.mode === 'walk' || anim.mode === 'alert') {
    const stride = (anim.frame === 1 ? -2 : anim.frame === 2 ? 2 : 0);
    p.rect(x + 4, y + h - 7, 5, 5 + Math.abs(stride), 2);
    p.rect(x + w - 9, y + h - 7, 5, 5 + Math.abs(stride), 2);
  } else if (anim.mode === 'interact') {
    p.rect(x + w - 10, y + 4, 6, 6, 2);
  }
  p.pop();
  return false;
}

// Single panel: the whole door image slides in slideDir.
// Clipped to original bounding box so the door disappears under adjacent walls.
function drawSingleDoor(p, door, tile) {
  const x = door.x * tile;
  const y = door.y * tile;
  const doorW = (door.w || 1) * tile;
  const doorH = (door.h || 2) * tile;
  const ox = door.slideOffsetX || 0;
  const oy = door.slideOffsetY || 0;
  const img = getImage(SPRITE_PATHS.door.slide);
  if (!img) return;

  const ctx = p.drawingContext;
  ctx.save();
  ctx.beginPath();
  // Clip to original bounding box so the door disappears under adjacent walls when sliding
  ctx.rect(x, y, doorW, doorH);
  ctx.clip();
  p.image(img, x + ox, y + oy, doorW, doorH);
  ctx.restore();
}

// Double panel: always split left / right. Each half clipped to its side.
function drawDoubleDoor(p, door, tile) {
  const x = door.x * tile;
  const y = door.y * tile;
  const doorW = (door.w || 2) * tile;
  const doorH = (door.h || 2) * tile;
  const halfW = doorW / 2;
  const imgA = getImage(SPRITE_PATHS.door.doubleA) || getImage(SPRITE_PATHS.door.slide);
  const imgB = getImage(SPRITE_PATHS.door.doubleB) || getImage(SPRITE_PATHS.door.slide);
  if (!imgA && !imgB) return;
  const pA = door.panelA || { ox: 0, oy: 0 };
  const pB = door.panelB || { ox: 0, oy: 0 };
  const ctx = p.drawingContext;

  // Panel A (left half) — clips to left side of bounding box
  if (imgA) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, halfW, doorH);
    ctx.clip();
    p.image(imgA, x + pA.ox, y, halfW, doorH, 0, 0, imgA.width / 2, imgA.height);
    ctx.restore();
  }
  // Panel B (right half) — clips to right side of bounding box
  if (imgB) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + halfW, y, halfW, doorH);
    ctx.clip();
    p.image(imgB, x + halfW + pB.ox, y, halfW, doorH, imgB.width / 2, 0, imgB.width / 2, imgB.height);
    ctx.restore();
  }
}

function drawChest(p, chest, tile) {
  const rw = (chest.renderW || chest.w) * tile;
  const rh = (chest.renderH || chest.h) * tile;
  const px = chest.x * tile + (chest.renderOffsetX || 0) * tile;
  const py = chest.y * tile + (chest.renderOffsetY || 0) * tile;

  // Use closed or open image based on chest state
  const imgPath = chest.opened ? SPRITE_PATHS.chest.open : SPRITE_PATHS.chest.closed;
  const img = getImage(imgPath);

  if (img) {
    p.image(img, px, py, rw, rh);
  } else {
    // Fallback: simple colored rectangle
    p.noStroke();
    p.fill(chest.opened ? '#d4b14d' : '#8b5a2b');
    p.rect(px + 1, py + 1, rw - 2, rh - 2, 3);
  }
}


function drawExitBeacon(p, missionSystem, tile) {
  const exit = missionSystem?.exit;
  if (!exit) return;
  const cx = exit.x + exit.w / 2;
  const cy = exit.y + exit.h / 2;
  const pulse = (Math.sin(exit.pulse || 0) + 1) * 0.5;
  const size = tile * (exit.unlocked ? 0.78 : 0.58);
  p.push();
  p.translate(cx, cy);
  p.noStroke();
  p.fill(exit.unlocked ? 34 : 71, exit.unlocked ? 197 : 85, exit.unlocked ? 94 : 105, exit.unlocked ? 110 + pulse * 70 : 60);
  p.circle(0, 0, size + pulse * (exit.unlocked ? 10 : 4));
  p.rotate((exit.pulse || 0) * 0.6);
  p.fill(exit.unlocked ? '#86efac' : '#94a3b8');
  p.quad(0, -size * 0.55, size * 0.55, 0, 0, size * 0.55, -size * 0.55, 0);
  if (exit.unlocked) {
    p.fill(255, 255, 255, 180);
    p.rect(-2, -size * 0.62 - 8, 4, 12, 2);
    p.triangle(0, -size * 0.62 - 16, -6, -size * 0.62 - 6, 6, -size * 0.62 - 6);
  } else {
    p.fill(15, 23, 42, 220);
    p.rect(-5, -4, 10, 10, 2);
  }
  p.pop();
}

function renderButton(p, level, button) {
  const lit = level.roomSystem.isLit(button.roomId);
  const glow = button.responseGlow || 0;

  const path = lit ? SPRITE_PATHS.button.on : SPRITE_PATHS.button.off;
  const img = getImage(path);
  if (img) {
    p.image(img, button.centerX - 8 - glow * 2, button.centerY - 8 - glow * 2, 16 + glow * 4, 16 + glow * 4);
    return;
  }
  p.noStroke();
  p.fill(lit ? '#22c55e' : '#ef4444');
  p.circle(button.centerX, button.centerY, 8 + glow * 5);
}

function renderSearchMarker(p, npc) {
  if (!npc.searchTargetX || !npc.searchTargetY) return;
  p.push();
  p.noStroke();
  p.fill(245, 158, 11, 210);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(14);
  p.text('?', npc.searchTargetX, npc.searchTargetY - 1);
  p.pop();
}

function renderNpcAlertBar(p, npc) {
  const levelValue = Math.max(0, Math.min(1, (npc.alertLevel || 0) / 100));
  const width = Math.max(18, npc.w + 8);
  const x = npc.x + npc.w / 2 - width / 2;
  const y = npc.y - 22;
  p.push();
  p.noStroke();
  p.fill(15, 23, 42, 180);
  p.rect(x, y, width, 4, 2);
  if (levelValue > 0.001) {
    const red = npc.state === 'CHASE' ? 251 : npc.state === 'SEARCH' ? 245 : 248;
    const green = npc.state === 'CHASE' ? 113 : npc.state === 'SEARCH' ? 158 : 180;
    const blue = npc.state === 'CHASE' ? 133 : npc.state === 'SEARCH' ? 11 : 80;
    p.fill(red, green, blue, 230);
    p.rect(x, y, width * levelValue, 4, 2);
  }
  p.pop();
}

function renderFootsteps(p, level) {
  const footsteps = level.player?.footsteps || [];
  if (!footsteps.length) return;
  const now = Date.now();
  const lifetime = level.settings.footstepLifetime || 3000;
  p.push();
  p.noStroke();
  for (const footstep of footsteps) {
    const age = now - footstep.timestamp;
    const t = Math.min(1, age / lifetime);
    const alpha = (1 - t) * (1 - t) * 140;
    const size = 3 * (1 - t * 0.2);
    p.fill(255, 244, 160, alpha);
    p.circle(footstep.x, footstep.y, size * 2);
  }
  p.pop();
}

// Render E-key interaction hints at doors when player is nearby
export function renderDoorInteractionPrompts(p, level) {
  const prompt = getInteractionPrompt(level);
  if (!prompt || prompt.type !== 'door') return;

  const door = prompt.entity;
  const tile = level.settings.baseTile;

  // Don't show prompt if doorway is blocked
  const blockedByPlayer = isActorOnDoorTiles(level.player, door, tile);
  const blockedByNpc = (level.npcs || []).some((npc) => isActorOnDoorTiles(npc, door, tile));
  if (blockedByPlayer || blockedByNpc) return;

  const x = door.x * tile;
  const y = door.y * tile;
  const w = (door.w || 2) * tile;
  const h = (door.h || 2) * tile;
  const centerX = x + w / 2;
  const topY = y - 8; // Slightly above the door

  p.push();
  // Draw key background
  p.noStroke();
  p.fill(15, 23, 42, 200);
  p.rect(centerX - 12, topY - 14, 24, 20, 4);
  // Draw 'E' text
  p.fill(255, 255, 255, 240);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(12);
  p.textStyle(p.BOLD);
  p.text('E', centerX, topY - 4);
  // Optional: draw action text below
  p.textStyle(p.NORMAL);
  p.textSize(8);
  p.fill(255, 255, 255, 180);
  const actionText = door.state === 'OPEN' ? 'Close' : door.state === 'LOCKED' ? 'Unlock' : 'Open';
  p.text(actionText, centerX, topY + 10);
  p.pop();
}

// Render E-key interaction hints at light buttons when player is nearby
export function renderButtonInteractionPrompts(p, level) {
  const prompt = getInteractionPrompt(level);
  if (!prompt || prompt.type !== 'light') return;

  const button = prompt.entity;
  const tile = level.settings.baseTile;

  const centerX = (button.x + 0.5) * tile;
  const topY = button.y * tile - 8; // Slightly above the button

  p.push();
  // Draw key background
  p.noStroke();
  p.fill(15, 23, 42, 200);
  p.rect(centerX - 12, topY - 14, 24, 20, 4);
  // Draw 'E' text
  p.fill(255, 255, 255, 240);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(12);
  p.textStyle(p.BOLD);
  p.text('E', centerX, topY - 4);
  // Draw action text below
  p.textStyle(p.NORMAL);
  p.textSize(8);
  p.fill(255, 255, 255, 180);
  const isLit = level.roomSystem.isLit(button.roomId);
  const actionText = isLit ? 'Lights off' : 'Lights on';
  p.text(actionText, centerX, topY + 10);
  p.pop();
}

// Helper: Check if actor is on door tiles
function isActorOnDoorTiles(actor, door, tileSize) {
  const left = Math.floor(actor.x / tileSize);
  const right = Math.floor((actor.x + actor.w - 1) / tileSize);
  const top = Math.floor(actor.y / tileSize);
  const bottom = Math.floor((actor.y + actor.h - 1) / tileSize);
  return door.tiles.some(t => t.x >= left && t.x <= right && t.y >= top && t.y <= bottom);
}



export function renderEntities(p, state) {
  const level = state.level;
  if (!level) return;
  const tile = level.settings.baseTile;

  const camera = state.camera || { x: 0, y: 0, width: p.width, height: p.height };

  for (const door of level.doorSystem.doors) {
    const worldX = door.x * tile;
    const worldY = door.y * tile;
    const worldW = (door.w || 2) * tile;
    const worldH = (door.h || 2) * tile;
    if (!isRectVisible(camera, worldX, worldY, worldW, worldH, 48)) continue;
    if (door.panels === 'double') drawDoubleDoor(p, door, tile);
    else drawSingleDoor(p, door, tile);
  }

  if (level.missionSystem?.exit) {
    const exit = level.missionSystem.exit;
    if (isRectVisible(camera, exit.x, exit.y, exit.w, exit.h, 64)) drawExitBeacon(p, level.missionSystem, tile);
  }

  for (const button of level.roomSystem.buttons) {
    if (!isRectVisible(camera, button.centerX - 10, button.centerY - 10, 20, 20, 16)) continue;
    renderButton(p, level, button);
  }

  renderFootsteps(p, level);

  for (const npc of level.npcs) {
    if (!isRectVisible(camera, npc.x, npc.y, npc.w, npc.h, 64)) continue;
    const vision = npc.vision;
    if (vision?.points?.length) {
      const alpha = npc.state === 'CHASE' ? 52 : npc.state === 'SEARCH' ? 36 : 24;
      const strokeColor = [248, 113, 113, 150];
      const fillColor = [248, 113, 113, alpha];
      p.fill(...fillColor);
      p.stroke(...strokeColor);
      p.beginShape();
      p.vertex(vision.origin.x, vision.origin.y);
      for (const point of vision.points) p.vertex(point.x, point.y);
      p.endShape(p.CLOSE);
      p.noStroke();
    }
    if (npc.state === 'SEARCH') renderSearchMarker(p, npc);
    const descriptor = resolveCharacterSprite('npc', npc.characterVariant || 'patrol', npc.anim?.mode || 'idle', npc.facing || 'down');
    drawResolvedCharacter(
      p,
      descriptor,
      npc,
      npc.x,
      npc.y,
      npc.w,
      npc.h,
      npc.state === 'CHASE' ? '#fb7185' : npc.state === 'SEARCH' ? '#f59e0b' : '#ef4444'
    );
    renderNpcAlertBar(p, npc);
  }

  // Render chests first (ground layer), then characters on top
  for (const chest of level.boxSystem.boxes) {
    const rw = (chest.renderW || chest.w) * tile;
    const rh = (chest.renderH || chest.h) * tile;
    const rx = chest.x * tile + (chest.renderOffsetX || 0) * tile;
    const ry = chest.y * tile + (chest.renderOffsetY || 0) * tile;
    if (!isRectVisible(camera, rx, ry, rw, rh, 24)) continue;
    drawChest(p, chest, tile);
  }

  if (isRectVisible(camera, level.player.x, level.player.y, level.player.w, level.player.h, 64)) {
    const descriptor = resolveCharacterSprite('player', level.player.characterVariant || 'default', level.player.anim?.mode || 'idle', level.player.facing || 'down');
    drawResolvedCharacter(p, descriptor, level.player, level.player.x, level.player.y, level.player.w, level.player.h, level.player.color);
  }
}
