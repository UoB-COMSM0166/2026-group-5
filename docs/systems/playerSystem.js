import { canMoveToRect } from './collisionSystem.js';
import { updateHumanoidAnimation, triggerOneShotAnimation } from './animationSystem.js';

export function triggerPlayerAction(player, mode = 'interact', duration = 0.26) {
  triggerOneShotAnimation(player, mode, duration, { facing: player.facing || 'down' });
}

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

export function updatePlayer(player, input, level, deltaTime) {
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
  moveActor(player, ix * speed * deltaTime, iy * speed * deltaTime, level);
  const moved = Math.abs(player.x - oldX) > 0.05 || Math.abs(player.y - oldY) > 0.05;

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

  if (hasMoveInput) {
    if (Math.abs(ix) >= Math.abs(iy)) {
      player.facing = ix > 0 ? 'right' : 'left';
    } else {
      player.facing = iy > 0 ? 'down' : 'up';
    }
  }

  player.moving = moved;
  player.moveX = ix;
  player.moveY = iy;
  player.characterType = 'player';
  player.characterVariant ||= 'default';
  updateHumanoidAnimation(player, deltaTime, moved, player.facing, {
    frameCount: 4,
    walkFrameDuration: sprinting ? 0.09 : 0.12,
    idleFrameDuration: 0.34,
    interactFrameDuration: 0.085,
    alertFrameDuration: 0.1,
    bobAmount: sprinting ? 2.2 : 1.5,
    walkFrames: [0, 1, 2, 1],
    idleFrames: [0, 0, 3, 0],
    interactFrames: [0, 1, 2, 3],
    alertFrames: [3, 2, 3, 1],
    variant: player.characterVariant
  });
}
