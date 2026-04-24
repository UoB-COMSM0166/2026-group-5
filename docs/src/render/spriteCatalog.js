// Sprite catalog: asset paths, character pack definitions, directional resolution.
// Fallback sprite image paths keyed by entity type and state.
export const SPRITE_PATHS = {
  player: './assets/images/characters/fallback/player.png',
  playerSheet: './assets/images/characters/fallback/player_sheet.png',
  npc: {
    PATROL: './assets/images/characters/fallback/npc_patrol.png',
    SEARCH: './assets/images/characters/fallback/npc_search.png',
    CHASE: './assets/images/characters/fallback/npc_chase.png'
  },
  npcSheet: {
    PATROL: './assets/images/characters/fallback/npc_patrol_sheet.png',
    SEARCH: './assets/images/characters/fallback/npc_search_sheet.png',
    CHASE: './assets/images/characters/fallback/npc_chase_sheet.png',
    RETURN: './assets/images/characters/fallback/npc_patrol_sheet.png'
  },
  door: {
    slide: './assets/images/interactives/doors/door_slides.png',
    doubleA: './assets/images/interactives/doors/door_double_a.png',
    doubleB: './assets/images/interactives/doors/door_double_b.png'
  },
  chest: {
    closed: './assets/images/interactives/chests/chest_closed.png',
    open: './assets/images/interactives/chests/chest_open.png'
  },
  button: {
    on: './assets/images/interactives/buttons/button_on.png',
    off: './assets/images/interactives/buttons/button_off.png'
  },
  portal: {
    blue: './assets/images/interactives/portals/portal_blue3232.png',
    red: './assets/images/interactives/portals/portal_red3232.png'
  }
};

// Naming conventions for character sprite sheets and directional images.
export const CHARACTER_ASSET_RULES = {
  baseDir: './assets/images/characters',
  pattern: '{baseDir}/{character}/{variant}/{mode}_{facing}.png',
  sheetPattern: '{baseDir}/{character}/{variant}/{mode}_sheet.png',
  supportedModes: ['idle', 'walk', 'interact', 'alert'],
  supportedFacings: ['down', 'left', 'right', 'up']
};

function directionalFacingPath(character, variant, facing) {
  return `${CHARACTER_ASSET_RULES.baseDir}/${character}/${variant}/${facing}.png`;
}

function walkingDirectionalCycle(character, variant, facing) {
  return [
    `${CHARACTER_ASSET_RULES.baseDir}/${character}/${variant}/${facing}-walk-0.png`,
    `${CHARACTER_ASSET_RULES.baseDir}/${character}/${variant}/${facing}-walk-1.png`,
    `${CHARACTER_ASSET_RULES.baseDir}/${character}/${variant}/${facing}-walk-2.png`,
    `${CHARACTER_ASSET_RULES.baseDir}/${character}/${variant}/${facing}-walk-3.png`
  ];
}

function idleDirectionalCycle(character, variant, facing) {
  return [
    `${CHARACTER_ASSET_RULES.baseDir}/${character}/${variant}/${facing}-idle-0.png`,
    `${CHARACTER_ASSET_RULES.baseDir}/${character}/${variant}/${facing}-idle-1.png`,
    `${CHARACTER_ASSET_RULES.baseDir}/${character}/${variant}/${facing}-idle-2.png`,
    `${CHARACTER_ASSET_RULES.baseDir}/${character}/${variant}/${facing}-idle-3.png`
  ];
}

// Per-character, per-variant sprite pack definitions.
export const CHARACTER_PACKS = {
  player: {
    default: {
      directional: {
        up: directionalFacingPath('player', 'default', 'up'),
        down: directionalFacingPath('player', 'default', 'down'),
        left: directionalFacingPath('player', 'default', 'left'),
        right: directionalFacingPath('player', 'default', 'right')
      },
      modes: {
        walk: {
          directionalFrames: {
            up: walkingDirectionalCycle('player', 'default', 'up'),
            down: walkingDirectionalCycle('player', 'default', 'down'),
            left: walkingDirectionalCycle('player', 'default', 'left'),
            right: walkingDirectionalCycle('player', 'default', 'right')
          }
        },
        idle: {
          directionalFrames: {
            down: idleDirectionalCycle('player', 'default', 'down')
          }
        }
      }
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

// Collect all character sprite file paths for preloading.
export function collectCharacterPaths() {
  const paths = new Set();
  for (const variants of Object.values(CHARACTER_PACKS)) {
    for (const pack of Object.values(variants)) {
      if (pack.fallbackSingle) paths.add(pack.fallbackSingle);
      if (pack.fallbackSheet) paths.add(pack.fallbackSheet);
      for (const modeEntry of Object.values(pack.modes || {})) {
        if (modeEntry.sheet) paths.add(modeEntry.sheet);
        for (const path of Object.values(modeEntry.directional || {})) {
          if (path) paths.add(path);
        }
        for (const frames of Object.values(modeEntry.directionalFrames || {})) {
          for (const path of frames || []) {
            if (path) paths.add(path);
          }
        }
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

// Resolve the best available sprite descriptor for a character+variant+mode+facing.
export function resolveCharacterSprite(character, variant = 'default', mode = 'idle', facing = 'down') {
  const packs = CHARACTER_PACKS[character] || {};
  const pack = packs[variant] || packs.default || Object.values(packs)[0] || null;
  if (!pack) return { sheet: null, directional: null, fallbackSingle: null, fallbackSheet: null };
  const normalizedMode = normalizeMode(mode);
  const modeEntry = pack.modes?.[normalizedMode] || pack.modes?.idle || {};
  const directional = modeEntry.directional || pack.directional || directionalPaths(character, variant, normalizedMode);
  return {
    sheet: modeEntry.sheet || null,
    directionalFrames: modeEntry.directionalFrames || null,
    directional,
    fallbackSingle: pack.fallbackSingle || null,
    fallbackSheet: pack.fallbackSheet || null,
    mode: normalizedMode,
    facing
  };
}
