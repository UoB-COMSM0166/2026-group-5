// Map registry: stores and retrieves map configs, bootstraps legacy map specs.
import { loadLegacyMapSpecs, validateLegacyMapSpecs } from './legacyDataAdapter.js';

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
  registry.clear();
  const specs = loadLegacyMapSpecs();
  for (const [id, spec] of specs.entries()) {
    registerMap(id, spec);
  }
  return validateLegacyMapSpecs(specs);
}
