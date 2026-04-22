// Entity renderer: draws doors, chests, buttons, NPCs, player, footsteps.
import { getImage } from '../core/assetLoader.js';
import { SPRITE_PATHS, resolveCharacterSprite } from './spriteCatalog.js';
import { Camera } from '../systems/cameraSystem.js';
import { ensureAnimState, getFrameRect } from '../systems/animationSystem.js';
import { getInteractionPrompt } from '../systems/interactionSystem.js';
import { updateLootPopups, renderLootPopups } from '../systems/lootPopup.js';
import { NPC_SEARCH_REASON_PORTAL_CONFUSED } from '../systems/npcStateMachine.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getKeyDisplayName } from '../systems/lootTable.js';


// Draw a twinkling 4-pointed star sparkle on interactive objects.
function drawSparkles(p, x, y, w, h) {
  const t = performance.now() * 0.001;
  const alpha = (Math.sin(t * 2.3) + 1) * 0.5;
  if (alpha < 0.1) return;
  const sx = x + w * 0.8;
  const sy = y + h * 0.15;
  const outer = 2.5 + alpha * 3;
  const inner = outer * 0.25;
  p.push();
  p.stroke(0, 0, 0, alpha * 200);
  p.strokeWeight(0.8);
  // 4-pointed star shape
  p.fill(255, 215, 0, alpha * 255);
  p.beginShape();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    p.vertex(sx + Math.cos(angle) * r, sy + Math.sin(angle) * r);
  }
  p.endShape(p.CLOSE);
  p.pop();
}

// Draw a sprite image at fixed height, preserving aspect ratio.
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

function resolveDirectionalImage(descriptor, anim) {
  const facing = anim.facing || descriptor?.facing || 'down';
  const directionalFrames = descriptor?.directionalFrames?.[facing];
  if (Array.isArray(directionalFrames) && directionalFrames.length) {
    const framePath = directionalFrames[anim.frame] || directionalFrames[0];
    const frameImage = framePath ? getImage(framePath) : null;
    if (frameImage) return frameImage;
  }

  const directionalPath = descriptor?.directional?.[facing];
  return directionalPath ? getImage(directionalPath) : null;
}

// Draw a character using its sprite sheet or directional image.
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

  const directional = resolveDirectionalImage(descriptor, anim);
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

// Draw a chest with lid-opening animation and loot glow.
function drawChest(p, chest, tile, level) {
  const rw = (chest.renderW || chest.w) * tile;
  const rh = (chest.renderH || chest.h) * tile;
  const px = chest.x * tile + (chest.renderOffsetX || 0) * tile;
  const py = chest.y * tile + (chest.renderOffsetY || 0) * tile;

  // Check if room is lit - apply darkness if lights are off
  const roomId = level.roomSystem?.getRoomId(chest.x, chest.y);
  const isLit = level.roomSystem?.isLit(roomId) ?? true;

  // Use closed or open image based on chest state
  const imgPath = chest.opened ? SPRITE_PATHS.chest.open : SPRITE_PATHS.chest.closed;
  const img = getImage(imgPath);

  if (img) {
    if (!isLit) {
      p.push();
      p.tint(180, 180, 200, 200); // Apply dark tint when lights are off
    }
    p.image(img, px, py, rw, rh);
    if (!isLit) {
      p.pop();
    }
  } else {
    // Fallback: simple colored rectangle
    p.noStroke();
    if (!isLit) {
      p.fill(chest.opened ? '#6b5a3b' : '#4b3a1b'); // Darker colors when lights off
    } else {
      p.fill(chest.opened ? '#d4b14d' : '#8b5a2b');
    }
    p.rect(px + 1, py + 1, rw - 2, rh - 2, 3);
  }
}


// Draw the pulsing exit beacon when the mission is unlocked.
function drawExitBeacon(p, missionSystem, tile) {
  // Exit beacon rendering removed as requested
  // (No pulsing circles or arrows)
}

// Draw a light-switch button with lit/unlit and glow states.
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

// Draw a floating question mark at the NPC's search target.
function renderSearchMarker(p, npc) {
  const isPortalConfused = npc.searchReason === NPC_SEARCH_REASON_PORTAL_CONFUSED;
  const markerX = isPortalConfused ? (npc.x + npc.w / 2) : npc.searchTargetX;
  const markerY = isPortalConfused ? (npc.y - 9) : (npc.searchTargetY - 1);
  if (!Number.isFinite(markerX) || !Number.isFinite(markerY)) return;
  p.push();
  p.noStroke();
  p.fill(245, 158, 11, 210);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(14);
  p.text('?', markerX, markerY);
  p.pop();
}

// Draw the alert-level bar above an NPC.
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

// Draw fading footstep markers left by the player.
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

function renderPortals(p, level, camera, tile) {
  const portals = level.portalSystem?.getPortals?.() || [];
  if (!portals.length) return;

  const visualScale = 2;
  const drawSize = tile * visualScale;
  const drawOffset = (drawSize - tile) / 2;

  for (let i = 0; i < portals.length; i += 1) {
    const portal = portals[i];
    const x = portal.tx * tile;
    const y = portal.ty * tile;
    const drawX = x - drawOffset;
    const drawY = y - drawOffset;
    if (!camera.isRectVisible(drawX, drawY, drawSize, drawSize, 20)) continue;

    const portalColor = portal.color === 'red' ? 'red' : (portal.color === 'blue' ? 'blue' : (i === 0 ? 'blue' : 'red'));
    const imagePath = portalColor === 'red' ? SPRITE_PATHS.portal.red : SPRITE_PATHS.portal.blue;
    const img = getImage(imagePath);
    if (img) {
      p.image(img, drawX, drawY, drawSize, drawSize);
      continue;
    }

    p.push();
    p.noStroke();
    if (portalColor === 'blue') p.fill(96, 165, 250, 180);
    else p.fill(248, 113, 113, 180);
    p.circle(x + tile * 0.5, y + tile * 0.5, tile * 1.8);
    p.fill(15, 23, 42, 200);
    p.circle(x + tile * 0.5, y + tile * 0.5, tile * 0.92);
    p.pop();
  }
}

// Render E-key interaction hints at chests when player is nearby
export function renderChestInteractionPrompts(p, level) {
  const prompt = getInteractionPrompt(level);
  if (!prompt || prompt.type !== 'box') return;

  const chest = prompt.entity;
  const tile = level.settings.baseTile;

  const x = chest.x * tile;
  const y = chest.y * tile;
  const w = (chest.w || 1) * tile;
  const h = (chest.h || 1) * tile;

  // Check if on top 2 rows - show prompt on right side instead of top
  const isTopRows = chest.y < 2;
  const centerX = isTopRows ? x + w + 20 : x + w / 2;
  const promptY = isTopRows ? y + h / 2 - 10 : y - 26;
  const textAlignY = isTopRows ? promptY : promptY - 4;

  p.push();
  p.noStroke();
  // Draw key background
  p.fill(15, 23, 42, 200);
  p.rect(centerX - 12, promptY - 14, 24, 20, 4);
  // Draw 'E' text
  p.fill(255, 255, 255, 240);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(12);
  p.textStyle(p.BOLD);
  p.text('E', centerX, textAlignY);
  // Draw action text
  p.textStyle(p.NORMAL);
  p.textSize(8);
  p.fill(255, 255, 255, 180);
  const actionText = 'Open';
  const actionY = isTopRows ? promptY + 16 : promptY + 10;
  p.text(actionText, centerX, actionY);
  p.pop();
}

// Render E-key interaction hints at doors when player is nearby
export function renderDoorInteractionPrompts(p, level, inventory) {
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

  // Check if on top 2 rows - show prompt on right side instead of top
  const isTopRows = door.y < 2;
  const centerX = isTopRows ? x + w + 20 : x + w / 2;
  const promptY = isTopRows ? y + h / 2 : y - 16;
  const textAlignY = isTopRows ? promptY : promptY - 4;

  p.push();
  p.noStroke();
  // Show keyId text above E box for locked doors
  if (door.state === 'LOCKED' && door.keyId) {
    const hasKey = inventory?.hasKey?.(door.keyId);
    const keyName = getKeyDisplayName(level.id, door.keyId);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.textSize(10);
    p.textStyle(p.BOLD);
    p.fill(hasKey ? '#ffd700' : '#ff6b6b');
    const keyTextY = promptY - 20;
    p.text(hasKey ? keyName : `Requires ${keyName}`, centerX, keyTextY);
  }
  // Draw key background
  p.fill(15, 23, 42, 200);
  p.rect(centerX - 12, promptY - 14, 24, 20, 4);
  // Draw 'E' text
  p.fill(255, 255, 255, 240);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(12);
  p.textStyle(p.BOLD);
  p.text('E', centerX, textAlignY);
  // Optional: draw action text
  p.textStyle(p.NORMAL);
  p.textSize(8);
  p.fill(255, 255, 255, 180);
  const actionText = door.state === 'OPEN' ? 'Close' : door.state === 'LOCKED' ? 'Unlock' : 'Open';
  const actionY = isTopRows ? promptY + 16 : promptY + 10;
  p.text(actionText, centerX, actionY);
  p.pop();
}

// Render E-key interaction hints at light buttons when player is nearby
export function renderButtonInteractionPrompts(p, level) {
  const prompt = getInteractionPrompt(level);
  if (!prompt || prompt.type !== 'light') return;

  const button = prompt.entity;
  const tile = level.settings.baseTile;

  const buttonX = button.x * tile;
  const buttonY = button.y * tile;

  // Check if on top 2 rows - show prompt on right side instead of top
  const isTopRows = button.y < 2;
  const centerX = isTopRows ? buttonX + tile + 20 : (button.x + 0.5) * tile;
  const promptY = isTopRows ? buttonY + tile / 2 : buttonY - 16;

  p.push();
  // Draw key background
  p.noStroke();
  p.fill(15, 23, 42, 200);
  p.rect(centerX - 12, promptY - 14, 24, 20, 4);
  // Draw 'E' text
  p.fill(255, 255, 255, 240);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(12);
  p.textStyle(p.BOLD);
  p.text('E', centerX, isTopRows ? promptY : promptY - 4);
  // Draw action text
  p.textStyle(p.NORMAL);
  p.textSize(8);
  p.fill(255, 255, 255, 180);
  const isLit = level.roomSystem.isLit(button.roomId);
  const actionText = isLit ? 'Lights off' : 'Lights on';
  const actionY = isTopRows ? promptY + 16 : promptY + 10;
  p.text(actionText, centerX, actionY);
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



// Main entity render pass: doors, chests, NPCs, player, footsteps, HUD.
export function renderEntities(p, state) {
  const level = state.level;
  if (!level) return;
  const tile = level.settings.baseTile;

  const camera = state.camera || new Camera(p.width, p.height);

  for (const door of level.doorSystem.doors) {
    const worldX = door.x * tile;
    const worldY = door.y * tile;
    const worldW = (door.w || 2) * tile;
    const worldH = (door.h || 2) * tile;
    if (!camera.isRectVisible(worldX, worldY, worldW, worldH, 48)) continue;
    if (door.panels === 'double') drawDoubleDoor(p, door, tile);
    else drawSingleDoor(p, door, tile);
    if (!door.visualOnly) {
      // Sparkles only in room 5 (map1); comment out the roomId check to enable for all rooms
      const doorRoomId = level.roomSystem.getRoomId(Math.floor(door.x), Math.floor(door.y));
      if (doorRoomId === 5 || door.id === 'door_4') {
        if (door.state === 'OPEN') {
          drawSparkles(p, worldX, worldY, worldW, worldH);
        } else {
          // Door closed/locked: sparkles on left and right frame edges
          drawSparkles(p, worldX - 4, worldY, 6, worldH);
          drawSparkles(p, worldX + worldW - 2, worldY, 6, worldH);
        }
      }
      // Other rooms sparkles commented out:
      // if (doorRoomId !== 5) {
      //   if (door.state === 'OPEN') {
      //     drawSparkles(p, worldX, worldY, worldW, worldH);
      //   } else {
      //     drawSparkles(p, worldX - 4, worldY, 6, worldH);
      //     drawSparkles(p, worldX + worldW - 2, worldY, 6, worldH);
      //   }
      // }
    }

    // Render EXIT label and glow for exit doors (doorJ, door_3, door_K)
    if (door.keyId === 'key_exit') {
      const hasExitKey = state.inventory?.hasKey?.('key_exit');
      const cx = worldX + worldW / 2;
      const cy = worldY + worldH / 2;
      const pulse = (Math.sin(performance.now() * 0.003) + 1) * 0.5;
      p.push();
      p.noStroke();
      // Glow effect behind the door
      const glowW = worldW * 0.8 + pulse * 3;
      const glowH = worldH * 0.8 + pulse * 3;
      const glowAlpha = hasExitKey ? 50 + pulse * 30 : 25 + pulse * 15;
      const gr = hasExitKey ? 34 : 180;
      const gg = hasExitKey ? 197 : 180;
      const gb = hasExitKey ? 94 : 180;
      p.fill(gr, gg, gb, glowAlpha);
      p.ellipse(cx, cy, glowW * 2, glowH * 2);
      p.fill(gr, gg, gb, glowAlpha * 0.5);
      p.ellipse(cx, cy, glowW * 2.5, glowH * 2.5);
      // EXIT text with tip font style
      setFont(p, 7, FONTS.ui, 'bold');
      p.fill(hasExitKey ? '#22c55e' : '#9ca3af');
      if ((door.w || 2) <= 1) {
        // Vertical layout for narrow doors
        p.textAlign(p.CENTER, p.BOTTOM);
        const chars = ['E','X','I','T'];
        const lineH = 9;
        const startY = worldY - 12 - (chars.length - 1) * lineH;
        for (let i = 0; i < chars.length; i++) {
          p.text(chars[i], cx, startY + i * lineH + lineH);
        }
      } else {
        // Horizontal layout for wide doors
        p.textAlign(p.CENTER, p.BOTTOM);
        p.text('EXIT', cx, worldY - 4);
      }
      p.pop();
    }
  }

  if (level.missionSystem?.exit) {
    const exit = level.missionSystem.exit;
    if (camera.isRectVisible(exit.x, exit.y, exit.w, exit.h, 64)) drawExitBeacon(p, level.missionSystem, tile);
  }

  for (const button of level.roomSystem.buttons) {
    if (!camera.isRectVisible(button.centerX - 10, button.centerY - 10, 20, 20, 16)) continue;
    renderButton(p, level, button);
    // Sparkles only in room 5 (map1); uncomment below to enable for all rooms
    if (button.roomId === 5) {
      drawSparkles(p, button.centerX - 8, button.centerY - 8, 16, 16);
    }
    // Other rooms sparkles commented out:
    // if (button.roomId !== 5) {
    //   drawSparkles(p, button.centerX - 8, button.centerY - 8, 16, 16);
    // }
  }

  renderPortals(p, level, camera, tile);
  renderFootsteps(p, level);

  for (const npc of level.npcs) {
    if (!camera.isRectVisible(npc.x, npc.y, npc.w, npc.h, 64)) continue;
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
    if (!camera.isRectVisible(rx, ry, rw, rh, 24)) continue;
    drawChest(p, chest, tile, level);
    // Sparkles only in room 5 (map1); uncomment below to enable for all rooms
    const chestRoomId = level.roomSystem.getRoomId(Math.floor(chest.x), Math.floor(chest.y));
    if (chestRoomId === 5) {
      drawSparkles(p, rx, ry, rw, rh);
    }
    // Other rooms sparkles commented out:
    // if (chestRoomId !== 5) {
    //   drawSparkles(p, rx, ry, rw, rh);
    // }
  }

  if (camera.isRectVisible(level.player.x, level.player.y, level.player.w, level.player.h, 64)) {
    const descriptor = resolveCharacterSprite('player', level.player.characterVariant || 'default', level.player.anim?.mode || 'idle', level.player.facing || 'down');
    drawResolvedCharacter(p, descriptor, level.player, level.player.x, level.player.y, level.player.w, level.player.h, level.player.color);
  }

  updateLootPopups(state.dt || 0.016);
  renderLootPopups(p);
}
