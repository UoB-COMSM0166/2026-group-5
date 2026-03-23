import { hasLineOfSight, canMoveToRect } from './collisionSystem.js';
import { updateHumanoidAnimation } from './animationSystem.js';


function tryOpenBlockingDoor(npc, level) {
  const tileSize = level?.settings?.baseTile || 16;
  const cx = npc.x + npc.w / 2;
  const cy = npc.y + npc.h / 2;
  for (const door of level?.doorSystem?.doors || []) {
    if (door.open) continue;
    const near = (door.tiles || []).some((tile) => {
      const tx = tile.x * tileSize + tileSize / 2;
      const ty = tile.y * tileSize + tileSize / 2;
      return Math.hypot(cx - tx, cy - ty) <= tileSize * 1.1;
    });
    if (near) {
      level.doorSystem.toggle(door);
      return true;
    }
  }
  return false;
}

function moveToward(npc, targetX, targetY, speed, deltaTime, level) {
  const dx = targetX - npc.x;
  const dy = targetY - npc.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) {
    npc.moving = false;
    return true;
  }
  const vx = (dx / dist) * speed * deltaTime;
  const vy = (dy / dist) * speed * deltaTime;
  const tileSize = level?.settings?.baseTile || 16;
  let moved = false;
  const canMoveX = vx !== 0 && canMoveToRect(npc, npc.x + vx, npc.y, level.collision, tileSize, level);
  const canMoveY = vy !== 0 && canMoveToRect(npc, npc.x, npc.y + vy, level.collision, tileSize, level);
  if (!canMoveX || !canMoveY) tryOpenBlockingDoor(npc, level);
  if (vx !== 0 && canMoveToRect(npc, npc.x + vx, npc.y, level.collision, tileSize, level)) {
    npc.x += vx;
    moved = true;
  }
  if (vy !== 0 && canMoveToRect(npc, npc.x, npc.y + vy, level.collision, tileSize, level)) {
    npc.y += vy;
    moved = true;
  }
  npc.moving = moved;
  if (Math.abs(dx) > Math.abs(dy)) npc.facing = dx >= 0 ? 'right' : 'left';
  else npc.facing = dy >= 0 ? 'down' : 'up';
  return dist <= speed * deltaTime;
}

function getPlayerCenter(player) {
  return { x: player.x + player.w / 2, y: player.y + player.h / 2 };
}

function getNpcCenter(npc) {
  return { x: npc.x + npc.w / 2, y: npc.y + npc.h / 2 };
}

function getFacingHeading(facing) {
  const dir = (facing || 'right').toLowerCase();
  if (dir === 'left') return Math.PI;
  if (dir === 'up') return -Math.PI / 2;
  if (dir === 'down') return Math.PI / 2;
  return 0;
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function canSeePlayer(npc, level) {
  const playerCenter = getPlayerCenter(level.player);
  const npcCenter = getNpcCenter(npc);
  const visionRange = level.roomSystem.getNpcVisionRange(npc, level.settings.visionRange || 112);
  const dx = playerCenter.x - npcCenter.x;
  const dy = playerCenter.y - npcCenter.y;
  const dist = Math.hypot(dx, dy);
  if (dist > visionRange) return false;

  const heading = getFacingHeading(npc.facing);
  const playerAngle = Math.atan2(dy, dx);
  const spread = Math.PI / 3.4;
  const delta = Math.abs(normalizeAngle(playerAngle - heading));
  if (delta > spread / 2) return false;

  return hasLineOfSight(level.collision, npcCenter.x, npcCenter.y, playerCenter.x, playerCenter.y, level.settings.baseTile, 4, level);
}

function seedSearchWander(npc, level) {
  const roomId = level.roomSystem.getActorRoomId(npc);
  const tiles = level.roomSystem.roomTiles.get(roomId) || [];
  if (!tiles.length) return;
  const pick = tiles[(Math.floor(Math.random() * tiles.length)) % tiles.length];
  npc.searchTargetX = pick.x * level.settings.baseTile + level.settings.baseTile / 2;
  npc.searchTargetY = pick.y * level.settings.baseTile + level.settings.baseTile / 2;
  npc.searchWanderTimer = 0.65 + Math.random() * 0.85;
}

function updateLightResponse(npc, level, deltaTime) {
  const task = npc.roomLightResponse;
  if (!task) return false;
  if (task.stage === 'GO_TO_BUTTON') {
    const arrived = moveToward(npc, task.buttonX - npc.w / 2, task.buttonY - npc.h / 2, npc.speedPatrol || 55, deltaTime, level);
    if (arrived) {
      const button = level.roomSystem.buttons.find((entry) => entry.roomId === task.roomId);
      if (button) level.roomSystem.consumeButtonResponse(button, 'npc');
      task.stage = 'SEARCH_AFTER_BUTTON';
      npc.searchTimer = Math.max(npc.searchTimer || 0, 1.8);
      seedSearchWander(npc, level);
    }
    return true;
  }
  if (task.stage === 'SEARCH_AFTER_BUTTON') {
    npc.searchTimer -= deltaTime;
    npc.searchWanderTimer = (npc.searchWanderTimer || 0) - deltaTime;
    if (npc.searchWanderTimer <= 0) seedSearchWander(npc, level);
    if (npc.searchTargetX && npc.searchTargetY) {
      moveToward(npc, npc.searchTargetX - npc.w / 2, npc.searchTargetY - npc.h / 2, npc.speedPatrol || 55, deltaTime, level);
    }
    if (npc.searchTimer <= 0) {
      npc.roomLightResponse = null;
      npc.state = 'RETURN';
    }
    return true;
  }
  return false;
}

function updateReturnState(npc, level, deltaTime) {
  const arrived = moveToward(npc, npc.homeX, npc.homeY, npc.speedPatrol || 55, deltaTime, level);
  if (arrived) {
    npc.state = 'PATROL';
    npc.lastSeenX = 0;
    npc.lastSeenY = 0;
    npc.searchTargetX = 0;
    npc.searchTargetY = 0;
  }
}

export function updateNpcs(level, deltaTime) {
  let detectedBy = null;
  for (const npc of level.npcs) {
    npc.state = npc.state || 'PATROL';
    npc.wpIndex = npc.wpIndex || 0;
    npc.searchTimer = npc.searchTimer || 0;
    npc.loseSight = npc.loseSight || 0;
    npc.searchWanderTimer = npc.searchWanderTimer || 0;
    npc.moving = false;

    if (canSeePlayer(npc, level)) {
      npc.state = 'CHASE';
      npc.loseSight = 0.9;
      const pc = getPlayerCenter(level.player);
      npc.lastSeenX = pc.x;
      npc.lastSeenY = pc.y;
      npc.roomLightResponse = null;
    } else if (npc.state === 'CHASE') {
      npc.loseSight -= deltaTime;
      if (npc.loseSight <= 0) {
        npc.state = 'SEARCH';
        npc.searchTimer = 2.8;
        npc.searchWanderTimer = 0;
      }
    }

    if (npc.state === 'CHASE') {
      const playerCenter = getPlayerCenter(level.player);
      moveToward(npc, playerCenter.x - npc.w / 2, playerCenter.y - npc.h / 2, npc.speedChase || 82, deltaTime, level);
      if (Math.hypot(playerCenter.x - (npc.x + npc.w / 2), playerCenter.y - (npc.y + npc.h / 2)) < 12) {
        detectedBy = npc.id;
      }
    } else if (updateLightResponse(npc, level, deltaTime)) {
      // handled above
    } else if (npc.state === 'SEARCH') {
      npc.searchTimer -= deltaTime;
      npc.searchWanderTimer -= deltaTime;
      if (npc.lastSeenX && npc.lastSeenY && npc.searchTimer > 1.2) {
        moveToward(npc, npc.lastSeenX - npc.w / 2, npc.lastSeenY - npc.h / 2, npc.speedPatrol || 55, deltaTime, level);
      } else {
        if (npc.searchWanderTimer <= 0 || !npc.searchTargetX || !npc.searchTargetY) seedSearchWander(npc, level);
        moveToward(npc, npc.searchTargetX - npc.w / 2, npc.searchTargetY - npc.h / 2, npc.speedPatrol || 55, deltaTime, level);
      }
      if (npc.searchTimer <= 0) {
        npc.state = 'RETURN';
      }
    } else if (npc.state === 'RETURN') {
      updateReturnState(npc, level, deltaTime);
    } else {
      const point = npc.waypoints?.[npc.wpIndex];
      if (point) {
        const arrived = moveToward(npc, point.x, point.y, npc.speedPatrol || 55, deltaTime, level);
        if (arrived) npc.wpIndex = (npc.wpIndex + 1) % npc.waypoints.length;
      }
    }

    npc.characterType = 'npc';
    npc.characterVariant = npc.state === 'CHASE' ? 'chase' : npc.state === 'SEARCH' ? 'search' : 'patrol';
    updateHumanoidAnimation(npc, deltaTime, !!npc.moving, npc.facing || 'down', {
      frameCount: 4,
      walkFrameDuration: npc.state === 'CHASE' ? 0.08 : 0.12,
      idleFrameDuration: 0.38,
      interactFrameDuration: 0.085,
      alertFrameDuration: npc.state === 'CHASE' ? 0.075 : 0.095,
      bobAmount: npc.state === 'CHASE' ? 2.0 : 1.2,
      walkFrames: [0, 1, 2, 1],
      idleFrames: [0, 0, 3, 0],
      interactFrames: [0, 1, 2, 3],
      alertFrames: [3, 2, 3, 1],
      modeOverride: npc.state === 'CHASE' || npc.state === 'SEARCH' ? 'alert' : npc.state === 'RETURN' ? 'walk' : undefined,
      variant: npc.characterVariant
    });
  }
  return detectedBy;
}
