// Loot system: ES6 Classes for Inventory and LootTable management
// Available loot categories with display labels.
export const LOOT_TYPES = Object.freeze({
  key:  { id: 'key',  label: 'Key',           icon: null },
  note: { id: 'note', label: 'Note Fragment',  icon: null }
});

// Per-map loot tables mapping chest IDs to their drop type.
const MAP_LOOT = Object.freeze({
  map1: Object.freeze({
    chest_1: { type: 'key', keyId: 'key_exit' },
    chest_2: 'note',
    chest_3: 'note',
    chest_4: 'note',
    chest_5: 'note',
    chest_6: 'note',
    chest_7: { type: 'key', keyId: 'key_doorA' },
    chest_8: 'note'
  }),
  map2: Object.freeze({
    'chest-2-1': { type: 'key', keyId: 'key_A' },
    'chest-2-2': 'note',
    'chest-2-3': 'note',
    'chest-2-4': { type: 'key', keyId: 'key_B' },
    'chest-2-5': 'note',
    'chest-2-6': { type: 'key', keyId: 'key_exit' },
    'chest-2-7': 'note',
    'chest-2-8': 'note',
    'chest-2-9': { type: 'key', keyId: 'key_D' },
    'chest-2-10': 'note',
    'chest-2-11': 'note'
  }),
  map3: Object.freeze({
    'chest-3-1': { type: 'key', keyId: 'key_exit' },
    'chest-3-2': 'note',
    'chest-3-3': { type: 'key', keyId: 'key_A' },
    'chest-3-4': 'note',
    'chest-3-5': 'note',
    'chest-3-6': 'note',
    'chest-3-7': { type: 'key', keyId: 'key_B' },
    'chest-3-8': 'note',
    'chest-3-9': { type: 'key', keyId: 'key_C' },
    'chest-3-10': 'note',
    'chest-3-11': 'note'
  })
});

// Map chest IDs to specific note IDs for story content.
const NOTE_IDS_BY_CHEST = Object.freeze({
  map1: Object.freeze({
    chest_2: 'note_1',
    chest_3: 'note_2',
    chest_4: 'note_3',
    chest_5: 'note_4',
    chest_6: 'note_5',
    chest_8: 'note_6'
  }),
  map2: Object.freeze({
    'chest-2-2': 'note_1',
    'chest-2-3': 'note_2',
    'chest-2-5': 'note_3',
    'chest-2-7': 'note_4',
    'chest-2-8': 'note_5',
    'chest-2-10': 'note_6',
    'chest-2-11': 'note_7'
  }),
  map3: Object.freeze({
    'chest-3-2': 'note_1',
    'chest-3-4': 'note_2',
    'chest-3-5': 'note_3',
    'chest-3-6': 'note_4',
    'chest-3-8': 'note_5',
    'chest-3-10': 'note_6',
    'chest-3-11': 'note_7'
  })
});

// Inventory: player item storage with encapsulated state
export class Inventory {
  #keys;
  #note;
  #notesCollected;

  constructor() {
    this.#keys = [];
    this.#note = 0;
    this.#notesCollected = [];
  }

  get keys() { return [...this.#keys]; }
  get note() { return this.#note; }
  get notesCollected() { return [...this.#notesCollected]; }

  // Add a key to the inventory and return the loot descriptor.
  addKey(keyId) {
    this.#keys.push(keyId);
    return { ...LOOT_TYPES.key, keyId };
  }

  // Add a note to the inventory, optionally with a specific note ID.
  addNote(noteId = null) {
    this.#note += 1;
    if (noteId) this.#notesCollected.push(noteId);
    return noteId ? { ...LOOT_TYPES.note, noteId } : LOOT_TYPES.note;
  }

  // Check if the inventory contains a specific key (or any key).
  hasKey(keyId = null) {
    if (!keyId) return this.#keys.length > 0;
    return this.#keys.includes(keyId);
  }

  // Remove and consume a key from the inventory.
  consumeKey(keyId = null) {
    if (!keyId) {
      if (!this.#keys.length) return false;
      this.#keys.splice(0, 1);
      return true;
    }
    const idx = this.#keys.indexOf(keyId);
    if (idx === -1) return false;
    this.#keys.splice(idx, 1);
    return true;
  }

  toString() {
    return `Keys: ${this.#keys.length}  |  Notes: ${this.#note}`;
  }

  // Legacy compatibility - returns plain object for existing code
  toJSON() {
    return {
      keys: [...this.#keys],
      note: this.#note,
      notesCollected: [...this.#notesCollected]
    };
  }
}

// LootTable: manages level-specific loot distribution
export class LootTable {
  #levelId;

  constructor(levelId) {
    this.#levelId = levelId;
  }

  get levelId() { return this.#levelId; }

  // Collect loot from a chest and add it to the inventory.
  collect(chestId, inventory) {
    const entry = MAP_LOOT[this.#levelId]?.[chestId];
    if (!entry) return null;

    if (typeof entry === 'string') {
      if (entry === 'note') {
        const noteId = NOTE_IDS_BY_CHEST[this.#levelId]?.[chestId] || null;
        return inventory.addNote(noteId);
      }
      return null;
    }

    if (entry.type === 'key') {
      return inventory.addKey(entry.keyId);
    }
    return null;
  }

  // Count total keys available in this level's loot table.
  countTotalKeys() {
    const loot = MAP_LOOT[this.#levelId];
    if (!loot) return 0;
    let count = 0;
    for (const entry of Object.values(loot)) {
      if (typeof entry === 'object' && entry?.type === 'key') {
        count++;
      }
    }
    return count;
  }

  // Count total notes available in this level's loot table.
  countTotalNotes() {
    const loot = MAP_LOOT[this.#levelId];
    if (!loot) return 0;
    let count = 0;
    for (const entry of Object.values(loot)) {
      if (entry === 'note') {
        count++;
      }
    }
    return count;
  }

  // Static: count total keys for any level ID.
  static countTotalKeys(levelId) {
    const loot = MAP_LOOT[levelId];
    if (!loot) return 0;
    let count = 0;
    for (const entry of Object.values(loot)) {
      if (typeof entry === 'object' && entry?.type === 'key') {
        count++;
      }
    }
    return count;
  }

  // Static: count total notes for any level ID.
  static countTotalNotes(levelId) {
    const loot = MAP_LOOT[levelId];
    if (!loot) return 0;
    let count = 0;
    for (const entry of Object.values(loot)) {
      if (entry === 'note') {
        count++;
      }
    }
    return count;
  }
}

// Backward compatibility - factory functions wrap classes
export function createInventory() {
  return new Inventory();
}

// Collect loot from a chest into the inventory (backward-compatible wrapper).
export function collectLoot(inventory, chestId, levelId) {
  const table = new LootTable(levelId);
  return table.collect(chestId, inventory);
}

// Check if the inventory has a specific key (backward-compatible wrapper).
export function hasKey(inventory, keyId) {
  return inventory.hasKey(keyId);
}

// Consume a key from the inventory (backward-compatible wrapper).
export function consumeKey(inventory, keyId) {
  return inventory.consumeKey(keyId);
}

export function formatInventory(inventory) {
  return inventory.toString();
}

// Count total keys for a level (backward-compatible wrapper).
export function countTotalKeys(levelId) {
  return LootTable.countTotalKeys(levelId);
}

// Count total notes for a level (backward-compatible wrapper).
export function countTotalNotes(levelId) {
  return LootTable.countTotalNotes(levelId);
}
