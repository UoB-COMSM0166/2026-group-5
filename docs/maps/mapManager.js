const registry = new Map();

export function registerMap(id, config) {
  registry.set(id, config);
}

export function getMap(id) {
  return registry.get(id) || null;
}

export function getAllMapIds() {
  return Array.from(registry.keys());
}

export function bootstrapLegacyMaps() {
  if (window.Map1Config) registerMap('map1', window.Map1Config);
  if (window.Map2Config) registerMap('map2', window.Map2Config);
  if (window.Map3Config) registerMap('map3', window.Map3Config);
}
