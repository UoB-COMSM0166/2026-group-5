import { getImage } from '../core/assetLoader.js';
import { getTilesetConfig, GID_REMAP, GID_COLORS } from './tilesetCatalog.js';
import { getVisibleTileBounds } from '../systems/cameraSystem.js';

const FLIP_H = 0x80000000;
const FLIP_V = 0x40000000;
const FLIP_D = 0x20000000;
const FLIP_MASK = FLIP_H | FLIP_V | FLIP_D;

function normalizeGid(gid) {
  return (gid >>> 0) & ~FLIP_MASK;
}

function resolveBaseGid(gid) {
  const raw = normalizeGid(gid);
  return GID_REMAP[raw] || raw;
}

function getTilesetInfo(levelId, gid) {
  const tilesetConfig = getTilesetConfig(levelId);
  const base = resolveBaseGid(gid);
  const numeric = Object.keys(tilesetConfig).map(Number).sort((a, b) => a - b);
  let firstgid = null;
  for (const key of numeric) {
    if (key <= base) firstgid = key;
    else break;
  }
  if (firstgid == null) return null;
  return { firstgid, config: tilesetConfig[firstgid], localId: base - firstgid, resolvedGid: base };
}

function drawFallbackCollision(p, level, camera) {
  const tile = level.settings.baseTile;
  const bounds = getVisibleTileBounds(camera, tile, level.collision[0]?.length || 0, level.collision.length || 0);
  p.noStroke();
  for (let y = bounds.startRow; y < bounds.endRow; y += 1) {
    for (let x = bounds.startCol; x < bounds.endCol; x += 1) {
      p.fill(level.collision[y]?.[x] === 1 ? '#394150' : '#1a2233');
      p.rect(x * tile, y * tile, tile, tile);
    }
  }
}

function getDrawMetrics(levelId, config, x, y, tile) {
  const baseTile = tile;
  const mapTileW = config.mapTileWidth || config.tileWidth || baseTile;
  const mapTileH = config.mapTileHeight || config.tileHeight || baseTile;
  const destW = mapTileW;
  const destH = mapTileH;
  const extraH = mapTileH - baseTile;
  const drawX = x * baseTile;
  const drawY = y * baseTile - extraH;
  return { drawX, drawY, destW, destH, mapTileW, mapTileH };
}

function isWithinExpandedViewport(camera, drawX, drawY, drawW, drawH) {
  const margin = 128;
  return !(
    drawX + drawW < camera.x - margin ||
    drawY + drawH < camera.y - margin ||
    drawX > camera.x + camera.width + margin ||
    drawY > camera.y + camera.height + margin
  );
}

function drawTileFromImage(p, levelId, gid, x, y, tile, camera) {
  const info = getTilesetInfo(levelId, gid);
  if (!info?.config?.image) return false;
  const img = getImage(info.config.image);
  if (!img || typeof img.width !== 'number' || img.width <= 0) return false;

  const tw = info.config.tileWidth || tile;
  const th = info.config.tileHeight || tile;
  const autoCols = Math.max(1, Math.floor(img.width / tw) || 1);
  const autoRows = Math.max(1, Math.floor(img.height / th) || 1);
  const cols = Math.max(1, info.config.columns || autoCols);
  const totalTiles = Math.max(1, info.config.totalTiles || (autoCols * autoRows));
  if (info.localId < 0 || info.localId >= totalTiles) return false;
  const sx = (info.localId % cols) * tw;
  const sy = Math.floor(info.localId / cols) * th;
  if (sx < 0 || sy < 0 || sx + tw > img.width || sy + th > img.height) return false;

  const { drawX, drawY, destW, destH, mapTileW, mapTileH } = getDrawMetrics(levelId, info.config, x, y, tile);
  if (camera && !isWithinExpandedViewport(camera, drawX, drawY, destW, destH)) return true;

  try {
    p.image(img, drawX, drawY, destW, destH, sx, sy, tw, th);
    return true;
  } catch {
    return false;
  }
}

function drawFallbackTile(p, levelId, gid, x, y, tile) {
  const info = getTilesetInfo(levelId, gid);
  const config = info?.config || {};
  const { drawX, drawY, destW, destH } = getDrawMetrics(levelId, config, x, y, tile);
  p.fill(GID_COLORS[resolveBaseGid(gid)] || '#334155');
  p.rect(drawX, drawY, destW, destH);
}

function drawLayer(p, level, layer, camera) {
  const tile = level.settings.baseTile;
  const width = level.mapData.width;
  const height = level.mapData.height;
  const bounds = getVisibleTileBounds(camera, tile, width, height);
  p.noStroke();
  for (let y = bounds.startRow; y < bounds.endRow; y += 1) {
    for (let x = bounds.startCol; x < bounds.endCol; x += 1) {
      const gid = layer.data[y * width + x] || 0;
      if (!gid) continue;
      const usedImage = drawTileFromImage(p, level.id, gid, x, y, tile, camera);
      if (!usedImage) {
        drawFallbackTile(p, level.id, gid, x, y, tile);
      }
    }
  }
}

export function renderMap(p, state) {
  const level = state.level;
  if (!level) return;
  const camera = state.camera || { x: 0, y: 0, width: p.width, height: p.height };

  if (!level.mapData?.layers) {
  drawFallbackCollision(p, level, camera);
  return;
}

  p.background('#0d1220');
  for (const layer of level.mapData.layers) {
    if (layer.type !== 'tilelayer' || !layer.visible || !Array.isArray(layer.data)) continue;
    drawLayer(p, level, layer, camera);
  }
}
