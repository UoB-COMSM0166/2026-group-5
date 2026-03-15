
(() => {
  'use strict';

  let mapRenderer = null;
  let showCollision = false;
  let currentMapConfig = null;
  let npcs = [];
  let player = {};
  let doors = [];
  let chests = [];
  let mapSettings = {};
  let collision = [];
  let entityData = { doors: [], chests: [] };
  let rows = 0;
  let cols = 0;
  let baseTile = 16;
  let currentLevel = 1;
  let roomLightCamera = null;
  const keys = Object.create(null);
  let lastT = 0;
  let message = '';
  let messageTimer = 0;



  function waypoint(tx, ty) {
    return { x: tx * baseTile + baseTile / 2, y: ty * baseTile + baseTile / 2 };
  }

  function loadMapConfig(mapConfig) {
    currentMapConfig = mapConfig;
    
    // Load player config
    player = { ...mapConfig.player };
    
    // Load map settings
    mapSettings = { ...mapConfig.settings };
    baseTile = mapSettings.baseTile || 16;
    
    // Load the collision matrix
    collision = mapConfig.collisionMatrix || [];
    rows = collision.length;
    cols = rows ? collision[0].length : 0;
    
    // Load entity config
    entityData = mapConfig.entities || { doors: [], chests: [] };
    
    // Load NPC config and convert waypoints to pixel space
    npcs = mapConfig.npcs.map(npcConfig => ({
      ...npcConfig,
      x: npcConfig.x * baseTile,
      y: npcConfig.y * baseTile,
      waypoints: npcConfig.waypoints.map(wp => {
        return waypoint(wp.x, wp.y);
      })
    }));
    
    // Build runtime entity state
    doors = (entityData.doors || []).map(d => ({
      id: d.id,
      kind: d.kind,
      tiles: d.tiles,
      open: false
    }));
    
    chests = (entityData.chests || []).map(c => ({
      id: c.id,
      x: c.x,
      y: c.y,
      opened: false
    }));

    roomLightCamera = typeof RoomLightCamera !== 'undefined'
      ? RoomLightCamera.createSystem({
          level: currentLevel,
          collisionMatrix: collision,
          doors,
          npcs,
          baseTile,
          setMessage
        })
      : null;
  }

  const state = {
    openedChests: 0,
    nearestDoor: null,
    nearestChest: null,
    prompt: '',
    nearestLightButton: null,
    playerDetected: false,
    staminaRecoverCooldown: 0,
    footsteps: [],
    lastFootstepX: null,
    lastFootstepY: null,
    lastFootstepAt: 0,
    footstepTrailX: null,
    footstepTrailY: null,
    footstepSide: 1
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function getNpcVisionRange(npc) {
    const baseRange = mapSettings.visionRange || 112;
    if (!roomLightCamera) return baseRange;
    return roomLightCamera.getNpcVisionRange(npc, baseRange);
  }

  function hudInfo() {
    const tx = Math.floor((player.x + player.w / 2) / baseTile);
    const ty = Math.floor((player.y + player.h / 2) / baseTile);
    const chasing = npcs.filter(n => n.state === 'CHASE').length;
    const debug = document.getElementById('debug-info');
    if (debug) {
      debug.textContent =
        `player=(${player.x.toFixed(1)}, ${player.y.toFixed(1)}) tile=(${tx}, ${ty}) scale=${mapRenderer ? mapRenderer.scale.toFixed(2) : '1.00'} collision=${showCollision} chests=${state.openedChests}/${chests.length} chasing=${chasing}`;
    }
  }

  function setMessage(text, seconds = 1.3) {
    message = text;
    messageTimer = seconds;
  }

  function isSolidTile(tx, ty) {
    if (ty < 0 || ty >= rows || tx < 0 || tx >= cols) return true;
    return collision[ty][tx] === 1;
  }

  function setSolidTile(tx, ty, solid) {
    if (ty < 0 || ty >= rows || tx < 0 || tx >= cols) return;
    collision[ty][tx] = solid ? 1 : 0;
  }

  function rectHitsCollision(x, y, w, h) {
    const left = Math.floor(x / baseTile);
    const right = Math.floor((x + w - 1) / baseTile);
    const top = Math.floor(y / baseTile);
    const bottom = Math.floor((y + h - 1) / baseTile);
    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (isSolidTile(tx, ty)) return true;
      }
    }
    return false;
  }

  function rectIntersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function tileRect(tx, ty) {
    return { x: tx * baseTile, y: ty * baseTile, w: baseTile, h: baseTile };
  }

  function playerCenter() {
    return { x: player.x + player.w / 2, y: player.y + player.h / 2 };
  }

  function npcCenter(npc) {
    return { x: npc.x + npc.w / 2, y: npc.y + npc.h / 2 };
  }

  function findSpawn() {
    const s = currentMapConfig?.defaultSpawn || { x: 1, y: 1 };
    player.x = s.x * baseTile + 3;
    player.y = s.y * baseTile + 1;
  }

  function moveActor(actor, dx, dy) {
    const nextX = actor.x + dx;
    const nextY = actor.y + dy;
    if (!rectHitsCollision(nextX, actor.y, actor.w, actor.h)) {
      actor.x = nextX;
    }
    if (!rectHitsCollision(actor.x, nextY, actor.w, actor.h)) {
      actor.y = nextY;
    }
    const maxX = cols * baseTile - actor.w;
    const maxY = rows * baseTile - actor.h;
    actor.x = clamp(actor.x, 0, maxX);
    actor.y = clamp(actor.y, 0, maxY);
  }

  function updatePlayer(dt) {
    let ix = 0, iy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) ix -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) ix += 1;
    if (keys['ArrowUp'] || keys['KeyW']) iy -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) iy += 1;

    const len = Math.hypot(ix, iy) || 1;
    ix /= len;
    iy /= len;

    let speed = player.speed;
    const wantsSprint = keys['ShiftLeft'] || keys['ShiftRight'];
    const hasMoveInput = Math.abs(ix) > 0.001 || Math.abs(iy) > 0.001;
    const sprinting = wantsSprint && hasMoveInput && player.stamina > 0;
    if (sprinting) speed *= player.sprint;

    // Store the player position before movement
    const oldX = player.x;
    const oldY = player.y;
    const oldCenterX = oldX + player.w / 2;
    const oldCenterY = oldY + player.h / 2;

    moveActor(player, ix * speed * dt, iy * speed * dt);

    // Check whether the player moved
    const moved = Math.abs(player.x - oldX) > 0.1 || Math.abs(player.y - oldY) > 0.1;
    const newCenterX = player.x + player.w / 2;
    const newCenterY = player.y + player.h / 2;

    if (sprinting) {
      state.staminaRecoverCooldown = player.staminaRecoverDelay;
      if (moved) {
        player.stamina = Math.max(0, player.stamina - player.staminaDrain * dt);
      }
    } else {
      state.staminaRecoverCooldown = Math.max(0, state.staminaRecoverCooldown - dt);
      if (state.staminaRecoverCooldown <= 0) {
        player.stamina = Math.min(player.staminaMax, player.stamina + player.staminaRecover * dt);
      }
    }
    
    if (moved) {
      // Always leave footsteps while sprinting
      if (sprinting) {
        addFootstepsAlongPath(oldCenterX, oldCenterY, newCenterX, newCenterY, ix, iy);
      } else {
        // When not sprinting, only leave footsteps if an NPC can see the player
        let playerSeen = false;
        for (const npc of npcs) {
          if (canSeePlayer(npc)) {
            playerSeen = true;
            break;
          }
        }
        
        if (playerSeen) {
          addFootstepsAlongPath(oldCenterX, oldCenterY, newCenterX, newCenterY, ix, iy);
        } else {
          state.footstepTrailX = null;
          state.footstepTrailY = null;
        }
      }
    } else {
      state.footstepTrailX = null;
      state.footstepTrailY = null;
    }
  }

  function addFootstepsAlongPath(startX, startY, endX, endY, dirX, dirY) {
    const stride = mapSettings.footstepStride || 7;

    if (state.footstepTrailX === null || state.footstepTrailY === null) {
      state.footstepTrailX = startX;
      state.footstepTrailY = startY;
      addFootstep(startX, startY, dirX, dirY);
    }

    let dx = endX - state.footstepTrailX;
    let dy = endY - state.footstepTrailY;
    let dist = Math.hypot(dx, dy);

    if (dist < stride) return;

    while (dist >= stride) {
      const ux = dx / dist;
      const uy = dy / dist;
      state.footstepTrailX += ux * stride;
      state.footstepTrailY += uy * stride;
      addFootstep(state.footstepTrailX, state.footstepTrailY, dirX, dirY);
      dx = endX - state.footstepTrailX;
      dy = endY - state.footstepTrailY;
      dist = Math.hypot(dx, dy);
    }
  }

  // Add a footstep
  function addFootstep(x, y, dirX, dirY) {
    const now = Date.now();
    let fx = 0;
    let fy = 1;

    let nx = 0;
    let ny = -1;
    const dirLen = Math.hypot(dirX, dirY);
    if (dirLen > 0.001) {
      fx = dirX / dirLen;
      fy = dirY / dirLen;
      nx = -dirY / dirLen;
      ny = dirX / dirLen;
    }

    const sideOffset = 3;
    const backOffset = 6;
    const offsetX = nx * sideOffset * state.footstepSide;
    const offsetY = ny * sideOffset * state.footstepSide;

    const footstep = {
      x: x + offsetX - fx * backOffset,
      y: y + offsetY - fy * backOffset,
      timestamp: now
    };
    state.footsteps.push(footstep);
    state.lastFootstepX = footstep.x;
    state.lastFootstepY = footstep.y;
    state.lastFootstepAt = now;
    state.footstepSide *= -1;
    
    // Limit the footstep count
    const maxFootsteps = mapSettings.maxFootsteps || 50;
    if (state.footsteps.length > maxFootsteps) {
      state.footsteps.shift();
    }
  }

  // Update footsteps and remove expired entries
  function updateFootsteps(dt) {
    const now = Date.now();
    const lifetime = mapSettings.footstepLifetime || 3000; // Read lifetime from config
    
    // Sort by time so older footsteps fade first
    state.footsteps.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove expired footsteps
    state.footsteps = state.footsteps.filter(footstep => {
      return now - footstep.timestamp < lifetime;
    });

    if (state.footsteps.length === 0) {
      state.lastFootstepX = null;
      state.lastFootstepY = null;
      state.lastFootstepAt = 0;
      state.footstepTrailX = null;
      state.footstepTrailY = null;
      state.footstepSide = 1;
    }
  }

  function updateInteractionTargets() {
    state.nearestDoor = null;
    state.nearestChest = null;
    state.nearestLightButton = null;
    state.prompt = '';

    const pc = playerCenter();
    let bestDoorDist = Infinity;
    for (const door of doors) {
      let best = Infinity;
      for (const t of door.tiles) {
        const cx = t.x * baseTile + baseTile / 2;
        const cy = t.y * baseTile + baseTile / 2;
        const d = Math.hypot(pc.x - cx, pc.y - cy);
        if (d < best) best = d;
      }
      if (best < bestDoorDist && best <= 24) {
        bestDoorDist = best;
        state.nearestDoor = door;
      }
    }

    let bestChestDist = Infinity;
    for (const chest of chests) {
      if (chest.opened) continue;
      const cx = chest.x * baseTile + baseTile / 2;
      const cy = chest.y * baseTile + baseTile / 2;
      const d = Math.hypot(pc.x - cx, pc.y - cy);
      if (d < bestChestDist && d <= 22) {
        bestChestDist = d;
        state.nearestChest = chest;
      }
    }

    if (state.nearestChest) {
      state.prompt = 'Press E to open chest';
    } else if (state.nearestDoor) {
      state.prompt = state.nearestDoor.open ? 'Press E to close door' : 'Press E to open door';
    }

    if (roomLightCamera) {
      roomLightCamera.updateInteractionState(state, player);
    }
  }

  function canCloseDoor(door) {
    for (const t of door.tiles) {
      const rect = tileRect(t.x, t.y);
      if (rectIntersects(player, rect)) return false;
      for (const npc of npcs) {
        if (rectIntersects(npc, rect)) return false;
      }
    }
    return true;
  }

  function toggleDoor(door) {
    if (!door) return;
    if (door.open) {
      if (!canCloseDoor(door)) {
        setMessage('Someone is blocking the doorway');
        return;
      }
      for (const t of door.tiles) setSolidTile(t.x, t.y, true);
      door.open = false;
      setMessage('Door closed');
    } else {
      for (const t of door.tiles) setSolidTile(t.x, t.y, false);
      door.open = true;
      setMessage('Door opened');
    }
  }

  function openChest(chest) {
    if (!chest || chest.opened) return;
    chest.opened = true;
    state.openedChests += 1;
    setMessage(`Chest opened ${state.openedChests}/${chests.length}`);
  }

  function tryInteract() {
    if (state.nearestChest) {
      openChest(state.nearestChest);
      return;
    }
    if (roomLightCamera && roomLightCamera.tryInteract(player, state)) {
      return;
    }
    if (state.nearestDoor) {
      toggleDoor(state.nearestDoor);
      return;
    }
  }

function lineOfSight(x0, y0, x1, y1) {
  // Convert to tile coordinates
  let tx0 = Math.floor(x0 / baseTile);
  let ty0 = Math.floor(y0 / baseTile);
  const tx1 = Math.floor(x1 / baseTile);
  const ty1 = Math.floor(y1 / baseTile);

  // Use a Bresenham-style line trace for visibility checks
  let dx = Math.abs(tx1 - tx0);
  let dy = Math.abs(ty1 - ty0);
  let sx = tx0 < tx1 ? 1 : -1;
  let sy = ty0 < ty1 ? 1 : -1;
  let err = dx - dy;

  let x = tx0;
  let y = ty0;

  while (!(x === tx1 && y === ty1)) {
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx)  { err += dx; y += sy; }

      // Stop before testing the target tile itself as a blocker
      if (x === tx1 && y === ty1) break;

      // Test whether the current tile blocks line of sight
      if (isVisionBlocker(x, y)) return false;
  }
  return true;
}

// Check whether a tile blocks vision, including walls and closed doors
function isVisionBlocker(tx, ty) {
  if (ty < 0 || ty >= rows || tx < 0 || tx >= cols) return true;
  
  // Check walls
  if (collision[ty][tx] === 1) return true;
  
  // Check closed doors
  for (const door of doors) {
    if (door.tiles) {
      for (const tile of door.tiles) {
        if (tile.x === tx && tile.y === ty && !door.open) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Get the visible area polygon for an NPC
function getVisibleArea(npc) {
  const nc = npcCenter(npc);
  const range = getNpcVisionRange(npc); // Read vision range from config
  const stepSize = 2; // Smaller steps produce a smoother result
  
  // Select the vision arc from the NPC facing direction
  let startAngle, endAngle;
  switch(npc.facing) {
    case 'RIGHT':
      startAngle = -Math.PI/4; endAngle = Math.PI/4;
      break;
    case 'DOWN':
      startAngle = Math.PI/4; endAngle = 3*Math.PI/4;
      break;
    case 'LEFT':
      startAngle = 3*Math.PI/4; endAngle = 5*Math.PI/4;
      break;
    case 'UP':
      startAngle = -3*Math.PI/4; endAngle = -Math.PI/4;
      break;
  }
  
  // Collect polygon points
  const pathPoints = [];
  
  // Scan the arc and keep the farthest visible point per angle
  const angleStep = 0.01; // Smaller steps produce smoother edges
  for (let angle = startAngle; angle <= endAngle; angle += angleStep) {
    let maxDist = 0;
    
    // Find the farthest visible point for this angle
    for (let dist = stepSize; dist <= range; dist += stepSize) {
      const px = nc.x + Math.cos(angle) * dist;
      const py = nc.y + Math.sin(angle) * dist;
      
      if (hasLineOfSightToPixel(nc.x, nc.y, px, py)) {
        maxDist = dist;
      } else {
        break; // Stop once the ray is blocked
      }
    }
    
    if (maxDist > 0) {
      const px = nc.x + Math.cos(angle) * maxDist;
      const py = nc.y + Math.sin(angle) * maxDist;
      pathPoints.push({ x: px, y: py });
    }
  }
  
  return pathPoints;
}

// Get visible pixels for an NPC at higher sampling density
function getVisiblePixels(npc) {
  const nc = npcCenter(npc);
  const range = getNpcVisionRange(npc); // Read vision range from config
  const stepSize = 4; // Smaller values are more precise
  
  const visiblePixels = [];
  
  // Select the vision arc from the NPC facing direction
  let startAngle, endAngle;
  switch(npc.facing) {
    case 'RIGHT':
      startAngle = -Math.PI/4; endAngle = Math.PI/4;
      break;
    case 'DOWN':
      startAngle = Math.PI/4; endAngle = 3*Math.PI/4;
      break;
    case 'LEFT':
      startAngle = 3*Math.PI/4; endAngle = 5*Math.PI/4;
      break;
    case 'UP':
      startAngle = -3*Math.PI/4; endAngle = -Math.PI/4;
      break;
  }
  
  // Sample the arc at a higher density
  const angleStep = 0.02; // Smaller values create smoother edges
  for (let angle = startAngle; angle <= endAngle; angle += angleStep) {
    for (let dist = stepSize; dist <= range; dist += stepSize) {
      const px = nc.x + Math.cos(angle) * dist;
      const py = nc.y + Math.sin(angle) * dist;
      
      // Test whether the sampled pixel is visible
      if (hasLineOfSightToPixel(nc.x, nc.y, px, py)) {
        visiblePixels.push({ x: px, y: py });
      } else {
        // Stop stepping along this angle once blocked
        break;
      }
    }
  }
  
  return visiblePixels;
}

// Check line of sight to a pixel target
function hasLineOfSightToPixel(x0, y0, x1, y1) {
  // Use a finer Bresenham-style trace
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (!(Math.abs(x - x1) < 2 && Math.abs(y - y1) < 2)) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx)  { err += dx; y += sy; }

    // Test whether the current pixel falls inside a blocking tile
    const tileX = Math.floor(x / baseTile);
    const tileY = Math.floor(y / baseTile);
    if (isVisionBlocker(tileX, tileY)) return false;
  }
  return true;
}

// Get visible tiles for an NPC, accounting for blockers
function getVisibleTiles(npc) {
  const nc = npcCenter(npc);
  const npcTileX = Math.floor(nc.x / baseTile);
  const npcTileY = Math.floor(nc.y / baseTile);
  const range = Math.floor(getNpcVisionRange(npc) / baseTile); // Convert vision range to tile count
  
  const visibleTiles = [];
  
  // Build candidate tiles from the facing direction
  const candidates = getVisionCandidates(npcTileX, npcTileY, range, npc.facing);
  
  // Keep only candidates that remain visible
  for (const tile of candidates) {
    if (tile.x >= 0 && tile.x < cols && tile.y >= 0 && tile.y < rows) {
      if (hasLineOfSightToTile(npcTileX, npcTileY, tile.x, tile.y)) {
        visibleTiles.push(tile);
      }
    }
  }
  
  return visibleTiles;
}

// Build candidate vision tiles in a quarter-cone
function getVisionCandidates(x, y, range, facing) {
  const candidates = [];
  
  for (let i = 1; i <= range; i++) {
    const half = Math.min(2, Math.floor(i / 2)); // Expand the cone with distance
    
    switch(facing) {
      case 'UP':
        for (let dx = -half; dx <= half; dx++) {
          candidates.push({ x: x + dx, y: y - i });
        }
        break;
      case 'DOWN':
        for (let dx = -half; dx <= half; dx++) {
          candidates.push({ x: x + dx, y: y + i });
        }
        break;
      case 'LEFT':
        for (let dy = -half; dy <= half; dy++) {
          candidates.push({ x: x - i, y: y + dy });
        }
        break;
      case 'RIGHT':
        for (let dy = -half; dy <= half; dy++) {
          candidates.push({ x: x + i, y: y + dy });
        }
        break;
    }
  }
  
  return candidates;
}

// Check line of sight to a tile target
function hasLineOfSightToTile(x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (!(x === x1 && y === y1)) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx)  { err += dx; y += sy; }

    if (x === x1 && y === y1) break;
    
    if (isVisionBlocker(x, y)) return false;
  }
  return true;
}

// Get the NPC alert level from 0 to 3
function getAlertLevel(npc) {
  if (npc.alert >= 50) return 3;
  if (npc.alert >= 40) return 2;
  if (npc.alert >= 20) return 1;
  return 0;
}

function isPointVisibleToNPC(npc, px, py) {
  const nc = npcCenter(npc);
  const dx = px - nc.x;
  const dy = py - nc.y;
  const dist = Math.hypot(dx, dy);
  if (dist > getNpcVisionRange(npc)) return false;

  const angle = Math.atan2(dy, dx);
  let minAngle, maxAngle;

  switch(npc.facing) {
    case 'RIGHT':
      minAngle = -Math.PI / 4;
      maxAngle = Math.PI / 4;
      break;
    case 'DOWN':
      minAngle = Math.PI / 4;
      maxAngle = 3 * Math.PI / 4;
      break;
    case 'LEFT':
      minAngle = 3 * Math.PI / 4;
      maxAngle = 5 * Math.PI / 4;
      break;
    case 'UP':
      minAngle = -3 * Math.PI / 4;
      maxAngle = -Math.PI / 4;
      break;
  }

  let normalizedAngle = angle;
  if (normalizedAngle > Math.PI) normalizedAngle -= 2 * Math.PI;
  if (normalizedAngle < -Math.PI) normalizedAngle += 2 * Math.PI;

  let inRange = false;
  if (minAngle <= maxAngle) {
    inRange = normalizedAngle >= minAngle && normalizedAngle <= maxAngle;
  } else {
    inRange = normalizedAngle >= minAngle || normalizedAngle <= maxAngle;
  }

  if (!inRange) return false;

  return hasLineOfSightToPixel(nc.x, nc.y, px, py);
}

function canSeePlayer(npc) {
  const samplePoints = [
    { x: player.x + player.w / 2, y: player.y + player.h / 2 },
    { x: player.x + 1, y: player.y + 1 },
    { x: player.x + player.w - 1, y: player.y + 1 },
    { x: player.x + 1, y: player.y + player.h - 1 },
    { x: player.x + player.w - 1, y: player.y + player.h - 1 },
    { x: player.x + player.w / 2, y: player.y + 1 },
    { x: player.x + player.w / 2, y: player.y + player.h - 1 },
    { x: player.x + 1, y: player.y + player.h / 2 },
    { x: player.x + player.w - 1, y: player.y + player.h / 2 }
  ];

  for (const point of samplePoints) {
    if (isPointVisibleToNPC(npc, point.x, point.y)) {
      return true;
    }
  }

  return false;
}

function seek(npc, tx, ty, speed, dt) {
  const nc = npcCenter(npc);
  const dx = tx - nc.x;
  const dy = ty - nc.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;

  const ux = dx / dist;
  const uy = dy / dist;
  if (Math.abs(ux) > Math.abs(uy)) npc.facing = ux >= 0 ? 'RIGHT' : 'LEFT';
  else npc.facing = uy >= 0 ? 'DOWN' : 'UP';

  moveActor(npc, ux * speed * dt, uy * speed * dt);
  return dist < 8;
}

function updateNPC(npc, dt) {
  const sees = canSeePlayer(npc);

  // Alert meter system
  if (sees) {
    // Increase alert faster while the player is visible
    npc.alert = Math.min(100, npc.alert + 8); // Fast reaction rate
    npc.loseSight = 0;
    
    // Keep the latest known player position up to date
    const pc = playerCenter();
    npc.lastSeenX = pc.x;
    npc.lastSeenY = pc.y;
  } else {
    // Reduce alert after losing sight
    npc.alert = Math.max(0, npc.alert - 0.5); // Gradual decay
    npc.loseSight += 1;
  }

  // State machine with priority-based transitions
  if (sees && npc.state !== 'CHASE') {
    // Switch to chase immediately after spotting the player
    npc.state = 'CHASE';
    if (roomLightCamera) roomLightCamera.onNpcChase(npc);
  } else if (!sees && npc.state === 'CHASE') {
    // Enter search after losing sight during a chase
    npc.state = 'SEARCH';
    npc.searchTimer = mapSettings.searchDuration || 3; // Read search time from config
    npc.searchWanderTimer = 0; // Reset wander timer
    
    // Set the search center to the last known player position
    npc.searchTargetX = npc.lastSeenX;
    npc.searchTargetY = npc.lastSeenY;
    
    // Create a yellow question-mark marker
    npc.searchMarker = {
      x: npc.lastSeenX,
      y: npc.lastSeenY,
      timestamp: Date.now()
    };
  } else if (npc.state === 'SEARCH') {
    if (roomLightCamera && roomLightCamera.updateNpcLightTask(npc, seek, dt)) {
      return;
    }
    // Wander near the search center while searching
    npc.searchTimer -= dt;
    npc.searchWanderTimer += dt;
    
    // Pick a new random search target every 0.5 seconds
    if (npc.searchWanderTimer >= 0.5) {
      npc.searchWanderTimer = 0;
      
      // Pick a random point around the search center
      const wanderRadius = mapSettings.searchRadius || 48; // Read wander radius from config
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * wanderRadius;
      
      npc.searchTargetX = npc.lastSeenX + Math.cos(angle) * distance;
      npc.searchTargetY = npc.lastSeenY + Math.sin(angle) * distance;
    }
    
    // Move toward the current search target
    seek(npc, npc.searchTargetX, npc.searchTargetY, npc.speedPatrol, dt);
    
    // Return to patrol after the search timer ends
    if (npc.searchTimer <= 0) {
      npc.state = 'PATROL';
      npc.searchMarker = null; // Clear the search marker
      if (roomLightCamera) roomLightCamera.onNpcPatrolReset(npc);
    }
  } else if (npc.state === 'PATROL') {
    // Clear the search marker while patrolling
    npc.searchMarker = null;
    if (roomLightCamera) roomLightCamera.onNpcPatrolReset(npc);
  }

  if (npc.state === 'PATROL') {
    const target = npc.waypoints[npc.wpIndex];
    if (seek(npc, target.x, target.y, npc.speedPatrol, dt)) {
      npc.wpIndex = (npc.wpIndex + 1) % npc.waypoints.length;
    }
  } else if (npc.state === 'CHASE') {
    seek(npc, npc.lastSeenX, npc.lastSeenY, npc.speedChase, dt);
  }
  // Search behavior is already handled by the state machine
}

function updateNPCs(dt) {
  // Update the existing NPC system
  state.playerDetected = false;
  for (const npc of npcs) {
    updateNPC(npc, dt);
    if (npc.state === 'CHASE') state.playerDetected = true;
  }
}

function drawPlayer(ctx, scale) {
  ctx.save();
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x * scale, player.y * scale, player.w * scale, player.h * scale);
  ctx.fillStyle = '#0d3';
  ctx.fillRect((player.x + 2) * scale, (player.y + 2) * scale, 2 * scale, 2 * scale);
  ctx.fillRect((player.x + player.w - 4) * scale, (player.y + 2) * scale, 2 * scale, 2 * scale);
  ctx.restore();
}

function drawNPCs(ctx, scale) {
  ctx.save();
  for (const npc of npcs) {
    // Draw the continuous vision shadow
    const visibleArea = getVisibleArea(npc);
    const nc = npcCenter(npc);
    
    if (visibleArea.length > 0) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.12)'; // Semi-transparent red
      ctx.beginPath();
      
      // Start from the NPC center
      ctx.moveTo(nc.x * scale, nc.y * scale);
      
      // Draw the vision boundary
      for (const point of visibleArea) {
        ctx.lineTo(point.x * scale, point.y * scale);
      }
      
      // Close the path back to the NPC center
      ctx.closePath();
      ctx.fill();
    }

    const color = npc.state === 'CHASE' ? '#ff5555' : (npc.state === 'SEARCH' ? '#ffbb55' : '#ff77aa');
    ctx.fillStyle = color;
    ctx.fillRect(npc.x * scale, npc.y * scale, npc.w * scale, npc.h * scale);

    // facing indicator
    ctx.fillStyle = '#222';
    if (npc.facing === 'LEFT') ctx.fillRect(npc.x * scale, (npc.y + 4) * scale, 2 * scale, 2 * scale);
    if (npc.facing === 'RIGHT') ctx.fillRect((npc.x + npc.w - 2) * scale, (npc.y + 4) * scale, 2 * scale, 2 * scale);
    if (npc.facing === 'UP') ctx.fillRect((npc.x + 4) * scale, npc.y * scale, 2 * scale, 2 * scale);
    if (npc.facing === 'DOWN') ctx.fillRect((npc.x + 4) * scale, (npc.y + npc.h - 2) * scale, 2 * scale, 2 * scale);

    // debug sight cone line
    const c = npcCenter(npc);
    ctx.strokeStyle = npc.state === 'CHASE' ? 'rgba(255,100,100,.75)' : 'rgba(255,255,255,.25)';
    ctx.lineWidth = Math.max(1, scale);
    ctx.beginPath();
    ctx.moveTo(c.x * scale, c.y * scale);
    if (npc.facing === 'LEFT') ctx.lineTo((c.x - 14) * scale, c.y * scale);
    if (npc.facing === 'RIGHT') ctx.lineTo((c.x + 14) * scale, c.y * scale);
    if (npc.facing === 'UP') ctx.lineTo(c.x * scale, (c.y - 14) * scale);
    if (npc.facing === 'DOWN') ctx.lineTo(c.x * scale, (c.y + 14) * scale);
    ctx.stroke();

    // Live alert bar
    const barW = 18 * scale;
    const barH = 3 * scale;
    const barX = (npc.x + npc.w / 2) * scale - barW / 2;
    const barY = (npc.y - 8) * scale;
    const alertRatio = clamp(npc.alert / 100, 0, 1);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(barX, barY, barW, barH);

    const r = Math.floor(255 * alertRatio);
    const g = Math.floor(220 * (1 - alertRatio));
    ctx.fillStyle = `rgb(${r}, ${g}, 0)`;
    ctx.fillRect(barX, barY, barW * alertRatio, barH);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    
    // Draw the orange search marker
    if (npc.searchMarker) {
      const markerX = Math.floor(npc.searchMarker.x / baseTile) * baseTile * scale;
      const markerY = Math.floor(npc.searchMarker.y / baseTile) * baseTile * scale;
      
      ctx.fillStyle = '#ff6600'; // Orange
      ctx.font = `${12 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', markerX + baseTile * scale / 2, markerY + baseTile * scale / 2);
    }
  }
  ctx.restore();
}

function drawCollision(ctx, scale) {
  if (!showCollision || !collision.length) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 60, 60, 0.28)';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (collision[y][x] === 1) {
        ctx.fillRect(x * baseTile * scale, y * baseTile * scale, baseTile * scale, baseTile * scale);
      }
    }
  }
  ctx.restore();
}

function drawEntities(ctx, scale) {
  ctx.save();

  for (const door of doors) {
    if (!door.open) continue;
    ctx.fillStyle = 'rgba(80, 200, 255, 0.28)';
    ctx.strokeStyle = 'rgba(120, 230, 255, 0.85)';
    ctx.lineWidth = Math.max(1, scale);
    for (const t of door.tiles) {
      ctx.fillRect(t.x * baseTile * scale, t.y * baseTile * scale, baseTile * scale, baseTile * scale);
      ctx.strokeRect(t.x * baseTile * scale + 1, t.y * baseTile * scale + 1, baseTile * scale - 2, baseTile * scale - 2);
    }
  }

  for (const chest of chests) {
    const x = chest.x * baseTile * scale;
    const y = chest.y * baseTile * scale;
    if (chest.opened) {
      ctx.fillStyle = 'rgba(255, 220, 120, 0.20)';
      ctx.strokeStyle = 'rgba(255, 220, 120, 0.95)';
    } else {
      ctx.fillStyle = 'rgba(255, 180, 40, 0.18)';
      ctx.strokeStyle = 'rgba(255, 180, 40, 0.95)';
    }
    ctx.lineWidth = Math.max(1, scale);
    ctx.fillRect(x, y, baseTile * scale, baseTile * scale);
    ctx.strokeRect(x + 1, y + 1, baseTile * scale - 2, baseTile * scale - 2);
    if (chest.opened) {
      ctx.beginPath();
      ctx.moveTo(x + 3 * scale, y + 8 * scale);
      ctx.lineTo(x + 7 * scale, y + 12 * scale);
      ctx.lineTo(x + 13 * scale, y + 4 * scale);
      ctx.stroke();
    }
  }

  if (state.nearestDoor) {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(1, scale);
    for (const t of state.nearestDoor.tiles) {
      ctx.strokeRect(t.x * baseTile * scale + 1, t.y * baseTile * scale + 1, baseTile * scale - 2, baseTile * scale - 2);
    }
  }
  if (state.nearestChest) {
    const x = state.nearestChest.x * baseTile * scale;
    const y = state.nearestChest.y * baseTile * scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(1, scale);
    ctx.strokeRect(x + 1, y + 1, baseTile * scale - 2, baseTile * scale - 2);
  }

  ctx.restore();
}

function drawUI() {
  const info = document.getElementById('info');
  if (!info) return;
  let promptLine = state.prompt ? `<p>${state.prompt}</p>` : '<p>Press E near a door, chest, or light button to interact.</p>';
  let msgLine = message ? `<p>${message}</p>` : '';
  let danger = state.playerDetected ? '<p style="color:#ff8080;">Alert: you have been spotted</p>' : '<p style="color:#9fd4ff;">Status: hidden</p>';
  const staminaRatio = clamp(player.stamina / player.staminaMax, 0, 1);
  const staminaColor = staminaRatio > 0.5 ? '#79f28a' : (staminaRatio > 0.2 ? '#ffd166' : '#ff7b7b');
  const staminaPercent = Math.round(staminaRatio * 100);
  info.innerHTML = `
    <p>
      Map Size: <span id="map-size">${cols}×${rows}</span> |
      Tile Size: <span id="tile-size">${baseTile}</span> |
      Doors: <span id="door-count">${doors.length}</span> |
      Chests: <span id="chest-count">${state.openedChests}/${chests.length}</span> |
      NPCs: <span id="npc-count">${npcs.length}</span>
    </p>
    <p>Move with WASD or arrow keys. Shift to sprint, E to interact, ~ to toggle collision.</p>
    <div style="margin:8px 0 10px 0; max-width:220px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; color:#e8f1ff;">
        <span>Stamina</span>
        <span>${staminaPercent}%</span>
      </div>
      <div style="height:12px; background:#1f2430; border:1px solid rgba(255,255,255,0.18); border-radius:999px; overflow:hidden;">
        <div style="height:100%; width:${staminaPercent}%; background:${staminaColor}; box-shadow:0 0 8px ${staminaColor};"></div>
      </div>
    </div>
    ${danger}
    ${promptLine}
    ${msgLine}
  `;
}

// Draw footsteps
function drawFootsteps(ctx, scale) {
  if (state.footsteps.length === 0) return;
  
  ctx.save();
  
  for (const footstep of state.footsteps) {
    const now = Date.now();
    const age = now - footstep.timestamp;
    const lifetime = 3000;
    const t = clamp(age / lifetime, 0, 1);
    const opacity = (1 - t) * (1 - t) * 0.9;
    const drawX = footstep.x * scale;
    const drawY = footstep.y * scale;
    const baseDotSize = 3;
    const dotSize = baseDotSize * (1 - t * 0.2) * scale;

    ctx.fillStyle = `rgba(255, 255, 150, ${opacity})`;
    ctx.beginPath();
    ctx.arc(drawX, drawY, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

function afterRender() {
  if (!mapRenderer || !mapRenderer.ctx) return;
  drawCollision(mapRenderer.ctx, mapRenderer.scale);
  drawEntities(mapRenderer.ctx, mapRenderer.scale);
  if (roomLightCamera) roomLightCamera.draw(mapRenderer.ctx, mapRenderer.scale, state);
  drawFootsteps(mapRenderer.ctx, mapRenderer.scale);
  drawNPCs(mapRenderer.ctx, mapRenderer.scale);
  drawPlayer(mapRenderer.ctx, mapRenderer.scale);
  hudInfo();
  drawUI();
}

function frame(ts) {
  if (!lastT) lastT = ts;
  const dt = Math.min((ts - lastT) / 1000, 1 / 20);
  lastT = ts;

  updatePlayer(dt);
  updateNPCs(dt);
  updateFootsteps(dt);
  updateInteractionTargets();

  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) message = '';
  }

  if (mapRenderer && mapRenderer.isReady) {
    mapRenderer.render();
    afterRender();
  }
  requestAnimationFrame(frame);
}

async function initGame(level = 1) {
  try {
    currentLevel = level;
    // Use the map manager to switch levels
    if (typeof mapManager !== 'undefined') {
      const config = mapManager.switchToLevel(level);
      loadMapConfig(config);
    } else if (level === 1 && window.Map1Config) {
      // Fallback: load Map1Config directly
      loadMapConfig(window.Map1Config);
    } else {
      throw new Error(`Config file for level ${level} was not found`);
    }

    // Level-to-map name mapping
    const mapNames = {
      1: 'basic test',
      2: 'map2bomp_merged_colormap',
      3: 'map3_generated_colormap'
    };

    const mapName = mapNames[level];
    if (!mapName) {
      throw new Error(`Level ${level} is not available yet`);
    }

    mapRenderer = new TiledMapRenderer('mapCanvas', mapName);
    await mapRenderer.init();
    findSpawn();

    document.getElementById('loading').style.display = 'none';
    document.getElementById('zoomInBtn').addEventListener('click', () => mapRenderer.setZoom(mapRenderer.scale * 1.2));
    document.getElementById('zoomOutBtn').addEventListener('click', () => mapRenderer.setZoom(mapRenderer.scale / 1.2));
    document.getElementById('resetBtn').addEventListener('click', () => mapRenderer.resetView());
    document.getElementById('gridBtn').addEventListener('click', () => mapRenderer.toggleGrid());
    document.getElementById('collisionBtn').addEventListener('click', () => { showCollision = !showCollision; });

    drawUI();
    requestAnimationFrame(frame);
  } catch (err) {
    console.error(err);
    const loading = document.getElementById('loading');
    loading.textContent = 'Load failed: ' + err.message;
    loading.style.color = '#ff8080';
  }
}

// Keep backward compatibility
async function init() {
  await initGame(1);
}

// Expose the entry point for the page
window.initGame = initGame;

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === 'Backquote') showCollision = !showCollision;
  if (e.code === 'KeyE' && !e.repeat) tryInteract();
}, { passive:false });

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

window.addEventListener('blur', () => {
  for (const key in keys) keys[key] = false;
});

window.addEventListener('load', init);
})();
