// Loot system: item type registry, per-map chest loot assignments, inventory management.
//
// Keys carry a keyId that matches a door's keyId.
// Loot entries: string 'note' | { type: 'key', keyId: string }
export const LOOT_TYPES = Object.freeze({
  key:  { id: 'key',  label: 'Key',           icon: null },
  note: { id: 'note', label: 'Note Fragment',  icon: null }
});

const MAP_LOOT = {
  map1: {
    chest_1: { type: 'key', keyId: 'key_A' },
    chest_2: 'note',
    chest_3: 'note',
    chest_4: { type: 'key', keyId: 'key_B' },
    chest_5: 'note',
    chest_6: 'note',
    chest_7: { type: 'key', keyId: 'key_C' },
    chest_8: 'note'
  },
  map2: {
    'chest-2-1': { type: 'key', keyId: 'key_A' },
    'chest-2-2': 'note',
    'chest-2-3': 'note',
    'chest-2-4': { type: 'key', keyId: 'key_B' },
    'chest-2-5': 'note',
    'chest-2-6': 'note',
    'chest-2-7': { type: 'key', keyId: 'key_C' },
    'chest-2-8': 'note',
    'chest-2-9': { type: 'key', keyId: 'key_D' },
    'chest-2-10': 'note'
  },
  map3: {
    'chest-3-1': 'note',
    'chest-3-2': { type: 'key', keyId: 'key_A' },
    'chest-3-3': 'note',
    'chest-3-4': { type: 'key', keyId: 'key_B' },
    'chest-3-5': 'note',
    'chest-3-6': 'note',
    'chest-3-7': { type: 'key', keyId: 'key_C' },
    'chest-3-8': 'note',
    'chest-3-9': { type: 'key', keyId: 'key_D' },
    'chest-3-10': 'note'
  }
};

export function createInventory() {
  return {
    keys: [],
    note: 0
  };
}

export function collectLoot(inventory, chestId, levelId) {
  const entry = MAP_LOOT[levelId]?.[chestId];
  if (!entry) return null;
  if (typeof entry === 'string') {
    if (entry === 'note') {
      inventory.note = (inventory.note || 0) + 1;
      return LOOT_TYPES.note;
    }
    return null;
  }
  if (entry.type === 'key') {
    inventory.keys.push(entry.keyId);
    return { ...LOOT_TYPES.key, keyId: entry.keyId };
  }
  return null;
}

export function hasKey(inventory, keyId) {
  if (!keyId) return inventory.keys.length > 0;
  return inventory.keys.includes(keyId);
}

export function consumeKey(inventory, keyId) {
  if (!keyId) {
    if (!inventory.keys.length) return false;
    inventory.keys.splice(0, 1);
    return true;
  }
  const idx = inventory.keys.indexOf(keyId);
  if (idx === -1) return false;
  inventory.keys.splice(idx, 1);
  return true;
}

export function formatInventory(inventory) {
  return `Keys: ${inventory.keys.length}  |  Notes: ${inventory.note || 0}`;
}
