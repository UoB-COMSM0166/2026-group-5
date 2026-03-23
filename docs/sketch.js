(() => {
  // core/gameState.js
  var SCREEN_STATES = Object.freeze({
    START: "start",
    INTRO: "intro",
    PLAYING: "playing",
    PAUSE: "pause",
    WIN: "win",
    LOSE: "lose"
  });
  function createGameState() {
    return {
      screen: SCREEN_STATES.START,
      previousScreen: SCREEN_STATES.START,
      levelId: null,
      level: null,
      prompt: "Press Enter to start",
      meta: {
        collected: 0,
        target: 0,
        startedAt: 0,
        detectedBy: null,
        elapsedMs: 0
      },
      ui: {
        message: "",
        messageTimer: 0,
        overlayAlpha: 0,
        flashAlpha: 0,
        vignette: 0.18
      },
      audio: {
        muted: false,
        unlocked: false,
        currentTrack: null
      },
      debug: {
        showCollision: false,
        showRooms: false,
        showVision: false,
        showLayers: false,
        showCamera: false
      },
      camera: null,
      loading: {
        ready: false,
        message: "Loading assets...",
        error: ""
      }
    };
  }

  // core/inputSystem.js
  function createInputSystem() {
    const pressed = /* @__PURE__ */ new Set();
    let interactPressed = false;
    let confirmPressed = false;
    function keyName(key, code) {
      return String(key || code || "").toLowerCase();
    }
    return {
      onKeyPressed(key, code) {
        const name = keyName(key, code);
        pressed.add(name);
        if (name === "e") interactPressed = true;
        if (name === "enter" || name === " ") confirmPressed = true;
      },
      onKeyReleased(key, code) {
        pressed.delete(keyName(key, code));
      },
      getMovement() {
        const left = pressed.has("a") || pressed.has("arrowleft");
        const right = pressed.has("d") || pressed.has("arrowright");
        const up = pressed.has("w") || pressed.has("arrowup");
        const down = pressed.has("s") || pressed.has("arrowdown");
        return {
          x: (right ? 1 : 0) - (left ? 1 : 0),
          y: (down ? 1 : 0) - (up ? 1 : 0),
          sprint: pressed.has("shift") || pressed.has("shiftleft") || pressed.has("shiftright")
        };
      },
      consumeInteract() {
        const value = interactPressed;
        interactPressed = false;
        return value;
      },
      consumeConfirm() {
        const value = confirmPressed;
        confirmPressed = false;
        return value;
      }
    };
  }

  // render/tilesetCatalog.js
  var TILESET_CONFIG = {
    1: { name: "floor", image: "./tilesets/floor128128.png", tileWidth: 128, tileHeight: 128, columns: 8, totalTiles: 64 },
    2: { name: "leftwall", image: "./tilesets/verticalwall_left3232.png", tileWidth: 32, tileHeight: 32, columns: 1, totalTiles: 1 },
    3: { name: "downwall", image: "./tilesets/verticalwall_horizontal3232.png", tileWidth: 32, tileHeight: 32, columns: 1, totalTiles: 1 },
    4: { name: "rightwall", image: "./tilesets/verticalwall_right3232.png", tileWidth: 32, tileHeight: 32, columns: 1, totalTiles: 1 },
    5: { name: "facewall", image: "./tilesets/brick3232.jpg", tileWidth: 32, tileHeight: 32, columns: 1, totalTiles: 1 },
    6: { name: "brownfloor", image: "./tilesets/floorbrown6464.png", tileWidth: 64, tileHeight: 64, columns: 1, totalTiles: 1 },
    7: { name: "purplefloor", image: "./tilesets/floordarkpurple6464.png", tileWidth: 64, tileHeight: 64, columns: 1, totalTiles: 1 },
    8: { name: "table", image: "./tilesets/table6464.png", tileWidth: 64, tileHeight: 64, columns: 1, totalTiles: 1 },
    9: { name: "window", image: "./tilesets/window3232.png", tileWidth: 32, tileHeight: 32, columns: 1, totalTiles: 1 },
    10: { name: "neonlight", image: "./tilesets/neonlight3232.png", tileWidth: 16, tileHeight: 16, columns: 2, totalTiles: 4 },
    14: { name: "cabinet", image: "./tilesets/cabinet3232.png", tileWidth: 32, tileHeight: 32, columns: 1, totalTiles: 1 },
    15: { name: "box", image: "./tilesets/chest_closed3232.png", tileWidth: 32, tileHeight: 32, columns: 1, totalTiles: 1 },
    16: { name: "neonbars_yellow", image: "./tilesets/neonbars_yellow64.png", tileWidth: 16, tileHeight: 16, columns: 4, totalTiles: 8 },
    24: { name: "neonbars_multicolor", image: "./tilesets/neonbars_multicolor64.png", tileWidth: 16, tileHeight: 16, columns: 4, totalTiles: 8 },
    32: { name: "neonbars_pink", image: "./tilesets/neonbars_pink64.png", tileWidth: 16, tileHeight: 16, columns: 4, totalTiles: 8 },
    40: { name: "neonbars_bluepink", image: "./tilesets/neonbars_bluepink64.png", tileWidth: 16, tileHeight: 16, columns: 4, totalTiles: 8 },
    48: { name: "circuit", image: "./tilesets/circuit64.png", tileWidth: 16, tileHeight: 16, columns: 4, totalTiles: 8 },
    56: { name: "pinksymbol", image: "./tilesets/pinksymbol3232.png", tileWidth: 32, tileHeight: 32, columns: 1, totalTiles: 1 },
    57: { name: "bluesymbol", image: "./tilesets/bluesymbol3232.png", tileWidth: 32, tileHeight: 32, columns: 1, totalTiles: 1 },
    58: { name: "key", image: "./tilesets/key1616.png", tileWidth: 16, tileHeight: 16, columns: 1, totalTiles: 1 },
    59: { name: "door", image: "./tilesets/door_twoside3232.png", tileWidth: 16, tileHeight: 16, columns: 2, totalTiles: 4 },
    83: { name: "door_lateral", image: "./tilesets/linedoor1632.png", tileWidth: 16, tileHeight: 16, columns: 1, totalTiles: 2 }
  };
  var GID_REMAP = { 60: 59, 61: 59, 62: 59, 84: 83 };
  var GID_COLORS = {
    1: "#2b3446",
    2: "#334155",
    3: "#475569",
    4: "#334155",
    5: "#7c2d12",
    6: "#3a2c1d",
    7: "#281d3f",
    8: "#705f4b",
    9: "#60a5fa",
    10: "#8b5cf6",
    14: "#475569",
    15: "#8b5a2b",
    16: "#eab308",
    24: "#f472b6",
    32: "#38bdf8",
    40: "#a78bfa",
    48: "#22c55e",
    56: "#ec4899",
    57: "#3b82f6",
    58: "#facc15",
    59: "#8b7355",
    60: "#8b7355",
    61: "#8b7355",
    62: "#8b7355",
    83: "#8b7355",
    84: "#8b7355"
  };

  // render/spriteCatalog.js
  var SPRITE_PATHS = {
    player: "./assets/images/sprites/player.png",
    playerSheet: "./assets/images/sprites/player_sheet.png",
    npc: {
      PATROL: "./assets/images/sprites/npc_patrol.png",
      SEARCH: "./assets/images/sprites/npc_search.png",
      CHASE: "./assets/images/sprites/npc_chase.png"
    },
    npcSheet: {
      PATROL: "./assets/images/sprites/npc_patrol_sheet.png",
      SEARCH: "./assets/images/sprites/npc_search_sheet.png",
      CHASE: "./assets/images/sprites/npc_chase_sheet.png",
      RETURN: "./assets/images/sprites/npc_patrol_sheet.png"
    },
    door: {
      double: "./assets/images/sprites/door_double.png",
      line: "./assets/images/sprites/door_line.png"
    },
    chest: {
      base: "./assets/images/sprites/chest_base.png",
      lid: "./assets/images/sprites/chest_lid.png"
    },
    button: {
      on: "./assets/images/sprites/button_on.png",
      off: "./assets/images/sprites/button_off.png"
    }
  };
  var CHARACTER_ASSET_RULES = {
    baseDir: "./assets/images/characters",
    pattern: "{baseDir}/{character}/{variant}/{mode}_{facing}.png",
    sheetPattern: "{baseDir}/{character}/{variant}/{mode}_sheet.png",
    supportedModes: ["idle", "walk", "interact", "alert"],
    supportedFacings: ["down", "left", "right", "up"]
  };
  var CHARACTER_PACKS = {
    player: {
      default: {
        fallbackSingle: SPRITE_PATHS.player,
        fallbackSheet: SPRITE_PATHS.playerSheet,
        modes: {
          idle: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/player/default/idle_sheet.png` },
          walk: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/player/default/walk_sheet.png` },
          interact: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/player/default/interact_sheet.png` },
          alert: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/player/default/alert_sheet.png` }
        }
      },
      stealth: {
        fallbackSingle: SPRITE_PATHS.player,
        fallbackSheet: SPRITE_PATHS.playerSheet,
        modes: {
          idle: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/player/stealth/idle_sheet.png` },
          walk: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/player/stealth/walk_sheet.png` },
          interact: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/player/stealth/interact_sheet.png` },
          alert: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/player/stealth/alert_sheet.png` }
        }
      }
    },
    npc: {
      patrol: {
        fallbackSingle: SPRITE_PATHS.npc.PATROL,
        fallbackSheet: SPRITE_PATHS.npcSheet.PATROL,
        modes: {
          idle: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/npc/patrol/idle_sheet.png` },
          walk: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/npc/patrol/walk_sheet.png` },
          alert: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/npc/patrol/alert_sheet.png` }
        }
      },
      search: {
        fallbackSingle: SPRITE_PATHS.npc.SEARCH,
        fallbackSheet: SPRITE_PATHS.npcSheet.SEARCH,
        modes: {
          idle: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/npc/search/idle_sheet.png` },
          walk: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/npc/search/walk_sheet.png` },
          alert: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/npc/search/alert_sheet.png` }
        }
      },
      chase: {
        fallbackSingle: SPRITE_PATHS.npc.CHASE,
        fallbackSheet: SPRITE_PATHS.npcSheet.CHASE,
        modes: {
          idle: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/npc/chase/idle_sheet.png` },
          walk: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/npc/chase/walk_sheet.png` },
          alert: { sheet: `${CHARACTER_ASSET_RULES.baseDir}/npc/chase/alert_sheet.png` }
        }
      }
    }
  };
  function directionalPaths(character, variant, mode) {
    const out = {};
    for (const facing of CHARACTER_ASSET_RULES.supportedFacings) {
      out[facing] = `${CHARACTER_ASSET_RULES.baseDir}/${character}/${variant}/${mode}_${facing}.png`;
    }
    return out;
  }
  function collectCharacterPaths() {
    const paths = /* @__PURE__ */ new Set();
    for (const variants of Object.values(CHARACTER_PACKS)) {
      for (const pack of Object.values(variants)) {
        if (pack.fallbackSingle) paths.add(pack.fallbackSingle);
        if (pack.fallbackSheet) paths.add(pack.fallbackSheet);
        for (const modeEntry of Object.values(pack.modes || {})) {
          if (modeEntry.sheet) paths.add(modeEntry.sheet);
        }
      }
    }
    return Array.from(paths);
  }
  function normalizeMode(mode = "idle") {
    if (mode === "return") return "walk";
    if (mode === "search" || mode === "chase") return "alert";
    return mode;
  }
  function resolveCharacterSprite(character, variant = "default", mode = "idle", facing = "down") {
    var _a, _b;
    const packs = CHARACTER_PACKS[character] || {};
    const pack = packs[variant] || packs.default || Object.values(packs)[0] || null;
    if (!pack) return { sheet: null, directional: null, fallbackSingle: null, fallbackSheet: null };
    const normalizedMode = normalizeMode(mode);
    const modeEntry = ((_a = pack.modes) == null ? void 0 : _a[normalizedMode]) || ((_b = pack.modes) == null ? void 0 : _b.idle) || {};
    const directional = directionalPaths(character, variant, normalizedMode);
    return {
      sheet: modeEntry.sheet || null,
      directional,
      fallbackSingle: pack.fallbackSingle || null,
      fallbackSheet: pack.fallbackSheet || null,
      mode: normalizedMode,
      facing
    };
  }

  // core/assetLoader.js
  var assets = {
    images: /* @__PURE__ */ new Map(),
    requested: /* @__PURE__ */ new Set(),
    ready: false,
    failed: []
  };
  function collectPaths() {
    const paths = /* @__PURE__ */ new Set();
    for (const config of Object.values(TILESET_CONFIG)) {
      if (config.image) paths.add(config.image);
    }
    paths.add(SPRITE_PATHS.player);
    paths.add(SPRITE_PATHS.playerSheet);
    Object.values(SPRITE_PATHS.npc).forEach((v) => paths.add(v));
    Object.values(SPRITE_PATHS.npcSheet).forEach((v) => paths.add(v));
    Object.values(SPRITE_PATHS.door).forEach((v) => paths.add(v));
    Object.values(SPRITE_PATHS.chest).forEach((v) => paths.add(v));
    Object.values(SPRITE_PATHS.button).forEach((v) => paths.add(v));
    collectCharacterPaths().forEach((v) => paths.add(v));
    return Array.from(paths).filter(Boolean);
  }
  function loadImageAsync(path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ path, img, ok: true });
      img.onerror = () => resolve({ path, img: null, ok: false });
      img.src = path;
    });
  }
  async function loadAssetsAsync() {
    const paths = collectPaths();
    assets.failed = [];
    const pending = [];
    for (const path of paths) {
      if (assets.requested.has(path)) continue;
      assets.requested.add(path);
      pending.push(loadImageAsync(path));
    }
    const results = await Promise.all(pending);
    for (const result of results) {
      assets.images.set(result.path, result.ok ? result.img : null);
      if (!result.ok) assets.failed.push(result.path);
    }
    assets.ready = true;
    return getAssetState();
  }
  function getImage(path) {
    return assets.images.get(path) || null;
  }
  function getAssetState() {
    let loadedCount = 0;
    for (const value of assets.images.values()) {
      if (value) loadedCount += 1;
    }
    return {
      ready: assets.ready,
      imageCount: loadedCount,
      requestedCount: assets.images.size,
      failedCount: assets.failed.length,
      failed: [...assets.failed]
    };
  }

  // maps/mapManager.js
  var registry = /* @__PURE__ */ new Map();
  function registerMap(id, config) {
    registry.set(id, config);
  }
  function getMap(id) {
    return registry.get(id) || null;
  }
  function bootstrapLegacyMaps() {
    if (window.Map1Config) registerMap("map1", window.Map1Config);
    if (window.Map2Config) registerMap("map2", window.Map2Config);
    if (window.Map3Config) registerMap("map3", window.Map3Config);
  }

  // systems/doorSystem.js
  function layerNameMatches(layer, names) {
    return names.has(String(layer.name || "").toLowerCase());
  }
  function getCell(layer, width, x, y) {
    return layer.data[y * width + x] || 0;
  }
  function createDoorSystem(mapData, tileSize = 16) {
    const doors = [];
    if (!(mapData == null ? void 0 : mapData.layers)) return api(doors, tileSize);
    const layers = mapData.layers.filter((layer) => layer.type === "tilelayer" && Array.isArray(layer.data));
    const width = mapData.width || 0;
    const height = mapData.height || 0;
    const validNames = /* @__PURE__ */ new Set(["door", "door_lateral"]);
    const seenDouble = /* @__PURE__ */ new Set();
    const seenLine = /* @__PURE__ */ new Set();
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
              kind: "double",
              x,
              y,
              w: 2,
              h: 2,
              open: false,
              anim: 0,
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
          if (gid === 83 && gidB === 84) {
            const tiles = [{ x, y }, { x, y: y + 1 }];
            tiles.forEach((tile) => seenLine.add(`${layer.name}:${tile.x},${tile.y}`));
            doors.push({
              id: `door1x2-${doors.length + 1}`,
              kind: "line",
              x,
              y,
              w: 1,
              h: 2,
              open: false,
              anim: 0,
              angle: 0,
              tiles,
              centerX: (x + 0.5) * tileSize,
              centerY: (y + 1) * tileSize
            });
          }
        }
      }
    }
    return api(doors, tileSize);
  }
  function api(doors, tileSize) {
    return {
      doors,
      toggle(door) {
        if (!door) return false;
        door.open = !door.open;
        return true;
      },
      blocksTile(tx, ty) {
        var _a;
        for (const door of doors) {
          if (door.open || door.anim > 0.92) continue;
          if ((_a = door.tiles) == null ? void 0 : _a.some((tile) => tile.x === tx && tile.y === ty)) return true;
        }
        return false;
      },
      update(deltaTime) {
        for (const door of doors) {
          const target = door.open ? 1 : 0;
          const speed = door.kind === "line" ? 5 : 4;
          door.anim += (target - door.anim) * Math.min(1, deltaTime * speed);
          if (Math.abs(target - door.anim) < 1e-3) door.anim = target;
          door.angle = door.kind === "line" ? -Math.PI / 2 * door.anim : 0;
          door.openMask = door.kind === "double" ? door.anim : 0;
        }
      }
    };
  }

  // systems/boxSystem.js
  function getCell2(layer, width, x, y) {
    return layer.data[y * width + x] || 0;
  }
  function createBoxSystem(mapData, existingChests = [], tileSize = 16) {
    const boxes = [];
    for (const chest of existingChests) {
      boxes.push({
        id: chest.id,
        x: chest.x,
        y: chest.y,
        w: 2,
        h: 2,
        opened: !!chest.opened,
        anim: chest.opened ? 1 : 0,
        angle: chest.opened ? -110 * Math.PI / 180 : 0,
        centerX: (chest.x + 1) * tileSize,
        centerY: (chest.y + 1) * tileSize,
        lootPulse: chest.opened ? 1 : 0
      });
    }
    if (!(mapData == null ? void 0 : mapData.layers)) return api2(boxes);
    const layer = mapData.layers.find((entry) => String(entry.name || "").toLowerCase() === "box" && entry.type === "tilelayer");
    if (!layer || !Array.isArray(layer.data)) return api2(boxes);
    const width = mapData.width || 0;
    const height = mapData.height || 0;
    const seen = new Set(boxes.map((box) => `${box.x},${box.y}`));
    for (let y = 0; y < height - 1; y += 1) {
      for (let x = 0; x < width - 1; x += 1) {
        if (seen.has(`${x},${y}`)) continue;
        const tl = getCell2(layer, width, x, y);
        const tr = getCell2(layer, width, x + 1, y);
        const bl = getCell2(layer, width, x, y + 1);
        const br = getCell2(layer, width, x + 1, y + 1);
        if (tl === 15 && tr === 15 && bl === 15 && br === 15) {
          boxes.push({
            id: `box-${boxes.length + 1}`,
            x,
            y,
            w: 2,
            h: 2,
            opened: false,
            anim: 0,
            angle: 0,
            centerX: (x + 1) * tileSize,
            centerY: (y + 1) * tileSize,
            lootPulse: 0
          });
          seen.add(`${x},${y}`);
        }
      }
    }
    return api2(boxes);
  }
  function api2(boxes) {
    return {
      boxes,
      open(box) {
        if (!box || box.opened) return false;
        box.opened = true;
        box.lootPulse = 1;
        return true;
      },
      update(deltaTime) {
        for (const box of boxes) {
          const target = box.opened ? 1 : 0;
          box.anim += (target - box.anim) * Math.min(1, deltaTime * 5);
          if (Math.abs(target - box.anim) < 1e-3) box.anim = target;
          box.angle = -110 * Math.PI / 180 * box.anim;
          box.lootPulse = Math.max(0, box.lootPulse - deltaTime * 0.85);
        }
      }
    };
  }

  // systems/roomSystem.js
  function getRoomIdAt(matrix, x, y) {
    var _a, _b;
    if (!Array.isArray(matrix) || y < 0 || y >= matrix.length) return 1;
    if (x < 0 || x >= (((_a = matrix[y]) == null ? void 0 : _a.length) || 0)) return 1;
    return ((_b = matrix[y]) == null ? void 0 : _b[x]) || 1;
  }
  function collectRoomTiles(roomMatrix) {
    const roomTiles = /* @__PURE__ */ new Map();
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
    const assignedRooms = /* @__PURE__ */ new Set();
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
  function createRoomSystem(roomMatrix, options = {}) {
    const baseTile = options.baseTile || 16;
    const roomTiles = collectRoomTiles(roomMatrix || []);
    const rooms = /* @__PURE__ */ new Map();
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
    const api3 = {
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
        var _a, _b;
        return (_b = (_a = this.rooms.get(roomId)) == null ? void 0 : _a.lightOn) != null ? _b : true;
      },
      getNpcVisionRange(npc, baseRange) {
        if (npc.state === "CHASE") return baseRange * (options.chaseVisionMultiplier || 1.2);
        if (npc.state === "SEARCH") return baseRange * 0.9;
        const roomId = this.getActorRoomId(npc);
        if (!this.isLit(roomId)) return baseRange * (options.darkVisionMultiplier || 0.65);
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
      toggleRoom(roomId, source = "player") {
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
          if (npc.state === "CHASE") continue;
          npc.state = "SEARCH";
          npc.searchTimer = options.searchDuration || 3.5;
          npc.searchWanderTimer = 0;
          npc.roomLightResponse = {
            roomId,
            source,
            stage: "GO_TO_BUTTON",
            buttonTile: { x: button.x, y: button.y },
            buttonX: button.centerX,
            buttonY: button.centerY
          };
          npc.searchTargetX = button.centerX;
          npc.searchTargetY = button.centerY;
        }
      },
      consumeButtonResponse(button, source = "npc") {
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
    return api3;
  }

  // maps/mapFactory.js
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function tileToPixel(tile, baseTile) {
    return tile * baseTile;
  }
  function resolveRoomMatrix(levelId) {
    var _a, _b, _c;
    if ((_a = window.RoomMatrices) == null ? void 0 : _a[levelId]) return window.RoomMatrices[levelId];
    const numeric = Number(String(levelId).replace(/[^0-9]/g, ""));
    return ((_c = (_b = window.RoomLightCamera) == null ? void 0 : _b.ROOM_MATRICES) == null ? void 0 : _c[numeric]) || [];
  }
  function createRuntimeLevel(levelId, config) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
    const settings = {
      baseTile: ((_a = config == null ? void 0 : config.settings) == null ? void 0 : _a.baseTile) || 16,
      visionRange: ((_b = config == null ? void 0 : config.settings) == null ? void 0 : _b.visionRange) || 112,
      searchDuration: ((_c = config == null ? void 0 : config.settings) == null ? void 0 : _c.searchDuration) || 3.5,
      chaseVisionMultiplier: ((_d = config == null ? void 0 : config.settings) == null ? void 0 : _d.chaseVisionMultiplier) || 1.2,
      darkVisionMultiplier: ((_e = config == null ? void 0 : config.settings) == null ? void 0 : _e.darkVisionMultiplier) || 0.65,
      normalVisionMultiplier: ((_f = config == null ? void 0 : config.settings) == null ? void 0 : _f.normalVisionMultiplier) || 1,
      ...clone((config == null ? void 0 : config.settings) || {})
    };
    const player = {
      x: tileToPixel(((_g = config == null ? void 0 : config.defaultSpawn) == null ? void 0 : _g.x) || 2, settings.baseTile),
      y: tileToPixel(((_h = config == null ? void 0 : config.defaultSpawn) == null ? void 0 : _h.y) || 2, settings.baseTile),
      w: ((_i = config == null ? void 0 : config.player) == null ? void 0 : _i.w) || 10,
      h: ((_j = config == null ? void 0 : config.player) == null ? void 0 : _j.h) || 14,
      speed: ((_k = config == null ? void 0 : config.player) == null ? void 0 : _k.speed) || 110,
      sprint: ((_l = config == null ? void 0 : config.player) == null ? void 0 : _l.sprint) || 1.5,
      stamina: (_n = (_m = config == null ? void 0 : config.player) == null ? void 0 : _m.stamina) != null ? _n : 100,
      staminaMax: (_p = (_o = config == null ? void 0 : config.player) == null ? void 0 : _o.staminaMax) != null ? _p : 100,
      color: ((_q = config == null ? void 0 : config.player) == null ? void 0 : _q.color) || "#33ff66",
      facing: "down"
    };
    const npcs = ((config == null ? void 0 : config.npcs) || []).map((npc) => ({
      ...clone(npc),
      x: tileToPixel(npc.x, settings.baseTile),
      y: tileToPixel(npc.y, settings.baseTile),
      homeX: tileToPixel(npc.x, settings.baseTile),
      homeY: tileToPixel(npc.y, settings.baseTile),
      waypoints: (npc.waypoints || []).map((point) => ({
        x: tileToPixel(point.x, settings.baseTile),
        y: tileToPixel(point.y, settings.baseTile)
      }))
    }));
    const mapName = (config == null ? void 0 : config.mapName) || levelId;
    const mapData = ((_r = window.TileMaps) == null ? void 0 : _r[mapName]) || ((_s = window.TileMaps) == null ? void 0 : _s["basic test"]) || null;
    const roomMatrix = resolveRoomMatrix(levelId);
    const doorSystem = createDoorSystem(mapData, settings.baseTile);
    const boxSystem = createBoxSystem(mapData, clone(((_t = config == null ? void 0 : config.entities) == null ? void 0 : _t.chests) || []), settings.baseTile);
    const roomSystem = createRoomSystem(roomMatrix, {
      baseTile: settings.baseTile,
      searchDuration: settings.searchDuration,
      normalVisionMultiplier: settings.normalVisionMultiplier,
      darkVisionMultiplier: settings.darkVisionMultiplier,
      chaseVisionMultiplier: settings.chaseVisionMultiplier,
      doors: [...doorSystem.doors, ...((_u = config == null ? void 0 : config.entities) == null ? void 0 : _u.doors) || []]
    });
    roomSystem.attachNpcs(npcs);
    const mapWidth = (mapData == null ? void 0 : mapData.width) || (((_w = (_v = config == null ? void 0 : config.collisionMatrix) == null ? void 0 : _v[0]) == null ? void 0 : _w.length) || 0);
    const mapHeight = (mapData == null ? void 0 : mapData.height) || (((_x = config == null ? void 0 : config.collisionMatrix) == null ? void 0 : _x.length) || 0);
    return {
      id: levelId,
      settings,
      collision: clone((config == null ? void 0 : config.collisionMatrix) || []),
      player,
      npcs,
      source: config,
      mapData,
      mapWidth,
      mapHeight,
      worldWidth: mapWidth * settings.baseTile,
      worldHeight: mapHeight * settings.baseTile,
      doorSystem,
      boxSystem,
      roomSystem
    };
  }

  // systems/collisionSystem.js
  function isBlocked(collision, tx, ty) {
    if (!collision.length) return false;
    if (ty < 0 || ty >= collision.length) return true;
    if (tx < 0 || tx >= collision[0].length) return true;
    return collision[ty][tx] === 1;
  }
  function isBlockedByWorld(levelOrCollision, tx, ty, tileSize = 16) {
    var _a, _b;
    const collision = Array.isArray(levelOrCollision) ? levelOrCollision : (levelOrCollision == null ? void 0 : levelOrCollision.collision) || [];
    if (isBlocked(collision, tx, ty)) return true;
    const level = Array.isArray(levelOrCollision) ? null : levelOrCollision;
    if ((_b = (_a = level == null ? void 0 : level.doorSystem) == null ? void 0 : _a.blocksTile) == null ? void 0 : _b.call(_a, tx, ty)) return true;
    return false;
  }
  function canMoveToRect(entity, nextX, nextY, collision, tileSize, level = null) {
    const left = Math.floor(nextX / tileSize);
    const right = Math.floor((nextX + entity.w - 1) / tileSize);
    const top = Math.floor(nextY / tileSize);
    const bottom = Math.floor((nextY + entity.h - 1) / tileSize);
    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        if (level ? isBlockedByWorld(level, tx, ty, tileSize) : isBlocked(collision, tx, ty)) {
          return false;
        }
      }
    }
    return true;
  }
  function hasLineOfSight(collision, x1, y1, x2, y2, tileSize, step = 6, level = null) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (dist <= step) return true;
    const steps = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const sx = x1 + dx * t;
      const sy = y1 + dy * t;
      const tx = Math.floor(sx / tileSize);
      const ty = Math.floor(sy / tileSize);
      if (level ? isBlockedByWorld(level, tx, ty, tileSize) : isBlocked(collision, tx, ty)) {
        return false;
      }
    }
    return true;
  }

  // systems/animationSystem.js
  var DIRECTIONS = ["down", "left", "right", "up"];
  function clampFrame(frame, max) {
    return (frame % max + max) % max;
  }
  function ensureAnimState(entity, defaults = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    (_a = entity.anim) != null ? _a : entity.anim = {};
    (_c = (_b = entity.anim).mode) != null ? _c : _b.mode = defaults.mode || "idle";
    (_e = (_d = entity.anim).facing) != null ? _e : _d.facing = defaults.facing || "down";
    (_g = (_f = entity.anim).frame) != null ? _g : _f.frame = 0;
    (_i = (_h = entity.anim).timer) != null ? _i : _h.timer = 0;
    (_k = (_j = entity.anim).bob) != null ? _k : _j.bob = 0;
    (_m = (_l = entity.anim).flipX) != null ? _m : _l.flipX = false;
    (_o = (_n = entity.anim).frameCount) != null ? _o : _n.frameCount = defaults.frameCount || 4;
    (_q = (_p = entity.anim).lockedMode) != null ? _q : _p.lockedMode = null;
    (_s = (_r = entity.anim).lockedTimer) != null ? _s : _r.lockedTimer = 0;
    (_u = (_t = entity.anim).variant) != null ? _u : _t.variant = defaults.variant || "default";
    (_w = (_v = entity.anim).lastMode) != null ? _w : _v.lastMode = entity.anim.mode;
    return entity.anim;
  }
  function triggerOneShotAnimation(entity, mode, duration = 0.28, options = {}) {
    const anim = ensureAnimState(entity, options);
    anim.lockedMode = mode;
    anim.lockedTimer = duration;
    if (options.facing) anim.facing = options.facing;
    if (options.variant) anim.variant = options.variant;
    anim.timer = 0;
    return anim;
  }
  function facingToRow(facing) {
    return Math.max(0, DIRECTIONS.indexOf(facing || "down"));
  }
  function normalizeVisualMode(mode, moving) {
    if (mode === "return") return moving ? "walk" : "idle";
    return mode;
  }
  function updateHumanoidAnimation(entity, deltaTime, moving, facing, config = {}) {
    const anim = ensureAnimState(entity, config);
    const walkFrameDuration = config.walkFrameDuration || 0.12;
    const idleFrameDuration = config.idleFrameDuration || 0.35;
    const interactFrameDuration = config.interactFrameDuration || 0.09;
    const alertFrameDuration = config.alertFrameDuration || 0.1;
    const bobSpeed = config.bobSpeed || 10;
    const bobAmount = config.bobAmount || 1.5;
    const frameCount = config.frameCount || 4;
    if (facing) anim.facing = facing;
    anim.frameCount = frameCount;
    let desiredMode = config.modeOverride || (moving ? "walk" : "idle");
    if (anim.lockedTimer > 0 && anim.lockedMode) {
      anim.lockedTimer -= deltaTime;
      desiredMode = anim.lockedMode;
      if (anim.lockedTimer <= 0) {
        anim.lockedMode = null;
        anim.lockedTimer = 0;
        desiredMode = config.modeOverride || (moving ? "walk" : "idle");
      }
    }
    desiredMode = normalizeVisualMode(desiredMode, moving);
    if (anim.lastMode !== desiredMode) {
      anim.timer = 0;
      anim.lastMode = desiredMode;
    }
    anim.mode = desiredMode;
    anim.timer += deltaTime;
    if (desiredMode === "interact") {
      const interactFrames = config.interactFrames || [0, 1, 2, 3];
      const cycle = Math.floor(anim.timer / interactFrameDuration);
      anim.frame = interactFrames[Math.min(cycle, interactFrames.length - 1)];
      anim.bob *= Math.max(0, 1 - deltaTime * 10);
    } else if (desiredMode === "alert") {
      const alertFrames = config.alertFrames || [3, 2, 3, 1];
      const cycle = Math.floor(anim.timer / alertFrameDuration);
      anim.frame = alertFrames[cycle % alertFrames.length];
      anim.bob = Math.sin(anim.timer * (bobSpeed + 4)) * (bobAmount * 0.65);
    } else if (moving || desiredMode === "walk") {
      const cycle = Math.floor(anim.timer / walkFrameDuration);
      const walkFrames = config.walkFrames || [0, 1, 2, 1];
      anim.frame = walkFrames[cycle % walkFrames.length];
      anim.bob = Math.sin(anim.timer * bobSpeed) * bobAmount;
    } else {
      const idleFrames = config.idleFrames || [0, 0, 3, 0];
      const cycle = Math.floor(anim.timer / idleFrameDuration);
      anim.frame = idleFrames[cycle % idleFrames.length];
      anim.bob *= Math.max(0, 1 - deltaTime * 8);
    }
    anim.frame = clampFrame(anim.frame, frameCount);
    return anim;
  }
  function getFrameRect(img, anim, options = {}) {
    if (!img) return null;
    const frameCount = options.frameCount || (anim == null ? void 0 : anim.frameCount) || 4;
    const rows = options.rows || 4;
    const frameW = Math.floor(img.width / frameCount);
    const frameH = Math.floor(img.height / rows);
    const row = facingToRow((anim == null ? void 0 : anim.facing) || "down");
    const col = clampFrame((anim == null ? void 0 : anim.frame) || 0, frameCount);
    return {
      sx: col * frameW,
      sy: row * frameH,
      sw: frameW,
      sh: frameH
    };
  }

  // systems/playerSystem.js
  function triggerPlayerAction(player, mode = "interact", duration = 0.26) {
    triggerOneShotAnimation(player, mode, duration, { facing: player.facing || "down" });
  }
  function updatePlayer(player, input, level, deltaTime) {
    const speed = player.speed * (input.sprint ? player.sprint : 1);
    let moveX = input.x;
    let moveY = input.y;
    let moving = moveX !== 0 || moveY !== 0;
    if (moveX !== 0 && moveY !== 0) {
      const inv = Math.SQRT1_2;
      moveX *= inv;
      moveY *= inv;
    }
    const nextX = player.x + moveX * speed * deltaTime;
    const nextY = player.y + moveY * speed * deltaTime;
    if (moveX !== 0) {
      player.facing = moveX > 0 ? "right" : "left";
      if (canMoveToRect(player, nextX, player.y, level.collision, level.settings.baseTile, level)) {
        player.x = nextX;
      }
    }
    if (moveY !== 0) {
      player.facing = moveY > 0 ? "down" : "up";
      if (canMoveToRect(player, player.x, nextY, level.collision, level.settings.baseTile, level)) {
        player.y = nextY;
      }
    }
    player.moving = moving;
    player.moveX = moveX;
    player.moveY = moveY;
    player.characterType = "player";
    player.characterVariant || (player.characterVariant = "default");
    updateHumanoidAnimation(player, deltaTime, moving, player.facing, {
      frameCount: 4,
      walkFrameDuration: input.sprint ? 0.09 : 0.12,
      idleFrameDuration: 0.34,
      interactFrameDuration: 0.085,
      alertFrameDuration: 0.1,
      bobAmount: input.sprint ? 2.2 : 1.5,
      walkFrames: [0, 1, 2, 1],
      idleFrames: [0, 0, 3, 0],
      interactFrames: [0, 1, 2, 3],
      alertFrames: [3, 2, 3, 1],
      variant: player.characterVariant
    });
  }

  // systems/interactionSystem.js
  function findNearbyEntity(player, entities, tileSize, maxDistanceTiles = 1.25) {
    var _a, _b;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const maxDistance = tileSize * maxDistanceTiles;
    let best = null;
    let bestDist = Infinity;
    for (const entity of entities) {
      const cx = (_a = entity.centerX) != null ? _a : (entity.x + 0.5) * tileSize;
      const cy = (_b = entity.centerY) != null ? _b : (entity.y + 0.5) * tileSize;
      const dist = Math.hypot(px - cx, py - cy);
      if (dist <= maxDistance && dist < bestDist) {
        best = entity;
        bestDist = dist;
      }
    }
    return best;
  }
  function getInteractionPrompt(level) {
    const tileSize = level.settings.baseTile;
    const chest = findNearbyEntity(level.player, level.boxSystem.boxes, tileSize, 1.1);
    if (chest && !chest.opened) return { type: "box", entity: chest, text: "Press E to open chest" };
    const door = findNearbyEntity(level.player, level.doorSystem.doors, tileSize, 1.25);
    if (door) return { type: "door", entity: door, text: door.open ? "Press E to close door" : "Press E to open door" };
    const button = level.roomSystem.getNearestButtonForPlayer(level.player, tileSize * 1.35);
    if (button) return { type: "light", entity: button, text: level.roomSystem.isLit(button.roomId) ? "Press E to turn lights off" : "Press E to restore lights" };
    return null;
  }
  function tryInteract(level) {
    var _a;
    const prompt = getInteractionPrompt(level);
    if (!prompt) return { success: false, text: "" };
    if (prompt.type === "box") {
      const changed = level.boxSystem.open(prompt.entity);
      return { success: changed, text: changed ? "Chest opened" : "", kind: "box", entity: prompt.entity };
    }
    if (prompt.type === "door") {
      const changed = level.doorSystem.toggle(prompt.entity);
      return { success: changed, text: prompt.entity.open ? "Door opened" : "Door closed", kind: "door", entity: prompt.entity };
    }
    if (prompt.type === "light") {
      const roomId = prompt.entity.roomId;
      level.roomSystem.toggleRoom(roomId);
      return { success: true, text: ((_a = level.roomSystem.rooms.get(roomId)) == null ? void 0 : _a.lightOn) ? "Lights on" : "Lights off", kind: "light", entity: prompt.entity };
    }
    return { success: false, text: "" };
  }

  // systems/npcSystem.js
  function moveToward(npc, targetX, targetY, speed, deltaTime) {
    const dx = targetX - npc.x;
    const dy = targetY - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      npc.moving = false;
      return true;
    }
    npc.x += dx / dist * speed * deltaTime;
    npc.y += dy / dist * speed * deltaTime;
    npc.moving = true;
    npc.facing = Math.abs(dx) > Math.abs(dy) ? dx >= 0 ? "right" : "left" : dy >= 0 ? "down" : "up";
    return dist <= speed * deltaTime;
  }
  function getPlayerCenter(player) {
    return { x: player.x + player.w / 2, y: player.y + player.h / 2 };
  }
  function getNpcCenter(npc) {
    return { x: npc.x + npc.w / 2, y: npc.y + npc.h / 2 };
  }
  function canSeePlayer(npc, level) {
    const playerCenter = getPlayerCenter(level.player);
    const npcCenter = getNpcCenter(npc);
    const visionRange = level.roomSystem.getNpcVisionRange(npc, level.settings.visionRange || 112);
    const dist = Math.hypot(playerCenter.x - npcCenter.x, playerCenter.y - npcCenter.y);
    if (dist > visionRange) return false;
    return hasLineOfSight(level.collision, npcCenter.x, npcCenter.y, playerCenter.x, playerCenter.y, level.settings.baseTile, 6, level);
  }
  function seedSearchWander(npc, level) {
    const roomId = level.roomSystem.getActorRoomId(npc);
    const tiles = level.roomSystem.roomTiles.get(roomId) || [];
    if (!tiles.length) return;
    const pick = tiles[Math.floor(Math.random() * tiles.length) % tiles.length];
    npc.searchTargetX = pick.x * level.settings.baseTile + level.settings.baseTile / 2;
    npc.searchTargetY = pick.y * level.settings.baseTile + level.settings.baseTile / 2;
    npc.searchWanderTimer = 0.65 + Math.random() * 0.85;
  }
  function updateLightResponse(npc, level, deltaTime) {
    const task = npc.roomLightResponse;
    if (!task) return false;
    if (task.stage === "GO_TO_BUTTON") {
      const arrived = moveToward(npc, task.buttonX - npc.w / 2, task.buttonY - npc.h / 2, npc.speedPatrol || 55, deltaTime);
      if (arrived) {
        const button = level.roomSystem.buttons.find((entry) => entry.roomId === task.roomId);
        if (button) level.roomSystem.consumeButtonResponse(button, "npc");
        task.stage = "SEARCH_AFTER_BUTTON";
        npc.searchTimer = Math.max(npc.searchTimer || 0, 1.8);
        seedSearchWander(npc, level);
      }
      return true;
    }
    if (task.stage === "SEARCH_AFTER_BUTTON") {
      npc.searchTimer -= deltaTime;
      npc.searchWanderTimer = (npc.searchWanderTimer || 0) - deltaTime;
      if (npc.searchWanderTimer <= 0) seedSearchWander(npc, level);
      if (npc.searchTargetX && npc.searchTargetY) {
        moveToward(npc, npc.searchTargetX - npc.w / 2, npc.searchTargetY - npc.h / 2, npc.speedPatrol || 55, deltaTime);
      }
      if (npc.searchTimer <= 0) {
        npc.roomLightResponse = null;
        npc.state = "RETURN";
      }
      return true;
    }
    return false;
  }
  function updateReturnState(npc, deltaTime) {
    const arrived = moveToward(npc, npc.homeX, npc.homeY, npc.speedPatrol || 55, deltaTime);
    if (arrived) {
      npc.state = "PATROL";
      npc.lastSeenX = 0;
      npc.lastSeenY = 0;
      npc.searchTargetX = 0;
      npc.searchTargetY = 0;
    }
  }
  function updateNpcs(level, deltaTime) {
    var _a;
    let detectedBy = null;
    for (const npc of level.npcs) {
      npc.state = npc.state || "PATROL";
      npc.wpIndex = npc.wpIndex || 0;
      npc.searchTimer = npc.searchTimer || 0;
      npc.loseSight = npc.loseSight || 0;
      npc.searchWanderTimer = npc.searchWanderTimer || 0;
      npc.moving = false;
      if (canSeePlayer(npc, level)) {
        npc.state = "CHASE";
        npc.loseSight = 0.9;
        const pc = getPlayerCenter(level.player);
        npc.lastSeenX = pc.x;
        npc.lastSeenY = pc.y;
        npc.roomLightResponse = null;
      } else if (npc.state === "CHASE") {
        npc.loseSight -= deltaTime;
        if (npc.loseSight <= 0) {
          npc.state = "SEARCH";
          npc.searchTimer = 2.8;
          npc.searchWanderTimer = 0;
        }
      }
      if (npc.state === "CHASE") {
        const playerCenter = getPlayerCenter(level.player);
        moveToward(npc, playerCenter.x - npc.w / 2, playerCenter.y - npc.h / 2, npc.speedChase || 82, deltaTime);
        if (Math.hypot(playerCenter.x - (npc.x + npc.w / 2), playerCenter.y - (npc.y + npc.h / 2)) < 12) {
          detectedBy = npc.id;
        }
      } else if (updateLightResponse(npc, level, deltaTime)) {
      } else if (npc.state === "SEARCH") {
        npc.searchTimer -= deltaTime;
        npc.searchWanderTimer -= deltaTime;
        if (npc.lastSeenX && npc.lastSeenY && npc.searchTimer > 1.2) {
          moveToward(npc, npc.lastSeenX - npc.w / 2, npc.lastSeenY - npc.h / 2, npc.speedPatrol || 55, deltaTime);
        } else {
          if (npc.searchWanderTimer <= 0 || !npc.searchTargetX || !npc.searchTargetY) seedSearchWander(npc, level);
          moveToward(npc, npc.searchTargetX - npc.w / 2, npc.searchTargetY - npc.h / 2, npc.speedPatrol || 55, deltaTime);
        }
        if (npc.searchTimer <= 0) {
          npc.state = "RETURN";
        }
      } else if (npc.state === "RETURN") {
        updateReturnState(npc, deltaTime);
      } else {
        const point = (_a = npc.waypoints) == null ? void 0 : _a[npc.wpIndex];
        if (point) {
          const arrived = moveToward(npc, point.x, point.y, npc.speedPatrol || 55, deltaTime);
          if (arrived) npc.wpIndex = (npc.wpIndex + 1) % npc.waypoints.length;
        }
      }
      npc.characterType = "npc";
      npc.characterVariant = npc.state === "CHASE" ? "chase" : npc.state === "SEARCH" ? "search" : "patrol";
      updateHumanoidAnimation(npc, deltaTime, !!npc.moving, npc.facing || "down", {
        frameCount: 4,
        walkFrameDuration: npc.state === "CHASE" ? 0.08 : 0.12,
        idleFrameDuration: 0.38,
        interactFrameDuration: 0.085,
        alertFrameDuration: npc.state === "CHASE" ? 0.075 : 0.095,
        bobAmount: npc.state === "CHASE" ? 2 : 1.2,
        walkFrames: [0, 1, 2, 1],
        idleFrames: [0, 0, 3, 0],
        interactFrames: [0, 1, 2, 3],
        alertFrames: [3, 2, 3, 1],
        modeOverride: npc.state === "CHASE" || npc.state === "SEARCH" ? "alert" : npc.state === "RETURN" ? "walk" : void 0,
        variant: npc.characterVariant
      });
    }
    return detectedBy;
  }

  // systems/cameraSystem.js
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function createCamera(viewWidth, viewHeight) {
    return {
      x: 0,
      y: 0,
      width: viewWidth,
      height: viewHeight,
      deadZoneX: Math.floor(viewWidth * 0.22),
      deadZoneY: Math.floor(viewHeight * 0.18),
      smoothing: 0.18,
      worldWidth: viewWidth,
      worldHeight: viewHeight,
      targetX: 0,
      targetY: 0
    };
  }
  function resizeCamera(camera, width, height) {
    camera.width = width;
    camera.height = height;
    camera.deadZoneX = Math.floor(width * 0.22);
    camera.deadZoneY = Math.floor(height * 0.18);
  }
  function configureCameraBounds(camera, mapWidthTiles, mapHeightTiles, tileSize) {
    camera.worldWidth = Math.max(camera.width, mapWidthTiles * tileSize);
    camera.worldHeight = Math.max(camera.height, mapHeightTiles * tileSize);
    camera.x = clamp(camera.x, 0, Math.max(0, camera.worldWidth - camera.width));
    camera.y = clamp(camera.y, 0, Math.max(0, camera.worldHeight - camera.height));
  }
  function updateCamera(camera, player, deltaTime = 0) {
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;
    let targetX = camera.x;
    let targetY = camera.y;
    const leftEdge = camera.x + camera.deadZoneX;
    const rightEdge = camera.x + camera.width - camera.deadZoneX;
    const topEdge = camera.y + camera.deadZoneY;
    const bottomEdge = camera.y + camera.height - camera.deadZoneY;
    if (centerX < leftEdge) targetX = centerX - camera.deadZoneX;
    else if (centerX > rightEdge) targetX = centerX + camera.deadZoneX - camera.width;
    if (centerY < topEdge) targetY = centerY - camera.deadZoneY;
    else if (centerY > bottomEdge) targetY = centerY + camera.deadZoneY - camera.height;
    const maxX = Math.max(0, camera.worldWidth - camera.width);
    const maxY = Math.max(0, camera.worldHeight - camera.height);
    targetX = clamp(targetX, 0, maxX);
    targetY = clamp(targetY, 0, maxY);
    const blend = deltaTime > 0 ? 1 - Math.pow(1 - camera.smoothing, deltaTime * 60) : camera.smoothing;
    camera.x += (targetX - camera.x) * blend;
    camera.y += (targetY - camera.y) * blend;
    camera.x = clamp(camera.x, 0, maxX);
    camera.y = clamp(camera.y, 0, maxY);
    camera.targetX = targetX;
    camera.targetY = targetY;
  }
  function isRectVisible(camera, x, y, w, h, pad = 0) {
    return x + w >= camera.x - pad && y + h >= camera.y - pad && x <= camera.x + camera.width + pad && y <= camera.y + camera.height + pad;
  }
  function getVisibleTileBounds(camera, tileSize, mapWidth, mapHeight) {
    const startCol = clamp(Math.floor(camera.x / tileSize), 0, Math.max(0, mapWidth - 1));
    const endCol = clamp(Math.ceil((camera.x + camera.width) / tileSize), 0, mapWidth);
    const startRow = clamp(Math.floor(camera.y / tileSize), 0, Math.max(0, mapHeight - 1));
    const endRow = clamp(Math.ceil((camera.y + camera.height) / tileSize), 0, mapHeight);
    return { startCol, endCol, startRow, endRow };
  }

  // render/mapRenderer_p5.js
  function resolveBaseGid(gid) {
    return GID_REMAP[gid] || gid;
  }
  function getTilesetInfo(gid) {
    const base = resolveBaseGid(gid);
    const numeric = Object.keys(TILESET_CONFIG).map(Number).sort((a, b) => a - b);
    let firstgid = null;
    for (const key of numeric) {
      if (key <= base) firstgid = key;
      else break;
    }
    if (firstgid == null) return null;
    return { firstgid, config: TILESET_CONFIG[firstgid], localId: base - firstgid };
  }
  function drawFallbackCollision(p, level, camera) {
    var _a;
    const tile = level.settings.baseTile;
    const bounds = getVisibleTileBounds(camera, tile, ((_a = level.collision[0]) == null ? void 0 : _a.length) || 0, level.collision.length || 0);
    p.noStroke();
    for (let y = bounds.startRow; y < bounds.endRow; y += 1) {
      for (let x = bounds.startCol; x < bounds.endCol; x += 1) {
        p.fill(level.collision[y][x] === 1 ? "#394150" : "#1a2233");
        p.rect(x * tile, y * tile, tile, tile);
      }
    }
  }
  function drawTileFromImage(p, gid, x, y, tile) {
    var _a;
    const info = getTilesetInfo(gid);
    if (!((_a = info == null ? void 0 : info.config) == null ? void 0 : _a.image)) return false;
    const img = getImage(info.config.image);
    if (!img) return false;
    const cols = Math.max(1, info.config.columns || 1);
    const tw = info.config.tileWidth || tile;
    const th = info.config.tileHeight || tile;
    const sx = info.localId % cols * tw;
    const sy = Math.floor(info.localId / cols) * th;
    p.image(img, x * tile, y * tile, tile, tile, sx, sy, tw, th);
    return true;
  }
  function drawLayer(p, level, layer, camera) {
    const tile = level.settings.baseTile;
    const width = level.mapData.width;
    const height = level.mapData.height;
    const bounds = getVisibleTileBounds(camera, tile, width, height);
    p.noStroke();
    for (let y = bounds.startRow; y < bounds.endRow; y += 1) {
      for (let x = bounds.startCol; x < bounds.endCol; x += 1) {
        const gid = layer.data[y * width + x] || 0;
        if (!gid) continue;
        const usedImage = drawTileFromImage(p, gid, x, y, tile);
        if (!usedImage) {
          p.fill(GID_COLORS[gid] || "#334155");
          p.rect(x * tile, y * tile, tile, tile);
        }
      }
    }
  }
  function renderMap(p, state) {
    var _a;
    const level = state.level;
    if (!level) return;
    const camera = state.camera || { x: 0, y: 0, width: p.width, height: p.height };
    if (!((_a = level.mapData) == null ? void 0 : _a.layers)) {
      drawFallbackCollision(p, level, camera);
      return;
    }
    p.background("#0d1220");
    for (const layer of level.mapData.layers) {
      if (layer.type !== "tilelayer" || !layer.visible || !Array.isArray(layer.data)) continue;
      drawLayer(p, level, layer, camera);
    }
  }

  // render/entityRenderer_p5.js
  function drawResolvedCharacter(p, descriptor, entity, x, y, w, h, fillColor) {
    var _a;
    const anim = ensureAnimState(entity, { facing: entity.facing || "down", frameCount: 4, variant: entity.characterVariant || "default" });
    const sheet = (descriptor == null ? void 0 : descriptor.sheet) ? getImage(descriptor.sheet) : null;
    if (sheet) {
      const rect = getFrameRect(sheet, anim, { frameCount: 4, rows: 4 });
      p.push();
      p.translate(0, anim.bob || 0);
      p.image(sheet, x, y, w, h, rect.sx, rect.sy, rect.sw, rect.sh);
      p.pop();
      return true;
    }
    const directional = ((_a = descriptor == null ? void 0 : descriptor.directional) == null ? void 0 : _a[anim.facing || "down"]) ? getImage(descriptor.directional[anim.facing || "down"]) : null;
    if (directional) {
      p.push();
      p.translate(0, anim.bob || 0);
      p.image(directional, x, y, w, h);
      p.pop();
      return true;
    }
    const fallbackSheet = (descriptor == null ? void 0 : descriptor.fallbackSheet) ? getImage(descriptor.fallbackSheet) : null;
    if (fallbackSheet) {
      const rect = getFrameRect(fallbackSheet, anim, { frameCount: 4, rows: 4 });
      p.push();
      p.translate(0, anim.bob || 0);
      p.image(fallbackSheet, x, y, w, h, rect.sx, rect.sy, rect.sw, rect.sh);
      p.pop();
      return true;
    }
    const fallbackSingle = (descriptor == null ? void 0 : descriptor.fallbackSingle) ? getImage(descriptor.fallbackSingle) : null;
    if (fallbackSingle) {
      p.push();
      p.translate(0, anim.bob || 0);
      p.image(fallbackSingle, x, y, w, h);
      p.pop();
      return true;
    }
    p.push();
    p.translate(0, anim.bob || 0);
    p.noStroke();
    p.fill(fillColor);
    p.rect(x, y, w, h, 3);
    p.fill(255, 255, 255, 60);
    if (anim.mode === "walk" || anim.mode === "alert") {
      const stride = anim.frame === 1 ? -2 : anim.frame === 2 ? 2 : 0;
      p.rect(x + 4, y + h - 7, 5, 5 + Math.abs(stride), 2);
      p.rect(x + w - 9, y + h - 7, 5, 5 + Math.abs(stride), 2);
    } else if (anim.mode === "interact") {
      p.rect(x + w - 10, y + 4, 6, 6, 2);
    }
    p.pop();
    return false;
  }
  function drawDoubleDoor(p, door, tile) {
    const x = door.x * tile;
    const y = door.y * tile;
    const leafW = tile;
    const leafH = tile * 2;
    const img = getImage(SPRITE_PATHS.door.double);
    p.push();
    p.translate(x + leafW, y);
    p.rotate(-0.95 * door.anim);
    if (img) p.image(img, -leafW, 0, leafW, leafH, 0, 0, img.width / 2, img.height);
    else {
      p.noStroke();
      p.fill("#8b7355");
      p.rect(-leafW + 1, 1, leafW - 2, leafH - 2, 2);
    }
    p.pop();
    p.push();
    p.translate(x + leafW, y);
    p.rotate(0.95 * door.anim);
    if (img) p.image(img, 0, 0, leafW, leafH, img.width / 2, 0, img.width / 2, img.height);
    else {
      p.noStroke();
      p.fill("#8b7355");
      p.rect(1, 1, leafW - 2, leafH - 2, 2);
    }
    p.pop();
    if (door.anim > 0.05) {
      p.noStroke();
      p.fill(20, 30, 50, 130 * door.anim);
      p.rect(x + 2, y + 2, tile * 2 - 4, tile * 2 - 4, 2);
    }
  }
  function drawLineDoor(p, door, tile) {
    const px = door.x * tile;
    const py = door.y * tile;
    const w = tile;
    const h = tile * 2;
    const img = getImage(SPRITE_PATHS.door.line);
    p.push();
    p.translate(px + w / 2, py);
    p.rotate(door.angle || 0);
    if (img) p.image(img, -w / 2, 0, w, h);
    else {
      p.fill("#a16207");
      p.rect(-w / 2, 0, w, h, 2);
      p.stroke("#111827");
      p.line(0, 2, 0, h - 2);
      p.noStroke();
    }
    p.pop();
  }
  function drawChest(p, chest, tile) {
    const px = chest.x * tile;
    const py = chest.y * tile;
    const w = chest.w * tile;
    const h = chest.h * tile;
    const baseImg = getImage(SPRITE_PATHS.chest.base);
    const lidImg = getImage(SPRITE_PATHS.chest.lid);
    if (baseImg) p.image(baseImg, px + 1, py + h / 2, w - 2, h / 2 - 1);
    else {
      p.noStroke();
      p.fill("#7a4b1f");
      p.rect(px + 1, py + h / 2, w - 2, h / 2 - 1, 3);
    }
    const hingeX = px + w / 2;
    const hingeY = py + h / 2;
    p.push();
    p.translate(hingeX, hingeY);
    p.rotate(chest.angle || 0);
    if (lidImg) p.image(lidImg, -w / 2 + 1, -h / 2 + 1, w - 2, h / 2 - 2);
    else {
      p.fill(chest.opened ? "#d4b14d" : "#8b5a2b");
      p.rect(-w / 2 + 1, -h / 2 + 1, w - 2, h / 2 - 2, 3);
    }
    p.pop();
    if (chest.opened) {
      p.fill(254, 243, 199, 70 + 110 * chest.lootPulse);
      p.rect(px + 4, py + h / 2 + 2, w - 8, 5, 2);
    }
  }
  function renderButton(p, level, button) {
    const lit = level.roomSystem.isLit(button.roomId);
    const glow = button.responseGlow || 0;
    const path = lit ? SPRITE_PATHS.button.on : SPRITE_PATHS.button.off;
    const img = getImage(path);
    if (img) {
      p.image(img, button.centerX - 8 - glow * 2, button.centerY - 8 - glow * 2, 16 + glow * 4, 16 + glow * 4);
      return;
    }
    p.noStroke();
    p.fill(lit ? "#22c55e" : "#ef4444");
    p.circle(button.centerX, button.centerY, 8 + glow * 5);
  }
  function renderSearchMarker(p, npc) {
    if (!npc.searchTargetX || !npc.searchTargetY) return;
    p.push();
    p.noFill();
    p.stroke(251, 191, 36, 110);
    p.circle(npc.searchTargetX, npc.searchTargetY, 10);
    p.line(npc.searchTargetX - 4, npc.searchTargetY, npc.searchTargetX + 4, npc.searchTargetY);
    p.line(npc.searchTargetX, npc.searchTargetY - 4, npc.searchTargetX, npc.searchTargetY + 4);
    p.pop();
  }
  function renderEntities(p, state) {
    var _a, _b;
    const level = state.level;
    if (!level) return;
    const tile = level.settings.baseTile;
    const camera = state.camera || { x: 0, y: 0, width: p.width, height: p.height };
    for (const door of level.doorSystem.doors) {
      const worldX = door.x * tile;
      const worldY = door.y * tile;
      if (!isRectVisible(camera, worldX, worldY, door.kind === "line" ? tile : tile * 2, tile * 2, 32)) continue;
      if (door.kind === "line") drawLineDoor(p, door, tile);
      else drawDoubleDoor(p, door, tile);
    }
    for (const chest of level.boxSystem.boxes) {
      const worldX = chest.x * tile;
      const worldY = chest.y * tile;
      if (!isRectVisible(camera, worldX, worldY, chest.w * tile, chest.h * tile, 24)) continue;
      drawChest(p, chest, tile);
    }
    for (const button of level.roomSystem.buttons) {
      if (!isRectVisible(camera, button.centerX - 10, button.centerY - 10, 20, 20, 16)) continue;
      renderButton(p, level, button);
    }
    for (const npc of level.npcs) {
      if (!isRectVisible(camera, npc.x, npc.y, npc.w, npc.h, 64)) continue;
      const descriptor = resolveCharacterSprite("npc", npc.characterVariant || "patrol", ((_a = npc.anim) == null ? void 0 : _a.mode) || "idle", npc.facing || "down");
      drawResolvedCharacter(
        p,
        descriptor,
        npc,
        npc.x,
        npc.y,
        npc.w,
        npc.h,
        npc.state === "CHASE" ? "#fb7185" : npc.state === "SEARCH" ? "#f59e0b" : npc.state === "RETURN" ? "#60a5fa" : "#ef4444"
      );
      if (state.debug.showVision) {
        p.noFill();
        p.stroke("#f87171");
        const range = level.roomSystem.getNpcVisionRange(npc, level.settings.visionRange || 112);
        p.circle(npc.x + npc.w / 2, npc.y + npc.h / 2, range * 2);
        p.noStroke();
        if (npc.state === "SEARCH") renderSearchMarker(p, npc);
      }
    }
    if (isRectVisible(camera, level.player.x, level.player.y, level.player.w, level.player.h, 64)) {
      const descriptor = resolveCharacterSprite("player", level.player.characterVariant || "default", ((_b = level.player.anim) == null ? void 0 : _b.mode) || "idle", level.player.facing || "down");
      drawResolvedCharacter(p, descriptor, level.player, level.player.x, level.player.y, level.player.w, level.player.h, level.player.color);
    }
  }

  // systems/lightingSystem.js
  function getTileDarkness(level, tx, ty) {
    const roomId = level.roomSystem.getRoomId(tx, ty);
    if (roomId <= 1) return 0;
    const room = level.roomSystem.rooms.get(roomId);
    if (!room) return 0;
    const base = room.lightOn ? 0 : 0.62;
    return Math.min(0.8, base + room.alert * 0.08);
  }

  // render/lightingRenderer_p5.js
  function drawTileDarkness(p, level) {
    const tile = level.settings.baseTile;
    const matrix = level.roomSystem.matrix || [];
    p.noStroke();
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        const darkness = getTileDarkness(level, x, y);
        if (darkness <= 0) continue;
        p.fill(0, 0, 0, darkness * 255);
        p.rect(x * tile, y * tile, tile, tile);
      }
    }
  }
  function drawPlayerReveal(p, level) {
    const roomId = level.roomSystem.getActorRoomId(level.player);
    if (level.roomSystem.isLit(roomId)) return;
    const cx = level.player.x + level.player.w / 2;
    const cy = level.player.y + level.player.h / 2;
    const maxR = (level.settings.baseTile || 16) * 4.6;
    p.noStroke();
    for (let i = 7; i >= 1; i -= 1) {
      const t = i / 7;
      const r = maxR * t;
      p.fill(255, 244, 200, 11 * (1 - t));
      p.circle(cx, cy, r * 2);
    }
  }
  function drawRoomDebug(p, level) {
    const tile = level.settings.baseTile;
    const matrix = level.roomSystem.matrix || [];
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(9);
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        const roomId = matrix[y][x] || 1;
        if (roomId <= 1) continue;
        p.noFill();
        p.stroke(96, 165, 250, 60);
        p.rect(x * tile, y * tile, tile, tile);
        p.noStroke();
        p.fill(191, 219, 254, 80);
        p.text(String(roomId), x * tile + tile / 2, y * tile + tile / 2 + 1);
      }
    }
  }
  function drawButtonsGlow(p, level) {
    for (const button of level.roomSystem.buttons) {
      if (!(button.responseGlow > 0.01)) continue;
      p.noFill();
      p.stroke(250, 204, 21, 120 * button.responseGlow);
      p.circle(button.centerX, button.centerY, 18 + button.responseGlow * 12);
      p.noStroke();
    }
  }
  function renderLightingOverlay(p, state) {
    const level = state.level;
    if (!level) return;
    drawTileDarkness(p, level);
    drawPlayerReveal(p, level);
    drawButtonsGlow(p, level);
    if (state.debug.showRooms) drawRoomDebug(p, level);
  }

  // states/startScreen.js
  function renderStartScreen(p, state) {
    p.background("#0b1020");
    p.fill("#f8fafc");
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(42);
    p.text("Fusion Game v16", p.width / 2, p.height / 2 - 64);
    p.textSize(18);
    p.text(`Level: ${state.levelId || "-"}`, p.width / 2, p.height / 2 - 18);
    p.text("Press Enter to open the mission brief", p.width / 2, p.height / 2 + 20);
    p.text("Resource-clean build: manifest loading, quieter console, and p5.js 2 friendly startup.", p.width / 2, p.height / 2 + 54);
  }

  // states/introScreen.js
  function renderIntroScreen(p, state) {
    p.background("#111827");
    p.fill("#e5e7eb");
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(28);
    p.text("Mission Brief", p.width / 2, 120);
    p.textSize(17);
    p.text("Open every chest, avoid patrols, and use room lights to reduce enemy vision.", p.width / 2, 220);
    p.text("Controls: WASD / Arrows to move, Shift to sprint, E to interact, P to pause.", p.width / 2, 254);
    p.text("Press Enter to deploy.", p.width / 2, 320);
  }

  // states/winScreen.js
  function renderWinScreen(p, state) {
    p.background("#052e16");
    p.fill("#dcfce7");
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(34);
    p.text("Mission Complete", p.width / 2, p.height / 2 - 42);
    p.textSize(18);
    p.text(`All chests opened in ${(state.meta.elapsedMs / 1e3).toFixed(1)}s`, p.width / 2, p.height / 2 + 4);
    p.text("Press Enter to restart", p.width / 2, p.height / 2 + 40);
  }

  // states/loseScreen.js
  function renderLoseScreen(p, state) {
    p.background("#3f0d0d");
    p.fill("#fee2e2");
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(34);
    p.text("Detected", p.width / 2, p.height / 2 - 42);
    p.textSize(18);
    p.text(`NPC: ${state.meta.detectedBy || "unknown"}`, p.width / 2, p.height / 2 + 4);
    p.text("Press Enter to try again", p.width / 2, p.height / 2 + 40);
  }

  // states/pauseScreen.js
  function renderPauseScreen(p) {
    p.push();
    p.noStroke();
    p.fill(0, 0, 0, 150);
    p.rect(0, 0, p.width, p.height);
    p.fill("#ffffff");
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(36);
    p.text("Paused", p.width / 2, p.height / 2 - 16);
    p.textSize(18);
    p.text("Press P or Enter to continue", p.width / 2, p.height / 2 + 24);
    p.pop();
  }

  // render/renderSystem.js
  function renderScene(p, state, overlaySystem) {
    if (state.screen === "start") {
      renderStartScreen(p, state);
    } else if (state.screen === "intro") {
      renderIntroScreen(p, state);
    } else if (state.screen === "win") {
      renderWinScreen(p, state);
    } else if (state.screen === "lose") {
      renderLoseScreen(p, state);
    } else {
      p.push();
      if (state.camera) p.translate(-state.camera.x, -state.camera.y);
      renderMap(p, state);
      renderEntities(p, state);
      renderLightingOverlay(p, state);
      p.pop();
      renderHud(p, state);
      if (state.screen === "pause") renderPauseScreen(p, state);
      if (state.debug.showCamera && state.camera) renderCameraDebug(p, state);
    }
    overlaySystem == null ? void 0 : overlaySystem.render(p, state);
  }
  function renderHud(p, state) {
    var _a, _b;
    p.push();
    p.noStroke();
    p.fill(8, 15, 28, 190);
    p.rect(8, 8, 430, 160, 8);
    p.fill("#ffffff");
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(14);
    p.text(`Chests: ${state.meta.collected}/${state.meta.target}`, 16, 16);
    const assets2 = getAssetState();
    p.text(`Prompt: ${state.prompt || "-"}`, 16, 34);
    p.text(`Time: ${(state.meta.elapsedMs / 1e3).toFixed(1)}s`, 16, 52);
    p.text(`Assets: ${assets2.imageCount}/${assets2.requestedCount || assets2.imageCount} loaded${assets2.failedCount ? ` / fallback ${assets2.failedCount}` : ""}`, 16, 70);
    p.text(`Track: ${state.audio.currentTrack || "-"}${state.audio.muted ? " (muted)" : ""}`, 16, 88);
    p.text(`Camera: ${Math.round(((_a = state.camera) == null ? void 0 : _a.x) || 0)}, ${Math.round(((_b = state.camera) == null ? void 0 : _b.y) || 0)}`, 16, 106);
    p.text("R restart | 1 2 3 map | B/C/V/G debug | P or Esc pause | M mute", 16, 124);
    p.text("Step 14: manifest-based assets + quieter startup", 16, 142);
    if (state.ui.message) {
      p.textAlign(p.CENTER, p.TOP);
      p.text(state.ui.message, p.width / 2, 16);
    }
    if (state.meta.detectedBy) {
      p.textAlign(p.RIGHT, p.TOP);
      p.text(`Detected by: ${state.meta.detectedBy}`, p.width - 12, 16);
    }
    p.pop();
  }
  function renderCameraDebug(p, state) {
    const camera = state.camera;
    if (!camera) return;
    p.push();
    p.noFill();
    p.stroke(96, 165, 250);
    p.rect(1, 1, p.width - 2, p.height - 2);
    p.stroke(248, 113, 113, 160);
    p.noFill();
    p.rect(camera.deadZoneX, camera.deadZoneY, p.width - camera.deadZoneX * 2, p.height - camera.deadZoneY * 2);
    p.pop();
  }

  // systems/audioSystem.js
  var TRACK_CONFIG = {
    start: { src: "./assets/audio/startScreen.wav", volume: 0.3, loop: true },
    intro: { src: "./assets/audio/startScreen.wav", volume: 0.25, loop: true },
    playing: { src: "./assets/audio/gameplay.wav", volume: 0.2, loop: true },
    win: { src: "./assets/audio/winScreen.wav", volume: 0.28, loop: true },
    lose: { src: "./assets/audio/loseScreen.wav", volume: 0.3, loop: true },
    pause: { src: "./assets/audio/startScreen.wav", volume: 0.12, loop: true }
  };
  function createAudioSystem() {
    const tracks = /* @__PURE__ */ new Map();
    let currentKey = null;
    let muted = false;
    let unlocked = false;
    function ensureTrack(key) {
      var _a;
      if (!TRACK_CONFIG[key]) return null;
      if (tracks.has(key)) return tracks.get(key);
      try {
        const audio = new Audio(TRACK_CONFIG[key].src);
        audio.loop = (_a = TRACK_CONFIG[key].loop) != null ? _a : true;
        audio.preload = "auto";
        audio.volume = 0;
        tracks.set(key, audio);
        return audio;
      } catch (e) {
        return null;
      }
    }
    function targetVolume(key) {
      var _a;
      const config = TRACK_CONFIG[key];
      if (!config || muted) return 0;
      return Math.max(0, Math.min(1, (_a = config.volume) != null ? _a : 1));
    }
    function stopAll() {
      for (const track of tracks.values()) {
        try {
          track.pause();
          track.currentTime = 0;
          track.volume = 0;
        } catch (e) {
        }
      }
      currentKey = null;
    }
    async function sync(stateKey) {
      if (!unlocked || currentKey === stateKey) return;
      const next = ensureTrack(stateKey);
      if (!next) {
        stopAll();
        currentKey = stateKey;
        return;
      }
      for (const [key, track] of tracks.entries()) {
        if (key !== stateKey) {
          try {
            track.pause();
            track.currentTime = 0;
            track.volume = 0;
          } catch (e) {
          }
        }
      }
      try {
        next.volume = targetVolume(stateKey);
        next.currentTime = 0;
        await next.play();
        currentKey = stateKey;
      } catch (e) {
        currentKey = stateKey;
      }
    }
    return {
      unlock() {
        unlocked = true;
      },
      sync,
      toggleMute() {
        muted = !muted;
        if (currentKey) {
          const track = ensureTrack(currentKey);
          if (track) track.volume = targetVolume(currentKey);
        }
        return muted;
      },
      setMuted(value) {
        muted = !!value;
      },
      stopAll,
      getState() {
        return { currentKey, muted, unlocked };
      }
    };
  }

  // systems/screenOverlaySystem.js
  function createScreenOverlaySystem() {
    return {
      update(state, deltaTime) {
        const targetAlpha = state.screen === "playing" ? 0 : 0.18;
        state.ui.overlayAlpha += (targetAlpha - state.ui.overlayAlpha) * Math.min(1, deltaTime * 6);
        if (state.ui.messageTimer > 0) {
          state.ui.messageTimer = Math.max(0, state.ui.messageTimer - deltaTime);
          if (state.ui.messageTimer === 0) state.ui.message = "";
        }
        state.ui.flashAlpha = Math.max(0, state.ui.flashAlpha - deltaTime * 1.8);
      },
      flash(state, alpha = 0.35) {
        state.ui.flashAlpha = Math.max(state.ui.flashAlpha, alpha);
      },
      render(p, state) {
        if (state.ui.vignette > 0) {
          p.noStroke();
          p.fill(0, 0, 0, 60);
          p.rect(0, 0, p.width, 28);
          p.rect(0, p.height - 28, p.width, 28);
        }
        if (state.ui.overlayAlpha > 0.01) {
          p.noStroke();
          p.fill(0, 0, 0, 255 * state.ui.overlayAlpha);
          p.rect(0, 0, p.width, p.height);
        }
        if (state.ui.flashAlpha > 0.01) {
          p.noStroke();
          p.fill(255, 255, 255, 255 * state.ui.flashAlpha);
          p.rect(0, 0, p.width, p.height);
        }
      }
    };
  }

  // core/gameCore.js
  function ensureRoomMatrices() {
    var _a, _b, _c, _d, _e, _f;
    if (window.RoomMatrices) return;
    window.RoomMatrices = {
      map1: ((_b = (_a = window.RoomLightCamera) == null ? void 0 : _a.ROOM_MATRICES) == null ? void 0 : _b[1]) || [],
      map2: ((_d = (_c = window.RoomLightCamera) == null ? void 0 : _c.ROOM_MATRICES) == null ? void 0 : _d[2]) || [],
      map3: ((_f = (_e = window.RoomLightCamera) == null ? void 0 : _e.ROOM_MATRICES) == null ? void 0 : _f[3]) || []
    };
  }
  function createGameCore({ initialLevel = "map2" } = {}) {
    const state = createGameState();
    const input = createInputSystem();
    const audio = createAudioSystem();
    const overlay = createScreenOverlaySystem();
    let currentLevelId = initialLevel;
    const camera = createCamera(960, 640);
    function syncHud() {
      var _a, _b, _c, _d;
      (_a = document.getElementById("screenState")) == null ? void 0 : _a.replaceChildren(document.createTextNode(state.screen));
      (_b = document.getElementById("levelName")) == null ? void 0 : _b.replaceChildren(document.createTextNode(state.levelId || "-"));
      (_c = document.getElementById("promptText")) == null ? void 0 : _c.replaceChildren(document.createTextNode(state.prompt || "-"));
      (_d = document.getElementById("assetState")) == null ? void 0 : _d.replaceChildren(document.createTextNode(`${getAssetState().imageCount} images cached`));
    }
    function setMessage(text, seconds = 1.5) {
      state.ui.message = text;
      state.ui.messageTimer = seconds;
    }
    function loadLevel(levelId) {
      const config = getMap(levelId);
      if (!config) throw new Error(`Unknown level: ${levelId}`);
      state.levelId = levelId;
      state.level = createRuntimeLevel(levelId, config);
      configureCameraBounds(camera, state.level.mapWidth, state.level.mapHeight, state.level.settings.baseTile);
      camera.x = 0;
      camera.y = 0;
      state.camera = camera;
      state.meta.collected = state.level.boxSystem.boxes.filter((box) => box.opened).length;
      state.meta.target = state.level.boxSystem.boxes.length;
      state.meta.detectedBy = null;
      state.meta.elapsedMs = 0;
      state.meta.startedAt = 0;
      state.prompt = "Find the chests";
      syncHud();
    }
    function setScreen(screen) {
      state.previousScreen = state.screen;
      state.screen = screen;
      if (screen === SCREEN_STATES.START) state.prompt = "Press Enter to start";
      if (screen === SCREEN_STATES.INTRO) state.prompt = "Press Enter to begin";
      if (screen === SCREEN_STATES.PAUSE) state.prompt = "Paused";
      audio.sync(screen);
      syncHud();
    }
    function restartLevel() {
      loadLevel(currentLevelId);
      setScreen(SCREEN_STATES.START);
      overlay.flash(state, 0.3);
    }
    function switchLevel(levelId) {
      currentLevelId = levelId;
      loadLevel(levelId);
      setScreen(SCREEN_STATES.START);
      overlay.flash(state, 0.3);
    }
    function togglePause() {
      if (state.screen === SCREEN_STATES.PLAYING) setScreen(SCREEN_STATES.PAUSE);
      else if (state.screen === SCREEN_STATES.PAUSE) setScreen(SCREEN_STATES.PLAYING);
    }
    return {
      async loadAssets() {
        state.loading.message = "Loading assets...";
        try {
          const result = await loadAssetsAsync();
          state.loading.ready = true;
          state.loading.message = result.failedCount > 0 ? `Loaded with ${result.failedCount} fallback asset(s)` : "Assets loaded";
        } catch (error) {
          state.loading.error = (error == null ? void 0 : error.message) || String(error);
          throw error;
        }
        syncHud();
      },
      setup() {
        bootstrapLegacyMaps();
        ensureRoomMatrices();
        loadLevel(currentLevelId);
        setScreen(SCREEN_STATES.START);
        setMessage("Loaded. Press Enter to continue.", 1.2);
      },
      update(deltaTime) {
        var _a;
        overlay.update(state, deltaTime);
        if (state.ui.messageTimer > 0) {
          state.ui.messageTimer -= deltaTime;
          if (state.ui.messageTimer <= 0) state.ui.message = "";
        }
        const confirmed = input.consumeConfirm();
        if ((state.screen === SCREEN_STATES.START || state.screen === SCREEN_STATES.INTRO || state.screen === SCREEN_STATES.WIN || state.screen === SCREEN_STATES.LOSE) && confirmed) {
          audio.unlock();
        }
        if (state.screen === SCREEN_STATES.START && confirmed) {
          setScreen(SCREEN_STATES.INTRO);
        } else if (state.screen === SCREEN_STATES.INTRO && confirmed) {
          setScreen(SCREEN_STATES.PLAYING);
          state.meta.startedAt = performance.now();
          setMessage("Mission started", 1.2);
        } else if (state.screen === SCREEN_STATES.PAUSE && confirmed) {
          setScreen(SCREEN_STATES.PLAYING);
        } else if ((state.screen === SCREEN_STATES.WIN || state.screen === SCREEN_STATES.LOSE) && confirmed) {
          restartLevel();
        }
        if (state.screen !== SCREEN_STATES.PLAYING) {
          syncHud();
          return;
        }
        state.meta.elapsedMs = Math.max(0, performance.now() - state.meta.startedAt);
        if (state.camera) updateCamera(state.camera, state.level.player, deltaTime);
        updatePlayer(state.level.player, input.getMovement(), state.level, deltaTime);
        state.level.doorSystem.update(deltaTime);
        state.level.boxSystem.update(deltaTime);
        state.level.roomSystem.update(deltaTime);
        const detectedBy = updateNpcs(state.level, deltaTime);
        if (detectedBy) {
          triggerPlayerAction(state.level.player, "alert", 0.32);
          state.meta.detectedBy = detectedBy;
          setScreen(SCREEN_STATES.LOSE);
          overlay.flash(state, 0.45);
          setMessage("You were spotted", 2);
          return;
        }
        const prompt = getInteractionPrompt(state.level);
        state.prompt = (prompt == null ? void 0 : prompt.text) || "Find the chests";
        if (input.consumeInteract()) {
          const result = tryInteract(state.level);
          if (result.success) {
            triggerPlayerAction(state.level.player, result.kind === "light" ? "alert" : "interact", result.kind === "light" ? 0.22 : 0.28);
            setMessage(result.text, 1.2);
            overlay.flash(state, result.kind === "light" ? 0.12 : 0.18);
          }
          if (result.success && result.kind === "light") {
            const roomId = (_a = result.entity) == null ? void 0 : _a.roomId;
            if (roomId) setMessage(state.level.roomSystem.isLit(roomId) ? `Room ${roomId} restored` : `Room ${roomId} darkened`, 1.3);
          }
          if (result.success && result.kind === "door") {
            setMessage(result.entity.open ? "Door opened" : "Door closed", 1);
          }
          if (result.success && result.kind === "box") {
            state.meta.collected = state.level.boxSystem.boxes.filter((box) => box.opened).length;
            if (state.meta.collected >= state.meta.target && state.meta.target > 0) {
              setScreen(SCREEN_STATES.WIN);
              overlay.flash(state, 0.32);
              return;
            }
          }
        }
        syncHud();
      },
      render(p) {
        renderScene(p, state, overlay);
      },
      onKeyPressed(key, keyCode) {
        audio.unlock();
        input.onKeyPressed(key, keyCode);
        const lower = String(key).toLowerCase();
        if (keyCode === 27) togglePause();
        if (lower === "r") restartLevel();
        if (lower === "1") switchLevel("map1");
        if (lower === "2") switchLevel("map2");
        if (lower === "3") switchLevel("map3");
        if (lower === "b") state.debug.showRooms = !state.debug.showRooms;
        if (lower === "c") state.debug.showCollision = !state.debug.showCollision;
        if (lower === "v") state.debug.showVision = !state.debug.showVision;
        if (lower === "g") state.debug.showCamera = !state.debug.showCamera;
        if (lower === "p") togglePause();
        if (lower === "h" && state.level) {
          const next = state.level.player.characterVariant === "default" ? "stealth" : "default";
          state.level.player.characterVariant = next;
          setMessage(`Player skin: ${next}`, 1);
        }
        if (lower === "m") {
          state.audio.muted = audio.toggleMute();
          setMessage(state.audio.muted ? "Muted" : "Unmuted", 1);
        }
      },
      onKeyReleased(key, keyCode) {
        input.onKeyReleased(key, keyCode);
      },
      onResize(width, height) {
        resizeCamera(camera, width, height);
        if (state.level) configureCameraBounds(camera, state.level.mapWidth, state.level.mapHeight, state.level.settings.baseTile);
        state.camera = camera;
      },
      switchLevel,
      restartLevel,
      getState() {
        return state;
      }
    };
  }

  // sketch.entry.js
  var game = createGameCore({ initialLevel: "map2" });
  window.fusionGame = game;
  var root = document.getElementById("game-root");
  var getCanvasSize = () => ({
    width: (root == null ? void 0 : root.clientWidth) || 960,
    height: (root == null ? void 0 : root.clientHeight) || 640
  });
  var boundUi = false;
  var initialized = false;
  var loadingError = "";
  var loadingMessage = "Loading assets...";
  function bindUi() {
    var _a;
    if (boundUi) return;
    document.querySelectorAll("[data-level]").forEach((button) => {
      button.addEventListener("click", () => game.switchLevel(button.dataset.level));
    });
    (_a = document.getElementById("restartBtn")) == null ? void 0 : _a.addEventListener("click", () => game.restartLevel());
    boundUi = true;
  }
  new window.p5((p) => {
    async function boot() {
      var _a;
      try {
        loadingMessage = "Loading assets...";
        await game.loadAssets();
        game.setup(p);
        (_a = game.onResize) == null ? void 0 : _a.call(game, p.width, p.height);
        initialized = true;
        loadingMessage = "";
      } catch (error) {
        loadingError = (error == null ? void 0 : error.message) || String(error);
        console.error(error);
      }
    }
    function renderLoading() {
      p.background("#091226");
      p.push();
      p.noStroke();
      p.fill(255);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(28);
      p.text("Fusion Game v16", p.width / 2, p.height / 2 - 42);
      p.textSize(16);
      p.text(loadingError ? "Load failed" : loadingMessage, p.width / 2, p.height / 2 + 4);
      if (loadingError) {
        p.fill("#fca5a5");
        p.textSize(14);
        p.text(loadingError, p.width / 2, p.height / 2 + 34, p.width - 80, 120);
      }
      p.pop();
    }
    p.setup = () => {
      const { width, height } = getCanvasSize();
      const canvas = p.createCanvas(width, height);
      canvas.parent("game-root");
      p.noSmooth();
      bindUi();
      boot();
    };
    p.draw = () => {
      if (!initialized) {
        renderLoading();
        return;
      }
      game.update(p.deltaTime / 1e3);
      game.render(p);
    };
    p.keyPressed = () => {
      if (!initialized) return;
      game.onKeyPressed(p.key, p.keyCode);
    };
    p.keyReleased = () => {
      if (!initialized) return;
      game.onKeyReleased(p.key, p.keyCode);
    };
    p.windowResized = () => {
      var _a;
      const { width, height } = getCanvasSize();
      p.resizeCanvas(width, height);
      if (initialized) (_a = game.onResize) == null ? void 0 : _a.call(game, width, height);
    };
  }, root || void 0);
})();
