// Async image loader: collects all tileset and sprite paths, loads via p5 or DOM.
import { collectTilesetPaths } from '../render/tilesetCatalog.js';
import { SPRITE_PATHS, collectCharacterPaths } from '../render/spriteCatalog.js';
import { STORY_SCREEN_ASSET_PATHS } from '../screens/storyAssetCatalog.js';

// Singleton store for all loaded image assets and their load status.
const assets = {
  images: new Map(),
  requested: new Set(),
  ready: false,
  failed: []
};

// Gather every image path the game may need (tilesets, sprites, UI, story art).
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
  Object.values(SPRITE_PATHS.portal).forEach((v) => paths.add(v));
  paths.add('./assets/images/adapted/interactives/key3232.png');
  paths.add('./assets/images/sprites/key_Esc.png');
  paths.add('./assets/images/sprites/note.png');
  paths.add('./assets/images/original/drawings/start_bg.png');
  paths.add('./assets/images/original/npcs/dragon/dragon.png');
  paths.add('./assets/images/original/drawings/title_logo.png');
  paths.add('./assets/images/original/drawings/captured.png');
  paths.add('./assets/images/tutorial/page0_gameplay1.png');
  paths.add('./assets/images/tutorial/page1_gameplay2.png');
  paths.add('./assets/images/tutorial/page2_move_asdw.png');
  paths.add('./assets/images/tutorial/page3_accelarate.png');
  paths.add('./assets/images/tutorial/page4_interact_e1.png');
  paths.add('./assets/images/tutorial/page5_interact_e2.png');
  paths.add('./assets/images/tutorial/page6_interact_e3.png');
  paths.add('./assets/images/tutorial/page7_pauced_esc.png');
  paths.add('./assets/images/tutorial/page8_portal_space.png');
  paths.add('./assets/images/tutorial/page9_readnotes.png');
  STORY_SCREEN_ASSET_PATHS.forEach((path) => paths.add(path));

  // v19 intentionally stops probing every potential character variant path.
  // Only concrete fallback assets are requested here, so missing-file noise stays low.
  return Array.from(paths).filter(Boolean);
}

// Wrap a native Image element to match the p5 image interface.
function wrapDomImage(img) {
  return {
    elt: img,
    width: img.naturalWidth || img.width || 0,
    height: img.naturalHeight || img.height || 0
  };
}

// Load an image via a DOM Image element, resolving with ok/fail metadata.
function loadDomImageAsync(path) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve({ path, img: null, ok: false });
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve({ path, img: wrapDomImage(img), ok: true });
    img.onerror = () => resolve({ path, img: null, ok: false });
    img.src = path;
  });
}

// Try loading via p5.loadImage first, fall back to DOM Image on failure/timeout.
function loadImageAsync(p, path) {
  if (!p || typeof p.loadImage !== 'function') return loadDomImageAsync(path);

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      resolve(result);
    };

    // Invalid GIF files can leave p5's loader unresolved. Fall back to a DOM image
    // probe so bad optional assets don't block startup.
    timeoutId = setTimeout(() => {
      loadDomImageAsync(path).then(finish);
    }, 800);

    try {
      p.loadImage(
        path,
        (img) => finish({ path, img, ok: true }),
        () => {
          loadDomImageAsync(path).then(finish);
        }
      );
    } catch {
      loadDomImageAsync(path).then(finish);
    }
  });
}

// Load all game assets in batches to prevent overwhelming the browser.
// Critical assets load first, then non-critical in parallel batches.
export async function loadAssetsAsync(p) {
  const paths = collectPaths();
  assets.failed = [];

  // Critical UI assets that must load first for basic display
  const criticalPaths = paths.filter(p =>
    p.includes('start_bg') ||
    p.includes('title_logo') ||
    p.includes('key3232') ||
    p.includes('note') ||
    p.includes('tutorial')
  );

  // Load critical assets first
  await loadBatch(p, criticalPaths, 8);

  // Load remaining assets in parallel batches
  const remainingPaths = paths.filter(p => !assets.requested.has(p));
  await loadBatch(p, remainingPaths, 16);

  assets.ready = true;
  return getAssetState();
}

// Load a batch of assets with concurrency limit
async function loadBatch(p, paths, concurrency) {
  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const promises = batch.map(path => {
      if (assets.requested.has(path)) return Promise.resolve({ path, ok: true });
      assets.requested.add(path);
      return loadImageAsync(p, path);
    });
    const results = await Promise.all(promises);
    for (const result of results) {
      if (result.ok && result.img) {
        assets.images.set(result.path, result.img);
      } else if (!result.ok) {
        assets.failed.push(result.path);
        assets.images.set(result.path, null);
      }
    }
  }
}

// Retrieve a loaded image by its path, or null if unavailable.
export function getImage(path) {
  return assets.images.get(path) || null;
}

// Check whether a given image path has been successfully loaded.
export function hasImage(path) {
  return !!assets.images.get(path);
}

// Return a summary of asset loading progress and failures.
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
