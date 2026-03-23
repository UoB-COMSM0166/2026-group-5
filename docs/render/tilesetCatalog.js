// Tileset catalog: per-map GID-to-image mappings, fallback colors, path collector.
const MAP1_TILESET_CONFIG = {
  1:  { name: 'floor', image: './tilesets/floor128128.png', tileWidth: 128, tileHeight: 128, mapTileWidth: 128, mapTileHeight: 128, columns: 8, totalTiles: 64 },
  2:  { name: 'leftwall', image: './tilesets/verticalwall_left3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  3:  { name: 'downwall', image: './tilesets/verticalwall_horizontal3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  4:  { name: 'rightwall', image: './tilesets/verticalwall_right3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  5:  { name: 'facewall', image: './tilesets/brick3232.jpg', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  6:  { name: 'brownfloor', image: './tilesets/floorbrown6464.png', tileWidth: 64, tileHeight: 64, mapTileWidth: 64, mapTileHeight: 64, columns: 1, totalTiles: 1 },
  7:  { name: 'purplefloor', image: './tilesets/floordarkpurple6464.png', tileWidth: 64, tileHeight: 64, mapTileWidth: 64, mapTileHeight: 64, columns: 1, totalTiles: 1 },
  8:  { name: 'table', image: './tilesets/table6464.png', tileWidth: 64, tileHeight: 64, mapTileWidth: 64, mapTileHeight: 64, columns: 1, totalTiles: 1 },
  9:  { name: 'window', image: './tilesets/window3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  10: { name: 'neonlight', image: './tilesets/neonlight3232.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 2, totalTiles: 4 },
  14: { name: 'cabinet', image: './tilesets/cabinet3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  15: { name: 'box', image: './tilesets/chest_closed3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  16: { name: 'neonbars_yellow', image: './tilesets/neonbars_yellow64.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 4, totalTiles: 8 },
  24: { name: 'neonbars_multicolor', image: './tilesets/neonbars_multicolor64.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 4, totalTiles: 8 },
  32: { name: 'neonbars_pink', image: './tilesets/neonbars_pink64.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 4, totalTiles: 8 },
  40: { name: 'neonbars_bluepink', image: './tilesets/neonbars_bluepink64.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 4, totalTiles: 8 },
  48: { name: 'circuit', image: './tilesets/circuit64.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 4, totalTiles: 8 },
  56: { name: 'pinksymbol', image: './tilesets/pinksymbol3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  57: { name: 'bluesymbol', image: './tilesets/bluesymbol3232.png', tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  58: { name: 'key', image: './tilesets/key1616.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  59: { name: 'door', image: './tilesets/door_twoside3232.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 2, totalTiles: 4 },
  83: { name: 'door_lateral', image: './tilesets/linedoor1632.png', tileWidth: 16, tileHeight: 32, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 2 }
};

const MAP2_TILESET_CONFIG = {
  1:  { name: 'wall',        image: './tilesets/wall1616.png',                     tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  10: { name: 'horishelf1',      image: './tilesets/horizontalsplit_1_1616.png',   tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  11: { name: 'horishelf2',      image: './tilesets/horizontalsplit_2_1616.png',   tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  12: { name: 'horishelf3',      image: './tilesets/horizontalsplit_3_1616.png',   tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  13: { name: 'horishelf4',      image: './tilesets/horizontalsplit_4_1616.png',   tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  14: { name: 'lineshelf1',      image: './tilesets/lineshelfsplit_1_1616.png',    tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  15: { name: 'lineshelf2',      image: './tilesets/lineshelfsplit_2_1616.png',    tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  16: { name: 'doorline',        image: './tilesets/doorline1632.png',             tileWidth: 16, tileHeight: 32, mapTileWidth: 16, mapTileHeight: 32, columns: 1, totalTiles: 2 },
  17: { name: 'doortwoside',     image: './tilesets/doortwoside3232.png',          tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  18: { name: 'box',             image: './tilesets/box3216.png',                  tileWidth: 32, tileHeight: 16, mapTileWidth: 32, mapTileHeight: 16, columns: 2, totalTiles: 2 },
  19: { name: 'window3232',      image: './tilesets/window3232.png',               tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  20: { name: 'map2circuit1',    image: './tilesets/circuit3232.png',              tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  21: { name: 'pinksymble3232',  image: './tilesets/pinksymbol3232.png',           tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  22: { name: 'bluefloor',       image: './tilesets/floor128128.png',              tileWidth: 128, tileHeight: 128, mapTileWidth: 128, mapTileHeight: 128, columns: 8, totalTiles: 64 },
  23: { name: 'purplefloor',     image: './tilesets/floordarkpurple6464.png',      tileWidth: 64, tileHeight: 64, mapTileWidth: 64, mapTileHeight: 64, columns: 4, totalTiles: 32 },
  24: { name: 'linewall_left',   image: './tilesets/verticalwall_left3232.png',    tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  25: { name: 'linewall_right',  image: './tilesets/verticalwall_right3232.png',   tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  26: { name: 'wall_bricks',     image: './tilesets/brick3232.jpg',                tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  27: { name: 'bluesymple',      image: './tilesets/bluesymbol3232.png',           tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 }
};

const MAP3_TILESET_CONFIG = {
  1:  { name: 'wall',        image: './tilesets/wall1616.png',                 tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  4:  { name: 'horishelf1',  image: './tilesets/horizontalsplit_1_1616.png',     tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  8:  { name: 'bluefloor',   image: './tilesets/floor128128.png',              tileWidth: 128, tileHeight: 128, mapTileWidth: 128, mapTileHeight: 128, columns: 8, totalTiles: 64 },
  9:  { name: 'leftwall',    image: './tilesets/verticalwall_left3232.png',    tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  10: { name: 'rightwall',   image: './tilesets/verticalwall_right3232.png',   tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  11: { name: 'brickwall',   image: './tilesets/brick3232.jpg',                tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  12: { name: 'candlestick', image: './tilesets/candlestick1648.png',          tileWidth: 16, tileHeight: 48, mapTileWidth: 16, mapTileHeight: 48, columns: 1, totalTiles: 3 },
  13: { name: 'box',         image: './tilesets/box3216.png',                  tileWidth: 32, tileHeight: 16, mapTileWidth: 32, mapTileHeight: 16, columns: 2, totalTiles: 2 },
  14: { name: 'doortwoside', image: './tilesets/doortwoside3232.png',          tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  15: { name: 'linedoor',   image: './tilesets/doorline1632.png',              tileWidth: 16, tileHeight: 32, mapTileWidth: 16, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  16: { name: 'horishelf2',  image: './tilesets/horizontalsplit_2_1616.png',     tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  17: { name: 'horishelf3',  image: './tilesets/horizontalsplit_3_1616.png',     tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  18: { name: 'horishelf4',  image: './tilesets/horizontalsplit_4_1616.png',     tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  19: { name: 'lineshelf1',  image: './tilesets/lineshelfsplit_1_1616.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  20: { name: 'lineshelf2',  image: './tilesets/lineshelfsplit_2_1616.png', tileWidth: 16, tileHeight: 16, mapTileWidth: 16, mapTileHeight: 16, columns: 1, totalTiles: 1 },
  21: { name: 'sofa_left',   image: './tilesets/sofa_left3232.png',        tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  22: { name: 'sofa_right',  image: './tilesets/sofa_right3232.png',       tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  23: { name: 'longtable',   image: './tilesets/longtable32208.png',        tileWidth: 32, tileHeight: 208, mapTileWidth: 32, mapTileHeight: 208, columns: 2, totalTiles: 26 },
  24: { name: 'table',       image: './tilesets/table3232.png',             tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  25: { name: 'candlestick', image: './tilesets/cabinet3232.png',      tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  26: { name: 'purplefloor', image: './tilesets/floordarkpurple6464.png',      tileWidth: 64, tileHeight: 64, mapTileWidth: 64, mapTileHeight: 64, columns: 4, totalTiles: 32 },
  27: { name: 'downwall',    image: './tilesets/verticalwall_horizontal3232.png',            tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  28: { name: 'window',      image: './tilesets/window3232.png',            tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  29: { name: 'circuit1',    image: './tilesets/circuit3232.png',              tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  30: { name: 'pinksymbol',  image: './tilesets/pinksymbol3232.png',        tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
  31: { name: 'pinksymbol',  image: './tilesets/bluesymbol3232.png',        tileWidth: 32, tileHeight: 32, mapTileWidth: 32, mapTileHeight: 32, columns: 1, totalTiles: 1 },
};

export const GID_REMAP = { 60: 59, 61: 59, 62: 59, 84: 83 };

export const GID_COLORS = {
  1: '#2b3446', 2: '#334155', 3: '#475569', 4: '#334155', 5: '#7c2d12', 6: '#7c2d12', 7: '#60a5fa',
  8: '#8b7355', 9: '#8b7355', 10: '#8b7355', 11: '#8b5a2b', 12: '#8b5a2b', 13: '#8b5a2b',
  14: '#705f4b', 15: '#705f4b', 16: '#475569', 17: '#475569', 18: '#475569', 19: '#475569', 20: '#475569',
  21: '#475569', 22: '#475569', 23: '#475569', 24: '#475569', 25: '#475569', 26: '#475569',
  27: '#7f1d1d', 28: '#ec4899', 29: '#3b82f6', 30: '#22c55e', 59: '#8b7355', 83: '#8b7355'
};

export function getTilesetConfig(levelId) {
  if (levelId === 'map2') return MAP2_TILESET_CONFIG;
  else if(levelId === 'map3') return MAP3_TILESET_CONFIG;
  return MAP1_TILESET_CONFIG;
}


export function collectTilesetPaths() {
  const paths = new Set();
  for (const config of [MAP1_TILESET_CONFIG, MAP2_TILESET_CONFIG,MAP3_TILESET_CONFIG]) {
    for (const entry of Object.values(config)) {
      if (entry.image) paths.add(entry.image);
    }
  }
  return Array.from(paths);
}
