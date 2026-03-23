
import { getImage } from '../core/assetLoader.js';
import { SPRITE_PATHS, resolveCharacterSprite } from './spriteCatalog.js';
import { isRectVisible } from '../systems/cameraSystem.js';
import { castVisionRay } from '../systems/collisionSystem.js';
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

function drawSpriteOrRect(p, path, x, y, w, h, fillColor, radius = 2) {
  const img = path ? getImage(path) : null;
  if (img) {
    p.image(img, x, y, w, h);
    return true;
  }
  p.noStroke();
  p.fill(fillColor);
  p.rect(x, y, w, h, radius);
  return false;
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
  const leafW = tile;
  const leafH = tile * 2;
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
    p.rect(x + 2, y + 2, tile * 2 - 4, tile * 2 - 4, 2);
  }
}

function drawLineDoor(p, door, tile) {
  const px = door.x * tile;
  const py = door.y * tile;
  const w = tile;
  const h = tile * 2;
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
  p.noFill();
  p.stroke(251, 191, 36, 110);
  p.circle(npc.searchTargetX, npc.searchTargetY, 10);
  p.line(npc.searchTargetX - 4, npc.searchTargetY, npc.searchTargetX + 4, npc.searchTargetY);
  p.line(npc.searchTargetX, npc.searchTargetY - 4, npc.searchTargetX, npc.searchTargetY + 4);
  p.pop();
}



function renderLegacyNpcVision(p, npc, level) {
  const cx = npc.x + npc.w / 2;
  const cy = npc.y + npc.h / 2;
  const range = level.roomSystem.getNpcVisionRange(npc, level.settings.visionRange || 112);
  const facing = (npc.facing || 'right').toLowerCase();
  const heading = facing === 'left' ? Math.PI : facing === 'up' ? -Math.PI / 2 : facing === 'down' ? Math.PI / 2 : 0;
  const spread = Math.PI / 3.4;
  p.push();
  p.noStroke();
  p.fill(255, 0, 0, npc.state === 'CHASE' ? 48 : 28);
  p.beginShape();
  p.vertex(cx, cy);
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const a = heading - spread / 2 + (spread * i) / steps;
    const hit = castVisionRay(level, cx, cy, a, range, level.settings.baseTile || 16, 4);
    p.vertex(hit.x, hit.y);
  }
  p.endShape(p.CLOSE);
  p.pop();
}

function renderLegacyActor(p, actor, color) {
  const descriptor = resolveCharacterSprite(actor.characterType === 'npc' ? 'npc' : 'player', 'default', 'idle', actor.facing || 'down');
  const facing = (actor.facing || 'down').toLowerCase();
  const directional = descriptor?.directional?.[facing] ? getImage(descriptor.directional[facing]) : null;
  if (directional) {
    drawDirectionalWithFixedHeight(p, directional, actor.x, actor.y, actor.w, actor.h, 32, 0);
    return;
  }
  const w = 16;
  const h = 24;
  const drawX = actor.x + actor.w / 2 - w / 2;
  const drawY = actor.y + actor.h - h;
  p.push();
  p.noStroke();
  p.fill(color);
  p.rect(drawX, drawY, w, h, 3);
  p.fill(34);
  if (facing === 'left') p.rect(drawX + 1, drawY + 8, 3, 3, 1);
  else if (facing === 'right') p.rect(drawX + w - 4, drawY + 8, 3, 3, 1);
  else if (facing === 'up') p.rect(drawX + 6, drawY + 1, 3, 3, 1);
  else p.rect(drawX + 6, drawY + h - 4, 3, 3, 1);
  p.pop();
}

function renderLegacyMap1Overlays(p, state, level, tile, camera) {
  const nearestDoor = state.nearestDoor;
  const nearestChest = state.nearestChest;
  const nearestLightButton = state.nearestLightButton;

  for (const button of level.roomSystem.buttons || []) {
    const worldX = button.x * tile;
    const worldY = button.y * tile;
    if (!isRectVisible(camera, worldX, worldY, tile, tile, 16)) continue;
    const lit = level.roomSystem.isLit(button.roomId);
    p.noStroke();
    p.fill(lit ? 'rgba(80,220,120,0.45)' : 'rgba(80,160,255,0.55)');
    p.rect(worldX + 2, worldY + 2, tile - 4, tile - 4, 2);
    p.noFill();
    p.stroke(nearestLightButton && nearestLightButton.x === button.x && nearestLightButton.y === button.y ? '#ffffff' : 'rgba(255,255,255,0.55)');
    p.strokeWeight(nearestLightButton && nearestLightButton.x === button.x && nearestLightButton.y === button.y ? 1.5 : 1);
    p.rect(worldX + 1, worldY + 1, tile - 2, tile - 2, 2);
    p.noStroke();
  }

  for (const door of level.doorSystem.doors) {
    const worldX = door.x * tile;
    const worldY = door.y * tile;
    const width = door.kind === 'line' ? tile : tile * 2;
    if (!isRectVisible(camera, worldX, worldY, width, tile * 2, 24)) continue;
    if (!door.open) continue;
    p.noStroke();
    p.fill(80, 200, 255, 72);
    if (door.kind === 'line') {
      p.rect(worldX, worldY, tile, tile * 2);
    } else {
      p.rect(worldX, worldY, tile * 2, tile * 2);
    }
    p.stroke(120, 230, 255, 200);
    p.strokeWeight(1);
    if (door.kind === 'line') {
      p.rect(worldX + 1, worldY + 1, tile - 2, tile * 2 - 2);
    } else {
      p.rect(worldX + 1, worldY + 1, tile * 2 - 2, tile * 2 - 2);
    }
    p.noStroke();
  }

  for (const chest of level.boxSystem.boxes) {
    const worldX = chest.x * tile;
    const worldY = chest.y * tile;
    if (!isRectVisible(camera, worldX, worldY, tile, tile, 24)) continue;
    p.strokeWeight(1);
    if (chest.opened) {
      p.fill(255, 220, 120, 52);
      p.stroke(255, 220, 120, 240);
    } else {
      p.fill(255, 180, 40, 46);
      p.stroke(255, 180, 40, 240);
    }
    p.rect(worldX, worldY, tile, tile);
    if (chest.opened) {
      p.line(worldX + 3, worldY + 8, worldX + 7, worldY + 12);
      p.line(worldX + 7, worldY + 12, worldX + 13, worldY + 4);
    }
    p.noStroke();
  }

  if (nearestDoor) {
    p.noFill();
    p.stroke(255,255,255,242);
    p.strokeWeight(1);
    for (const t of nearestDoor.tiles) {
      p.rect(t.x * tile + 1, t.y * tile + 1, tile - 2, tile - 2);
    }
    p.noStroke();
  }

  if (nearestChest) {
    p.noFill();
    p.stroke(255,255,255,242);
    p.strokeWeight(1);
    p.rect(nearestChest.x * tile + 1, nearestChest.y * tile + 1, tile - 2, tile - 2);
    p.noStroke();
  }
}

export function renderEntities(p, state) {
  const level = state.level;
  if (!level) return;
  const tile = level.settings.baseTile;

  const camera = state.camera || { x: 0, y: 0, width: p.width, height: p.height };

  if (level.id === 'map1') {
    for (const npc of level.npcs) {
      if (!isRectVisible(camera, npc.x - 16, npc.y - 24, 40, 40, 96)) continue;
      renderLegacyNpcVision(p, npc, level);
    }
    renderLegacyMap1Overlays(p, state, level, tile, camera);
  } else for (const door of level.doorSystem.doors) {
    const worldX = door.x * tile;
    const worldY = door.y * tile;
    if (!isRectVisible(camera, worldX, worldY, door.kind === 'line' ? tile : tile * 2, tile * 2, 32)) continue;
    if (door.kind === 'line') drawLineDoor(p, door, tile);
    else drawDoubleDoor(p, door, tile);
  }

  if (level.id !== 'map1') for (const chest of level.boxSystem.boxes) {
    const worldX = chest.x * tile;
    const worldY = chest.y * tile;
    if (!isRectVisible(camera, worldX, worldY, chest.w * tile, chest.h * tile, 24)) continue;
    drawChest(p, chest, tile);
  }
  if (level.id !== 'map1' && level.missionSystem?.exit) {
    const exit = level.missionSystem.exit;
    if (isRectVisible(camera, exit.x, exit.y, exit.w, exit.h, 64)) drawExitBeacon(p, level.missionSystem, tile);
  }

  if (level.id !== 'map1') for (const button of level.roomSystem.buttons) {
    if (!isRectVisible(camera, button.centerX - 10, button.centerY - 10, 20, 20, 16)) continue;
    renderButton(p, level, button);
  }

  for (const npc of level.npcs) {
    if (!isRectVisible(camera, npc.x, npc.y, npc.w, npc.h, 64)) continue;
    if (level.id === 'map1') {
      renderLegacyActor(p, npc, npc.state === 'CHASE' ? '#a7f35d' : '#a7f35d');
      if (npc.state === 'SEARCH') renderSearchMarker(p, npc);
      continue;
    }
    const descriptor = resolveCharacterSprite('npc', npc.characterVariant || 'patrol', npc.anim?.mode || 'idle', npc.facing || 'down');
    drawResolvedCharacter(
      p,
      descriptor,
      npc,
      npc.x,
      npc.y,
      npc.w,
      npc.h,
      npc.state === 'CHASE' ? '#fb7185' : npc.state === 'SEARCH' ? '#f59e0b' : npc.state === 'RETURN' ? '#60a5fa' : '#ef4444'
    );
    if (state.debug.showVision) {
      p.noFill();
      p.stroke('#f87171');
      const range = level.roomSystem.getNpcVisionRange(npc, level.settings.visionRange || 112);
      p.circle(npc.x + npc.w / 2, npc.y + npc.h / 2, range * 2);
      p.noStroke();
      if (npc.state === 'SEARCH') renderSearchMarker(p, npc);
    }
  }

  if (isRectVisible(camera, level.player.x, level.player.y, level.player.w, level.player.h, 64)) {
    if (level.id === 'map1') renderLegacyActor(p, level.player, '#ffd966');
    else {
      const descriptor = resolveCharacterSprite('player', level.player.characterVariant || 'default', level.player.anim?.mode || 'idle', level.player.facing || 'down');
      drawResolvedCharacter(p, descriptor, level.player, level.player.x, level.player.y, level.player.w, level.player.h, level.player.color);
    }
  }
}
