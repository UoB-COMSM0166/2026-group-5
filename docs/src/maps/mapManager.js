// Map registry: stores and retrieves map configs, bootstraps legacy map specs.
import { loadLegacyMapSpecs, validateLegacyMapSpecs } from './legacyDataAdapter.js';

// Internal store mapping level IDs to their normalised map specs.
const registry = new Map();

// Register a map spec under the given level ID.
export function registerMap(id, config) {
  registry.set(id, config);
}

// Retrieve a registered map spec by level ID, or null.
export function getMap(id) {
  return registry.get(id) || null;
}

// Return an array of all registered level IDs.
export function getAllMapIds() {
  return Array.from(registry.keys());
}

// Clear registry, load legacy map specs, register them, and return validation report.
export function bootstrapLegacyMaps() {
  registry.clear();
  const specs = loadLegacyMapSpecs();
  for (const [id, spec] of specs.entries()) {
    registerMap(id, spec);
  }
  return validateLegacyMapSpecs(specs);
}
