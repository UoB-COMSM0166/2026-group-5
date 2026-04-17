// Player movement, stamina, footstep trail, and animation driver.
import { canMoveToRect } from './collisionSystem.js';
import { isPointInsideNpcVision } from './npcSystem.js';
import { updateHumanoidAnimation, triggerOneShotAnimation } from './animationSystem.js';

// Update the DOM stamina bar width and colour class.
function updateStaminaBar(player) {
  const staminaFill = document.getElementById('stamina-fill');
  if (!staminaFill) return;

  const maxStamina = player.staminaMax || 100;
  const currentStamina = player.stamina || 0;
  const percentage = (currentStamina / maxStamina) * 100;

  staminaFill.style.width = `${percentage}%`;

  // Update color based on stamina level
  staminaFill.classList.remove('low', 'critical');
  if (percentage <= 20) {
    staminaFill.classList.add('critical');
  } else if (percentage <= 40) {
    staminaFill.classList.add('low');
  }
}

// Trigger a one-shot player animation (e.g. interact).
export function triggerPlayerAction(player, mode = 'interact', duration = 0.26) {
  triggerOneShotAnimation(player, mode, duration, { facing: player.facing || 'down' });
}

// Guarantee the player has footstep trail tracking fields.
function ensureFootstepState(player) {
  player.footsteps ||= [];
  if (player.footstepTrailX == null) player.footstepTrailX = null;
  if (player.footstepTrailY == null) player.footstepTrailY = null;
  if (player.lastFootstepAt == null) player.lastFootstepAt = 0;
  if (player.footstepSide == null) player.footstepSide = 1;
}

// Place a single footstep marker at the given position.
function addFootstep(player, x, y, dirX, dirY, level) {
  const now = Date.now();
  let fx = 0;
  let fy = 1;

  if (Math.abs(dirX) > Math.abs(dirY)) {
    fx = dirX >= 0 ? 1 : -1;
    fy = 0;
  } else {
    fy = dirY >= 0 ? 1 : -1;
  }

  const nx = -fy;
  const ny = fx;
  const sideOffset = 3;
  const backOffset = 6;
  const offsetX = nx * sideOffset * player.footstepSide;
  const offsetY = ny * sideOffset * player.footstepSide;
  player.footsteps.push({
    x: x + offsetX - fx * backOffset,
    y: y + offsetY - fy * backOffset,
    timestamp: now
  });
  player.lastFootstepAt = now;
  player.footstepSide *= -1;

  const maxFootsteps = level.settings.maxFootsteps || 50;
  if (player.footsteps.length > maxFootsteps) player.footsteps.shift();
}

// Distribute footstep markers along the movement path at stride intervals.
function addFootstepsAlongPath(player, startX, startY, endX, endY, dirX, dirY, level) {
  const stride = level.settings.footstepStride || 7;

  if (player.footstepTrailX == null || player.footstepTrailY == null) {
    player.footstepTrailX = startX;
    player.footstepTrailY = startY;
    addFootstep(player, startX, startY, dirX, dirY, level);
  }

  let dx = endX - player.footstepTrailX;
  let dy = endY - player.footstepTrailY;
  let dist = Math.hypot(dx, dy);

  while (dist >= stride) {
    const ux = dx / dist;
    const uy = dy / dist;
    player.footstepTrailX += ux * stride;
    player.footstepTrailY += uy * stride;
    addFootstep(player, player.footstepTrailX, player.footstepTrailY, dirX, dirY, level);
    dx = endX - player.footstepTrailX;
    dy = endY - player.footstepTrailY;
    dist = Math.hypot(dx, dy);
  }
}

// Expire old footsteps and reset trail state when none remain.
function updateFootsteps(player, level) {
  const now = Date.now();
  const lifetime = level.settings.footstepLifetime || 3000;
  player.footsteps = (player.footsteps || []).filter((footstep) => now - footstep.timestamp < lifetime);
  if (player.footsteps.length === 0) {
    player.footstepTrailX = null;
    player.footstepTrailY = null;
    player.footstepSide = 1;
  }
}

// Check if the player is within any NPC's vision cone.
function isPlayerInsideAnyNpcWarningRange(player, level) {
  const targetX = player.x + player.w / 2;
  const targetY = player.y + player.h / 2;
  for (const npc of level.npcs || []) {
    if (isPointInsideNpcVision(npc, targetX, targetY, level)) return true;
  }
  return false;
}

// Move the player by (dx, dy), resolving axis-independent collisions.
function moveActor(player, dx, dy, level) {
  const tileSize = level.settings.baseTile;
  const nextX = player.x + dx;
  const nextY = player.y + dy;

  if (dx !== 0 && canMoveToRect(player, nextX, player.y, level.collision, tileSize, level)) {
    player.x = nextX;
  }
  if (dy !== 0 && canMoveToRect(player, player.x, nextY, level.collision, tileSize, level)) {
    player.y = nextY;
  }

  const maxX = level.mapWidth * tileSize - player.w;
  const maxY = level.mapHeight * tileSize - player.h;
  player.x = Math.max(0, Math.min(maxX, player.x));
  player.y = Math.max(0, Math.min(maxY, player.y));
}

// Main per-frame player update: movement, stamina, footsteps, animation.
export function updatePlayer(player, input, level, deltaTime) {
  ensureFootstepState(player);
  let ix = input.x;
  let iy = input.y;
  const len = Math.hypot(ix, iy) || 1;
  ix /= len;
  iy /= len;

  let speed = player.speed;
  const hasMoveInput = Math.abs(ix) > 0.001 || Math.abs(iy) > 0.001;
  const sprinting = Boolean(input.sprint && hasMoveInput && player.stamina > 0);
  if (sprinting) speed *= player.sprint;

  const oldX = player.x;
  const oldY = player.y;
  const oldCenterX = oldX + player.w / 2;
  const oldCenterY = oldY + player.h / 2;
  moveActor(player, ix * speed * deltaTime, iy * speed * deltaTime, level);
  const moved = Math.abs(player.x - oldX) > 0.05 || Math.abs(player.y - oldY) > 0.05;
  const newCenterX = player.x + player.w / 2;
  const newCenterY = player.y + player.h / 2;

  player.recoverCooldown = player.recoverCooldown || 0;
  if (sprinting) {
    player.recoverCooldown = player.staminaRecoverDelay || 0;
    if (moved) {
      player.stamina = Math.max(0, player.stamina - (player.staminaDrain || 0) * deltaTime);
    }
  } else {
    player.recoverCooldown = Math.max(0, player.recoverCooldown - deltaTime);
    if (player.recoverCooldown <= 0) {
      player.stamina = Math.min(player.staminaMax || 100, player.stamina + (player.staminaRecover || 0) * deltaTime);
    }
  }

  // Update stamina bar UI
  updateStaminaBar(player);

  if (hasMoveInput) {
    if (Math.abs(ix) >= Math.abs(iy)) {
      player.facing = ix > 0 ? 'right' : 'left';
    } else {
      player.facing = iy > 0 ? 'down' : 'up';
    }
  }

  const shouldShowFootsteps = sprinting || isPlayerInsideAnyNpcWarningRange(player, level);
  if (moved && shouldShowFootsteps) {
    addFootstepsAlongPath(player, oldCenterX, oldCenterY, newCenterX, newCenterY, ix, iy, level);
  } else if (!shouldShowFootsteps) {
    player.footstepTrailX = null;
    player.footstepTrailY = null;
  }
  updateFootsteps(player, level);

  player.moving = moved;
  player.moveX = ix;
  player.moveY = iy;
  player.characterType = 'player';
  player.characterVariant ||= 'default';
  updateHumanoidAnimation(player, deltaTime, moved, player.facing, {
    frameCount: 4,
    walkFrameDuration: sprinting ? 0.15 : 0.20,
    idleFrameDuration: 0.25,
    interactFrameDuration: 0.085,
    alertFrameDuration: 0.1,
    bobAmount: 0,
    walkFrames: [0, 1, 2, 3],
    idleFrames: [0, 1, 2, 3],
    interactFrames: [0, 1, 2, 3],
    alertFrames: [3, 2, 3, 1],
    variant: player.characterVariant
  });
}
