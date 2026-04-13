// Game core: main loop, screen transitions, level loading, input dispatch.
import { SCREEN_STATES, GameState } from './gameState.js';
import { InputSystem } from './inputSystem.js';
import { loadAssetsAsync, getAssetState } from './assetLoader.js';
import { bootstrapLegacyMaps, getMap } from '../maps/mapManager.js';
import { Level, createRuntimeLevel } from '../maps/mapFactory.js';
import { updatePlayer, triggerPlayerAction } from '../systems/playerSystem.js';
import { getInteractionPrompt, tryInteract } from '../systems/interactionSystem.js';
import { updateNpcs } from '../systems/npcSystem.js';
import { renderScene } from '../render/renderSystem.js';
import { AudioSystem } from '../systems/audioSystem.js';
import { ScreenOverlaySystem } from '../systems/screenOverlaySystem.js';
import { Camera } from '../systems/cameraSystem.js';
import { Inventory, LootTable, collectLoot, formatInventory, countTotalKeys, countTotalNotes } from '../systems/lootTable.js';

export class GameCore {
  #state;
  #input;
  #audio;
  #overlay;
  #currentLevelId;
  #camera;

  constructor({ initialLevel = 'map2' } = {}) {
    this.#state = new GameState();
    this.#input = new InputSystem();
    this.#audio = new AudioSystem();
    this.#overlay = new ScreenOverlaySystem();
    this.#currentLevelId = initialLevel;
    this.#camera = new Camera(960, 640);
  }

  #syncHud() {
    const s = this.#state;
    document.getElementById('screenState')?.replaceChildren(document.createTextNode(s.screen));
    document.getElementById('levelName')?.replaceChildren(document.createTextNode(s.levelId || '-'));
    document.getElementById('promptText')?.replaceChildren(document.createTextNode(s.prompt || '-'));
    const assetState = getAssetState();
    document.getElementById('assetState')?.replaceChildren(document.createTextNode(`${assetState.imageCount}/${assetState.requestedCount}${assetState.failedCount ? ` fallback ${assetState.failedCount}` : ''}`));
    document.getElementById('inventoryText')?.replaceChildren(document.createTextNode(s.inventory.toString()));
    const chestCountEl = document.getElementById('chest-count');
    if (chestCountEl && s.level) {
      chestCountEl.textContent = `${s.level.boxSystem.boxes.filter(b => b.opened).length}/${s.level.boxSystem.boxes.length}`;
    }
    const keyCountEl = document.getElementById('key-count');
    if (keyCountEl) keyCountEl.textContent = `${s.inventory.keys.length}/${countTotalKeys(s.levelId)}`;
    const noteCountEl = document.getElementById('note-count');
    if (noteCountEl) noteCountEl.textContent = `${s.inventory.note}/${LootTable.countTotalNotes(s.levelId)}`;
  }

  #setMessage(text, seconds = 1.5) { this.#state.ui.message = text; this.#state.ui.messageTimer = seconds; }
  #markMissionStart() { this.#state.meta.startedAt = performance.now(); }

  #loadLevel(levelId) {
    const config = getMap(levelId);
    if (!config) throw new Error(`Unknown level: ${levelId}`);
    const s = this.#state;
    s.levelId = levelId;
    s.level = new Level(levelId, config);
    this.#camera.configureBounds(s.level.mapWidth, s.level.mapHeight, s.level.settings.baseTile);
    this.#camera.x = 0; this.#camera.y = 0;
    this.#camera.setZoom(s.level.settings.initialZoom ?? 1.0);
    s.camera = this.#camera;
    s.meta.collected = s.level.boxSystem.boxes.filter(b => b.opened).length;
    s.meta.target = s.level.boxSystem.boxes.length;
    s.meta.detectedBy = null; s.meta.elapsedMs = 0; s.meta.startedAt = 0; s.meta.levelSession += 1;
    s.meta.objective = s.level.missionSystem.getObjectiveText(s.meta.collected, s.meta.target);
    s.meta.exitDistanceText = s.level.missionSystem.isUnlocked() ? `${s.level.missionSystem.getDistanceToExit(s.level.player).toFixed(0)} px` : 'locked';
    s.inventory = new Inventory();
    s.prompt = 'Arrow Up / Down to choose, Enter to confirm';
    this.#syncHud();
  }

  #setScreen(screen) {
    this.#input.reset?.();
    const s = this.#state;
    s.previousScreen = s.screen; s.screen = screen; s.screenEnteredAt = performance.now(); s.screenTimeMs = 0;
    s.prompt = this.#overlay.screenManager.getPrompt(screen);
    this.#overlay.screenManager.reset(screen);
    this.#audio.sync(screen);
    const audioState = this.#audio.getState();
    s.audio.currentTrack = audioState.currentKey; s.audio.muted = audioState.muted;
    this.#syncHud();
  }

  restartLevel() {
    this.#loadLevel(this.#currentLevelId);
    this.#state.nearestLightButton = null;
    this.#setScreen(SCREEN_STATES.START);
    this.#overlay.flash(this.#state, 0.3);
  }

  switchLevel(levelId) {
    this.#currentLevelId = levelId;
    this.#loadLevel(levelId);
    this.#setScreen(SCREEN_STATES.START);
    this.#overlay.flash(this.#state, 0.3);
  }

  #togglePause() {
    if (this.#state.screen === SCREEN_STATES.PLAYING) this.#setScreen(SCREEN_STATES.PAUSE);
    else if (this.#state.screen === SCREEN_STATES.PAUSE) this.#setScreen(SCREEN_STATES.PLAYING);
  }

  #getApi() {
    return { setScreen: s => this.#setScreen(s), setMessage: (t, s) => this.#setMessage(t, s), markMissionStart: () => this.#markMissionStart(), restartLevel: () => this.restartLevel() };
  }

  #handleNonPlayingKey(key) {
    return this.#overlay.screenManager.handleKey(this.#state.screen, key, this.#state, this.#getApi());
  }

  async loadAssets(p) {
    this.#state.loading.message = 'Loading assets...';
    try { const r = await loadAssetsAsync(p); this.#state.loading.ready = true; this.#state.loading.message = r.failedCount > 0 ? `Loaded with ${r.failedCount} fallback asset(s)` : 'Assets loaded'; }
    catch (e) { this.#state.loading.error = e?.message || String(e); throw e; }
    this.#syncHud();
  }

  setup() {
    const v = bootstrapLegacyMaps();
    if (v.length) throw new Error(`Legacy map bootstrap failed: ${v.map(e => `${e.levelId}: ${e.issues.join(', ')}`).join(' | ')}`);
    this.#loadLevel(this.#currentLevelId);
    this.#setScreen(SCREEN_STATES.START);
    this.#setMessage('Ready.', 1.2);
  }

  update(deltaTime) {
    const s = this.#state;
    s.screenTimeMs = performance.now() - s.screenEnteredAt;
    this.#overlay.update(s, deltaTime);
    if (s.ui.messageTimer > 0) { s.ui.messageTimer -= deltaTime; if (s.ui.messageTimer <= 0) s.ui.message = ''; }
    if (s.screen !== SCREEN_STATES.PLAYING) { this.#syncHud(); return; }
    s.meta.elapsedMs = Math.max(0, performance.now() - s.meta.startedAt);
    updatePlayer(s.level.player, this.#input.getMovement(), s.level, deltaTime);
    if (s.camera) s.camera.update(s.level.player, deltaTime);
    const roomSystem = s.level.roomSystem;
    if (roomSystem.getActorRoomId(s.level.player) > 1) roomSystem.explorePlayerRoom(s.level.player);
    s.level.doorSystem.update(deltaTime, [s.level.player, ...(s.level.npcs || [])]);
    s.level.boxSystem.update(deltaTime); s.level.roomSystem.update(deltaTime); s.level.missionSystem.update(deltaTime);
    const detectedBy = updateNpcs(s.level, deltaTime);
    if (detectedBy) {
      triggerPlayerAction(s.level.player, 'alert', 0.32); s.meta.detectedBy = detectedBy;
      this.#setScreen(SCREEN_STATES.LOSE); this.#overlay.flash(s, 0.45); this.#setMessage('You were spotted', 2);
      this.#syncHud(); return;
    }
    s.meta.objective = s.level.missionSystem.getObjectiveText(s.meta.collected, s.meta.target);
    s.meta.exitDistanceText = s.level.missionSystem.isUnlocked() ? `${s.level.missionSystem.getDistanceToExit(s.level.player).toFixed(0)} px` : 'locked';
    const prompt = getInteractionPrompt(s.level);
    s.nearestLightButton = prompt?.type === 'light' ? prompt.entity : null;
    s.prompt = prompt?.text || (s.level.missionSystem.isUnlocked() ? 'Head to extraction' : 'Find the chests');
    if (this.#input.consumeInteract()) {
      const r = tryInteract(s.level, s.inventory);
      if (r.success) {
        triggerPlayerAction(s.level.player, r.kind === 'light' ? 'alert' : 'interact', r.kind === 'light' ? 0.22 : 0.28);
        this.#setMessage(r.text, 1.2); this.#overlay.flash(s, r.kind === 'light' ? 0.12 : 0.18);
      } else if (r.text) this.#setMessage(r.text, 1);
      if (r.success && r.kind === 'exit') { this.#setScreen(SCREEN_STATES.WIN); this.#overlay.flash(s, 0.28); this.#setMessage('Extraction confirmed', 1.4); this.#syncHud(); return; }
      if (r.success && r.kind === 'light') { const roomId = r.entity?.roomId; if (roomId) this.#setMessage(s.level.roomSystem.isLit(roomId) ? `Room ${roomId} restored` : `Room ${roomId} darkened`, 1.3); }
      if (r.success && r.kind === 'door') this.#setMessage(r.text, 1);
      if (r.success && r.kind === 'box') {
        const loot = collectLoot(s.inventory, r.entity.id, s.levelId);
        if (loot) this.#setMessage(`Found: ${loot.label}`, 1.5);
        s.meta.collected = s.level.boxSystem.boxes.filter(b => b.opened).length;
        if (s.meta.collected >= s.meta.target && s.meta.target > 0 && !s.level.missionSystem.isUnlocked()) {
          s.level.missionSystem.unlock(); s.meta.objective = s.level.missionSystem.getObjectiveText(s.meta.collected, s.meta.target);
          s.prompt = 'Extraction unlocked'; this.#setMessage('All chests secured. Reach extraction.', 2); this.#overlay.flash(s, 0.26);
        }
      }
    }
    this.#syncHud();
  }

  render(p) { renderScene(p, this.#state, this.#overlay); }

  onKeyPressed(key, keyCode) {
    this.#audio.unlock();
    if (this.#handleNonPlayingKey(key)) { const a = this.#audio.getState(); this.#state.audio.currentTrack = a.currentKey; this.#state.audio.muted = a.muted; this.#syncHud(); return; }
    this.#input.onKeyPressed(key, keyCode);
    const l = String(key).toLowerCase(), s = this.#state;
    if (keyCode === 27) this.restartLevel();
    if (l === '1') this.switchLevel('map1'); if (l === '2') this.switchLevel('map2'); if (l === '3') this.switchLevel('map3');
    if (l === 'b') s.debug.showRooms = !s.debug.showRooms; if (l === 'c') s.debug.showCollision = !s.debug.showCollision;
    if (l === 'g') s.debug.showCamera = !s.debug.showCamera; if (l === 'v') s.debug.showExploration = !s.debug.showExploration;
    if (l === 'p') this.#togglePause();
    if (l === 'h' && s.level) { const next = s.level.player.characterVariant === 'default' ? 'stealth' : 'default'; s.level.player.characterVariant = next; this.#setMessage(`Player skin: ${next}`, 1); }
    if (l === 'm') { s.audio.muted = this.#audio.toggleMute(); this.#setMessage(s.audio.muted ? 'Muted' : 'Unmuted', 1); }
    const a = this.#audio.getState(); s.audio.currentTrack = a.currentKey; s.audio.muted = a.muted; this.#syncHud();
  }

  onKeyReleased(key, keyCode) { this.#input.onKeyReleased(key, keyCode); }
  onWindowBlur() { this.#input.reset?.(); if (this.#state.screen === SCREEN_STATES.PLAYING) this.#setMessage('Input reset', 0.6); this.#syncHud(); }
  onDomKeyDown(key, code) { this.#input.onDomKeyDown?.(key, code); }
  onDomKeyUp(key, code) { this.#input.onDomKeyUp?.(key, code); }

  onMouseWheel(delta, mouseX, mouseY) {
    if (this.#state.screen !== SCREEN_STATES.PLAYING || !this.#state.camera) return;
    const zoomDelta = delta > 0 ? -0.1 : 0.1, player = this.#state.level.player;
    const psx = (player.x + player.w / 2 - this.#state.camera.x) * this.#state.camera.zoom;
    const psy = (player.y + player.h / 2 - this.#state.camera.y) * this.#state.camera.zoom;
    this.#state.camera.changeZoom(zoomDelta, (mouseX >= 0 && mouseX <= this.#state.camera.width) ? mouseX : psx, (mouseY >= 0 && mouseY <= this.#state.camera.height) ? mouseY : psy);
  }

  onMousePressed(mouseX, mouseY, mouseButton, p) {
    if (this.#overlay.screenManager.handleMouse(this.#state.screen, mouseX, mouseY, p, this.#state, this.#getApi())) { this.#syncHud(); }
  }

  syncInputSnapshot(snapshot) { this.#input.syncMovementFromSnapshot?.(snapshot); }

  onResize(width, height) {
    this.#camera.resize(width, height);
    if (this.#state.level) this.#camera.configureBounds(this.#state.level.mapWidth, this.#state.level.mapHeight, this.#state.level.settings.baseTile);
    this.#state.camera = this.#camera;
  }

  getState() { return this.#state; }
}

export function createGameCore(options = {}) { return new GameCore(options); }
