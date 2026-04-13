// Room system: room lighting, button placement, NPC light-change notification.
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

function buildButtonsFromRooms(roomMatrix, doors = [], manualButtons = []) {
  // If manual buttons provided, use them directly
  if (manualButtons && manualButtons.length > 0) {
    return manualButtons.map((btn) => ({
      roomId: btn.roomId,
      x: btn.col,
      y: btn.row,
      centerX: 0,
      centerY: 0,
      responseGlow: 0
    }));
  }

  // Otherwise, auto-generate from room tiles (original logic)
  const roomTiles = collectRoomTiles(roomMatrix || []);
  const buttons = [];
  const assignedRooms = new Set();

  // Collect all door-adjacent tiles so buttons never spawn next to doors
  const doorNeighborKeys = new Set();
  for (const door of doors) {
    for (const tile of door.tiles || []) {
      doorNeighborKeys.add(`${tile.x},${tile.y}`);
      doorNeighborKeys.add(`${tile.x + 1},${tile.y}`);
      doorNeighborKeys.add(`${tile.x - 1},${tile.y}`);
      doorNeighborKeys.add(`${tile.x},${tile.y + 1}`);
      doorNeighborKeys.add(`${tile.x},${tile.y - 1}`);
    }
  }

  for (const [roomId, tiles] of roomTiles.entries()) {
    if (assignedRooms.has(roomId) || !tiles.length) continue;
    let chosen = null;
    // Prefer a room-edge tile that is NOT adjacent to any door
    for (const tile of tiles) {
      if (doorNeighborKeys.has(`${tile.x},${tile.y}`)) continue;
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
    // Fallback: any tile not near a door, or first tile
    if (!chosen) chosen = tiles.find((t) => !doorNeighborKeys.has(`${t.x},${t.y}`)) || tiles[0];
    buttons.push({ roomId, x: chosen.x, y: chosen.y, centerX: 0, centerY: 0, responseGlow: 0 });
    assignedRooms.add(roomId);
  }

  return buttons;
}

export class RoomSystem {
  #matrix;
  #rooms;
  #roomTiles;
  #buttons;
  #attachedNpcs;
  #baseTile;
  #chaseVisionMultiplier;
  #darkVisionMultiplier;
  #normalVisionMultiplier;

  constructor(roomMatrix, options = {}) {
    this.#baseTile = options.baseTile || 16;
    this.#chaseVisionMultiplier = options.chaseVisionMultiplier || 1.2;
    this.#darkVisionMultiplier = options.darkVisionMultiplier || 0.5;
    this.#normalVisionMultiplier = options.normalVisionMultiplier || 1;
    this.#matrix = roomMatrix || [];
    this.#roomTiles = collectRoomTiles(this.#matrix);
    this.#rooms = new Map();
    this.#attachedNpcs = [];

    for (const roomId of this.#roomTiles.keys()) {
      this.#rooms.set(roomId, {
        lightOn: true,
        alert: 0,
        pendingLightAlert: false,
        lastChangedAt: 0,
        forcedBy: null,
        explored: false
      });
    }

    this.#buttons = buildButtonsFromRooms(this.#matrix, options.doors || [], options.manualButtons || []).map((button) => ({
      ...button,
      centerX: button.x * this.#baseTile + this.#baseTile / 2,
      centerY: button.y * this.#baseTile + this.#baseTile / 2
    }));
  }

  get matrix() { return this.#matrix; }
  get rooms() { return this.#rooms; }
  get roomTiles() { return this.#roomTiles; }
  get buttons() { return this.#buttons; }
  get attachedNpcs() { return this.#attachedNpcs; }

  attachNpcs(npcs) {
    this.#attachedNpcs = Array.isArray(npcs) ? npcs : [];
  }

  getRoomId(tx, ty) {
    return getRoomIdAt(this.#matrix, tx, ty);
  }

  getActorRoomId(actor) {
    const cx = actor.x + actor.w / 2;
    const cy = actor.y + actor.h / 2;
    return this.getRoomId(Math.floor(cx / this.#baseTile), Math.floor(cy / this.#baseTile));
  }

  isLit(roomId) {
    return this.#rooms.get(roomId)?.lightOn ?? true;
  }

  isExplored(roomId) {
    return this.#rooms.get(roomId)?.explored ?? false;
  }

  exploreRoom(roomId) {
    const room = this.#rooms.get(roomId);
    if (!room || room.explored) return false;
    room.explored = true;
    room.exploredAt = performance.now();
    return true;
  }

  resetExploration() {
    for (const room of this.#rooms.values()) {
      room.explored = false;
    }
  }

  explorePlayerRoom(player) {
    const roomId = this.getActorRoomId(player);
    if (roomId > 1) {
      return this.exploreRoom(roomId);
    }
    return false;
  }

  getNpcVisionRange(npc, baseRange) {
    if (npc.state === 'CHASE') return baseRange * this.#chaseVisionMultiplier;
    if (npc.state === 'SEARCH') return baseRange * 0.9;
    const roomId = this.getActorRoomId(npc);
    if (!this.isLit(roomId)) return baseRange * this.#darkVisionMultiplier;
    return baseRange * this.#normalVisionMultiplier;
  }

  getNearestButtonForPlayer(player, maxDistance = this.#baseTile * 1.6) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const playerTileX = Math.floor(px / this.#baseTile);
    const playerTileY = Math.floor(py / this.#baseTile);

    for (const button of this.#buttons) {
      const targetRow = button.y + 2;
      const validCols = [button.x - 1, button.x, button.x + 1];

      if (playerTileY === targetRow && validCols.includes(playerTileX)) {
        return button;
      }
    }
    return null;
  }

  toggleRoom(roomId, source = 'player') {
    const room = this.#rooms.get(roomId);
    if (!room) return false;
    room.lightOn = !room.lightOn;
    room.alert = 1;
    room.pendingLightAlert = true;
    room.forcedBy = source;
    room.lastChangedAt = Date.now();
    const button = this.#buttons.find((entry) => entry.roomId === roomId);
    if (button) button.responseGlow = 1;
    this.notifyNpcsOfLightChange(roomId, source);
    return true;
  }

  notifyNpcsOfLightChange(roomId, source) {
    const button = this.#buttons.find((entry) => entry.roomId === roomId);
    if (!button) return;
    for (const npc of this.#attachedNpcs) {
      const npcRoomId = this.getActorRoomId(npc);
      if (npcRoomId !== roomId) continue;
      if (npc.state === 'CHASE') continue;
      npc.roomLightResponse = {
        roomId,
        source,
        buttonTile: { x: button.x, y: button.y },
        buttonX: button.centerX,
        buttonY: button.centerY
      };
      npc.searchTargetX = button.centerX;
      npc.searchTargetY = button.centerY;
    }
  }

  consumeButtonResponse(button, source = 'npc') {
    const room = this.#rooms.get(button.roomId);
    if (!room) return false;
    if (!room.lightOn) room.lightOn = true;
    room.pendingLightAlert = false;
    room.alert = 0.65;
    room.forcedBy = source;
    room.lastChangedAt = Date.now();
    button.responseGlow = 1;
    return true;
  }

  update(deltaTime) {
    for (const room of this.#rooms.values()) {
      room.alert = Math.max(0, room.alert - deltaTime * 1.15);
    }
    for (const button of this.#buttons) {
      button.responseGlow = Math.max(0, button.responseGlow - deltaTime * 1.7);
    }
  }

  getUnexploredRooms() {
    const unexplored = [];
    for (const [roomId, room] of this.#rooms.entries()) {
      if (!room.explored) {
        unexplored.push(roomId);
      }
    }
    return unexplored;
  }
}
