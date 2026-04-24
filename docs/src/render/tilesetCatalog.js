// Tileset catalog: per-map GID-to-image mappings, fallback colors, path collector.
const MAP1_TILESET_CONFIG = {
  1:  { name: 'floor', image: './assets/tilesets/environment/floors/floor128128.png', tileWidth: 128, tileHeight: 128, mapTileWidth: 128, mapTileHeight: 128, columns: 8, totalTiles: 64 },
  2:  { name: 'leftwall', image: './assets/tilesets/environment/walls/verticalwall_left3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  3:  { name: 'downwall', image: './assets/tilesets/environment/walls/verticalwall_horizontal3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  4:  { name: 'rightwall',  image: './assets/tilesets/environment/walls/verticalwall_right3232.png',   tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  5:  { name: 'facewall', image: './assets/tilesets/environment/walls/brick3232.jpg', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  6:  { name: 'brownfloor', image: './assets/tilesets/environment/floors/floorbrown6464.png', tileWidth: 64, tileHeight: 64, mapTileWidth: 64, mapTileHeight: 64, columns: 1, totalTiles: 1 },
  7:  { name: 'purplefloor', image: './assets/tilesets/environment/floors/floordarkpurple6464.png', tileWidth: 64, tileHeight: 64, mapTileWidth: 64, mapTileHeight: 64, columns: 1, totalTiles: 1 },
  8:  { name: 'table', image: './assets/tilesets/furniture/table6464.png', tileWidth: 64, tileHeight: 64, mapTileWidth: 64, mapTileHeight: 64, columns: 1, totalTiles: 1 },
  9:  { name: 'window', image: './assets/tilesets/environment/walls/window3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  10: { name: 'neonlight', image: './assets/tilesets/decor/neonlight3232.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 2, totalTiles: 4 },
  14: { name: 'cabinet', image: './assets/tilesets/furniture/cabinet3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  // Legacy box tile intentionally omitted from the live runtime set.
  16: { name: 'neonbars_yellow', image: './assets/tilesets/decor/neonbars_yellow64.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 4, totalTiles: 8 },
  24: { name: 'neonbars_multicolor', image: './assets/tilesets/decor/neonbars_multicolor64.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 4, totalTiles: 8 },
  32: { name: 'neonbars_pink', image: './assets/tilesets/decor/neonbars_pink64.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 4, totalTiles: 8 },
  40: { name: 'neonbars_bluepink', image: './assets/tilesets/decor/neonbars_bluepink64.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 4, totalTiles: 8 },
  48: { name: 'pinksymble',  image: './assets/tilesets/decor/pinksymbol3232.png',           tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  49: { name: 'bluesymble',      image: './assets/tilesets/decor/bluesymbol3232.png',           tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  54: { name: 'wall',        image: './assets/tilesets/environment/walls/wall1616.png',                     tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  55: { name: 'circuits', image: './assets/tilesets/decor/circuit64.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  56: { name: 'pinksymbol', image: './assets/tilesets/decor/pinksymbol3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  57: { name: 'bluesymbol', image: './assets/tilesets/decor/bluesymbol3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  58: { name: 'key', image: './assets/tilesets/interactives/key1616.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  // Legacy door tiles intentionally omitted from the live runtime set.
};

const MAP2_TILESET_CONFIG = {
  1:  { name: 'wall',        image: './assets/tilesets/environment/walls/wall1616.png',                     tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  10: { name: 'horishelf1',      image: './assets/tilesets/furniture/horizontalsplit_1_1616.png',   tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  11: { name: 'horishelf2',      image: './assets/tilesets/furniture/horizontalsplit_2_1616.png',   tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  12: { name: 'horishelf3',      image: './assets/tilesets/furniture/horizontalsplit_3_1616.png',   tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  13: { name: 'horishelf4',      image: './assets/tilesets/furniture/horizontalsplit_4_1616.png',   tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  14: { name: 'lineshelf1',      image: './assets/tilesets/furniture/lineshelfsplit_1_1616.png',    tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  15: { name: 'lineshelf2',      image: './assets/tilesets/furniture/lineshelfsplit_2_1616.png',    tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  // Legacy door and box tiles intentionally omitted from the live runtime set.
  19: { name: 'window3232',      image: './assets/tilesets/environment/walls/window3232.png',               tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  20: { name: 'map2circuit1',    image: './assets/tilesets/decor/circuit3232.png',              tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  21: { name: 'pinksymble3232',  image: './assets/tilesets/decor/pinksymbol3232.png',           tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  22: { name: 'bluefloor',       image: './assets/tilesets/environment/floors/floor128128.png',              tileWidth: 128, tileHeight: 128, mapTileWidth: 128, mapTileHeight: 128, columns: 8, totalTiles: 64 },
  23: { name: 'purplefloor',     image: './assets/tilesets/environment/floors/floordarkpurple6464.png',      tileWidth: 64, tileHeight: 64, mapTileWidth: 64, mapTileHeight: 64, columns: 4, totalTiles: 32 },
  24: { name: 'linewall_left',   image: './assets/tilesets/environment/walls/verticalwall_left3232.png',    tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  25: { name: 'linewall_right',  image: './assets/tilesets/environment/walls/verticalwall_right3232.png',   tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  26: { name: 'wall_bricks',     image: './assets/tilesets/environment/walls/brick3232.jpg',                tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  27: { name: 'bluesymple',      image: './assets/tilesets/decor/bluesymbol3232.png',           tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 }
};

const MAP3_TILESET_CONFIG = {
  1:  { name: 'wall',        image: './assets/tilesets/environment/walls/wall1616.png',                 tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  4:  { name: 'horishelf1',  image: './assets/tilesets/furniture/horizontalsplit_1_1616.png',     tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  8:  { name: 'bluefloor',   image: './assets/tilesets/environment/floors/floor128128.png',              tileWidth: 128, tileHeight: 128, mapTileWidth: 128, mapTileHeight: 128, columns: 8, totalTiles: 64 },
  9:  { name: 'leftwall',    image: './assets/tilesets/environment/walls/verticalwall_left3232.png',    tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  10: { name: 'rightwall',   image: './assets/tilesets/environment/walls/verticalwall_right3232.png',   tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  11: { name: 'brickwall',   image: './assets/tilesets/environment/walls/brick3232.jpg',                tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  12: { name: 'candlestick', image: './assets/tilesets/furniture/candlestick1648.png',          tileWidth: 16, tileHeight: 48, mapTileWidth: 16, mapTileHeight: 48, columns: 1, totalTiles: 3 },
  // Legacy box and door tiles intentionally omitted from the live runtime set.
  16: { name: 'horishelf2',  image: './assets/tilesets/furniture/horizontalsplit_2_1616.png',     tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  17: { name: 'horishelf3',  image: './assets/tilesets/furniture/horizontalsplit_3_1616.png',     tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  18: { name: 'horishelf4',  image: './assets/tilesets/furniture/horizontalsplit_4_1616.png',     tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  19: { name: 'lineshelf1',  image: './assets/tilesets/furniture/lineshelfsplit_1_1616.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  20: { name: 'lineshelf2',  image: './assets/tilesets/furniture/lineshelfsplit_2_1616.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  21: { name: 'sofa_left',   image: './assets/tilesets/furniture/sofa_left3232.png',        tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  22: { name: 'sofa_right',  image: './assets/tilesets/furniture/sofa_right3232.png',       tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  23: { name: 'longtable',   image: './assets/tilesets/furniture/longtable32208.png',        tileWidth: 32, tileHeight: 208, mapTileWidth: 32, mapTileHeight: 208, columns: 2, totalTiles: 26 },
  24: { name: 'table',       image: './assets/tilesets/furniture/table3232.png',             tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  25: { name: 'candlestick', image: './assets/tilesets/furniture/cabinet3232.png',      tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  26: { name: 'purplefloor', image: './assets/tilesets/environment/floors/floordarkpurple6464.png',      tileWidth: 64, tileHeight: 64, mapTileWidth: 64, mapTileHeight: 64, columns: 4, totalTiles: 32 },
  27: { name: 'downwall',    image: './assets/tilesets/environment/walls/verticalwall_horizontal3232.png',            tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  28: { name: 'window',      image: './assets/tilesets/environment/walls/window3232.png',            tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  29: { name: 'circuit1',    image: './assets/tilesets/decor/circuit3232.png',              tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  30: { name: 'pinksymbol',  image: './assets/tilesets/decor/pinksymbol3232.png',        tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  31: { name: 'pinksymbol',  image: './assets/tilesets/decor/bluesymbol3232.png',        tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
};

export const GID_REMAP = { 60: 59, 61: 59, 62: 59, 84: 83 };

export const GID_COLORS = {
  1: '#2b3446', 2: '#334155', 3: '#475569', 4: '#334155', 5: '#7c2d12', 6: '#7c2d12', 7: '#60a5fa',
  8: '#8b7355', 9: '#8b7355', 10: '#8b7355', 11: '#8b5a2b', 12: '#8b5a2b', 13: '#8b5a2b',
  14: '#705f4b', 15: '#705f4b', 16: '#475569', 17: '#475569', 18: '#475569', 19: '#475569', 20: '#475569',
  21: '#475569', 22: '#475569', 23: '#475569', 24: '#475569', 25: '#475569', 26: '#475569',
  27: '#7f1d1d', 28: '#ec4899', 29: '#3b82f6', 30: '#22c55e', 59: '#8b7355', 83: '#8b7355'
};

// Return the tileset config object for the given level ID.
export function getTilesetConfig(levelId) {
  if (levelId === 'map2') return MAP2_TILESET_CONFIG;
  else if(levelId === 'map3') return MAP3_TILESET_CONFIG;
  return MAP1_TILESET_CONFIG;
}


// Collect all tileset image paths for preloading.
export function collectTilesetPaths() {
  const paths = new Set();
  for (const config of [MAP1_TILESET_CONFIG, MAP2_TILESET_CONFIG,MAP3_TILESET_CONFIG]) {
    for (const entry of Object.values(config)) {
      if (entry.image) paths.add(entry.image);
    }
  }
  return Array.from(paths);
}

