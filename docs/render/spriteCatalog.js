// Sprite catalog: asset paths, character pack definitions, directional resolution.
export const SPRITE_PATHS = {
  player: './assets/images/sprites/player.png',
  playerSheet: './assets/images/sprites/player_sheet.png',
  npc: {
    PATROL: './assets/images/sprites/npc_patrol.png',
    SEARCH: './assets/images/sprites/npc_search.png',
    CHASE: './assets/images/sprites/npc_chase.png'
  },
  npcSheet: {
    PATROL: './assets/images/sprites/npc_patrol_sheet.png',
    SEARCH: './assets/images/sprites/npc_search_sheet.png',
    CHASE: './assets/images/sprites/npc_chase_sheet.png',
    RETURN: './assets/images/sprites/npc_patrol_sheet.png'
  },
  door: {
    double: './assets/images/sprites/door_double.png',
    line: './assets/images/sprites/door_line.png'
  },
  chest: {
    base: './assets/images/sprites/chest_base.png',
    lid: './assets/images/sprites/chest_lid.png'
  },
  button: {
    on: './assets/images/sprites/button_on.png',
    off: './assets/images/sprites/button_off.png'
  }
};

export const CHARACTER_ASSET_RULES = {
  baseDir: './assets/images/characters',
  pattern: '{baseDir}/{character}/{variant}/{mode}_{facing}.png',
  sheetPattern: '{baseDir}/{character}/{variant}/{mode}_sheet.png',
  supportedModes: ['idle', 'walk', 'interact', 'alert'],
  supportedFacings: ['down', 'left', 'right', 'up']
};

export const CHARACTER_PACKS = {
  player: {
    default: {
      fallbackSingle: SPRITE_PATHS.player,
      fallbackSheet: SPRITE_PATHS.playerSheet,
      directional: {
        up: `${CHARACTER_ASSET_RULES.baseDir}/player/default/up.png`,
        down: `${CHARACTER_ASSET_RULES.baseDir}/player/default/down.png`,
        left: `${CHARACTER_ASSET_RULES.baseDir}/player/default/left.png`,
        right: `${CHARACTER_ASSET_RULES.baseDir}/player/default/right.png`
      },
      modes: {}
    }
  },
  npc: {
    default: {
      fallbackSingle: SPRITE_PATHS.npc.PATROL,
      fallbackSheet: SPRITE_PATHS.npcSheet.PATROL,
      directional: {
        up: `${CHARACTER_ASSET_RULES.baseDir}/npc/default/up.png`,
        down: `${CHARACTER_ASSET_RULES.baseDir}/npc/default/down.png`,
        left: `${CHARACTER_ASSET_RULES.baseDir}/npc/default/left.png`,
        right: `${CHARACTER_ASSET_RULES.baseDir}/npc/default/right.png`
      },
      modes: {}
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

export function collectCharacterPaths() {
  const paths = new Set();
  for (const variants of Object.values(CHARACTER_PACKS)) {
    for (const pack of Object.values(variants)) {
      if (pack.fallbackSingle) paths.add(pack.fallbackSingle);
      if (pack.fallbackSheet) paths.add(pack.fallbackSheet);
      for (const modeEntry of Object.values(pack.modes || {})) {
        if (modeEntry.sheet) paths.add(modeEntry.sheet);
      }
      for (const path of Object.values(pack.directional || {})) {
        if (path) paths.add(path);
      }
    }
  }
  return Array.from(paths);
}

function normalizeMode(mode = 'idle') {
  if (mode === 'return') return 'walk';
  if (mode === 'search' || mode === 'chase') return 'alert';
  return mode;
}

export function resolveCharacterSprite(character, variant = 'default', mode = 'idle', facing = 'down') {
  const packs = CHARACTER_PACKS[character] || {};
  const pack = packs[variant] || packs.default || Object.values(packs)[0] || null;
  if (!pack) return { sheet: null, directional: null, fallbackSingle: null, fallbackSheet: null };
  const normalizedMode = normalizeMode(mode);
  const modeEntry = pack.modes?.[normalizedMode] || pack.modes?.idle || {};
  const directional = pack.directional || directionalPaths(character, variant, normalizedMode);
  return {
    sheet: modeEntry.sheet || null,
    directional,
    fallbackSingle: pack.fallbackSingle || null,
    fallbackSheet: pack.fallbackSheet || null,
    mode: normalizedMode,
    facing
  };
}
