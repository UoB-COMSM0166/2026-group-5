function layerNameMatches(layer, names) {
  return names.has(String(layer.name || '').toLowerCase());
}

function getCell(layer, width, x, y) {
  return layer.data[y * width + x] || 0;
}

function inferDoorOpen(tiles, collision) {
  if (!Array.isArray(collision) || !collision.length) return false;
  return tiles.every((tile) => collision?.[tile.y]?.[tile.x] === 0);
}

function setDoorTilesSolid(door, collision, solid) {
  if (!Array.isArray(collision) || !collision.length || !door?.tiles) return;
  for (const tile of door.tiles) {
    if (collision[tile.y] && typeof collision[tile.y][tile.x] !== 'undefined') {
      collision[tile.y][tile.x] = solid ? 1 : 0;
    }
  }
}

export function createDoorSystem(mapData, tileSize = 16, seededDoors = [], collision = null) {
  const doors = [];

  for (const source of seededDoors || []) {
    const tiles = (source.tiles || []).map((tile) => ({ x: tile.x, y: tile.y }));
    if (!tiles.length) continue;
    const minX = Math.min(...tiles.map((tile) => tile.x));
    const minY = Math.min(...tiles.map((tile) => tile.y));
    const maxX = Math.max(...tiles.map((tile) => tile.x));
    const maxY = Math.max(...tiles.map((tile) => tile.y));
    const kind = source.kind === 'lateral' ? 'line' : (source.kind || 'double');
    doors.push({
      id: source.id || `door-${doors.length + 1}`,
      kind,
      x: minX,
      y: minY,
      w: (maxX - minX) + 1,
      h: (maxY - minY) + 1,
      open: inferDoorOpen(tiles, collision),
      anim: inferDoorOpen(tiles, collision) ? 1 : 0,
      angle: 0,
      tiles,
      centerX: (minX + ((maxX - minX) + 1) / 2) * tileSize,
      centerY: (minY + ((maxY - minY) + 1) / 2) * tileSize
    });
  }

  if (doors.length) return api(doors, tileSize, collision);
  if (!mapData?.layers) return api(doors, tileSize, collision);

  const layers = mapData.layers.filter((layer) => layer.type === 'tilelayer' && Array.isArray(layer.data));
  const width = mapData.width || 0;
  const height = mapData.height || 0;
  const validNames = new Set(['door', 'door_lateral']);
  const seenDouble = new Set();
  const seenLine = new Set();

  for (const layer of layers) {
    if (!layerNameMatches(layer, validNames)) continue;

    for (let y = 0; y < height - 1; y += 1) {
      for (let x = 0; x < width - 1; x += 1) {
        const key = `${layer.name}:${x},${y}`;
        if (seenDouble.has(key)) continue;
        const gid = getCell(layer, width, x, y);
        const gidR = getCell(layer, width, x + 1, y);
        const gidB = getCell(layer, width, x, y + 1);
        const gidBR = getCell(layer, width, x + 1, y + 1);
        if (gid === 59 && gidR === 60 && gidB === 61 && gidBR === 62) {
          const tiles = [
            { x, y },
            { x: x + 1, y },
            { x, y: y + 1 },
            { x: x + 1, y: y + 1 }
          ];
          tiles.forEach((tile) => seenDouble.add(`${layer.name}:${tile.x},${tile.y}`));
          doors.push({
            id: `door2x2-${doors.length + 1}`,
            kind: 'double',
            x,
            y,
            w: 2,
            h: 2,
            open: inferDoorOpen(tiles, collision),
            anim: inferDoorOpen(tiles, collision) ? 1 : 0,
            angle: 0,
            tiles,
            centerX: (x + 1) * tileSize,
            centerY: (y + 1) * tileSize
          });
        }
      }
    }

    for (let y = 0; y < height - 1; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const key = `${layer.name}:${x},${y}`;
        if (seenLine.has(key)) continue;
        const gid = getCell(layer, width, x, y);
        const gidB = getCell(layer, width, x, y + 1);
        if (gid === 83 && (gidB === 84 || gidB === 83)) {
          const tiles = [{ x, y }, { x, y: y + 1 }];
          tiles.forEach((tile) => seenLine.add(`${layer.name}:${tile.x},${tile.y}`));
          doors.push({
            id: `door1x2-${doors.length + 1}`,
            kind: 'line',
            x,
            y,
            w: 1,
            h: 2,
            open: inferDoorOpen(tiles, collision),
            anim: inferDoorOpen(tiles, collision) ? 1 : 0,
            angle: 0,
            tiles,
            centerX: (x + 0.5) * tileSize,
            centerY: (y + 1) * tileSize
          });
        }
      }
    }
  }

  return api(doors, tileSize, collision);
}

function api(doors, tileSize, collision) {
  return {
    doors,
    toggle(door) {
      if (!door) return false;
      door.open = !door.open;
      setDoorTilesSolid(door, collision, !door.open);
      return true;
    },
    blocksTile(tx, ty) {
      for (const door of doors) {
        if (door.open || door.anim > 0.92) continue;
        if (door.tiles?.some((tile) => tile.x === tx && tile.y === ty)) return true;
      }
      return false;
    },
    update(deltaTime) {
      for (const door of doors) {
        const target = door.open ? 1 : 0;
        const speed = door.kind === 'line' ? 5 : 4;
        door.anim += (target - door.anim) * Math.min(1, deltaTime * speed);
        if (Math.abs(target - door.anim) < 0.001) door.anim = target;
        door.angle = door.kind === 'line' ? (-Math.PI / 2) * door.anim : 0;
        door.openMask = door.kind === 'double' ? door.anim : 0;
      }
    }
  };
}
