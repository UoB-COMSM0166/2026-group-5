// NPC movement tracker: pathfinding dispatch, edge-following, collision sliding, facing.
import { hasLineOfSight, canMoveToRect } from './collisionSystem.js';
import { findPath, getActorTilePosition, getPointTilePosition, tilePathToWorldPath } from './pathfindingSystem.js';

const TRACKER_ALGORITHMS = new Map();
const DEFAULT_TRACKER_PROFILE = 'path_smooth';

const EDGE_FOLLOW_DIRECTIONS = [
  { x: 1, y: 0, facing: 'right' },
  { x: -1, y: 0, facing: 'left' },
  { x: 0, y: 1, facing: 'down' },
  { x: 0, y: -1, facing: 'up' }
];

export function registerNpcTracker(name, implementation) {
  if (!name || typeof implementation !== 'function') return;
  TRACKER_ALGORITHMS.set(name, implementation);
}

export function clearNpcTrackerState(npc) {
  npc.tracker = {
    profile: npc.tracker?.profile || DEFAULT_TRACKER_PROFILE,
    path: [],
    pathIndex: 0,
    pathTargetKey: '',
    pathReplanCooldown: 0,
    pathGoalX: undefined,
    pathGoalY: undefined,
    edgeFollowTimer: 0,
    edgeFollowDirX: 0,
    edgeFollowDirY: 0,
    edgeFacing: '',
    steeringTurnTimer: 0,
    lastMoveX: 0,
    lastMoveY: 0,
    patrolJoinIndex: -1,
    blockedTimer: 0,
    facingHoldTimer: 0
  };
}

export function ensureNpcTrackerState(npc) {
  if (npc.tracker) return npc.tracker;
  clearNpcTrackerState(npc);
  return npc.tracker;
}

function trySetFacing(npc, newFacing) {
  if (!newFacing) return;
  const tracker = npc.tracker;
  if (tracker && (tracker.facingHoldTimer || 0) > 0) return;
  if (npc.facing === newFacing) return;
  npc.facing = newFacing;
  if (tracker) tracker.facingHoldTimer = 0.2;
}

export function setNpcFacingFromVector(npc, dx, dy) {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
  const angle = Math.atan2(dy, dx);
  const absAngle = Math.abs(angle);
  let newFacing;
  if (absAngle <= Math.PI / 4) newFacing = 'right';
  else if (absAngle >= 3 * Math.PI / 4) newFacing = 'left';
  else if (angle > 0) newFacing = 'down';
  else newFacing = 'up';
  trySetFacing(npc, newFacing);
}

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
      const steps = Math.max(1, Math.ceil(dist / Math.max(4, tileSize * 0.35)));
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

function moveToward(npc, targetX, targetY, speed, deltaTime, level, options = {}) {
  const dx = targetX - npc.x;
  const dy = targetY - npc.y;
  const dist = Math.hypot(dx, dy);
  const reachThreshold = options.reachThreshold ?? Math.max(4, speed * deltaTime * 1.1);
  if (dist <= reachThreshold) {
    npc.moving = false;
    return true;
  }
  const stepDistance = Math.min(dist, speed * deltaTime);
  const vx = (dx / dist) * stepDistance;
  const vy = (dy / dist) * stepDistance;
  const tileSize = level?.settings?.baseTile || 16;

  const okBoth = canMoveToRect(npc, npc.x + vx, npc.y + vy, level.collision, tileSize, level);
  if (okBoth) {
    npc.x += vx;
    npc.y += vy;
    npc.moving = true;
    npc.tracker.lastMoveX = vx;
    npc.tracker.lastMoveY = vy;
    if (options.updateFacing !== false) setNpcFacingFromVector(npc, dx, dy);
    return false;
  }

  if (!canMoveToRect(npc, npc.x + vx, npc.y, level.collision, tileSize, level)
    && !canMoveToRect(npc, npc.x, npc.y + vy, level.collision, tileSize, level)) {
    tryOpenBlockingDoor(npc, level);
  }

  const okX = vx !== 0 && canMoveToRect(npc, npc.x + vx, npc.y, level.collision, tileSize, level);
  const okY = vy !== 0 && canMoveToRect(npc, npc.x, npc.y + vy, level.collision, tileSize, level);

  if (okX && !okY) {
    const slideX = Math.sign(vx) * stepDistance;
    const safeX = canMoveToRect(npc, npc.x + slideX, npc.y, level.collision, tileSize, level) ? slideX : vx;
    npc.x += safeX;
    npc.moving = true;
    npc.tracker.lastMoveX = safeX;
    npc.tracker.lastMoveY = 0;
    if (options.updateFacing !== false) setNpcFacingFromVector(npc, safeX, 0);
    return false;
  }

  if (okY && !okX) {
    const slideY = Math.sign(vy) * stepDistance;
    const safeY = canMoveToRect(npc, npc.x, npc.y + slideY, level.collision, tileSize, level) ? slideY : vy;
    npc.y += safeY;
    npc.moving = true;
    npc.tracker.lastMoveX = 0;
    npc.tracker.lastMoveY = safeY;
    if (options.updateFacing !== false) setNpcFacingFromVector(npc, 0, safeY);
    return false;
  }

  if (okX && okY) {
    npc.x += vx;
    npc.y += vy;
    npc.moving = true;
    npc.tracker.lastMoveX = vx;
    npc.tracker.lastMoveY = vy;
    if (options.updateFacing !== false) setNpcFacingFromVector(npc, dx, dy);
    return false;
  }

  npc.moving = false;
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
  if (!fallback) return false;
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
  const path = findPath(level, npc, startTile, goalTile, { tileSize });
  tracker.path = simplifyWorldPath(
    npc,
    tilePathToWorldPath(path, tileSize).map((node) => getSafeTileWorldTarget(npc, node.tx, node.ty, tileSize)),
    level
  );
  tracker.pathIndex = tracker.path.length > 1 ? 1 : 0;
  tracker.pathTargetKey = toTargetKey(goalTile.tx, goalTile.ty, label);
  tracker.pathReplanCooldown = 0.35;
  tracker.pathGoalX = targetX;
  tracker.pathGoalY = targetY;
  return tracker.path.length > 0;
}

function followCurrentPath(npc, tracker, speed, deltaTime, level, targetX, targetY, options = {}) {
  if (!tracker.path.length || tracker.pathIndex >= tracker.path.length) {
    npc.moving = false;
    return true;
  }
  const node = tracker.path[tracker.pathIndex];
  const isFinalNode = tracker.pathIndex >= tracker.path.length - 1;
  const waypointX = isFinalNode ? targetX : node.x;
  const waypointY = isFinalNode ? targetY : node.y;
  const reached = moveToward(npc, waypointX, waypointY, speed, deltaTime, level, options);
  if (!reached) return false;
  tracker.pathIndex += 1;
  if (tracker.pathIndex >= tracker.path.length) {
    npc.moving = false;
    return true;
  }
  return false;
}

function trackPathSmooth(npc, request, deltaTime, level) {
  const tracker = ensureNpcTrackerState(npc);
  const tileSize = level?.settings?.baseTile || 16;
  const targetX = request.targetX;
  const targetY = request.targetY;
  const speed = request.speed;
  const label = request.label || 'target';
  tracker.pathReplanCooldown = Math.max(0, (tracker.pathReplanCooldown || 0) - deltaTime);

  if (request.preferDirectSight) {
    const npcCenterX = npc.x + npc.w / 2;
    const npcCenterY = npc.y + npc.h / 2;
    const targetCenterX = targetX + npc.w / 2;
    const targetCenterY = targetY + npc.h / 2;
    const hasSight = hasLineOfSight(level.collision, npcCenterX, npcCenterY, targetCenterX, targetCenterY, tileSize, 4, level);
    if (hasSight) {
      tracker.path = [];
      tracker.pathIndex = 0;
      tracker.pathTargetKey = '';
      tracker.pathGoalX = targetX;
      tracker.pathGoalY = targetY;
      return moveToward(npc, targetX, targetY, speed, deltaTime, level, request);
    }
  }

  const goalTile = getPointTilePosition(targetX, targetY, tileSize);
  const targetKey = toTargetKey(goalTile.tx, goalTile.ty, label);
  const repathDistanceThreshold = request.repathDistanceThreshold ?? tileSize * 0.75;
  const targetShift = Math.hypot((tracker.pathGoalX ?? targetX) - targetX, (tracker.pathGoalY ?? targetY) - targetY);
  const targetMovedFarEnough = targetShift >= repathDistanceThreshold;
  const shouldRebuild = !tracker.path.length
    || tracker.pathTargetKey !== targetKey
    || tracker.pathIndex >= tracker.path.length
    || (targetMovedFarEnough && tracker.pathReplanCooldown <= 0)
    || request.forceRepath;

  if (shouldRebuild) {
    const built = computePathToPoint(npc, tracker, targetX, targetY, level, label);
    if (!built) {
      clearNpcTrackerState(npc);
      return moveToward(npc, targetX, targetY, speed, deltaTime, level, request);
    }
  }

  const finished = followCurrentPath(npc, tracker, speed, deltaTime, level, targetX, targetY, request);
  if (finished) return Math.hypot(targetX - npc.x, targetY - npc.y) <= (request.reachThreshold ?? Math.max(6, speed * deltaTime * 1.5));

  if (!npc.moving) {
    tracker.blockedTimer = (tracker.blockedTimer || 0) + deltaTime;
    if (tracker.blockedTimer >= 0.15) {
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
  const dist = Math.hypot(dx, dy);
  const tileSize = level?.settings?.baseTile || 16;
  const directRange = request.directRange ?? tileSize * 5.5;
  const npcCenterX = npc.x + npc.w / 2;
  const npcCenterY = npc.y + npc.h / 2;
  const targetCenterX = targetX + npc.w / 2;
  const targetCenterY = targetY + npc.h / 2;
  const hasSight = hasLineOfSight(level.collision, npcCenterX, npcCenterY, targetCenterX, targetCenterY, tileSize, 4, level);

  if ((tracker.edgeFollowTimer || 0) > 0) {
    if (hasSight) {
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

  const shouldUseDirect = hasSight || dist <= directRange;

  if (shouldUseDirect) {
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
    if (!npc.moving) beginEdgeFollow(npc, level, dx, dy, 1.5);
    return moved;
  }

  const finished = trackPathSmooth(npc, {
    ...request,
    preferDirectSight: true,
    reachThreshold: request.reachThreshold ?? Math.max(6, tileSize * 0.4),
    repathDistanceThreshold: request.repathDistanceThreshold ?? tileSize * 2.25
  }, deltaTime, level);

  if (!npc.moving) beginEdgeFollow(npc, level, dx, dy, 1.5);
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
  const arrived = moveToward(npc, target.x, target.y, request.speed, deltaTime, level, {
    axisBias: request.axisBias ?? 1.35,
    reachThreshold,
    updateFacing: true
  });
  npc.patrolRouteJoined = true;
  if (arrived) advancePatrolWaypoint(npc, waypoints);
  return arrived;
}

TRACKER_ALGORITHMS.set(DEFAULT_TRACKER_PROFILE, trackPathSmooth);
TRACKER_ALGORITHMS.set('steering_chase', trackSteeringChase);
TRACKER_ALGORITHMS.set('patrol_route', trackDirectPatrol);

export function runNpcTracker(npc, request, deltaTime, level) {
  const tracker = ensureNpcTrackerState(npc);
  tracker.facingHoldTimer = Math.max(0, (tracker.facingHoldTimer || 0) - deltaTime);
  const profile = request.profile || npc.trackerProfile || DEFAULT_TRACKER_PROFILE;
  if (tracker.profile !== profile) {
    clearNpcTrackerState(npc);
    npc.tracker.profile = profile;
  }
  const implementation = TRACKER_ALGORITHMS.get(profile) || TRACKER_ALGORITHMS.get(DEFAULT_TRACKER_PROFILE);
  return implementation(npc, request, deltaTime, level);
}

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
