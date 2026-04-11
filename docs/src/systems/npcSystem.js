// NPC per-frame update: vision cone, alert escalation, state transitions, movement dispatch.
import { hasLineOfSight } from './collisionSystem.js';
import { castVisionRay } from './collisionSystem.js';
import { updateHumanoidAnimation } from './animationSystem.js';
import {
  NPC_STATES,
  ensureNpcRuntimeState,
  setNpcState,
  updateNpcAlertLevel,
  beginSearchState,
  enterPatrolState,
  shouldEnterChase,
  shouldExitChaseToSearch,
  canStateTransition,
  getNpcStateLabel
} from './npcStateMachine.js';
import {
  ensureNpcTrackerState,
  clearNpcTrackerState,
  runNpcTracker,
  getNpcWorldCenterTarget,
  applyNpcSeparation,
  findNearbyOpenDoor,
  debugTickNpcTracker
} from './npcTrackerSystem.js';
import { DOOR_STATES, DOOR_TIMING } from './doorSystem.js';

function getWaypointTarget(npc) {
  const point = npc.waypoints?.[npc.wpIndex];
  if (!point) return null;
  return point;
}

function getTileCenterTarget(npc, point, level) {
  if (!point) return null;
  const tileSize = level.settings.baseTile || 16;
  const insetX = Math.max(0, npc.collisionInsetX || 0);
  const insetY = Math.max(0, npc.collisionInsetY || 0);
  const safeCenterX = point.x + Math.max(insetX + 1, Math.min(tileSize - insetX - 1, tileSize / 2));
  const safeCenterY = point.y + Math.max(insetY + 1, Math.min(tileSize - insetY - 1, tileSize / 2));
  return getNpcWorldCenterTarget(npc, safeCenterX, safeCenterY);
}

function getPatrolTargets(npc, level) {
  return (npc.waypoints || [])
    .map((point) => getTileCenterTarget(npc, point, level))
    .filter(Boolean);
}

function getSearchMoveTarget(npc) {
  if (!Number.isFinite(npc.searchMoveTargetX) || !Number.isFinite(npc.searchMoveTargetY)) return null;
  return getNpcWorldCenterTarget(npc, npc.searchMoveTargetX, npc.searchMoveTargetY);
}


function getPlayerCenter(player) {
  return { x: player.x + player.w / 2, y: player.y + player.h / 2 };
}

function getNpcCenter(npc) {
  return { x: npc.x + npc.w / 2, y: npc.y + npc.h / 2 };
}

function getRandomSearchPoint(npc, level) {
  const tileSize = level.settings.baseTile || 16;
  const radius = tileSize * 1.1;
  const angle = Math.random() * Math.PI * 2;
  return {
    x: npc.searchTargetX + Math.cos(angle) * radius,
    y: npc.searchTargetY + Math.sin(angle) * radius
  };
}

function getReachableSearchPoint(npc, level) {
  const tileSize = level.settings.baseTile || 16;
  const npcCenter = getNpcCenter(npc);
  const wanderRadius = level.settings.searchRadius || 48;
  // Use searchBase as search origin (different from question mark position during light search)
  const baseX = npc.searchBaseX || npc.lastSeenX;
  const baseY = npc.searchBaseY || npc.lastSeenY;
  for (let i = 0; i < 8; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * wanderRadius;
    const candidateX = baseX + Math.cos(angle) * distance;
    const candidateY = baseY + Math.sin(angle) * distance;
    if (hasLineOfSight(level.collision, npcCenter.x, npcCenter.y, candidateX, candidateY, tileSize, 4, level)) {
      return { x: candidateX, y: candidateY };
    }
  }
  return { x: baseX, y: baseY };
}

function updateGlobalStuckCheck(npc, deltaTime, level) {
  // Stuck recovery is now handled inside the tracker layer (updateStuckDetection +
  // performStuckRecovery in npcTrackerSystem.js) with progressive tiers:
  //   Tier 1: force path replan after 0.8s stuck
  //   Tier 2: perpendicular nudge after 1.8s stuck
  //   Tier 3: edge follow as last resort
  // This global check only maintains the sampling counters for external monitoring;
  // it no longer destroys tracker state, which was a root cause of path-wipe loops.
  npc.stuckSampleTimer = (npc.stuckSampleTimer || 0) + deltaTime;
  npc.stuckOriginX ??= npc.x;
  npc.stuckOriginY ??= npc.y;
  if (npc.stuckSampleTimer < 1) return;
  npc.stuckSampleTimer = 0;
  npc.stuckOriginX = npc.x;
  npc.stuckOriginY = npc.y;
}

function clearRecoveryMonitor(npc) {
  npc.idleRecoveryTimer = 0;
  npc.stuckSampleTimer = 0;
  npc.stuckOriginX = npc.x;
  npc.stuckOriginY = npc.y;
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

function getNpcVisionSpread() {
  return Math.PI / 2;
}

function getNpcVisionRange(npc, level) {
  return level.roomSystem.getNpcVisionRange(npc, level.settings.visionRange || 112);
}

export function isPointInsideNpcVision(npc, targetX, targetY, level) {
  return isPointInsideVisionCone(npc, targetX, targetY, level);
}

function isPointInsideVisionCone(npc, targetX, targetY, level) {
  const npcCenter = getNpcCenter(npc);
  const dx = targetX - npcCenter.x;
  const dy = targetY - npcCenter.y;
  const dist = Math.hypot(dx, dy);
  const visionRange = getNpcVisionRange(npc, level);
  if (dist > visionRange) return false;

  const heading = getFacingHeading(npc.facing);
  const targetAngle = Math.atan2(dy, dx);
  const spread = getNpcVisionSpread();
  const delta = Math.abs(normalizeAngle(targetAngle - heading));
  return delta <= spread / 2;
}

export function getNpcVisionPolygon(npc, level) {
  const npcCenter = getNpcCenter(npc);
  const range = getNpcVisionRange(npc, level);
  const spread = getNpcVisionSpread();
  const heading = getFacingHeading(npc.facing);
  const startAngle = heading - spread / 2;
  const endAngle = heading + spread / 2;
  const tileSize = level?.settings?.baseTile || 16;
  const step = Math.max(2, Math.round(tileSize / 6));
  const angleStep = 0.01;
  const points = [];

  for (let angle = startAngle; angle <= endAngle + 0.0001; angle += angleStep) {
    const hit = castVisionRay(level, npcCenter.x, npcCenter.y, angle, range, tileSize, step);
    points.push({ x: hit.x, y: hit.y });
  }

  const finalHit = castVisionRay(level, npcCenter.x, npcCenter.y, endAngle, range, tileSize, step);
  const lastPoint = points[points.length - 1];
  if (!lastPoint || Math.hypot(lastPoint.x - finalHit.x, lastPoint.y - finalHit.y) > 0.5) {
    points.push({ x: finalHit.x, y: finalHit.y });
  }

  return {
    origin: npcCenter,
    range,
    spread,
    heading,
    points
  };
}

function getDetectionPoint(npc, player, level) {
  const center = getPlayerCenter(player);
  if (isPointInsideVisionCone(npc, center.x, center.y, level)) return center;
  return null;
}

function findTrackableFootstep(npc, level) {
  const npcCenter = getNpcCenter(npc);
  const footsteps = level.player?.footsteps || [];
  const searchRadius = level.settings.searchRadius || getNpcVisionRange(npc, level);
  let best = null;
  let bestDist = Infinity;

  for (let i = footsteps.length - 1; i >= 0; i -= 1) {
    const footstep = footsteps[i];
    const dist = Math.hypot(footstep.x - npcCenter.x, footstep.y - npcCenter.y);
    if (dist > searchRadius) continue;
    if (!isPointInsideVisionCone(npc, footstep.x, footstep.y, level)) continue;
    if (!hasLineOfSight(level.collision, npcCenter.x, npcCenter.y, footstep.x, footstep.y, level.settings.baseTile, 4, level)) continue;
    if (dist < bestDist) {
      best = footstep;
      bestDist = dist;
    }
  }

  return best;
}

function consumeLightSearchTrigger(npc, level) {
  const task = npc.roomLightResponse;
  if (!task) return false;
  const tileSize = level.settings.baseTile || 16;
  const searchBaseX = task.buttonX;
  const searchBaseY = task.buttonY + tileSize * 2;
  beginSearchState(npc, task.buttonX, task.buttonY, 'LIGHT', level, { searchBaseX, searchBaseY });
  clearNpcTrackerState(npc);
  npc.roomLightResponse = null;
  return true;
}

function updateSearchScan(npc, deltaTime, level) {
  // For LIGHT search: go directly to button position (searchBaseX/Y) using smart pathfinding
  // For other searches: use random wandering behavior
  const isLightSearch = npc.searchReason === 'LIGHT';

  if (isLightSearch) {
    const tileSize = level.settings.baseTile || 16;

    // Phase 1: Navigate to button area using smart pathfinding
    if (npc.searchTimer === -1) {
      const targetX = npc.searchBaseX ?? npc.searchTargetX;
      const targetY = npc.searchBaseY ?? npc.searchTargetY;
      runNpcTracker(npc, {
        profile: 'patrol_route',
        targetX,
        targetY,
        speed: npc.speedPatrol || 48,
        label: 'light_search',
        axisBias: 1.35,
        reachThreshold: tileSize * 0.5,
        preferDirectSight: true,
        waypoints: [{ x: targetX, y: targetY }]
      }, deltaTime, level);
      return;
    }

    // Phase 2: Countdown active - random wandering near button area
    if (npc.searchTimer > 0) {
      npc.searchScanStepTimer = Math.max(0, (npc.searchScanStepTimer || 0) - deltaTime);
      const needsNewTarget = !Number.isFinite(npc.searchMoveTargetX)
        || !Number.isFinite(npc.searchMoveTargetY)
        || npc.searchScanStepTimer <= 0;
      if (needsNewTarget) {
        // Generate random point near button (searchBaseX/Y)
        const baseX = npc.searchBaseX ?? npc.x;
        const baseY = npc.searchBaseY ?? npc.y;
        const wanderRadius = tileSize * 3; // Wander within 3 tiles of button
        for (let i = 0; i < 8; i += 1) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * wanderRadius;
          const candidateX = baseX + Math.cos(angle) * distance;
          const candidateY = baseY + Math.sin(angle) * distance;
          const npcCenter = { x: npc.x + npc.w / 2, y: npc.y + npc.h / 2 };
          if (hasLineOfSight(level.collision, npcCenter.x, npcCenter.y, candidateX, candidateY, tileSize, 4, level)) {
            npc.searchMoveTargetX = candidateX;
            npc.searchMoveTargetY = candidateY;
            break;
          }
        }
        npc.searchScanStepTimer = 0.5;
      }
      const moveTarget = getSearchMoveTarget(npc);
      if (moveTarget) {
        runNpcTracker(npc, {
          profile: 'patrol_route',
          targetX: moveTarget.x,
          targetY: moveTarget.y,
          speed: npc.speedPatrol || 48,
          label: 'light_wander',
          axisBias: 1.35,
          reachThreshold: 8,
          waypoints: [moveTarget]
        }, deltaTime, level);
      }
      return;
    }
  }

  // Original random wandering for non-LIGHT searches
  npc.searchScanStepTimer = Math.max(0, (npc.searchScanStepTimer || 0) - deltaTime);
  const needsNewTarget = !Number.isFinite(npc.searchMoveTargetX)
    || !Number.isFinite(npc.searchMoveTargetY)
    || npc.searchScanStepTimer <= 0;
  if (needsNewTarget) {
    const target = getReachableSearchPoint(npc, level);
    npc.searchMoveTargetX = target.x;
    npc.searchMoveTargetY = target.y;
    npc.searchScanStepTimer = 0.5;
  }
  const moveTarget = getSearchMoveTarget(npc);
  if (!moveTarget) {
    npc.moving = false;
    return;
  }
  runNpcTracker(npc, {
    profile: 'patrol_route',
    targetX: moveTarget.x,
    targetY: moveTarget.y,
    speed: npc.speedPatrol || 48,
    label: 'search',
    axisBias: 1.35,
    reachThreshold: 8,
    waypoints: [moveTarget]
  }, deltaTime, level);
}

export function updateNpcs(level, deltaTime) {
  debugTickNpcTracker(deltaTime);
  let detectedBy = null;
  const now = Date.now();
  for (const npc of level.npcs) {
    ensureNpcRuntimeState(npc, now);
    ensureNpcTrackerState(npc);

    const detectionPoint = getDetectionPoint(npc, level.player, level);
    const seesPlayer = !!detectionPoint && hasLineOfSight(level.collision, getNpcCenter(npc).x, getNpcCenter(npc).y, detectionPoint.x, detectionPoint.y, level.settings.baseTile, 4, level);
    updateNpcAlertLevel(npc, seesPlayer, deltaTime);
    if (seesPlayer) {
      npc.lastSeenX = detectionPoint.x;
      npc.lastSeenY = detectionPoint.y;
    }

    if (canStateTransition(npc, now) && shouldExitChaseToSearch(npc, seesPlayer) && npc.lastSeenX && npc.lastSeenY) {
      console.log(`%c[DEBUG STATE] NPC=${npc.id} CHASE→SEARCH (lost sight) pos=(${npc.x.toFixed(1)},${npc.y.toFixed(1)}) lastSeen=(${npc.lastSeenX.toFixed(1)},${npc.lastSeenY.toFixed(1)})`, 'color: #e91e63; font-weight: bold');
      beginSearchState(npc, npc.lastSeenX, npc.lastSeenY, 'PLAYER_LAST_SEEN', level);
      clearNpcTrackerState(npc);
    }

    if (canStateTransition(npc, now) && npc.state === NPC_STATES.PATROL && consumeLightSearchTrigger(npc, level)) {
      // light-triggered search applied above
    } else if (canStateTransition(npc, now) && npc.state === NPC_STATES.PATROL) {
      // Check if in dark room, go turn on light if so
      const roomId = level.roomSystem.getActorRoomId(npc);
      if (!level.roomSystem.isLit(roomId)) {
        const button = level.roomSystem.buttons.find(b => b.roomId === roomId);
        if (button) {
          const tileSize = level.settings.baseTile || 16;
          // Question mark at button position, but actual search point is 2 rows below button
          const searchBaseX = button.centerX;
          const searchBaseY = button.centerY + tileSize * 2;
          beginSearchState(npc, button.centerX, button.centerY, 'LIGHT', level, { searchBaseX, searchBaseY });
          clearNpcTrackerState(npc);
        }
      }
    }

    if (canStateTransition(npc, now) && npc.state === NPC_STATES.PATROL) {
      const trackableFootstep = findTrackableFootstep(npc, level);
      if (trackableFootstep) {
        beginSearchState(npc, trackableFootstep.x, trackableFootstep.y, 'FOOTSTEP', level);
        clearNpcTrackerState(npc);
      }
    }

    if (canStateTransition(npc, now) && shouldEnterChase(npc, seesPlayer)) {
      if (npc.state !== NPC_STATES.CHASE) {
        console.log(`%c[DEBUG STATE] NPC=${npc.id} ${npc.state}→CHASE seesPlayer=${seesPlayer} pos=(${npc.x.toFixed(1)},${npc.y.toFixed(1)})`, 'color: #f44336; font-weight: bold');
        setNpcState(npc, NPC_STATES.CHASE);
        clearNpcTrackerState(npc);
        npc.roomLightResponse = null;
      }
    }

    if (npc.state === NPC_STATES.CHASE) {
      const playerCenter = getPlayerCenter(level.player);
      const chaseTarget = getNpcWorldCenterTarget(npc, playerCenter.x, playerCenter.y);
      if (!npc._dbgChaseFrame) npc._dbgChaseFrame = 0;
      npc._dbgChaseFrame++;
      if (npc._dbgChaseFrame % 3 === 0) {
        console.log(`[DEBUG CHASE TARGET] NPC=${npc.id} playerCenter=(${playerCenter.x.toFixed(2)},${playerCenter.y.toFixed(2)}) chaseTarget=(${chaseTarget.x.toFixed(2)},${chaseTarget.y.toFixed(2)}) playerPos=(${level.player.x.toFixed(2)},${level.player.y.toFixed(2)}) npcPos=(${npc.x.toFixed(2)},${npc.y.toFixed(2)}) npcW=${npc.w} npcH=${npc.h} insetX=${npc.collisionInsetX} insetY=${npc.collisionInsetY}`);
      }
      runNpcTracker(npc, {
        profile: 'steering_chase',
        targetX: chaseTarget.x,
        targetY: chaseTarget.y,
        speed: npc.speedChase || 82,
        label: 'chase',
        repathDistanceThreshold: level.settings.baseTile * 2.25,
        axisBias: 1.5,
        minimumEdgeFollowSeconds: 0.45,
        directRange: level.settings.baseTile * 5.5
      }, deltaTime, level);
      if (Math.hypot(playerCenter.x - (npc.x + npc.w / 2), playerCenter.y - (npc.y + npc.h / 2)) < 12) {
        detectedBy = npc.id;
      }
    } else if (npc.state === NPC_STATES.SEARCH) {
      // Light search: start countdown only when near actual search point
      if (npc.searchReason === 'LIGHT' && npc.searchTimer === -1) {
        const distToSearchBase = Math.hypot(npc.x + npc.w / 2 - npc.searchBaseX, npc.y + npc.h / 2 - npc.searchBaseY);
        if (distToSearchBase < level.settings.baseTile * 2) {
          npc.searchTimer = 2; // start 2 second random search
        }
      }
      if (npc.searchTimer > 0) {
        npc.searchTimer -= deltaTime;
      }
      if (npc.searchTimer <= 0 && npc.searchTimer > -1 && canStateTransition(npc, now)) {
        // If light search, turn on light or keep it on when done
        if (npc.searchReason === 'LIGHT') {
          const button = level.roomSystem.buttons.find(b => Math.hypot(b.centerX - npc.searchTargetX, b.centerY - npc.searchTargetY) < 1);
          if (button) level.roomSystem.consumeButtonResponse(button, 'npc');
        }
        if (npc.doorCloseTarget && npc.doorCloseTarget.state === DOOR_STATES.OPEN) {
          level.doorSystem.close(npc.doorCloseTarget);
        }
        npc.doorCloseTarget = null;
        enterPatrolState(npc);
        clearNpcTrackerState(npc);
        clearRecoveryMonitor(npc);
      } else {
        updateSearchScan(npc, deltaTime, level);
      }
    } else {
      // Patrol: detect nearby open doors → search near door, then close
      if (canStateTransition(npc, now) && !npc.doorPhase) {
        const openDoor = findNearbyOpenDoor(npc, level);
        if (openDoor) {
          beginSearchState(npc, openDoor.centerX, openDoor.centerY, 'OPEN_DOOR', level);
          clearNpcTrackerState(npc);
          npc.doorCloseTarget = openDoor;
        }
      }

      const patrolTargets = getPatrolTargets(npc, level);
      const point = patrolTargets[npc.wpIndex] || patrolTargets[0] || null;
      if (point) {
        if (!npc.patrolRouteJoined) {
          const rejoined = runNpcTracker(npc, {
            profile: 'path_smooth',
            targetX: point.x,
            targetY: point.y,
            speed: npc.speedPatrol || 55,
            label: 'patrol_rejoin',
            axisBias: 1.35,
            preferDirectSight: true,
            reachThreshold: 6,
            repathDistanceThreshold: level.settings.baseTile * 0.75
          }, deltaTime, level);
          if (rejoined) {
            npc.patrolRouteJoined = true;
            clearRecoveryMonitor(npc);
            clearNpcTrackerState(npc);
          }
        } else {
          runNpcTracker(npc, {
            profile: 'patrol_route',
            targetX: point.x,
            targetY: point.y,
            speed: npc.speedPatrol || 55,
            label: 'patrol',
            axisBias: 1.35,
            reachThreshold: 6,
            waypoints: patrolTargets
          }, deltaTime, level);
          if (npc.moving) clearRecoveryMonitor(npc);
        }
      }
    }

    updateGlobalStuckCheck(npc, deltaTime, level);
    applyNpcSeparation(npc, level);

    npc.characterType = 'npc';
    npc.stateLabel = getNpcStateLabel(npc);
    npc.characterVariant = npc.state === NPC_STATES.CHASE ? 'chase' : npc.state === NPC_STATES.SEARCH ? 'search' : 'patrol';
    npc.vision = getNpcVisionPolygon(npc, level);
    updateHumanoidAnimation(npc, deltaTime, !!npc.moving, npc.facing || 'down', {
      frameCount: 4,
      walkFrameDuration: npc.state === NPC_STATES.CHASE ? 0.08 : 0.12,
      idleFrameDuration: 0.38,
      interactFrameDuration: 0.085,
      alertFrameDuration: npc.state === NPC_STATES.CHASE ? 0.075 : 0.095,
      bobAmount: npc.state === NPC_STATES.CHASE ? 2.0 : 1.2,
      walkFrames: [0, 1, 2, 1],
      idleFrames: [0, 0, 3, 0],
      interactFrames: [0, 1, 2, 3],
      alertFrames: [3, 2, 3, 1],
      modeOverride: npc.state === NPC_STATES.CHASE || npc.state === NPC_STATES.SEARCH ? 'alert' : undefined,
      variant: npc.characterVariant
    });
  }
  return detectedBy;
}
