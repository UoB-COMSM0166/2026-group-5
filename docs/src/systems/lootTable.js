// Loot system: ES6 Classes for Inventory and LootTable management
export const LOOT_TYPES = Object.freeze({
  key:  { id: 'key',  label: 'Key',           icon: null },
  note: { id: 'note', label: 'Note Fragment',  icon: null }
});

const MAP_LOOT = Object.freeze({
  map1: Object.freeze({
    chest_1: { type: 'key', keyId: 'key_A' },
    chest_2: 'note',
    chest_3: 'note',
    chest_4: { type: 'key', keyId: 'key_B' },
    chest_5: 'note',
    chest_6: 'note',
    chest_7: { type: 'key', keyId: 'key_C' },
    chest_8: 'note'
  }),
  map2: Object.freeze({
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
  }),
  map3: Object.freeze({
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
  })
});

const NOTE_IDS_BY_CHEST = Object.freeze({
  map1: Object.freeze({
    chest_2: 'note_1',
    chest_3: 'note_2',
    chest_5: 'note_3',
    chest_6: 'note_4',
    chest_8: 'note_5'
  }),
  map2: Object.freeze({
    'chest-2-2': 'note_6',
    'chest-2-3': 'note_7',
    'chest-2-5': 'note_8',
    'chest-2-6': 'note_9',
    'chest-2-8': 'note_10',
    'chest-2-10': 'note_11'
  }),
  map3: Object.freeze({
    'chest-3-1': 'note_12',
    'chest-3-3': 'note_13',
    'chest-3-5': 'note_14',
    'chest-3-6': 'note_15',
    'chest-3-8': 'note_16',
    'chest-3-10': 'note_17'
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

  addKey(keyId) {
    this.#keys.push(keyId);
    return { ...LOOT_TYPES.key, keyId };
  }

  addNote(noteId = null) {
    this.#note += 1;
    if (noteId) this.#notesCollected.push(noteId);
    return noteId ? { ...LOOT_TYPES.note, noteId } : LOOT_TYPES.note;
  }

  hasKey(keyId = null) {
    if (!keyId) return this.#keys.length > 0;
    return this.#keys.includes(keyId);
  }

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

export function collectLoot(inventory, chestId, levelId) {
  const table = new LootTable(levelId);
  return table.collect(chestId, inventory);
}

export function hasKey(inventory, keyId) {
  return inventory.hasKey(keyId);
}

export function consumeKey(inventory, keyId) {
  return inventory.consumeKey(keyId);
}

export function formatInventory(inventory) {
  return inventory.toString();
}

export function countTotalKeys(levelId) {
  return LootTable.countTotalKeys(levelId);
}

export function countTotalNotes(levelId) {
  return LootTable.countTotalNotes(levelId);
}
