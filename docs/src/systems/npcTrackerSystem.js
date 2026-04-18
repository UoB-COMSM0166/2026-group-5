// NPC movement tracker: pathfinding dispatch, edge-following, collision sliding, facing.
import { canMoveToRect, getEntityCollisionRect } from './collisionSystem.js';
import { findPath, getActorTilePosition, getPointTilePosition, tilePathToWorldPath } from './pathfindingSystem.js';
import { DOOR_STATES, DOOR_TIMING } from './doorSystem.js';

const TRACKER_ALGORITHMS = new Map();
const DEFAULT_TRACKER_PROFILE = 'path_smooth';

const EDGE_FOLLOW_DIRECTIONS = [
  { x: 1, y: 0, facing: 'right' },
  { x: -1, y: 0, facing: 'left' },
  { x: 0, y: 1, facing: 'down' },
  { x: 0, y: -1, facing: 'up' }
];

// --- Tuning constants for stable NPC movement ---
const FACING_HOLD_TIME = 0.18;           // min seconds before facing can change again
const FACING_MIN_DISPLACEMENT = 0.5;     // min px displacement to allow facing update
const SLIDE_COMMIT_TIME = 0.15;          // seconds to commit to a wall-slide axis
const STUCK_CHECK_INTERVAL = 0.5;        // seconds between stuck position samples
const STUCK_MOVE_THRESHOLD_FACTOR = 0.4; // fraction of tileSize: moved less = stuck
const STUCK_REPLAN_TIME = 0.8;           // seconds stuck before force-replanning path
const STUCK_NUDGE_TIME = 1.8;            // seconds stuck before perpendicular nudge
const REPLAN_COOLDOWN_DEFAULT = 0.4;     // min seconds between path replans
const CHASE_REPLAN_TILE_DIST = 2.25;     // tile-distance target must move before chase replan
const WAYPOINT_REACH_RADIUS = 6;         // px closeness to consider waypoint reached
const BLOCKED_EDGE_FOLLOW_DELAY = 0.18;  // seconds blocked before starting edge follow

// --- Context-based Steering constants ---
const STEERING_NUM_RAYS = 12;             // Reduced from 24 to 12 for better performance
const STEERING_DANGER_NEAR = 0.45;        // fraction of danger-far for "close" obstacle check
const STEERING_PARTIAL_WEIGHT = 0.12;     // weight for directions blocked far but clear near
const SKIP_DISTANCE_THRESHOLD = 400;      // Skip steering for NPCs far from player (squared)

// Pre-compute unit direction vectors for context steering
const STEERING_DIRS = [];
for (let i = 0; i < STEERING_NUM_RAYS; i++) {
  const angle = (i / STEERING_NUM_RAYS) * Math.PI * 2;
  STEERING_DIRS.push({ x: Math.cos(angle), y: Math.sin(angle) });
}

// Register a named movement algorithm for NPC tracking.
export function registerNpcTracker(name, implementation) {
  if (!name || typeof implementation !== 'function') return;
  TRACKER_ALGORITHMS.set(name, implementation);
}

// Reset all per-NPC tracker fields to defaults.
export function clearNpcTrackerState(npc) {
  npc.tracker = {
    profile: npc.tracker?.profile || DEFAULT_TRACKER_PROFILE,
    // --- Global path layer ---
    path: [],
    pathIndex: 0,
    pathTargetKey: '',
    pathReplanCooldown: 0,
    pathGoalX: undefined,
    pathGoalY: undefined,
    // --- Edge follow (recovery movement) ---
    edgeFollowTimer: 0,
    edgeFollowDirX: 0,
    edgeFollowDirY: 0,
    edgeFacing: '',
    // --- Local movement layer ---
    steeringTurnTimer: 0,
    lastMoveX: 0,
    lastMoveY: 0,
    slideAxis: 0,          // 0=none, 1=X, 2=Y  committed wall-slide axis
    slideCommitTimer: 0,    // remaining commitment to current slide axis
    blockedTimer: 0,
    // --- Facing layer ---
    facingHoldTimer: 0,
    stableFacing: npc.facing || 'down',
    // --- Anti-stuck layer ---
    stuckTimer: 0,
    stuckCheckTimer: 0,
    stuckOriginX: npc.x,
    stuckOriginY: npc.y,
    stuckRecoveryLevel: 0,  // 0=normal, 1=replanned, 2=nudged
    // --- Patrol ---
    patrolJoinIndex: -1
  };
}

// Guarantee an NPC has a tracker state object, creating one if missing.
export function ensureNpcTrackerState(npc) {
  if (npc.tracker) return npc.tracker;
  clearNpcTrackerState(npc);
  return npc.tracker;
}

function vectorToFacing(dx, dy) {
  const angle = Math.atan2(dy, dx);
  const absAngle = Math.abs(angle);
  if (absAngle <= Math.PI / 4) return 'right';
  if (absAngle >= 3 * Math.PI / 4) return 'left';
  return angle > 0 ? 'down' : 'up';
}

function trySetFacing(npc, newFacing) {
  if (!newFacing) return;
  const tracker = npc.tracker;
  if (tracker && (tracker.facingHoldTimer || 0) > 0) return;
  if (npc.facing === newFacing) return;
  npc.facing = newFacing;
  if (tracker) {
    tracker.facingHoldTimer = FACING_HOLD_TIME;
    tracker.stableFacing = newFacing;
  }
}

// Set the NPC facing direction from a movement vector.
export function setNpcFacingFromVector(npc, dx, dy) {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
  trySetFacing(npc, vectorToFacing(dx, dy));
}

// Velocity-gated facing: only updates facing when displacement is significant.
// During wall-sliding, uses target direction instead of slide direction to avoid jitter.
function updateFacingSmooth(npc, moveDx, moveDy, targetDx, targetDy, deltaTime) {
  const tracker = npc.tracker;
  if (!tracker) return;
  tracker.facingHoldTimer = Math.max(0, (tracker.facingHoldTimer || 0) - deltaTime);
  tracker._facingDecayedThisFrame = true;
  const moveSpeed = Math.hypot(moveDx, moveDy);
  if (moveSpeed < FACING_MIN_DISPLACEMENT) return;
  if (tracker.facingHoldTimer > 0) return;
  // Use target direction for facing when wall-sliding (moveDx/Dy may be axis-only)
  const useDx = (targetDx !== undefined) ? targetDx : moveDx;
  const useDy = (targetDy !== undefined) ? targetDy : moveDy;
  if (Math.abs(useDx) < 0.01 && Math.abs(useDy) < 0.01) return;
  const newFacing = vectorToFacing(useDx, useDy);
  if (npc.facing !== newFacing) {
    npc.facing = newFacing;
    tracker.facingHoldTimer = FACING_HOLD_TIME;
    tracker.stableFacing = newFacing;
  }
}

// Convert a centre-point target to top-left position for NPC placement.
export function getNpcWorldCenterTarget(npc, targetX, targetY) {
  return {
    x: targetX - npc.w / 2,
    y: targetY - npc.h / 2
  };
}

function toTargetKey(tx, ty, label = '') {
  return `${label}:${tx},${ty}`;
}

function getSafeTileWorldTarget(npc, tx, ty, tileSize) {
  const insetX = Math.max(0, npc?.collisionInsetX || 0);
  const insetY = Math.max(0, npc?.collisionInsetY || 0);
  const centerX = tx * tileSize + Math.max(insetX + 1, Math.min(tileSize - insetX - 1, tileSize / 2));
  const centerY = ty * tileSize + Math.max(insetY + 1, Math.min(tileSize - insetY - 1, tileSize / 2));
  return {
    tx,
    ty,
    x: centerX - npc.w / 2,
    y: centerY - npc.h / 2,
    centerX,
    centerY
  };
}

function simplifyWorldPath(npc, worldPath, level) {
  if (!worldPath || worldPath.length <= 2) return worldPath || [];
  const tileSize = level?.settings?.baseTile || 16;
  const simplified = [worldPath[0]];
  let anchorIndex = 0;
  while (anchorIndex < worldPath.length - 1) {
    let bestIndex = anchorIndex + 1;
    const anchor = worldPath[anchorIndex];
    for (let candidateIndex = anchorIndex + 1; candidateIndex < worldPath.length; candidateIndex += 1) {
      const candidate = worldPath[candidateIndex];
      const dx = candidate.centerX - anchor.centerX;
      const dy = candidate.centerY - anchor.centerY;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / Math.max(2, tileSize * 0.25)));
      let clear = true;
      for (let stepIndex = 1; stepIndex <= steps; stepIndex += 1) {
        const t = stepIndex / steps;
        const sampleCenterX = anchor.centerX + dx * t;
        const sampleCenterY = anchor.centerY + dy * t;
        const sampleX = sampleCenterX - npc.w / 2;
        const sampleY = sampleCenterY - npc.h / 2;
        if (!canMoveToRect(npc, sampleX, sampleY, level.collision, tileSize, level)) {
          clear = false;
          break;
        }
      }
      if (!clear) break;
      bestIndex = candidateIndex;
    }
    if (bestIndex === anchorIndex) break;
    simplified.push(worldPath[bestIndex]);
    anchorIndex = bestIndex;
  }
  return simplified;
}

// Box-swept traversal check: can the NPC collision box move in a straight line
// from (fromCx,fromCy) to (toCx,toCy) without hitting any blocked tile?
// Unlike point-based hasLineOfSight, this checks the FULL collision box at each step,
// correctly detecting diagonal corner clips that point-LOS misses.
function canBoxTraverseLine(npc, fromCx, fromCy, toCx, toCy, level) {
  const tileSize = level?.settings?.baseTile || 16;
  const ddx = toCx - fromCx;
  const ddy = toCy - fromCy;
  const dist = Math.hypot(ddx, ddy);
  if (dist < 1) return true;
  const stepSize = Math.max(2, tileSize * 0.25);
  const steps = Math.ceil(dist / stepSize);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const cx = fromCx + ddx * t;
    const cy = fromCy + ddy * t;
    if (!canMoveToRect(npc, cx - npc.w / 2, cy - npc.h / 2, level.collision, tileSize, level)) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// NPC door interaction coroutine
// ---------------------------------------------------------------------------
// doorPhase: null | 'opening' | 'passing' | 'closing'
// doorTimer: seconds remaining in current phase
// doorTarget: the door entity being interacted with

function findNearbyBlockingDoor(npc, level) {
  const tileSize = level?.settings?.baseTile || 16;
  const cx = npc.x + npc.w / 2;
  const cy = npc.y + npc.h / 2;
  for (const door of level?.doorSystem?.doors || []) {
    if (door.state === DOOR_STATES.OPEN) continue;
    const near = (door.tiles || []).some((tile) => {
      const tx = tile.x * tileSize + tileSize / 2;
      const ty = tile.y * tileSize + tileSize / 2;
      return Math.hypot(cx - tx, cy - ty) <= tileSize * 1.6;
    });
    if (near) return door;
  }
  return null;
}

// Find the closest open door within interaction range of an NPC.
export function findNearbyOpenDoor(npc, level) {
  const tileSize = level?.settings?.baseTile || 16;
  const cx = npc.x + npc.w / 2;
  const cy = npc.y + npc.h / 2;
  for (const door of level?.doorSystem?.doors || []) {
    if (door.state !== DOOR_STATES.OPEN) continue;
    const near = (door.tiles || []).some((tile) => {
      const tx = tile.x * tileSize + tileSize / 2;
      const ty = tile.y * tileSize + tileSize / 2;
      return Math.hypot(cx - tx, cy - ty) <= tileSize * 1.5;
    });
    if (near) return door;
  }
  return null;
}

function isNpcOnDoorTiles(npc, door, tileSize) {
  const left  = Math.floor(npc.x / tileSize);
  const right = Math.floor((npc.x + npc.w - 1) / tileSize);
  const top   = Math.floor(npc.y / tileSize);
  const bot   = Math.floor((npc.y + npc.h - 1) / tileSize);
  return door.tiles.some(t => t.x >= left && t.x <= right && t.y >= top && t.y <= bot);
}

function beginNpcDoorInteraction(npc, door, level) {
  // Chase state NPCs take 1 second to open doors (player can catch up)
  const isChase = npc.state === 'CHASE';
  const openDelay = isChase ? DOOR_TIMING.CHASE_NPC_OPEN : DOOR_TIMING.NPC_OPEN;
  npc.doorPhase = 'opening';
  npc.doorTimer = openDelay;
  npc.doorTarget = door;
  // Door actually opens after the delay (in updateNpcDoorCoroutine)
}

function updateNpcDoorCoroutine(npc, deltaTime, level) {
  if (!npc.doorPhase) return false;
  npc.doorTimer -= deltaTime;

  if (npc.doorTimer <= 0) {
    const isChase = npc.state === 'CHASE';
    if (npc.doorPhase === 'opening') {
      // Open the door now (after the delay)
      if (npc.doorTarget) level.doorSystem.open(npc.doorTarget);
      // Door is now open — let NPC walk through
      npc.doorPhase = 'passing';
      npc.doorTimer = DOOR_TIMING.NPC_PASS;
      return false; // allow movement this frame
    } else if (npc.doorPhase === 'passing') {
      if (isChase) {
        // Chase: don't close, just continue
        npc.doorPhase = null;
        npc.doorTarget = null;
        return false;
      }
      // Patrol/Search: close the door behind NPC
      // Ensure NPC has fully passed through door (not standing on door tiles)
      const tileSize = level?.settings?.baseTile || 16;
      if (npc.doorTarget && isNpcOnDoorTiles(npc, npc.doorTarget, tileSize)) {
        // NPC still on door, keep waiting, don't close
        npc.doorTimer = 0.1; // brief wait then re-check
        return false;
      }
      if (npc.doorTarget) level.doorSystem.close(npc.doorTarget);
      npc.doorPhase = 'closing';
      npc.doorTimer = DOOR_TIMING.NPC_CLOSE;
    } else if (npc.doorPhase === 'closing') {
      npc.doorPhase = null;
      npc.doorTarget = null;
      return false;
    }
  }

  // During 'passing', allow movement (NPC walks through doorway)
  if (npc.doorPhase === 'passing') return false;

  // During 'opening' and 'closing', freeze NPC
  npc.moving = false;
  return true;
}

function tryOpenBlockingDoor(npc, level) {
  const door = findNearbyBlockingDoor(npc, level);
  if (!door) return false;
  beginNpcDoorInteraction(npc, door, level);
  return true;
}

function moveToward(npc, targetX, targetY, speed, deltaTime, level, options = {}) {
  // NPC door coroutine: pause while interacting with door
  if (updateNpcDoorCoroutine(npc, deltaTime, level)) return false;

  const tracker = ensureNpcTrackerState(npc);
  const dx = targetX - npc.x;
  const dy = targetY - npc.y;
  const dist = Math.hypot(dx, dy);
  const reachThreshold = options.reachThreshold ?? Math.max(4, speed * deltaTime * 1.1);
  if (dist <= reachThreshold) {
    npc.moving = false;
    return true;
  }

  const stepDistance = Math.min(dist, speed * deltaTime);
  const tileSize = level?.settings?.baseTile || 16;
  const desiredDx = dx / dist;
  const desiredDy = dy / dist;
  const vx = desiredDx * stepDistance;
  const vy = desiredDy * stepDistance;

  // 1. Fast path: direct move when no obstacle ahead (skip steering overhead)
  const fastPathClear = canMoveToRect(npc, npc.x + vx, npc.y + vy, level.collision, tileSize, level);
  // Fast path blocked, continue to steering
  if (fastPathClear) {
    npc.x += vx;
    npc.y += vy;
    npc.moving = true;
    tracker.lastMoveX = vx;
    tracker.lastMoveY = vy;
    tracker.blockedTimer = 0;
    if (options.updateFacing !== false) updateFacingSmooth(npc, vx, vy, dx, dy, deltaTime);
    return false;
  }

  // 2. Direct move blocked → try to open a nearby door
  if (!npc.doorPhase && tryOpenBlockingDoor(npc, level)) {
    if (options.updateFacing !== false) updateFacingSmooth(npc, 0, 0, dx, dy, deltaTime);
    return false;
  }

  // 3. Context-based Steering: sample multiple directions, weight by interest
  //    (dot product toward target) and danger (box-collision), then sum into a
  //    composite obstacle-aware movement vector.

  // [OPTIMIZATION DISABLED] Performance: skip expensive steering for distant NPCs
  // const player = level.player;
  // const dxToPlayer = (npc.x + npc.w / 2) - (player.x + player.w / 2);
  // const dyToPlayer = (npc.y + npc.h / 2) - (player.y + player.h / 2);
  // const distSqToPlayer = dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer;
  // const skipSteering = distSqToPlayer > (SKIP_DISTANCE_THRESHOLD * SKIP_DISTANCE_THRESHOLD);

  // if (skipSteering) {
  //   // Simple direct movement for distant NPCs (no obstacle avoidance)
  //   const slideStep = stepDistance * 0.5;
  //   let moved = false;
  //   if (canMoveToRect(npc, npc.x + vx, npc.y, level.collision, tileSize, level)) {
  //     npc.x += vx * 0.8;
  //     moved = true;
  //   } else if (canMoveToRect(npc, npc.x + Math.sign(vx) * slideStep, npc.y, level.collision, tileSize, level)) {
  //     npc.x += Math.sign(vx) * slideStep;
  //     moved = true;
  //   }
  //   if (canMoveToRect(npc, npc.x, npc.y + vy, level.collision, tileSize, level)) {
  //     npc.y += vy * 0.8;
  //     moved = true;
  //   } else if (canMoveToRect(npc, npc.x, npc.y + Math.sign(vy) * slideStep, level.collision, tileSize, level)) {
  //     npc.y += Math.sign(vy) * slideStep;
  //     moved = true;
  //   }
  //   npc.moving = moved;
  //   if (options.updateFacing !== false) updateFacingSmooth(npc, vx, vy, dx, dy, deltaTime);
  //   return false;
  // }

  const dangerFar = Math.max(tileSize * 0.85, stepDistance * 2.5);
  const dangerNear = dangerFar * STEERING_DANGER_NEAR;
  let sumX = 0;
  let sumY = 0;
  let blockedNearCount = 0;
  let blockedFarCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < STEERING_NUM_RAYS; i++) {
    const dir = STEERING_DIRS[i];
    // Interest: cosine similarity with desired direction, clamped >= 0
    const dot = dir.x * desiredDx + dir.y * desiredDy;
    let weight = Math.max(0, dot);
    if (weight < 0.001) { skippedCount++; continue; }

    // Danger: box-collision check at two distances
    const farX = npc.x + dir.x * dangerFar;
    const farY = npc.y + dir.y * dangerFar;
    if (!canMoveToRect(npc, farX, farY, level.collision, tileSize, level)) {
      const nearX = npc.x + dir.x * dangerNear;
      const nearY = npc.y + dir.y * dangerNear;
      if (!canMoveToRect(npc, nearX, nearY, level.collision, tileSize, level)) {
        weight = 0;                        // close obstacle → zero this direction
        blockedNearCount++;
      } else {
        weight *= STEERING_PARTIAL_WEIGHT;  // far obstacle only → heavily reduce
        blockedFarCount++;
      }
    }
    if (weight > 0) {
      sumX += dir.x * weight;
      sumY += dir.y * weight;
    }
  }

  const sumLen = Math.hypot(sumX, sumY);
  if (sumLen < 0.001) {
    // No viable steering direction found
    npc.moving = false;
    tracker.blockedTimer = (tracker.blockedTimer || 0) + deltaTime;
    return false;
  }

  const steerX = (sumX / sumLen) * stepDistance;
  const steerY = (sumY / sumLen) * stepDistance;

  // 4. Apply steering direction
  const steerClear = canMoveToRect(npc, npc.x + steerX, npc.y + steerY, level.collision, tileSize, level);
  if (steerClear) {
    npc.x += steerX;
    npc.y += steerY;
    npc.moving = true;
    tracker.lastMoveX = steerX;
    tracker.lastMoveY = steerY;
    tracker.blockedTimer = 0;
    if (options.updateFacing !== false) updateFacingSmooth(npc, steerX, steerY, dx, dy, deltaTime);
    return false;
  }

  // 5. Steering blocked at step scale → axis-separated slide fallback
  const canSlX = Math.abs(steerX) > 0.001 && canMoveToRect(npc, npc.x + steerX, npc.y, level.collision, tileSize, level);
  const canSlY = Math.abs(steerY) > 0.001 && canMoveToRect(npc, npc.x, npc.y + steerY, level.collision, tileSize, level);
  let slideX = 0, slideY = 0;
  if (canSlX && canSlY) {
    if (Math.abs(steerX) >= Math.abs(steerY)) slideX = steerX; else slideY = steerY;
  } else if (canSlX) {
    slideX = steerX;
  } else if (canSlY) {
    slideY = steerY;
  }
  if (slideX !== 0 || slideY !== 0) {
    npc.x += slideX;
    npc.y += slideY;
    npc.moving = true;
    tracker.lastMoveX = slideX;
    tracker.lastMoveY = slideY;
    tracker.blockedTimer = 0;
    if (options.updateFacing !== false) updateFacingSmooth(npc, slideX, slideY, dx, dy, deltaTime);
    return false;
  }

  // 6. Completely blocked
  npc.moving = false;
  tracker.blockedTimer = (tracker.blockedTimer || 0) + deltaTime;
  return false;
}

function moveAlongAxis(npc, dirX, dirY, speed, deltaTime, level) {
  const tracker = ensureNpcTrackerState(npc);
  const tileSize = level?.settings?.baseTile || 16;
  const step = speed * deltaTime;
  let moved = false;
  if (dirX !== 0) {
    const nextX = npc.x + dirX * step;
    if (canMoveToRect(npc, nextX, npc.y, level.collision, tileSize, level)) {
      npc.x = nextX;
      moved = true;
      tracker.lastMoveX = dirX * step;
      tracker.lastMoveY = 0;
    }
  }
  if (!moved && dirY !== 0) {
    const nextY = npc.y + dirY * step;
    if (canMoveToRect(npc, npc.x, nextY, level.collision, tileSize, level)) {
      npc.y = nextY;
      moved = true;
      tracker.lastMoveX = 0;
      tracker.lastMoveY = dirY * step;
    }
  }
  npc.moving = moved;
  if (moved) setNpcFacingFromVector(npc, dirX, dirY);
  return moved;
}

function getPreferredEdgeDirections(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return [
      { x: 0, y: dy >= 0 ? 1 : -1, facing: dy >= 0 ? 'down' : 'up' },
      { x: 0, y: dy >= 0 ? -1 : 1, facing: dy >= 0 ? 'up' : 'down' },
      { x: dx >= 0 ? 1 : -1, y: 0, facing: dx >= 0 ? 'right' : 'left' },
      { x: dx >= 0 ? -1 : 1, y: 0, facing: dx >= 0 ? 'left' : 'right' }
    ];
  }
  return [
    { x: dx >= 0 ? 1 : -1, y: 0, facing: dx >= 0 ? 'right' : 'left' },
    { x: dx >= 0 ? -1 : 1, y: 0, facing: dx >= 0 ? 'left' : 'right' },
    { x: 0, y: dy >= 0 ? 1 : -1, facing: dy >= 0 ? 'down' : 'up' },
    { x: 0, y: dy >= 0 ? -1 : 1, facing: dy >= 0 ? 'up' : 'down' }
  ];
}

function beginEdgeFollow(npc, level, dx, dy, minimumSeconds = 2) {
  const tracker = ensureNpcTrackerState(npc);
  const tileSize = level?.settings?.baseTile || 16;
  const step = Math.max(4, tileSize * 0.55);
  const options = getPreferredEdgeDirections(dx, dy);
  for (const option of options) {
    const nextX = npc.x + option.x * step;
    const nextY = npc.y + option.y * step;
    const clear = canMoveToRect(npc, nextX, nextY, level.collision, tileSize, level);
    if (!clear) continue;
    tracker.edgeFollowTimer = minimumSeconds;
    tracker.edgeFollowDirX = option.x;
    tracker.edgeFollowDirY = option.y;
    tracker.edgeFacing = option.facing;
    trySetFacing(npc, option.facing);
    return true;
  }
  const fallback = EDGE_FOLLOW_DIRECTIONS.find((option) => {
    const nextX = npc.x + option.x * step;
    const nextY = npc.y + option.y * step;
    return canMoveToRect(npc, nextX, nextY, level.collision, tileSize, level);
  });
  if (!fallback) {
    return false;
  }
  tracker.edgeFollowTimer = minimumSeconds;
  tracker.edgeFollowDirX = fallback.x;
  tracker.edgeFollowDirY = fallback.y;
  tracker.edgeFacing = fallback.facing;
  trySetFacing(npc, fallback.facing);
  return true;
}

function runEdgeFollow(npc, speed, deltaTime, level) {
  const tracker = ensureNpcTrackerState(npc);
  if ((tracker.edgeFollowTimer || 0) <= 0) return false;
  tracker.edgeFollowTimer = Math.max(0, tracker.edgeFollowTimer - deltaTime);
  const moved = moveAlongAxis(npc, tracker.edgeFollowDirX, tracker.edgeFollowDirY, speed, deltaTime, level);
  if (moved) {
    trySetFacing(npc, tracker.edgeFacing);
    return true;
  }
  const tileSize = level?.settings?.baseTile || 16;
  const step = speed * deltaTime;
  const rotated = EDGE_FOLLOW_DIRECTIONS.find((option) => {
    if (option.x === tracker.edgeFollowDirX && option.y === tracker.edgeFollowDirY) return false;
    const nextX = npc.x + option.x * step;
    const nextY = npc.y + option.y * step;
    return canMoveToRect(npc, nextX, nextY, level.collision, tileSize, level);
  });
  if (!rotated) {
    npc.moving = false;
    return false;
  }
  tracker.edgeFollowDirX = rotated.x;
  tracker.edgeFollowDirY = rotated.y;
  tracker.edgeFacing = rotated.facing;
  return moveAlongAxis(npc, tracker.edgeFollowDirX, tracker.edgeFollowDirY, speed, deltaTime, level);
}

function computePathToPoint(npc, tracker, targetX, targetY, level, label = 'target') {
  const tileSize = level?.settings?.baseTile || 16;
  const startTile = getActorTilePosition(npc, tileSize);
  const goalTile = getPointTilePosition(targetX, targetY, tileSize);
  const path = findPath(level, npc, startTile, goalTile, { tileSize, allowDoors: true });
  const rawWorldPath = tilePathToWorldPath(path, tileSize).map((node) => getSafeTileWorldTarget(npc, node.tx, node.ty, tileSize));
  tracker.path = simplifyWorldPath(npc, rawWorldPath, level);
  tracker.pathIndex = tracker.path.length > 1 ? 1 : 0;
  tracker.pathTargetKey = toTargetKey(goalTile.tx, goalTile.ty, label);
  tracker.pathReplanCooldown = REPLAN_COOLDOWN_DEFAULT;
  tracker.pathGoalX = targetX;
  tracker.pathGoalY = targetY;
  return tracker.path.length > 0;
}

function followCurrentPath(npc, tracker, speed, deltaTime, level, targetX, targetY, options = {}) {
  if (!tracker.path.length || tracker.pathIndex >= tracker.path.length) {
    npc.moving = false;
    return true;
  }

  // --- Box-aware waypoint skip: jump ahead to the furthest waypoint reachable
  // by straight-line box sweep (not point-based LOS which misses diagonal corners) ---
  const npcCx = npc.x + npc.w / 2;
  const npcCy = npc.y + npc.h / 2;
  const prevPathIndex = tracker.pathIndex;
  for (let i = tracker.path.length - 1; i > tracker.pathIndex; i -= 1) {
    const far = tracker.path[i];
    if (canBoxTraverseLine(npc, npcCx, npcCy, far.centerX, far.centerY, level)) {
      tracker.pathIndex = i;
      break;
    }
  }
  const node = tracker.path[tracker.pathIndex];
  const isFinalNode = tracker.pathIndex >= tracker.path.length - 1;
  const waypointX = isFinalNode ? targetX : node.x;
  const waypointY = isFinalNode ? targetY : node.y;
  const reached = moveToward(npc, waypointX, waypointY, speed, deltaTime, level, options);
  if (!reached) return false;

  // Forward-only progression: advance and never go back
  tracker.pathIndex += 1;
  if (tracker.pathIndex >= tracker.path.length) {
    npc.moving = false;
    return true;
  }
  return false;
}

// --- Anti-stuck helpers ---

function updateStuckDetection(npc, tracker, deltaTime, tileSize) {
  tracker.stuckCheckTimer = (tracker.stuckCheckTimer || 0) + deltaTime;
  if (tracker.stuckCheckTimer < STUCK_CHECK_INTERVAL) return;
  const moved = Math.hypot(
    npc.x - (tracker.stuckOriginX ?? npc.x),
    npc.y - (tracker.stuckOriginY ?? npc.y)
  );
  tracker.stuckCheckTimer = 0;
  tracker.stuckOriginX = npc.x;
  tracker.stuckOriginY = npc.y;
  const threshold = tileSize * STUCK_MOVE_THRESHOLD_FACTOR;
  if (moved < threshold) {
    tracker.stuckTimer = (tracker.stuckTimer || 0) + STUCK_CHECK_INTERVAL;
  } else {
    tracker.stuckTimer = Math.max(0, (tracker.stuckTimer || 0) - STUCK_CHECK_INTERVAL * 0.5);
    if (tracker.stuckTimer <= 0) tracker.stuckRecoveryLevel = 0;
  }
}

function performStuckRecovery(npc, tracker, level, targetDx, targetDy, speed, deltaTime) {
  const tileSize = level?.settings?.baseTile || 16;
  // Tier 1: force replan
  if (tracker.stuckTimer >= STUCK_REPLAN_TIME && tracker.stuckRecoveryLevel < 1) {
    tracker.stuckRecoveryLevel = 1;
    tracker.path = [];
    tracker.pathIndex = 0;
    tracker.pathTargetKey = '';
    return 'replanned';
  }
  // Tier 2: perpendicular nudge
  if (tracker.stuckTimer >= STUCK_NUDGE_TIME && tracker.stuckRecoveryLevel < 2) {
    tracker.stuckRecoveryLevel = 2;
    const nudgeDist = tileSize * 0.7;
    const perpDirs = [];
    if (Math.abs(targetDx) >= Math.abs(targetDy)) {
      perpDirs.push({ x: 0, y: 1 }, { x: 0, y: -1 }, { x: Math.sign(targetDx) || 1, y: 0 });
    } else {
      perpDirs.push({ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: Math.sign(targetDy) || 1 });
    }
    for (const dir of perpDirs) {
      const nx = npc.x + dir.x * nudgeDist;
      const ny = npc.y + dir.y * nudgeDist;
      if (canMoveToRect(npc, nx, ny, level.collision, tileSize, level)) {
        npc.x = nx;
        npc.y = ny;
        tracker.stuckTimer = 0;
        tracker.stuckRecoveryLevel = 0;
        tracker.path = [];
        tracker.pathIndex = 0;
        tracker.pathTargetKey = '';
        return 'nudged';
      }
    }
    // Nudge failed — try edge follow as last resort
    beginEdgeFollow(npc, level, targetDx, targetDy, 0.6);
    runEdgeFollow(npc, speed, deltaTime, level);
    tracker.stuckTimer = 0;
    tracker.stuckRecoveryLevel = 0;
    return 'edge_follow';
  }
  return 'none';
}

function trackPathSmooth(npc, request, deltaTime, level) {
  const tracker = ensureNpcTrackerState(npc);
  const tileSize = level?.settings?.baseTile || 16;
  const targetX = request.targetX;
  const targetY = request.targetY;
  const speed = request.speed;
  const label = request.label || 'target';
  tracker.pathReplanCooldown = Math.max(0, (tracker.pathReplanCooldown || 0) - deltaTime);

  // --- Anti-stuck: sample position periodically ---
  updateStuckDetection(npc, tracker, deltaTime, tileSize);
  const stuckAction = performStuckRecovery(npc, tracker, level, targetX - npc.x, targetY - npc.y, speed, deltaTime);
  if (stuckAction === 'nudged' || stuckAction === 'edge_follow') return false;

  // --- Direct movement shortcut: only when NPC collision box can traverse the
  // entire straight line to target (box-swept check, not point-based LOS) ---
  if (request.preferDirectSight) {
    const npcCenterX = npc.x + npc.w / 2;
    const npcCenterY = npc.y + npc.h / 2;
    const targetCenterX = targetX + npc.w / 2;
    const targetCenterY = targetY + npc.h / 2;
    const directClear = canBoxTraverseLine(npc, npcCenterX, npcCenterY, targetCenterX, targetCenterY, level);
    if (directClear) {
      tracker.path = [];
      tracker.pathIndex = 0;
      tracker.pathTargetKey = '';
      tracker.pathGoalX = targetX;
      tracker.pathGoalY = targetY;
      return moveToward(npc, targetX, targetY, speed, deltaTime, level, request);
    }
  }

  // --- Path rebuild decision ---
  const goalTile = getPointTilePosition(targetX, targetY, tileSize);
  const targetKey = toTargetKey(goalTile.tx, goalTile.ty, label);
  const repathDistanceThreshold = request.repathDistanceThreshold ?? tileSize * 0.75;
  const targetShift = Math.hypot((tracker.pathGoalX ?? targetX) - targetX, (tracker.pathGoalY ?? targetY) - targetY);
  const targetMovedFarEnough = targetShift >= repathDistanceThreshold;
  const shouldRebuild = !tracker.path.length
    || tracker.pathTargetKey !== targetKey
    || tracker.pathIndex >= tracker.path.length
    || (targetMovedFarEnough && tracker.pathReplanCooldown <= 0)
    || request.forceRepath
    || stuckAction === 'replanned';

  if (shouldRebuild) {
    const built = computePathToPoint(npc, tracker, targetX, targetY, level, label);
    if (!built) {
      // Path not found — do NOT push directly toward target (causes wall-sticking).
      // Stand still and allow replan on next frame.
      npc.moving = false;
      return false;
    }
  }

  // --- Follow path ---
  const finished = followCurrentPath(npc, tracker, speed, deltaTime, level, targetX, targetY, request);
  if (finished) return Math.hypot(targetX - npc.x, targetY - npc.y) <= (request.reachThreshold ?? Math.max(6, speed * deltaTime * 1.5));

  // --- Blocked handling: start edge follow after delay ---
  // Don't start edge follow if NPC is waiting to open a door (doorPhase exists)
  if (!npc.moving && !npc.doorPhase) {
    tracker.blockedTimer = (tracker.blockedTimer || 0) + deltaTime;
    if (tracker.blockedTimer >= BLOCKED_EDGE_FOLLOW_DELAY) {
      beginEdgeFollow(npc, level, targetX - npc.x, targetY - npc.y, 0.4);
      runEdgeFollow(npc, speed, deltaTime, level);
      tracker.blockedTimer = 0;
    }
  } else {
    tracker.blockedTimer = 0;
  }

  return false;
}

function trackSteeringChase(npc, request, deltaTime, level) {
  const tracker = ensureNpcTrackerState(npc);
  const targetX = request.targetX;
  const targetY = request.targetY;
  const speed = request.speed;
  const dx = targetX - npc.x;
  const dy = targetY - npc.y;
  const tileSize = level?.settings?.baseTile || 16;
  const npcCenterX = npc.x + npc.w / 2;
  const npcCenterY = npc.y + npc.h / 2;
  const targetCenterX = targetX + npc.w / 2;
  const targetCenterY = targetY + npc.h / 2;
  const prevX = npc.x;
  const prevY = npc.y;

  // Box-swept check: can NPC's full collision box traverse a straight line to target?
  const canDirectReach = canBoxTraverseLine(npc, npcCenterX, npcCenterY, targetCenterX, targetCenterY, level);

  // --- Edge follow recovery: cancel when box-traversal regained ---
  if ((tracker.edgeFollowTimer || 0) > 0) {
    if (canDirectReach) {
      tracker.edgeFollowTimer = 0;
    } else {
      const edgeMoved = runEdgeFollow(npc, speed, deltaTime, level);
      if (edgeMoved) {
        tracker.edgeFollowTimer = Math.max(tracker.edgeFollowTimer, 0.3);
        return Math.hypot(targetX - npc.x, targetY - npc.y) <= Math.max(8, speed * deltaTime * 1.5);
      }
      tracker.edgeFollowTimer = 0;
    }
  }

  // --- Direct movement ONLY when NPC box can traverse the entire line to target.
  // No more "hasSight || dist <= directRange" shortcut which caused wall-sticking
  // at diagonal obstacles and 90-degree corners. ---
  if (canDirectReach) {
    const moved = moveToward(npc, targetX, targetY, speed, deltaTime, level, {
      ...request,
      reachThreshold: request.reachThreshold ?? Math.max(6, tileSize * 0.45),
      updateFacing: true
    });
    tracker.path = [];
    tracker.pathIndex = 0;
    tracker.pathTargetKey = '';
    tracker.pathGoalX = targetX;
    tracker.pathGoalY = targetY;
    return moved;
  }

  // --- Always use A* pathfinding when direct box-traversal is not possible ---
  const finished = trackPathSmooth(npc, {
    ...request,
    preferDirectSight: true,
    reachThreshold: request.reachThreshold ?? Math.max(6, tileSize * 0.4),
    repathDistanceThreshold: request.repathDistanceThreshold ?? tileSize * CHASE_REPLAN_TILE_DIST
  }, deltaTime, level);

  // Only start edge follow after sustained blockage
  // Don't start edge follow if NPC is waiting to open a door (doorPhase exists)
  if (!npc.moving && (tracker.blockedTimer || 0) >= BLOCKED_EDGE_FOLLOW_DELAY && !npc.doorPhase) {
    beginEdgeFollow(npc, level, dx, dy, 1.0);
  }
  return finished;
}

function advancePatrolWaypoint(npc, waypoints) {
  if (waypoints.length <= 1) return;
  npc.wpIndex = (npc.wpIndex + 1) % waypoints.length;
}

function trackDirectPatrol(npc, request, deltaTime, level) {
  const waypoints = request.waypoints || [];
  if (!waypoints.length) {
    npc.moving = false;
    return false;
  }
  const target = waypoints[npc.wpIndex] || waypoints[0];
  const reachThreshold = request.reachThreshold ?? Math.max(6, request.speed * deltaTime * 1.5);

  // Use pathfinding to reach patrol waypoint (prevents wall-sticking at corners).
  // trackPathSmooth with preferDirectSight will use canBoxTraverseLine for clear
  // straight lines, and A* pathfinding when obstacles are in the way.
  const arrived = trackPathSmooth(npc, {
    targetX: target.x,
    targetY: target.y,
    speed: request.speed,
    label: `patrol_${npc.wpIndex}`,
    reachThreshold,
    preferDirectSight: true,
    updateFacing: true
  }, deltaTime, level);

  npc.patrolRouteJoined = true;
  if (arrived) advancePatrolWaypoint(npc, waypoints);
  return arrived;
}

TRACKER_ALGORITHMS.set(DEFAULT_TRACKER_PROFILE, trackPathSmooth);
TRACKER_ALGORITHMS.set('steering_chase', trackSteeringChase);
TRACKER_ALGORITHMS.set('patrol_route', trackDirectPatrol);

// Execute the appropriate movement algorithm for an NPC's current request.
export function runNpcTracker(npc, request, deltaTime, level) {
  const tracker = ensureNpcTrackerState(npc);
  // facingHoldTimer is now decayed inside updateFacingSmooth per-frame;
  // only decay here for external callers that use setNpcFacingFromVector directly
  if (!tracker._facingDecayedThisFrame) {
    tracker.facingHoldTimer = Math.max(0, (tracker.facingHoldTimer || 0) - deltaTime);
  }
  tracker._facingDecayedThisFrame = false;
  const profile = request.profile || npc.trackerProfile || DEFAULT_TRACKER_PROFILE;
  if (tracker.profile !== profile) {
    clearNpcTrackerState(npc);
    npc.tracker.profile = profile;
  }
  const implementation = TRACKER_ALGORITHMS.get(profile) || TRACKER_ALGORITHMS.get(DEFAULT_TRACKER_PROFILE);
  return implementation(npc, request, deltaTime, level);
}

// Push overlapping NPCs apart to prevent stacking.
export function applyNpcSeparation(npc, level) {
  const neighbors = level.npcs || [];
  const inPatrolLikeState = npc.state !== 'CHASE';
  const minDist = Math.max(npc.w, npc.h) * (inPatrolLikeState ? 0.72 : 0.9);
  let pushX = 0;
  let pushY = 0;
  for (const other of neighbors) {
    if (other === npc) continue;
    const dx = (npc.x + npc.w / 2) - (other.x + other.w / 2);
    const dy = (npc.y + npc.h / 2) - (other.y + other.h / 2);
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.001 || dist >= minDist) continue;
    const strength = (minDist - dist) / minDist;
    pushX += (dx / dist) * strength;
    pushY += (dy / dist) * strength;
  }
  if (Math.abs(pushX) < 0.001 && Math.abs(pushY) < 0.001) return;
  const tileSize = level?.settings?.baseTile || 16;
  const offsetScale = inPatrolLikeState ? Math.min(1.2, tileSize * 0.08) : Math.min(2.5, tileSize * 0.16);
  const nextX = npc.x + pushX * offsetScale;
  const nextY = npc.y + pushY * offsetScale;
  if (canMoveToRect(npc, nextX, npc.y, level.collision, tileSize, level)) npc.x = nextX;
  if (canMoveToRect(npc, npc.x, nextY, level.collision, tileSize, level)) npc.y = nextY;
}
