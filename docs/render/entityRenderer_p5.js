// Entity renderer: draws doors, chests, buttons, NPCs, player, footsteps.
import { getImage } from '../core/assetLoader.js';
import { SPRITE_PATHS, resolveCharacterSprite } from './spriteCatalog.js';
import { isRectVisible } from '../systems/cameraSystem.js';
import { ensureAnimState, getFrameRect } from '../systems/animationSystem.js';


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

function drawDoubleDoor(p, door, tile) {
  const x = door.x * tile;
  const y = door.y * tile;
  const doorW = (door.w || 2) * tile;
  const doorH = (door.h || 2) * tile;
  const leafW = doorW / 2;
  const leafH = doorH;
  const img = getImage(SPRITE_PATHS.door.double);

  p.push();
  p.translate(x + leafW, y);
  p.rotate(-0.95 * door.anim);
  if (img) p.image(img, -leafW, 0, leafW, leafH, 0, 0, img.width / 2, img.height);
  else {
    p.noStroke();
    p.fill('#8b7355');
    p.rect(-leafW + 1, 1, leafW - 2, leafH - 2, 2);
  }
  p.pop();

  p.push();
  p.translate(x + leafW, y);
  p.rotate(0.95 * door.anim);
  if (img) p.image(img, 0, 0, leafW, leafH, img.width / 2, 0, img.width / 2, img.height);
  else {
    p.noStroke();
    p.fill('#8b7355');
    p.rect(1, 1, leafW - 2, leafH - 2, 2);
  }
  p.pop();

  if (door.anim > 0.05) {
    p.noStroke();
    p.fill(20, 30, 50, 130 * door.anim);
    p.rect(x + 2, y + 2, doorW - 4, doorH - 4, 2);
  }
}

function drawLineDoor(p, door, tile) {
  const px = door.x * tile;
  const py = door.y * tile;
  const w = (door.w || 1) * tile;
  const h = (door.h || 2) * tile;
  const img = getImage(SPRITE_PATHS.door.line);
  p.push();
  p.translate(px + w / 2, py);
  p.rotate(door.angle || 0);
  if (img) p.image(img, -w / 2, 0, w, h);
  else {
    p.fill('#a16207');
    p.rect(-w / 2, 0, w, h, 2);
    p.stroke('#111827');
    p.line(0, 2, 0, h - 2);
    p.noStroke();
  }
  p.pop();
}

function drawChest(p, chest, tile) {
  const px = chest.x * tile;
  const py = chest.y * tile;
  const w = chest.w * tile;
  const h = chest.h * tile;
  const baseImg = getImage(SPRITE_PATHS.chest.base);
  const lidImg = getImage(SPRITE_PATHS.chest.lid);
  if (baseImg) p.image(baseImg, px + 1, py + h / 2, w - 2, h / 2 - 1);
  else {
    p.noStroke();
    p.fill('#7a4b1f');
    p.rect(px + 1, py + h / 2, w - 2, h / 2 - 1, 3);
  }

  const hingeX = px + w / 2;
  const hingeY = py + h / 2;
  p.push();
  p.translate(hingeX, hingeY);
  p.rotate(chest.angle || 0);
  if (lidImg) p.image(lidImg, -w / 2 + 1, -h / 2 + 1, w - 2, h / 2 - 2);
  else {
    p.fill(chest.opened ? '#d4b14d' : '#8b5a2b');
    p.rect(-w / 2 + 1, -h / 2 + 1, w - 2, h / 2 - 2, 3);
  }
  p.pop();

  if (chest.opened) {
    p.fill(254, 243, 199, 70 + 110 * chest.lootPulse);
    p.rect(px + 4, py + h / 2 + 2, w - 8, 5, 2);
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
  const y = npc.y - 8;
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



export function renderEntities(p, state) {
  const level = state.level;
  if (!level) return;
  const tile = level.settings.baseTile;

  const camera = state.camera || { x: 0, y: 0, width: p.width, height: p.height };

  for (const door of level.doorSystem.doors) {
    const worldX = door.x * tile;
    const worldY = door.y * tile;
    const worldW = (door.w || (door.kind === 'line' ? 1 : 2)) * tile;
    const worldH = (door.h || 2) * tile;
    if (!isRectVisible(camera, worldX, worldY, worldW, worldH, 32)) continue;
    if (door.kind === 'line') drawLineDoor(p, door, tile);
    else drawDoubleDoor(p, door, tile);
  }

  for (const chest of level.boxSystem.boxes) {
    const worldX = chest.x * tile;
    const worldY = chest.y * tile;
    if (!isRectVisible(camera, worldX, worldY, chest.w * tile, chest.h * tile, 24)) continue;
    drawChest(p, chest, tile);
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

  if (isRectVisible(camera, level.player.x, level.player.y, level.player.w, level.player.h, 64)) {
    const descriptor = resolveCharacterSprite('player', level.player.characterVariant || 'default', level.player.anim?.mode || 'idle', level.player.facing || 'down');
    drawResolvedCharacter(p, descriptor, level.player, level.player.x, level.player.y, level.player.w, level.player.h, level.player.color);
  }
}
