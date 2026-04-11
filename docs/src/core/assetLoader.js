// Async image loader: collects all tileset and sprite paths, loads via p5 or DOM.
import { collectTilesetPaths } from '../render/tilesetCatalog.js';
import { SPRITE_PATHS, collectCharacterPaths } from '../render/spriteCatalog.js';

const assets = {
  images: new Map(),
  requested: new Set(),
  ready: false,
  failed: []
};

function collectPaths() {
  const paths = new Set();
  collectTilesetPaths().forEach((p) => paths.add(p));
  paths.add(SPRITE_PATHS.player);
  paths.add(SPRITE_PATHS.playerSheet);
  Object.values(SPRITE_PATHS.npc).forEach((v) => paths.add(v));
  Object.values(SPRITE_PATHS.npcSheet).forEach((v) => paths.add(v));
  collectCharacterPaths().forEach((p) => paths.add(p));
  Object.values(SPRITE_PATHS.door).forEach((v) => paths.add(v));
  Object.values(SPRITE_PATHS.chest).forEach((v) => paths.add(v));
  Object.values(SPRITE_PATHS.button).forEach((v) => paths.add(v));
  paths.add('./assets/images/original/drawings/start_bg.png');
  paths.add('./assets/images/original/npcs/dragon/dragon.png');
  paths.add('./assets/images/original/drawings/title_logo.png');
  paths.add('./assets/images/original/drawings/captured.png');
  paths.add('./assets/images/gif/ASDW.gif');
  paths.add('./assets/images/gif/b.gif');
  paths.add('./assets/images/gif/c.gif');
  paths.add('./assets/images/gif/d.gif');
  paths.add('./assets/images/gif/e.gif');
  paths.add('./assets/images/gif/f.gif');
  paths.add('./assets/images/gif/g.gif');

  // v19 intentionally stops probing every potential character variant path.
  // Only concrete fallback assets are requested here, so missing-file noise stays low.
  return Array.from(paths).filter(Boolean);
}

function loadImageAsync(p, path) {
  return new Promise((resolve) => {
    if (p && typeof p.loadImage === 'function') {
      p.loadImage(
        path,
        (img) => resolve({ path, img, ok: true }),
        () => resolve({ path, img: null, ok: false })
      );
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ path, img, ok: true });
    img.onerror = () => resolve({ path, img: null, ok: false });
    img.src = path;
  });
}

export async function loadAssetsAsync(p) {
  const paths = collectPaths();
  assets.failed = [];
  const pending = [];
  for (const path of paths) {
    if (assets.requested.has(path)) continue;
    assets.requested.add(path);
    pending.push(loadImageAsync(p, path));
  }
  const results = await Promise.all(pending);
  for (const result of results) {
    assets.images.set(result.path, result.ok ? result.img : null);
    if (!result.ok) assets.failed.push(result.path);
  }
  assets.ready = true;
  return getAssetState();
}

export function getImage(path) {
  return assets.images.get(path) || null;
}

export function hasImage(path) {
  return !!assets.images.get(path);
}

export function getAssetState() {
  let loadedCount = 0;
  for (const value of assets.images.values()) {
    if (value) loadedCount += 1;
  }
  return {
    ready: assets.ready,
    imageCount: loadedCount,
    requestedCount: assets.images.size,
    failedCount: assets.failed.length,
    failed: [...assets.failed]
  };
}
