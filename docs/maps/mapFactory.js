// Map factory: builds a runtime level from a map spec (collision, rooms, entities, NPCs).
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

function normalizeRuntimeNpc(npc, baseTile) {
  return {
    ...clone(npc),
    x: tileToPixel(npc.x, baseTile),
    y: tileToPixel(npc.y, baseTile),
    homeX: tileToPixel(npc.x, baseTile),
    homeY: tileToPixel(npc.y, baseTile),
    collisionInsetX: npc.collisionInsetX ?? 1,
    collisionInsetY: npc.collisionInsetY ?? 2,
    facing: String(npc.facing || 'down').toLowerCase(),
    waypoints: (npc.waypoints || []).map((point) => ({
      x: tileToPixel(point.x, baseTile),
      y: tileToPixel(point.y, baseTile)
    }))
  };
}

export function createRuntimeLevel(levelId, spec) {
  const settings = {
    baseTile: spec?.settings?.baseTile || 16,
    visionRange: spec?.settings?.visionRange || 112,
    searchDuration: spec?.settings?.searchDuration || 3.5,
    chaseVisionMultiplier: spec?.settings?.chaseVisionMultiplier || 1.2,
    darkVisionMultiplier: spec?.settings?.darkVisionMultiplier || 0.65,
    normalVisionMultiplier: spec?.settings?.normalVisionMultiplier || 1,
    lightingMode: spec?.settings?.lightingMode || 'tile_darkness',
    ...clone(spec?.settings || {})
  };

  const mapData = clone(spec?.mapData || null);
  const roomMatrix = clone(spec?.roomMatrix || []);
  const collision = clone(spec?.collisionMatrix || []);
  const spawnTile = {
    x: spec?.defaultSpawn?.x || 2,
    y: spec?.defaultSpawn?.y || 2
  };

  const player = {
    ...clone(spec?.player || {}),
    x: tileToPixel(spawnTile.x, settings.baseTile) + (spec?.player?.spawnOffsetX || 0),
    y: tileToPixel(spawnTile.y, settings.baseTile) + (spec?.player?.spawnOffsetY || 0),
    facing: String(spec?.player?.facing || 'down').toLowerCase(),
    characterType: 'player',
    characterVariant: spec?.player?.characterVariant || 'default'
  };

  const npcs = (spec?.npcs || []).map((npc) => normalizeRuntimeNpc(npc, settings.baseTile));

  const mapWidth = mapData?.width || (collision[0]?.length || 0);
  const mapHeight = mapData?.height || (collision.length || 0);
  const entities = clone(spec?.entities || { doors: [], chests: [] });

  const doorSystem = createDoorSystem(mapData, settings.baseTile, entities.doors || [], collision);
  const boxSystem = createBoxSystem(mapData, entities.chests || [], settings.baseTile);
  const roomSystem = createRoomSystem(roomMatrix, {
    baseTile: settings.baseTile,
    searchDuration: settings.searchDuration,
    normalVisionMultiplier: settings.normalVisionMultiplier,
    darkVisionMultiplier: settings.darkVisionMultiplier,
    chaseVisionMultiplier: settings.chaseVisionMultiplier,
    doors: [...doorSystem.doors]
  });
  roomSystem.attachNpcs(npcs);

  const missionSystem = createMissionSystem(collision, settings.baseTile, spawnTile, boxSystem.boxes.length, spec?.objective || {});

  return {
    id: levelId,
    settings,
    collision,
    player,
    npcs,
    source: spec?.source || spec,
    spec,
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
