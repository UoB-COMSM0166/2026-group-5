import { createDoorSystem } from '../systems/doorSystem.js';
import { createBoxSystem } from '../systems/boxSystem.js';
import { createRoomSystem } from '../systems/roomSystem.js';
import { createMissionSystem } from '../systems/missionSystem.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function tileToPixel(tile, baseTile) {
  return tile * baseTile;
}

function resolveRoomMatrix(levelId) {
  if (window.RoomMatrices?.[levelId]) return window.RoomMatrices[levelId];
  const numeric = Number(String(levelId).replace(/[^0-9]/g, ''));
  return window.RoomLightCamera?.ROOM_MATRICES?.[numeric] || [];
}

function resolveMapData(levelId, config) {
  const maps = window.TileMaps || {};
  if (levelId === 'map1') return maps['basic test'] || maps['map1'] || null;
  if (levelId === 'map2') return maps['map2'] || maps['map2bomp_merged_colormap'] || null;
  if (levelId === 'map3') return maps['map3_generated_colormap'] || maps['map3'] || null;
  return (config?.mapName && maps[config.mapName]) || null;
}

function getMap1LegacySpawn(config) {
  if (window.DefaultSpawn && Number.isFinite(window.DefaultSpawn.x) && Number.isFinite(window.DefaultSpawn.y)) {
    return { x: window.DefaultSpawn.x, y: window.DefaultSpawn.y };
  }
  return { x: config?.defaultSpawn?.x ?? 1, y: config?.defaultSpawn?.y ?? 2 };
}

function getMap1LegacyNpcs(baseTile) {
  const wp = (tx, ty) => ({ x: tileToPixel(tx, baseTile), y: tileToPixel(ty, baseTile) });
  return [
    {
      id: 'NPC-1',
      x: tileToPixel(7, baseTile), y: tileToPixel(8, baseTile), homeX: tileToPixel(7, baseTile), homeY: tileToPixel(8, baseTile),
      w: 10, h: 14,
      speedPatrol: 55, speedChase: 82,
      state: 'PATROL', facing: 'right', wpIndex: 0, spriteType: 'npc_guard', spriteFrame: 0, spriteTimer: 0,
      waypoints: [wp(7, 8), wp(25, 7), wp(25, 25), wp(8, 25), wp(25, 25), wp(25, 7), wp(7, 8)],
      lastSeenX: 0, lastSeenY: 0, searchTimer: 0, loseSight: 0, alert: 0,
      searchTargetX: 0, searchTargetY: 0, searchWanderTimer: 0, searchMarker: null
    },
    {
      id: 'NPC-2',
      x: tileToPixel(31, baseTile), y: tileToPixel(6, baseTile), homeX: tileToPixel(31, baseTile), homeY: tileToPixel(6, baseTile),
      w: 10, h: 14,
      speedPatrol: 55, speedChase: 82,
      state: 'PATROL', facing: 'right', wpIndex: 0, spriteType: 'npc_guard', spriteFrame: 0, spriteTimer: 0,
      waypoints: [wp(31, 6), wp(31, 18), wp(54, 18), wp(31, 18), wp(31, 6)],
      lastSeenX: 0, lastSeenY: 0, searchTimer: 0, loseSight: 0, alert: 0,
      searchTargetX: 0, searchTargetY: 0, searchWanderTimer: 0, searchMarker: null
    },
    {
      id: 'NPC-3',
      x: tileToPixel(10, baseTile), y: tileToPixel(30, baseTile), homeX: tileToPixel(10, baseTile), homeY: tileToPixel(30, baseTile),
      w: 10, h: 14,
      speedPatrol: 55, speedChase: 82,
      state: 'PATROL', facing: 'right', wpIndex: 0, spriteType: 'npc_guard', spriteFrame: 0, spriteTimer: 0,
      waypoints: [wp(10, 30), wp(50, 30), wp(10, 30)],
      lastSeenX: 0, lastSeenY: 0, searchTimer: 0, loseSight: 0, alert: 0,
      searchTargetX: 0, searchTargetY: 0, searchWanderTimer: 0, searchMarker: null
    }
  ];
}

function getMap1LegacyEntities() {
  const data = window.LevelEntities || { doors: [], chests: [] };
  return {
    doors: clone(data.doors || []),
    chests: clone(data.chests || []).map((chest) => ({ ...chest, w: 1, h: 1 }))
  };
}

export function createRuntimeLevel(levelId, config) {
  const settings = {
    baseTile: config?.settings?.baseTile || 16,
    visionRange: config?.settings?.visionRange || 112,
    searchDuration: config?.settings?.searchDuration || 3.5,
    chaseVisionMultiplier: config?.settings?.chaseVisionMultiplier || 1.2,
    darkVisionMultiplier: config?.settings?.darkVisionMultiplier || 0.65,
    normalVisionMultiplier: config?.settings?.normalVisionMultiplier || 1,
    ...clone(config?.settings || {})
  };

  const mapData = resolveMapData(levelId, config);
  const roomMatrix = resolveRoomMatrix(levelId);
  const collision = clone(levelId === 'map1' && window.CollisionMatrix ? window.CollisionMatrix : (config?.collisionMatrix || []));
  const spawnTile = levelId === 'map1' ? { x: 30, y: 38 } : { x: config?.defaultSpawn?.x || 2, y: config?.defaultSpawn?.y || 2 };

  const player = {
    x: tileToPixel(spawnTile.x, settings.baseTile) + (levelId === 'map1' ? 3 : 0),
    y: tileToPixel(spawnTile.y, settings.baseTile) + (levelId === 'map1' ? 1 : 0),
    w: levelId === 'map1' ? 10 : (config?.player?.w || 10),
    h: levelId === 'map1' ? 14 : (config?.player?.h || 14),
    speed: levelId === 'map1' ? 110 : (config?.player?.speed || 110),
    sprint: levelId === 'map1' ? 1.55 : (config?.player?.sprint || 1.5),
    stamina: levelId === 'map1' ? 100 : (config?.player?.stamina ?? 100),
    staminaMax: levelId === 'map1' ? 100 : (config?.player?.staminaMax ?? 100),
    color: (config?.player?.color || '#33ff66'),
    facing: 'down'
  };

  const npcs = (levelId === 'map1'
    ? getMap1LegacyNpcs(settings.baseTile)
    : (config?.npcs || []).map((npc) => ({
      ...clone(npc),
      x: tileToPixel(npc.x, settings.baseTile),
      y: tileToPixel(npc.y, settings.baseTile),
      homeX: tileToPixel(npc.x, settings.baseTile),
      homeY: tileToPixel(npc.y, settings.baseTile),
      waypoints: (npc.waypoints || []).map((point) => ({
        x: tileToPixel(point.x, settings.baseTile),
        y: tileToPixel(point.y, settings.baseTile)
      }))
    }))
  );

  const mapWidth = mapData?.width || (collision[0]?.length || 0);
  const mapHeight = mapData?.height || (collision.length || 0);
  const legacyEntities = levelId === 'map1' ? getMap1LegacyEntities() : null;

  const doorSystem = createDoorSystem(mapData, settings.baseTile, legacyEntities?.doors || (config?.entities?.doors || []), collision);
  const boxSystem = createBoxSystem(mapData, legacyEntities?.chests || clone(config?.entities?.chests || []), settings.baseTile);
  const roomSystem = createRoomSystem(roomMatrix, {
    baseTile: settings.baseTile,
    searchDuration: settings.searchDuration,
    normalVisionMultiplier: settings.normalVisionMultiplier,
    darkVisionMultiplier: settings.darkVisionMultiplier,
    chaseVisionMultiplier: settings.chaseVisionMultiplier,
    doors: [...doorSystem.doors]
  });
  roomSystem.attachNpcs(npcs);

  const missionSystem = createMissionSystem(collision, settings.baseTile, spawnTile, boxSystem.boxes.length, levelId);

  return {
    id: levelId,
    settings,
    collision,
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
    roomSystem,
    missionSystem
  };
}
