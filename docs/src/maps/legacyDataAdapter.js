// Legacy adapter: normalizes global map configs into standardized map specs.
// Deep-clone a value via JSON round-trip (null-safe).
function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

// Collect legacy map configurations and tile maps from globalThis.
function getGlobalLegacyData() {
  return {
    tileMaps: globalThis.TileMaps || {},
    mapConfigs: {
      map1: globalThis.Map1Config || null,
      map2: globalThis.Map2Config || null,
      map3: globalThis.Map3Config || null
    }
  };
}

// Look up Tiled map data using config.mapName or levelId-based aliases.
function resolveMapData(levelId, config, globals) {
  const aliases = [];
  if (config?.mapName) aliases.push(config.mapName);
  aliases.push(`${levelId} tiled`, levelId);
  for (const key of aliases) {
    if (globals.tileMaps?.[key]) return clone(globals.tileMaps[key]);
  }
  return null;
}

// Extract and clone the room matrix from a map config.
function resolveRoomMatrix(config) {
  return clone(config?.roomMatrix || []);
}

// Build a normalised player spec with defaults for missing fields.
function normalizePlayer(config, levelId) {
  return {
    w: config?.player?.w || 10,
    h: config?.player?.h || 14,
    speed: config?.player?.speed || 110,
    sprint: config?.player?.sprint || 1.5,
    stamina: config?.player?.stamina ?? 100,
    staminaMax: config?.player?.staminaMax ?? 100,
    staminaDrain: config?.player?.staminaDrain ?? 26,
    staminaRecover: config?.player?.staminaRecover ?? 18,
    staminaRecoverDelay: config?.player?.staminaRecoverDelay ?? 3,
    color: config?.player?.color || '#33ff66',
    facing: 'down',
    characterType: 'player',
    characterVariant: config?.player?.characterVariant || 'default',
    spawnOffsetX: config?.player?.spawnOffsetX || 0,
    spawnOffsetY: config?.player?.spawnOffsetY || 0
  };
}

// Build a normalised NPC spec, filling in defaults for behaviour and movement fields.
function normalizeNpc(npc) {
  return {
    ...clone(npc),
    w: npc?.w || 10,
    h: npc?.h || 14,
    state: npc?.state || 'PATROL',
    facing: String(npc?.facing || 'down').toLowerCase(),
    characterType: 'npc',
    characterVariant: npc?.characterVariant || 'patrol',
    waypoints: clone(npc?.waypoints || []),
    lastSeenX: npc?.lastSeenX || 0,
    lastSeenY: npc?.lastSeenY || 0,
    searchTimer: npc?.searchTimer || 0,
    loseSight: npc?.loseSight || 0,
    alert: npc?.alert || 0,
    searchTargetX: npc?.searchTargetX || 0,
    searchTargetY: npc?.searchTargetY || 0,
    searchWanderTimer: npc?.searchWanderTimer || 0,
    searchMarker: npc?.searchMarker || null
  };
}

// Normalise door and chest entity arrays from the config.
function normalizeEntities(config) {
  const configDoors = clone(config?.entities?.doors || []);
  const configChests = clone(config?.entities?.chests || []).map((chest) => ({ ...chest, w: chest.w || 1, h: chest.h || 1 }));
  return {
    doors: configDoors,
    chests: configChests
  };
}

// Clone the collision matrix, defaulting to an empty array.
function normalizeCollision(config) {
  return clone(config?.collisionMatrix || []);
}

// Extract the default spawn tile coordinates.
function normalizeSpawn(config) {
  return {
    x: config?.defaultSpawn?.x ?? 2,
    y: config?.defaultSpawn?.y ?? 2
  };
}

// Assemble a complete, normalised map specification from a raw config.
function normalizeMapConfig(levelId, config, globals) {
  const mapData = resolveMapData(levelId, config, globals);
  const roomMatrix = resolveRoomMatrix(config);
  const collisionMatrix = normalizeCollision(config);
  const defaultSpawn = normalizeSpawn(config);
  const entities = normalizeEntities(config);
  const settings = {
    baseTile: config?.settings?.baseTile || 16,
    visionRange: config?.settings?.visionRange || 112,
    searchDuration: config?.settings?.searchDuration || 3.5,
    chaseVisionMultiplier: config?.settings?.chaseVisionMultiplier || 1.2,
    darkVisionMultiplier: config?.settings?.darkVisionMultiplier || 0.6,
    normalVisionMultiplier: config?.settings?.normalVisionMultiplier || 1,
    lightingMode: config?.settings?.lightingMode || 'tile_darkness',
    ...clone(config?.settings || {})
  };

  const objective = {
    exitTile: config?.objective?.exitTile
      ? clone(config.objective.exitTile)
      : null
  };

  return {
    id: levelId,
    mapName: config?.mapName || `${levelId} tiled`,
    mapData,
    roomMatrix,
    collisionMatrix,
    defaultSpawn,
    player: normalizePlayer(config, levelId),
    npcs: (config?.npcs || []).map(normalizeNpc),
    entities,
    settings,
    objective,
    manualLightButtons: config?.manualLightButtons || [],
    source: clone(config || {})
  };
}

// Check a map spec for missing critical data and return a list of issues.
function validateMapSpec(spec) {
  const issues = [];
  if (!spec) issues.push('missing map spec');
  if (!spec?.mapData && !spec?.collisionMatrix?.length) issues.push('missing both mapData and collisionMatrix');
  if (!spec?.collisionMatrix?.length) issues.push('missing collisionMatrix');
  if (!spec?.roomMatrix?.length) issues.push('missing roomMatrix');
  if (!spec?.player) issues.push('missing player config');
  return issues;
}

// Load and normalise all legacy map specs from globalThis configs.
export function loadLegacyMapSpecs() {
  const globals = getGlobalLegacyData();
  const specs = new Map();
  for (const levelId of ['map1', 'map2', 'map3']) {
    const config = globals.mapConfigs[levelId];
    if (!config) continue;
    const spec = normalizeMapConfig(levelId, config, globals);
    specs.set(levelId, spec);
  }
  return specs;
}

// Validate a set of map specs, returning a report of any issues per level.
export function validateLegacyMapSpecs(specs) {
  const report = [];
  for (const [levelId, spec] of specs.entries()) {
    const issues = validateMapSpec(spec);
    if (issues.length) report.push({ levelId, issues });
  }
  return report;
}
