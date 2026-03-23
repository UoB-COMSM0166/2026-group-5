function getRoomIdAt(matrix, x, y) {
  if (!Array.isArray(matrix) || y < 0 || y >= matrix.length) return 1;
  if (x < 0 || x >= (matrix[y]?.length || 0)) return 1;
  return matrix[y]?.[x] || 1;
}

function collectRoomTiles(roomMatrix) {
  const roomTiles = new Map();
  for (let y = 0; y < roomMatrix.length; y += 1) {
    for (let x = 0; x < roomMatrix[y].length; x += 1) {
      const roomId = roomMatrix[y][x];
      if (roomId <= 1) continue;
      if (!roomTiles.has(roomId)) roomTiles.set(roomId, []);
      roomTiles.get(roomId).push({ x, y });
    }
  }
  return roomTiles;
}

function buildButtonsFromRooms(roomMatrix, doors = []) {
  const roomTiles = collectRoomTiles(roomMatrix || []);
  const buttons = [];
  const assignedRooms = new Set();

  for (const door of doors) {
    for (const tile of door.tiles || []) {
      const candidates = [
        { x: tile.x + 1, y: tile.y },
        { x: tile.x - 1, y: tile.y },
        { x: tile.x, y: tile.y + 1 },
        { x: tile.x, y: tile.y - 1 }
      ];
      for (const candidate of candidates) {
        const roomId = getRoomIdAt(roomMatrix, candidate.x, candidate.y);
        if (roomId <= 1 || assignedRooms.has(roomId)) continue;
        buttons.push({ roomId, x: candidate.x, y: candidate.y, centerX: 0, centerY: 0, responseGlow: 0 });
        assignedRooms.add(roomId);
      }
    }
  }

  for (const [roomId, tiles] of roomTiles.entries()) {
    if (assignedRooms.has(roomId) || !tiles.length) continue;
    let chosen = tiles[0];
    for (const tile of tiles) {
      const neighbors = [
        getRoomIdAt(roomMatrix, tile.x + 1, tile.y),
        getRoomIdAt(roomMatrix, tile.x - 1, tile.y),
        getRoomIdAt(roomMatrix, tile.x, tile.y + 1),
        getRoomIdAt(roomMatrix, tile.x, tile.y - 1)
      ];
      if (neighbors.some((id) => id === 1)) {
        chosen = tile;
        break;
      }
    }
    buttons.push({ roomId, x: chosen.x, y: chosen.y, centerX: 0, centerY: 0, responseGlow: 0 });
    assignedRooms.add(roomId);
  }

  return buttons;
}

export function createRoomSystem(roomMatrix, options = {}) {
  const baseTile = options.baseTile || 16;
  const roomTiles = collectRoomTiles(roomMatrix || []);
  const rooms = new Map();

  for (const roomId of roomTiles.keys()) {
    rooms.set(roomId, {
      lightOn: true,
      alert: 0,
      pendingLightAlert: false,
      lastChangedAt: 0,
      forcedBy: null
    });
  }

  const buttons = buildButtonsFromRooms(roomMatrix || [], options.doors || []).map((button) => ({
    ...button,
    centerX: button.x * baseTile + baseTile / 2,
    centerY: button.y * baseTile + baseTile / 2
  }));

  const api = {
    matrix: roomMatrix || [],
    rooms,
    roomTiles,
    buttons,
    attachedNpcs: [],
    attachNpcs(npcs) {
      this.attachedNpcs = Array.isArray(npcs) ? npcs : [];
    },
    getRoomId(tx, ty) {
      return getRoomIdAt(this.matrix, tx, ty);
    },
    getActorRoomId(actor) {
      const cx = actor.x + actor.w / 2;
      const cy = actor.y + actor.h / 2;
      return this.getRoomId(Math.floor(cx / baseTile), Math.floor(cy / baseTile));
    },
    isLit(roomId) {
      return this.rooms.get(roomId)?.lightOn ?? true;
    },
    getNpcVisionRange(npc, baseRange) {
      if (npc.state === 'CHASE') return baseRange * (options.chaseVisionMultiplier || 1.2);
      if (npc.state === 'SEARCH') return baseRange * 0.9;
      const roomId = this.getActorRoomId(npc);
      if (!this.isLit(roomId)) return baseRange * (options.darkVisionMultiplier || 0.5);
      return baseRange * (options.normalVisionMultiplier || 1);
    },
    getNearestButtonForPlayer(player, maxDistance = baseTile * 1.6) {
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      let best = null;
      let bestDist = Infinity;
      for (const button of this.buttons) {
        const dist = Math.hypot(px - button.centerX, py - button.centerY);
        if (dist <= maxDistance && dist < bestDist) {
          best = button;
          bestDist = dist;
        }
      }
      return best;
    },
    toggleRoom(roomId, source = 'player') {
      const room = this.rooms.get(roomId);
      if (!room) return false;
      room.lightOn = !room.lightOn;
      room.alert = 1;
      room.pendingLightAlert = true;
      room.forcedBy = source;
      room.lastChangedAt = Date.now();
      const button = this.buttons.find((entry) => entry.roomId === roomId);
      if (button) button.responseGlow = 1;
      this.notifyNpcsOfLightChange(roomId, source);
      return true;
    },
    notifyNpcsOfLightChange(roomId, source) {
      const button = this.buttons.find((entry) => entry.roomId === roomId);
      if (!button) return;
      for (const npc of this.attachedNpcs) {
        const npcRoomId = this.getActorRoomId(npc);
        if (npcRoomId !== roomId) continue;
        if (npc.state === 'CHASE') continue;
        npc.state = 'SEARCH';
        npc.searchTimer = options.searchDuration || 3.5;
        npc.searchWanderTimer = 0;
        npc.roomLightResponse = {
          roomId,
          source,
          stage: 'GO_TO_BUTTON',
          buttonTile: { x: button.x, y: button.y },
          buttonX: button.centerX,
          buttonY: button.centerY
        };
        npc.searchTargetX = button.centerX;
        npc.searchTargetY = button.centerY;
      }
    },
    consumeButtonResponse(button, source = 'npc') {
      const room = this.rooms.get(button.roomId);
      if (!room) return false;
      if (!room.lightOn) room.lightOn = true;
      room.pendingLightAlert = false;
      room.alert = 0.65;
      room.forcedBy = source;
      room.lastChangedAt = Date.now();
      button.responseGlow = 1;
      return true;
    },
    update(deltaTime) {
      for (const room of this.rooms.values()) {
        room.alert = Math.max(0, room.alert - deltaTime * 1.15);
      }
      for (const button of this.buttons) {
        button.responseGlow = Math.max(0, button.responseGlow - deltaTime * 1.7);
      }
    }
  };

  return api;
}
