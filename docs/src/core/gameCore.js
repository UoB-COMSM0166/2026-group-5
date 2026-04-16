// Game core: main loop, screen transitions, level loading, input dispatch.
import { SCREEN_STATES, GameState } from './gameState.js';
import { InputSystem } from './inputSystem.js';
import { loadAssetsAsync, getAssetState } from './assetLoader.js';
import { bootstrapLegacyMaps, getMap } from '../maps/mapManager.js';
import { Level } from '../maps/mapFactory.js';
import { updatePlayer, triggerPlayerAction } from '../systems/playerSystem.js';
import { getInteractionPrompt, tryInteract } from '../systems/interactionSystem.js';
import { updateNpcs } from '../systems/npcSystem.js';
import { renderScene } from '../render/renderSystem.js';
import { AudioSystem } from '../systems/audioSystem.js';
import { ScreenOverlaySystem } from '../systems/screenOverlaySystem.js';
import { Camera } from '../systems/cameraSystem.js';
import { Inventory, collectLoot, countTotalKeys, countTotalNotes } from '../systems/lootTable.js';
import { spawnLootPopup, clearLootPopups } from '../systems/lootPopup.js';

// Main game controller: owns state, input, audio, overlay, and orchestrates the game loop.
export class GameCore {
  #state;
  #input;
  #audio;
  #overlay;
  #currentLevelId;
  #camera;

  // Bootstrap subsystems and set the starting level.
  constructor({ initialLevel = 'map2' } = {}) {
    this.#state = new GameState();
    this.#input = new InputSystem();
    this.#audio = new AudioSystem();
    this.#overlay = new ScreenOverlaySystem();
    this.#currentLevelId = initialLevel;
    this.#camera = new Camera(960, 640);
  }

  // Push current state values into the DOM HUD elements.
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
    if (noteCountEl) noteCountEl.textContent = `${s.inventory.note}/${countTotalNotes(s.levelId)}`;
  }

  #setMessage(text, seconds = 1.5) { this.#state.ui.message = text; this.#state.ui.messageTimer = seconds; }
  #markMissionStart() { this.#state.meta.startedAt = performance.now(); }
  #resetStorySelection() {
    this.#state.story.currentPlaythrough = 1;
    this.#state.story.selectedRoute = null;
    this.#state.story.introVariant = 'first';
  }

  // Instantiate a Level from the map registry and reset camera, meta, and inventory.
  #loadLevel(levelId) {
    clearLootPopups();
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

  // Transition to a new screen: reset input, update timers, sync audio.
  #setScreen(screen) {
    this.#input.reset?.();
    const s = this.#state;
    s.previousScreen = s.screen; s.screen = screen; s.screenEnteredAt = performance.now(); s.screenTimeMs = 0;
    s.prompt = this.#overlay.screenManager.getPrompt(screen);
    this.#overlay.screenManager.reset(screen, s);
    this.#audio.sync(screen);
    const audioState = this.#audio.getState();
    s.audio.currentTrack = this.#audio.getTrackKeyForScreen(screen);
    s.audio.muted = audioState.muted;
    this.#syncHud();
  }

  // Full restart: reload level, clear story selection, return to start screen.
  restartLevel() {
    this.#loadLevel(this.#currentLevelId);
    this.#state.nearestLightButton = null;
    this.#resetStorySelection();
    this.#setScreen(SCREEN_STATES.START);
    this.#overlay.flash(this.#state, 0.3);
  }

  // Switch to a different level and reset to the start screen.
  switchLevel(levelId) {
    this.#currentLevelId = levelId;
    this.#loadLevel(levelId);
    this.#setScreen(SCREEN_STATES.START);
    this.#overlay.flash(this.#state, 0.3);
  }

  // Load a level for story mode without changing the current screen.
  loadStoryLevel(levelId) {
    this.#currentLevelId = levelId;
    this.#loadLevel(levelId);
    this.#state.nearestLightButton = null;
    this.#overlay.flash(this.#state, 0.3);
  }

  // Restart the current level (reload without changing the level).
  restartCurrentStoryRun() {
    // Reload the current level that the player is on
    this.#loadLevel(this.#currentLevelId);
    this.#state.nearestLightButton = null;
    this.#markMissionStart();
    this.#setScreen(SCREEN_STATES.PLAYING);
    this.#overlay.flash(this.#state, 0.3);
  }

  // Unpause and return to the playing screen.
  resumeGame() {
    this.#state.ui.pause.view = 'menu';
    this.#setScreen(SCREEN_STATES.PLAYING);
  }

  // Leave the current game and go back to the title screen.
  exitToTitle() {
    this.#resetStorySelection();
    this.#setScreen(SCREEN_STATES.START);
    this.#setMessage('Returned to title', 1.0);
  }

  // Go back to the playthrough select screen (for normal mode after win).
  exitToPlaythroughSelect() {
    this.#setScreen(SCREEN_STATES.PLAYTHROUGH_SELECT);
    this.#setMessage('Select a level', 1.0);
  }

  // Go back to the difficulty select screen (for normal mode after win).
  exitToDifficultySelect() {
    this.#setScreen(SCREEN_STATES.DIFFICULTY_SELECT);
    this.#setMessage('Select difficulty', 1.0);
  }

  // Toggle between playing and paused states.
  #togglePause() {
    if (this.#state.screen === SCREEN_STATES.PLAYING) this.#setScreen(SCREEN_STATES.PAUSE);
    else if (this.#state.screen === SCREEN_STATES.PAUSE) this.resumeGame();
  }

  // Unlock browser audio context if needed and sync track to current screen.
  #ensureAudioReadyForCurrentScreen() {
    const audioState = this.#audio.getState();
    if (audioState.unlocked) return;

    this.#audio.unlock();
    this.#audio.sync(this.#state.screen);
    this.#state.audio.currentTrack = this.#audio.getTrackKeyForScreen(this.#state.screen);
    this.#state.audio.muted = this.#audio.getState().muted;
  }

  // Build an API object exposing safe public actions for screen handlers.
  #getApi() {
    return {
      setScreen: s => this.#setScreen(s),
      setMessage: (t, s) => this.#setMessage(t, s),
      markMissionStart: () => this.#markMissionStart(),
      restartLevel: () => this.restartLevel(),
      restartCurrentStoryRun: () => this.restartCurrentStoryRun(),
      resumeGame: () => this.resumeGame(),
      exitToTitle: () => this.exitToTitle(),
      exitToPlaythroughSelect: () => this.exitToPlaythroughSelect(),
      exitToDifficultySelect: () => this.exitToDifficultySelect(),
      loadStoryLevel: (levelId) => this.loadStoryLevel(levelId)
    };
  }

  // Delegate key input to the overlay screen manager for non-playing screens.
  #handleNonPlayingKey(key) {
    return this.#overlay.screenManager.handleKey(this.#state.screen, key, this.#state, this.#getApi());
  }

  // Load all image and audio assets, updating the loading state.
  async loadAssets(p) {
    this.#state.loading.message = 'Loading assets...';
    try { const r = await loadAssetsAsync(p); this.#state.loading.ready = true; this.#state.loading.message = r.failedCount > 0 ? `Loaded with ${r.failedCount} fallback asset(s)` : 'Assets loaded'; }
    catch (e) { this.#state.loading.error = e?.message || String(e); throw e; }
    this.#syncHud();
  }

  // Bootstrap legacy maps, load the initial level, and show the start screen.
  setup() {
    const v = bootstrapLegacyMaps();
    if (v.length) throw new Error(`Legacy map bootstrap failed: ${v.map(e => `${e.levelId}: ${e.issues.join(', ')}`).join(' | ')}`);
    this.#loadLevel(this.#currentLevelId);
    this.#setScreen(SCREEN_STATES.START);
    this.#setMessage('Ready.', 1.2);
  }

  // Main per-frame update: advance screen time, update systems, check win/lose.
  update(deltaTime) {
    const s = this.#state;
    s.dt = deltaTime;
    s.screenTimeMs = performance.now() - s.screenEnteredAt;
    this.#overlay.update(s, deltaTime, this.#getApi());
    if (s.ui.messageTimer > 0) { s.ui.messageTimer -= deltaTime; if (s.ui.messageTimer <= 0) s.ui.message = ''; }
    if (s.screen !== SCREEN_STATES.PLAYING) { this.#syncHud(); return; }
    s.meta.elapsedMs = Math.max(0, performance.now() - s.meta.startedAt);
    updatePlayer(s.level.player, this.#input.getMovement(), s.level, deltaTime);
    if (this.#input.consumePortalPlace()) {
      s.level.portalSystem?.tryPlaceInFront?.(s.level.player, s.level);
    }
    s.level.portalSystem?.updatePlayerTeleport?.(s.level.player, s.level, deltaTime);
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
      if (r.success && r.kind === 'exit') {
        if (s.story.normalMode) {
          this.#setScreen(SCREEN_STATES.WIN);
          this.#setMessage('Mission complete', 1.4);
        } else if (s.story.currentPlaythrough === 1) {
          this.#setScreen(SCREEN_STATES.FALSE_ENDING);
          this.#setMessage('A strange ending has been reached', 1.4);
        } else {
          this.#setScreen(SCREEN_STATES.TRUE_ENDING);
          this.#setMessage('The real ending is unfolding', 1.4);
        }
        this.#overlay.flash(s, 0.28);
        this.#syncHud();
        return;
      }
      if (r.success && r.kind === 'light') { const roomId = r.entity?.roomId; if (roomId) this.#setMessage(s.level.roomSystem.isLit(roomId) ? `Room ${roomId} restored` : `Room ${roomId} darkened`, 1.3); }
      if (r.success && r.kind === 'door') {
        this.#setMessage(r.text, 1);
        // Map1 win condition: unlocking door_3 (key_exit) wins the game
        if (s.levelId === 'map1' && r.entity?.id === 'door_3') {
          if (s.story.normalMode) {
            this.#setScreen(SCREEN_STATES.WIN);
            this.#setMessage('Mission complete', 1.4);
          } else if (s.story.currentPlaythrough === 1) {
            this.#setScreen(SCREEN_STATES.FALSE_ENDING);
            this.#setMessage('A strange ending has been reached', 1.4);
          } else {
            this.#setScreen(SCREEN_STATES.TRUE_ENDING);
            this.#setMessage('The real ending is unfolding', 1.4);
          }
          this.#overlay.flash(s, 0.28);
          this.#syncHud();
          return;
        }
        // Map2 win condition: unlocking door_K (key_exit) wins the game
        if (s.levelId === 'map2' && r.entity?.id === 'door_K') {
          if (s.story.normalMode) {
            this.#setScreen(SCREEN_STATES.WIN);
            this.#setMessage('Mission complete', 1.4);
          } else if (s.story.currentPlaythrough === 1) {
            this.#setScreen(SCREEN_STATES.FALSE_ENDING);
            this.#setMessage('A strange ending has been reached', 1.4);
          } else {
            this.#setScreen(SCREEN_STATES.TRUE_ENDING);
            this.#setMessage('The real ending is unfolding', 1.4);
          }
          this.#overlay.flash(s, 0.28);
          this.#syncHud();
          return;
        }
        // Map3 win condition: unlocking door_J (key_exit) wins the game
        if (s.levelId === 'map3' && r.entity?.id === 'door_J') {
          if (s.story.normalMode) {
            this.#setScreen(SCREEN_STATES.WIN);
            this.#setMessage('Mission complete', 1.4);
          } else if (s.story.currentPlaythrough === 1) {
            this.#setScreen(SCREEN_STATES.FALSE_ENDING);
            this.#setMessage('A strange ending has been reached', 1.4);
          } else {
            this.#setScreen(SCREEN_STATES.TRUE_ENDING);
            this.#setMessage('The real ending is unfolding', 1.4);
          }
          this.#overlay.flash(s, 0.28);
          this.#syncHud();
          return;
        }
      }
      if (r.success && r.kind === 'box') {
        const loot = collectLoot(s.inventory, r.entity.id, s.levelId);
        if (loot) {
          const tile = s.level.settings.baseTile;
          const bx = r.entity.x * tile + ((r.entity.renderOffsetX || 0) + (r.entity.renderW || r.entity.w) / 2) * tile;
          const by = r.entity.y * tile + (r.entity.renderOffsetY || 0) * tile;
          spawnLootPopup(loot.id, bx, by, tile, loot.keyId);
          const lootText = loot.keyId ? `${loot.label} (${loot.keyId})` : loot.label;
          this.#setMessage(`Found: ${lootText}`, 1.5);
        }
        s.meta.collected = s.level.boxSystem.boxes.filter(b => b.opened).length;
        if (s.meta.collected >= s.meta.target && s.meta.target > 0 && !s.level.missionSystem.isUnlocked()) {
          s.level.missionSystem.unlock(); s.meta.objective = s.level.missionSystem.getObjectiveText(s.meta.collected, s.meta.target);
          s.prompt = 'Extraction unlocked'; this.#setMessage('All chests secured. Reach extraction.', 2); this.#overlay.flash(s, 0.26);
        }
      }
    }
    this.#syncHud();
  }

  // Render the current frame via the render system.
  render(p) { renderScene(p, this.#state, this.#overlay); }

  // Handle a key-down event: dispatch to screens or input system.
  onKeyPressed(key, keyCode) {
    this.#ensureAudioReadyForCurrentScreen();
    if (this.#handleNonPlayingKey(key)) { const a = this.#audio.getState(); this.#state.audio.currentTrack = a.currentKey; this.#state.audio.muted = a.muted; this.#syncHud(); return; }
    this.#input.onKeyPressed(key, keyCode);
    const l = String(key).toLowerCase(), s = this.#state;
    if (keyCode === 27 && s.screen === SCREEN_STATES.PLAYING) { this.#togglePause(); return; }
    // if (l === 'r' && s.screen === SCREEN_STATES.PLAYING) { this.restartCurrentStoryRun(); return; }
    // if (l === '1') this.switchLevel('map1'); if (l === '2') this.switchLevel('map2'); if (l === '3') this.switchLevel('map3');
    if (l === 'b') s.debug.showRooms = !s.debug.showRooms;
    if (l === 'c') s.debug.showCollision = !s.debug.showCollision;
    if (l === 'g') s.debug.showCamera = !s.debug.showCamera;
    if (l === 'v') s.debug.showExploration = !s.debug.showExploration;
    if (l === 'i') { s.debug.showEntityIds = !s.debug.showEntityIds; this.#setMessage(s.debug.showEntityIds ? 'Entity IDs: ON' : 'Entity IDs: OFF', 1); }
    // if (l === 'h' && s.level) { const next = s.level.player.characterVariant === 'default' ? 'stealth' : 'default'; s.level.player.characterVariant = next; this.#setMessage(`Player skin: ${next}`, 1); }
    // if (l === 'm') { s.audio.muted = this.#audio.toggleMute(); this.#setMessage(s.audio.muted ? 'Muted' : 'Unmuted', 1); }
    const a = this.#audio.getState(); s.audio.currentTrack = a.currentKey; s.audio.muted = a.muted; this.#syncHud();
  }

  onKeyReleased(key, keyCode) {
    this.#input.onKeyReleased(key, keyCode);
    // Forward to screen manager for screens that need key release (e.g., tutorial skip)
    if (this.#state.screen !== SCREEN_STATES.PLAYING) {
      this.#overlay.screenManager.handleKeyUp(this.#state.screen, key, this.#state, this.#getApi());
    }
  }
  onWindowBlur() { this.#input.reset?.(); if (this.#state.screen === SCREEN_STATES.PLAYING) this.#setMessage('Input reset', 0.6); this.#syncHud(); }
  onDomKeyDown(key, code) { this.#input.onDomKeyDown?.(key, code); }
  onDomKeyUp(key, code) { this.#input.onDomKeyUp?.(key, code); }

  // Zoom the camera on mouse wheel during gameplay.
  onMouseWheel(delta, mouseX, mouseY) {
    if (this.#state.screen !== SCREEN_STATES.PLAYING || !this.#state.camera) return;
    const zoomDelta = delta > 0 ? -0.1 : 0.1, player = this.#state.level.player;
    const psx = (player.x + player.w / 2 - this.#state.camera.x) * this.#state.camera.zoom;
    const psy = (player.y + player.h / 2 - this.#state.camera.y) * this.#state.camera.zoom;
    this.#state.camera.changeZoom(zoomDelta, (mouseX >= 0 && mouseX <= this.#state.camera.width) ? mouseX : psx, (mouseY >= 0 && mouseY <= this.#state.camera.height) ? mouseY : psy);
  }

  // Forward mouse clicks to the current screen handler.
  onMousePressed(mouseX, mouseY, mouseButton, p) {
    this.#ensureAudioReadyForCurrentScreen();
    if (this.#overlay.screenManager.handleMouse(this.#state.screen, mouseX, mouseY, p, this.#state, this.#getApi())) { this.#syncHud(); }
  }

  syncInputSnapshot(snapshot) { this.#input.syncMovementFromSnapshot?.(snapshot); }

  // Reconfigure camera dimensions on canvas resize.
  onResize(width, height) {
    this.#camera.resize(width, height);
    if (this.#state.level) this.#camera.configureBounds(this.#state.level.mapWidth, this.#state.level.mapHeight, this.#state.level.settings.baseTile);
    this.#state.camera = this.#camera;
  }

  getState() { return this.#state; }
}

// Factory wrapper for creating a GameCore instance.
export function createGameCore(options = {}) { return new GameCore(options); }
