// Door system: sliding doors with state machine LOCKED / CLOSED / OPEN.
//
// Door entity fields:
//   state     – 'LOCKED' | 'CLOSED' | 'OPEN'
//   panels    – 'single' | 'double'
//   slideDir  – 'left'|'right'|'up'|'down'  (single-door slide direction)
//   keyId     – string | null  (which key unlocks this door; null = any key)
//   anim      – 0 (closed) → 1 (fully open)
//   cooldown  – seconds remaining before next state change allowed (≥ 0.2s)
//   solid     – true when collision tiles are active (LOCKED/CLOSED at anim=0)
//
// Timing constants (exported for NPC use):
export const DOOR_TIMING = Object.freeze({
  MIN_STATE: 0.2,
  NPC_OPEN:  0.5,
  NPC_PASS:  0.2,
  NPC_CLOSE: 0.5,
  CHASE_NPC_OPEN: 0.5 // Chase state NPC takes 0.5 second to open doors
});

export const DOOR_STATES = Object.freeze({
  LOCKED: 'LOCKED',
  CLOSED: 'CLOSED',
  OPEN:   'OPEN'
});


function layerNameMatches(layer, names) {
  return names.has(String(layer.name || '').toLowerCase());
}

function getCell(layer, width, x, y) {
  return layer.data[y * width + x] || 0;
}

function resolveSlideDir(source) {
  return source?.slideDir || 'left';
}

function resolvePanels(source, width, height) {
  if (source?.panels) return source.panels;
  return (width >= 2 && height >= 2) ? 'double' : 'single';
}

function inferInitialState(tiles, collision, sourceLocked) {
  const tilesPassable = Array.isArray(collision) && collision.length
    && tiles.every((t) => collision?.[t.y]?.[t.x] === 0);
  if (tilesPassable) return DOOR_STATES.OPEN;
  if (sourceLocked === false) return DOOR_STATES.CLOSED;
  return DOOR_STATES.LOCKED;
}

function setDoorTilesSolid(door, collision, solid) {
  if (!Array.isArray(collision) || !collision.length || !door?.tiles) return;
  for (const tile of door.tiles) {
    if (collision[tile.y] && typeof collision[tile.y][tile.x] !== 'undefined') {
      collision[tile.y][tile.x] = solid ? 1 : 0;
    }
  }
}


function isEntityOnDoorTiles(entity, door, tileSize) {
  const left  = Math.floor(entity.x / tileSize);
  const right = Math.floor((entity.x + entity.w - 1) / tileSize);
  const top   = Math.floor(entity.y / tileSize);
  const bot   = Math.floor((entity.y + entity.h - 1) / tileSize);
  return door.tiles.some(t => t.x >= left && t.x <= right && t.y >= top && t.y <= bot);
}

function pushEntityFromDoor(entity, door, tileSize, collision) {
  const ecx = entity.x + entity.w / 2;
  const ecy = entity.y + entity.h / 2;
  const doorTileSet = new Set(door.tiles.map(t => `${t.x},${t.y}`));
  const candidates = [];
  for (const tile of door.tiles) {
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nx = tile.x + dx;
      const ny = tile.y + dy;
      if (doorTileSet.has(`${nx},${ny}`)) continue;
      if (!collision?.[ny] || collision[ny][nx] !== 0) continue;
      candidates.push({ x: nx, y: ny });
    }
  }
  if (!candidates.length) return null;
  let best = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    const cx = (c.x + 0.5) * tileSize;
    const cy = (c.y + 0.5) * tileSize;
    const d  = (cx - ecx) ** 2 + (cy - ecy) ** 2;
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return {
    targetX: (best.x + 0.5) * tileSize - entity.w / 2,
    targetY: (best.y + 0.5) * tileSize - entity.h / 2
  };
}

// Slide direction vectors
const SLIDE_VECTORS = {
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 }
};

// Double doors always split left / right
const DOUBLE_SPLIT = { a: { dx: -1, dy: 0 }, b: { dx: 1, dy: 0 } };

function makeDoor({ id, x, y, w, h, panels, slideDir, initialState, keyId, tiles }, tileSize) {
  const isOpen = initialState === DOOR_STATES.OPEN;
  return {
    id,
    x, y, w, h,
    panels,
    slideDir,
    state: initialState,
    keyId: keyId || null,
    anim: isOpen ? 1 : 0,
    cooldown: 0,
    solid: !isOpen,
    slideOffsetX: 0,
    slideOffsetY: 0,
    panelA: { ox: 0, oy: 0 },
    panelB: { ox: 0, oy: 0 },
    tiles,
    centerX: (x + w / 2) * tileSize,
    centerY: (y + h / 2) * tileSize
  };
}


export function createDoorSystem(mapData, tileSize = 16, seededDoors = [], collision = null) {
  const doors = [];

  for (const source of seededDoors || []) {
    const tiles = (source.tiles || []).map((t) => ({ x: t.x, y: t.y }));
    if (!tiles.length) continue;
    const minX = Math.min(...tiles.map((t) => t.x));
    const minY = Math.min(...tiles.map((t) => t.y));
    const maxX = Math.max(...tiles.map((t) => t.x));
    const maxY = Math.max(...tiles.map((t) => t.y));
    const w = (maxX - minX) + 1;
    const h = (maxY - minY) + 1;
    const initialState = source.state
      ? source.state
      : inferInitialState(tiles, collision, source.locked);
    doors.push(makeDoor({
      id: source.id || `door-${doors.length + 1}`,
      x: minX, y: minY, w, h,
      panels: resolvePanels(source, w, h),
      slideDir: resolveSlideDir(source),
      initialState,
      keyId: source.keyId,
      tiles,
    }, tileSize));
  }

  if (doors.length) return api(doors, tileSize, collision);
  if (!mapData?.layers) return api(doors, tileSize, collision);

  const layers = mapData.layers.filter((l) => l.type === 'tilelayer' && Array.isArray(l.data));
  const width = mapData.width || 0;
  const height = mapData.height || 0;
  const validNames = new Set(['door', 'door_lateral', 'door_vertical']);
  const seen = new Set();

  // Helper to infer slide direction from layer name
  function inferSlideDirFromLayer(layerName, w, h) {
    const name = String(layerName || '').toLowerCase();
    if (name.includes('vertical')) return 'up';
    if (name.includes('lateral')) return 'left';
    // Default: infer from aspect ratio (tall doors slide up, wide doors slide left)
    if (h > w) return 'up';
    return 'left';
  }

  for (const layer of layers) {
    if (!layerNameMatches(layer, validNames)) continue;

    // 2×2 doors (GID 59-62)
    for (let y = 0; y < height - 1; y += 1) {
      for (let x = 0; x < width - 1; x += 1) {
        const key = `${layer.name}:${x},${y}`;
        if (seen.has(key)) continue;
        const g = getCell(layer, width, x, y);
        const gR = getCell(layer, width, x + 1, y);
        const gB = getCell(layer, width, x, y + 1);
        const gBR = getCell(layer, width, x + 1, y + 1);
        if (g === 59 && gR === 60 && gB === 61 && gBR === 62) {
          const tiles = [{ x, y }, { x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }];
          tiles.forEach((t) => seen.add(`${layer.name}:${t.x},${t.y}`));
          const slideDir = inferSlideDirFromLayer(layer.name, 2, 2);
          doors.push(makeDoor({
            id: `door2x2-${doors.length + 1}`,
            x, y, w: 2, h: 2,
            panels: 'double', slideDir,
            initialState: inferInitialState(tiles, collision, undefined),
            keyId: null, tiles,
          }, tileSize));
        }
      }
    }

    // 1×2 doors (GID 83-84)
    for (let y = 0; y < height - 1; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const key = `${layer.name}:${x},${y}`;
        if (seen.has(key)) continue;
        const g = getCell(layer, width, x, y);
        const gB = getCell(layer, width, x, y + 1);
        if (g === 83 && (gB === 84 || gB === 83)) {
          const tiles = [{ x, y }, { x, y: y + 1 }];
          tiles.forEach((t) => seen.add(`${layer.name}:${t.x},${t.y}`));
          const slideDir = inferSlideDirFromLayer(layer.name, 1, 2);
          doors.push(makeDoor({
            id: `door1x2-${doors.length + 1}`,
            x, y, w: 1, h: 2,
            panels: 'single', slideDir,
            initialState: inferInitialState(tiles, collision, undefined),
            keyId: null, tiles,
          }, tileSize));
        }
      }
    }
  }

  return api(doors, tileSize, collision);
}


function api(doors, tileSize, collision) {
  const activePushes = []; // Track gradual door pushes { entity, fromX, fromY, toX, toY, elapsed, duration }
  const PUSH_DURATION = 0.5; // seconds

  return {
    doors,

    // Unlock a LOCKED door with matching keyId. Returns true on success.
    unlock(door, keyId) {
      if (!door || door.state !== DOOR_STATES.LOCKED || door.cooldown > 0) return false;
      if (door.keyId && keyId !== door.keyId) return false;
      door.state = DOOR_STATES.OPEN;
      door.cooldown = DOOR_TIMING.MIN_STATE;
      door.solid = false;
      setDoorTilesSolid(door, collision, false);
      return true;
    },

    // Open a CLOSED (or LOCKED for NPC) door. Returns true on success.
    open(door) {
      if (!door || door.cooldown > 0) return false;
      if (door.state === DOOR_STATES.OPEN) return false;
      door.state = DOOR_STATES.OPEN;
      door.cooldown = DOOR_TIMING.MIN_STATE;
      door.solid = false;
      setDoorTilesSolid(door, collision, false);
      return true;
    },

    // Close an OPEN door back to CLOSED. Returns true on success.
    close(door) {
      if (!door || door.cooldown > 0) return false;
      if (door.state !== DOOR_STATES.OPEN) return false;
      door.state = DOOR_STATES.CLOSED;
      door.cooldown = DOOR_TIMING.MIN_STATE;
      door.solid = true;
      setDoorTilesSolid(door, collision, true);
      return true;
    },

    blocksTile(tx, ty) {
      for (const door of doors) {
        if (!door.solid) continue;
        if (door.tiles?.some((t) => t.x === tx && t.y === ty)) return true;
      }
      return false;
    },

    isDoorTile(tx, ty) {
      for (const door of doors) {
        if (door.tiles?.some((t) => t.x === tx && t.y === ty)) return true;
      }
      return false;
    },

    update(deltaTime, entities) {
      const speed = 4;
      // Process active gradual pushes
      for (let i = activePushes.length - 1; i >= 0; i--) {
        const p = activePushes[i];
        p.elapsed += deltaTime;
        const t = Math.min(p.elapsed / p.duration, 1);
        // Ease-out interpolation for smoother landing
        const ease = 1 - (1 - t) * (1 - t);
        p.entity.x = p.fromX + (p.toX - p.fromX) * ease;
        p.entity.y = p.fromY + (p.toY - p.fromY) * ease;
        if (t >= 1) activePushes.splice(i, 1);
      }
      for (const door of doors) {
        if (door.cooldown > 0) door.cooldown = Math.max(0, door.cooldown - deltaTime);

        const target = door.state === DOOR_STATES.OPEN ? 1 : 0;
        door.anim += (target - door.anim) * Math.min(1, deltaTime * speed);
        if (Math.abs(target - door.anim) < 0.001) door.anim = target;

        // Collision logic:
        // - Closing: solid=true, collision=1 set immediately in close()
        // - Opening: keep collision=0 until fully open (anim=1)
        if (door.state === DOOR_STATES.OPEN && door.anim === 1 && door.solid) {
          door.solid = false;
          setDoorTilesSolid(door, collision, false);
        }

        // Push entities when door is closing (solid just became true)
        if (door.solid && !door._wasSolid) {
          door._wasSolid = true;
          if (entities) {
            for (const ent of entities) {
              if (ent && isEntityOnDoorTiles(ent, door, tileSize)) {
                const target = pushEntityFromDoor(ent, door, tileSize, collision);
                if (target && !activePushes.some(p => p.entity === ent)) {
                  activePushes.push({
                    entity: ent,
                    fromX: ent.x,
                    fromY: ent.y,
                    toX: target.targetX,
                    toY: target.targetY,
                    elapsed: 0,
                    duration: PUSH_DURATION
                  });
                }
              }
            }
          }
        }
        if (!door.solid) door._wasSolid = false;

        if (door.panels === 'double') {
          const halfW = door.w * tileSize * 0.5;
          const dist = halfW * door.anim;
          door.panelA.ox = DOUBLE_SPLIT.a.dx * dist;
          door.panelA.oy = 0;
          door.panelB.ox = DOUBLE_SPLIT.b.dx * dist;
          door.panelB.oy = 0;
          door.slideOffsetX = 0;
          door.slideOffsetY = 0;
        } else {
          const vec = SLIDE_VECTORS[door.slideDir] || SLIDE_VECTORS.left;
          door.slideOffsetX = vec.dx * door.w * tileSize * door.anim;
          door.slideOffsetY = vec.dy * door.h * tileSize * door.anim;
          door.panelA.ox = 0;
          door.panelA.oy = 0;
          door.panelB.ox = 0;
          door.panelB.oy = 0;
        }
      }
    }
  };
}
