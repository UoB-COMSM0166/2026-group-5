// Game core: main loop, screen transitions, level loading, input dispatch.
import { SCREEN_STATES, GameState } from './gameState.js';
import { InputSystem } from './inputSystem.js';
import { loadAssetsAsync, getAssetState } from './assetLoader.js';
import { bootstrapLegacyMaps, getMap } from '../maps/mapManager.js';
import { Level } from '../maps/mapFactory.js';
import { updatePlayer, triggerPlayerAction } from '../systems/playerSystem.js';
import { getInteractionPrompt, tryInteract } from '../systems/interactionSystem.js';
import { updateNpcs, handlePlayerPortalTeleport } from '../systems/npcSystem.js';
import { renderScene } from '../render/renderSystem.js';
import { AudioSystem } from '../systems/audioSystem.js';
import { ScreenOverlaySystem } from '../systems/screenOverlaySystem.js';
import { Camera } from '../systems/cameraSystem.js';
import { Inventory, collectLoot, countTotalKeys, countTotalNotes, getKeyDisplayName } from '../systems/lootTable.js';
import { spawnLootPopup, clearLootPopups } from '../systems/lootPopup.js';

const MENU_NAV_SCREENS = new Set([
  SCREEN_STATES.START,
  SCREEN_STATES.PLAYTHROUGH_SELECT,
  SCREEN_STATES.DIFFICULTY_SELECT,
  SCREEN_STATES.MAP_SELECT,
  SCREEN_STATES.PAUSE
]);
const MENU_NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S']);
const MENU_CONFIRM_KEYS = new Set(['Enter', 'e', 'E']);
const DOOR_STATE_OPEN = 'OPEN';
const DOOR_STATE_CLOSED = 'CLOSED';
const DOOR_STATE_LOCKED = 'LOCKED';
const TELEPORT_OUT_DELAY_MS = 80;
const PASSAGE_KEY_ID = 'key_exit';
const PASSAGE_KEY_PROMPT = 'Passage Key found. The exit is unlocked!';
const PASSAGE_KEY_PROMPT_DURATION = 2.6;
const NOTE_COLLECTED_PROMPT = 'Note collected. Press Esc to pause and read it.';
const NOTE_COLLECTED_PROMPT_DURATION = 4;
const NOTE_COLLECTED_PROMPT_ICON = './assets/images/ui/controls/key_Esc.png';
const EXTRACTION_UNLOCKED_PROMPT = 'All chests found. Time to escape!';
const EXTRACTION_UNLOCKED_PROMPT_DURATION = 2;

// Main game controller: owns state, input, audio, overlay, and orchestrates the game loop.
export class GameCore {
  #state;
  #input;
  #audio;
  #overlay;
  #currentLevelId;
  #camera;
  #introAnimation;
  #hudSyncTimer;
  #frameCount;
  #lastFpsTime;
  #lastChasingNpcIds;
  #levelDirty;

  // Bootstrap subsystems and set the starting level.
  constructor({ initialLevel = 'map2' } = {}) {
    this.#state = new GameState();
    this.#input = new InputSystem();
    this.#audio = new AudioSystem();
    this.#overlay = new ScreenOverlaySystem();
    this.#currentLevelId = initialLevel;
    this.#camera = new Camera(960, 640);
    this.#introAnimation = null; // { active, startX, startY, endY, tileSize, speed, progress }
    this.#hudSyncTimer = 0;
    this.#frameCount = 0;
    this.#lastFpsTime = 0;
    this.#lastChasingNpcIds = new Set();
    this.#levelDirty = false;
  }

  // Push current state values into the DOM HUD elements (throttled to reduce DOM operations).
  #syncHud(deltaTime = 0) {
    // Only sync HUD every 100ms (10 times per second) to reduce DOM operations
    this.#hudSyncTimer -= deltaTime;
    if (this.#hudSyncTimer > 0) return;
    this.#hudSyncTimer = 0.1; // 100ms throttle

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

  #setMessage(text, seconds = 1.5, iconPath = null) {
    this.#state.ui.messageQueue = [];
    this.#state.ui.message = text;
    this.#state.ui.messageTimer = seconds;
    this.#state.ui.messageIcon = iconPath;
  }
  #queueMessage(text, seconds = 1.5, iconPath = null) {
    this.#state.ui.messageQueue ??= [];
    this.#state.ui.messageQueue.push({ text, seconds, iconPath });
  }
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
    s.prompt = 'Arrow Up / Down or W / S to choose, Enter / E to confirm';
    this.#lastChasingNpcIds.clear();
    this.#syncHud();
  }

  // Transition to a new screen: reset input, update timers, sync audio.
  #setScreen(screen) {
    this.#input.reset?.();
    if (screen !== SCREEN_STATES.PLAYING) {
      this.#audio.setLoopingSfx('running', false);
      this.#lastChasingNpcIds.clear();
    }
    const s = this.#state;
    const wasPlaying = s.screen === SCREEN_STATES.PLAYING;
    const wasPause = s.screen === SCREEN_STATES.PAUSE;
    // Mark level dirty when leaving PLAYING/PAUSE for a non-game screen (win/lose/exit/endings)
    if (wasPlaying && screen !== SCREEN_STATES.PAUSE) {
      this.#levelDirty = true;
    }
    if (wasPause && screen !== SCREEN_STATES.PLAYING) {
      this.#levelDirty = true;
    }
    // Auto-reload level when entering PLAYING from a dirty state (not a resume from pause)
    if (screen === SCREEN_STATES.PLAYING && !wasPause && this.#levelDirty) {
      this.#loadLevel(this.#currentLevelId);
      this.#levelDirty = false;
    }
    s.previousScreen = s.screen; s.screen = screen; s.screenEnteredAt = performance.now(); s.screenTimeMs = 0;
    s.prompt = this.#overlay.screenManager.getPrompt(screen);
    this.#overlay.screenManager.reset(screen, s);
    this.#audio.sync(screen, s.levelId);
    const audioState = this.#audio.getState();
    s.audio.currentTrack = this.#audio.getTrackKeyForScreen(screen, s.levelId);
    s.audio.muted = audioState.muted;
    // Start intro animation when entering PLAYING from non-PLAYING screen (initial start)
    // Skip animation when resuming from pause (wasPause)
    if (screen === SCREEN_STATES.PLAYING && !wasPlaying && !wasPause) {
      this.#startIntroAnimation();
    }
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
    this.#resetStorySelection();
    this.#overlay.flash(this.#state, 0.3);
  }

  // Restart the current level (reload without changing the level).
  restartCurrentStoryRun() {
    // Reload the current level that the player is on
    this.#loadLevel(this.#currentLevelId);
    this.#state.nearestLightButton = null;
    this.#markMissionStart();
    this.#startIntroAnimation();
    this.#setScreen(SCREEN_STATES.PLAYING);
    this.#overlay.flash(this.#state, 0.3);
  }

  // Start intro animation for map2 and map3: player walks from col 3 row 1 to row 3
  #startIntroAnimation() {
    const levelId = this.#currentLevelId;
    if (levelId !== 'map2' && levelId !== 'map3') {
      this.#introAnimation = null;
      return;
    }
    const tileSize = this.#state.level.settings.baseTile;
    // Column 3 (0-indexed: 2), Row 1 (0-indexed: 0) to Row 3 (0-indexed: 2)
    const startCol = 2;
    const startRow = 0;
    const endRow = 2;
    this.#introAnimation = {
      active: true,
      startX: startCol * tileSize,
      startY: startRow * tileSize,
      endY: endRow * tileSize,
      tileSize,
      speed: 64, // pixels per second (32px / 0.5s = 64px/s)
      progress: 0
    };
    // Force player to starting position immediately
    const player = this.#state.level.player;
    player.x = this.#introAnimation.startX;
    player.y = this.#introAnimation.startY;
    player.facing = 'down';
    player.moving = false;
  }

  // Update intro animation, return true if still animating
  #updateIntroAnimation(deltaTime) {
    if (!this.#introAnimation?.active) return false;
    const anim = this.#introAnimation;
    const player = this.#state.level.player;
    const distance = anim.endY - anim.startY;
    anim.progress += anim.speed * deltaTime;
    if (anim.progress >= Math.abs(distance)) {
      // Animation complete
      player.y = anim.endY;
      player.moving = false;
      this.#introAnimation = null;
      return false;
    }
    // Still animating
    player.y = anim.startY + (distance > 0 ? anim.progress : -anim.progress);
    player.facing = 'down';
    player.moving = true;
    player.characterType = 'player';
    // Force animation frame for walking
    const walkFrame = Math.floor((Date.now() % 400) / 100) % 4;
    player.anim = {
      mode: 'walk',
      facing: 'down',
      frame: walkFrame,
      modeTimer: 0,
      variant: player.characterVariant || 'default',
      bob: 0
    };
    return true;
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
    this.#audio.sync(this.#state.screen, this.#state.levelId);
    this.#state.audio.currentTrack = this.#audio.getTrackKeyForScreen(this.#state.screen, this.#state.levelId);
    this.#state.audio.muted = this.#audio.getState().muted;
  }

  // play SFX for menu navigation and non-playing screen interactions
  #playNonPlayingKeySfx(key, screen) {
    if (MENU_NAV_KEYS.has(key) && MENU_NAV_SCREENS.has(screen)) {
      this.#audio.playSfx('cursor');
      return;
    }
    if (MENU_CONFIRM_KEYS.has(key)) this.#audio.playSfx('select');
  }

  // maps player interactions to SFX
  #playInteractionSfx(result) {
    if (!result) return;
    if (result.kind === 'box' && result.success) {
      this.#audio.playSfx('treasure');
      return;
    }
    if (result.kind === 'light' && result.success) {
      this.#audio.playSfx('lightSwitch');
      return;
    }
    if (result.kind !== 'door') return;
    if (result.success) {
      if (result.text === 'Door closed') this.#audio.playSfx('doorClose');
      else this.#audio.playSfx('doorOpen');
      return;
    }
    if (String(result.text || '').startsWith('Need key')) this.#audio.playSfx('doorLocked');
  }

  // get a key used to match door before/after states
  #getDoorSnapshotKey(door, index) {
    return `${door?.id || 'door'}#${index}`;
  }

  // capture the open/closed state of all doors in the level
  #snapshotDoorStates(level) {
    const snapshot = new Map();
    const doors = level?.doorSystem?.doors || [];
    for (let i = 0; i < doors.length; i += 1) {
      const door = doors[i];
      snapshot.set(this.#getDoorSnapshotKey(door, i), door?.state);
    }
    return snapshot;
  }

  // capture room light boolean states in the level
  #snapshotRoomLightStates(level) {
    const snapshot = new Map();
    const rooms = level?.roomSystem?.rooms;
    if (!rooms || typeof rooms.entries !== 'function') return snapshot;
    for (const [roomId, room] of rooms.entries()) {
      snapshot.set(roomId, !!room?.lightOn);
    }
    return snapshot;
  }

  // compares pre/post snapshots after NPC update and plays enemy-triggered SFX
  #playEnemyWorldInteractionSfx(level, doorBefore, roomLightBefore) {
    let shouldPlayDoorOpen = false;
    let shouldPlayDoorClose = false;
    let shouldPlayLightSwitch = false;

    const doors = level?.doorSystem?.doors || [];
    for (let i = 0; i < doors.length; i += 1) {
      const door = doors[i];
      const key = this.#getDoorSnapshotKey(door, i);
      const prevState = doorBefore.get(key);
      const nextState = door?.state;
      if (!prevState || prevState === nextState) continue;
      if (prevState !== DOOR_STATE_OPEN && nextState === DOOR_STATE_OPEN) shouldPlayDoorOpen = true;
      if (prevState === DOOR_STATE_OPEN && (nextState === DOOR_STATE_CLOSED || nextState === DOOR_STATE_LOCKED)) shouldPlayDoorClose = true;
    }

    const rooms = level?.roomSystem?.rooms;
    if (rooms && typeof rooms.entries === 'function') {
      for (const [roomId, room] of rooms.entries()) {
        if (!roomLightBefore.has(roomId)) continue;
        const prevLightOn = roomLightBefore.get(roomId);
        const nextLightOn = !!room?.lightOn;
        if (prevLightOn !== nextLightOn) {
          shouldPlayLightSwitch = true;
          break;
        }
      }
    }

    if (shouldPlayDoorOpen) this.#audio.playSfx('doorOpen');
    if (shouldPlayDoorClose) this.#audio.playSfx('doorClose');
    if (shouldPlayLightSwitch) this.#audio.playSfx('lightSwitch');
  }

  // update running-loop SFX based on current movement/sprint conditions
  #syncRunningSfx(movement, player) {
    const hasMoveInput = Math.abs(movement?.x || 0) > 0.001 || Math.abs(movement?.y || 0) > 0.001;
    const isRunningActive = Boolean(
      movement?.sprint
      && hasMoveInput
      && player?.moving
      && (player?.stamina || 0) > 0
    );
    this.#audio.setLoopingSfx('running', isRunningActive);
  }

  #getCurrentChasingNpcIds(level) {
    const ids = new Set();
    for (const npc of level?.npcs || []) {
      if (npc?.state !== 'CHASE') continue;
      ids.add(String(npc.id || ''));
    }
    return ids;
  }

  #playAlertOnNewNpcChase(level) {
    const currentChasingNpcIds = this.#getCurrentChasingNpcIds(level);
    let hasNewChaser = false;
    for (const id of currentChasingNpcIds) {
      if (!this.#lastChasingNpcIds.has(id)) {
        hasNewChaser = true;
        break;
      }
    }
    if (hasNewChaser) this.#audio.playSfx('alert');
    this.#lastChasingNpcIds = currentChasingNpcIds;
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
  // Optional onProgress callback receives { completed, total, path } updates.
  async loadAssets(p, onProgress) {
    this.#state.loading.message = 'Loading assets...';
    try {
      const r = await loadAssetsAsync(p, onProgress);
      this.#state.loading.ready = true;
      this.#state.loading.message = r.failedCount > 0 ? `Loaded with ${r.failedCount} fallback asset(s)` : 'Assets loaded';
    }
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
    if (s.screen !== SCREEN_STATES.PLAYING) { this.#audio.setLoopingSfx('running', false); this.#syncHud(deltaTime); return; }
    s.meta.elapsedMs = Math.max(0, performance.now() - s.meta.startedAt);
    // Handle intro animation (blocks player input during animation)
    const isInIntro = this.#updateIntroAnimation(deltaTime);
    const movement = this.#input.getMovement();
    if (!isInIntro) {
      updatePlayer(s.level.player, movement, s.level, deltaTime);
    }
    this.#syncRunningSfx(movement, s.level.player);
    if (this.#input.consumePortalPlace()) {
      const placement = s.level.portalSystem?.tryPlaceInFront?.(s.level.player, s.level);
      if (placement?.success) this.#audio.playSfx('portal');
    }
    const teleportResult = s.level.portalSystem?.updatePlayerTeleport?.(s.level.player, s.level, deltaTime);
    if (teleportResult?.teleported) {
      this.#audio.playSfx('teleportIn');
      this.#audio.playSfxDelayed('teleportOut', TELEPORT_OUT_DELAY_MS);
      handlePlayerPortalTeleport(s.level, teleportResult);
    }
    if (s.camera) s.camera.update(s.level.player, deltaTime);
    const roomSystem = s.level.roomSystem;
    if (roomSystem.getActorRoomId(s.level.player) > 1) {
      const enteredRoomId = roomSystem.getActorRoomId(s.level.player);
      const firstVisit = roomSystem.explorePlayerRoom(s.level.player);
      if (firstVisit && enteredRoomId === 5 && s.levelId === 'map1') {
        this.#setMessage('Highlighted items are interactive.', 2.5);
      }
    }
    s.level.doorSystem.update(deltaTime, [s.level.player, ...(s.level.npcs || [])]);
    s.level.boxSystem.update(deltaTime); s.level.roomSystem.update(deltaTime); s.level.missionSystem.update(deltaTime);
    const npcDoorStatesBefore = this.#snapshotDoorStates(s.level);
    const npcRoomLightsBefore = this.#snapshotRoomLightStates(s.level);
    const detectedBy = updateNpcs(s.level, deltaTime);
    this.#playAlertOnNewNpcChase(s.level);
    this.#playEnemyWorldInteractionSfx(s.level, npcDoorStatesBefore, npcRoomLightsBefore);
    if (detectedBy) {
      triggerPlayerAction(s.level.player, 'alert', 0.32); s.meta.detectedBy = detectedBy;
      this.#setScreen(SCREEN_STATES.LOSE); this.#overlay.flash(s, 0.45); this.#setMessage('You were spotted', 2);
      this.#syncHud(deltaTime); return;
    }
    s.meta.objective = s.level.missionSystem.getObjectiveText(s.meta.collected, s.meta.target);
    s.meta.exitDistanceText = s.level.missionSystem.isUnlocked() ? `${s.level.missionSystem.getDistanceToExit(s.level.player).toFixed(0)} px` : 'locked';
    const prompt = getInteractionPrompt(s.level);
    s.nearestLightButton = prompt?.type === 'light' ? prompt.entity : null;
    s.prompt = prompt?.text || (s.level.missionSystem.isUnlocked() ? 'Head to extraction' : 'Find the chests');
    if (this.#input.consumeInteract()) {
      const r = tryInteract(s.level, s.inventory);
      this.#playInteractionSfx(r);
      if (r.success) {
        triggerPlayerAction(s.level.player, r.kind === 'light' ? 'alert' : 'interact', r.kind === 'light' ? 0.22 : 0.28);
        if (r.text && r.kind !== 'light' && r.kind !== 'door' && r.kind !== 'box' && r.kind !== 'exit') {
          this.#setMessage(r.text, 1.2);
        }
        this.#overlay.flash(s, r.kind === 'light' ? 0.12 : 0.18);
      } else if (r.text) this.#setMessage(r.text, 1);
      if (r.success && r.kind === 'exit') {
        if (s.story.normalMode) {
          this.#setScreen(SCREEN_STATES.WIN);
          this.#setMessage('Mission complete', 1.4);
        } else if (s.levelId === 'map1') {
          // Map1 story mode ends with false ending (leads to second playthrough)
          this.#setScreen(SCREEN_STATES.FALSE_ENDING);
          this.#setMessage('A strange ending has been reached', 1.4);
        } else {
          // Map2 and Map3 story mode end with true ending
          this.#setScreen(SCREEN_STATES.TRUE_ENDING);
          this.#setMessage('The real ending is unfolding', 1.4);
        }
        this.#overlay.flash(s, 0.28);
        this.#syncHud(deltaTime);
        return;
      }
      if (r.success && r.kind === 'door') {
        // Map1 win condition: unlocking door_3 (key_exit) wins the game
        if (s.levelId === 'map1' && r.entity?.id === 'door_3') {
          if (s.story.normalMode) {
            this.#setScreen(SCREEN_STATES.WIN);
            this.#setMessage('Mission complete', 1.4);
          } else {
            // Map1 story mode always ends with false ending (leads to second playthrough)
            this.#setScreen(SCREEN_STATES.FALSE_ENDING);
            this.#setMessage('A strange ending has been reached', 1.4);
          }
          this.#overlay.flash(s, 0.28);
          this.#syncHud(deltaTime);
          return;
        }
        // Map2 win condition: unlocking door_K (key_exit) wins the game
        if (s.levelId === 'map2' && r.entity?.id === 'door_K') {
          if (s.story.normalMode) {
            this.#setScreen(SCREEN_STATES.WIN);
            this.#setMessage('Mission complete', 1.4);
          } else {
            // Map2 in story mode always ends with true ending
            this.#setScreen(SCREEN_STATES.TRUE_ENDING);
            this.#setMessage('The real ending is unfolding', 1.4);
          }
          this.#overlay.flash(s, 0.28);
          this.#syncHud(deltaTime);
          return;
        }
        // Map3 win condition: unlocking door_J (key_exit) wins the game
        if (s.levelId === 'map3' && r.entity?.id === 'door_J') {
          if (s.story.normalMode) {
            this.#setScreen(SCREEN_STATES.WIN);
            this.#setMessage('Mission complete', 1.4);
          } else {
            // Map3 in story mode always ends with true ending
            this.#setScreen(SCREEN_STATES.TRUE_ENDING);
            this.#setMessage('The real ending is unfolding', 1.4);
          }
          this.#overlay.flash(s, 0.28);
          this.#syncHud(deltaTime);
          return;
        }
      }
      if (r.success && r.kind === 'box') {
        const loot = collectLoot(s.inventory, r.entity.id, s.levelId);
        let collectedLoot = null;
        if (loot) {
          collectedLoot = loot;
          const tile = s.level.settings.baseTile;
          const bx = r.entity.x * tile + ((r.entity.renderOffsetX || 0) + (r.entity.renderW || r.entity.w) / 2) * tile;
          const by = r.entity.y * tile + (r.entity.renderOffsetY || 0) * tile;
          const keyLabel = loot.keyId ? getKeyDisplayName(s.levelId, loot.keyId) : null;
          const lootText = keyLabel || loot.label;
          spawnLootPopup(loot.id, bx, by, tile, loot.keyId, keyLabel);
          const isPassageKey = loot.keyId === PASSAGE_KEY_ID;
          const message = loot.id === 'note'
            ? NOTE_COLLECTED_PROMPT
            : isPassageKey
              ? PASSAGE_KEY_PROMPT
              : `Found: ${lootText}`;
          this.#setMessage(
            message,
            loot.id === 'note'
              ? NOTE_COLLECTED_PROMPT_DURATION
              : isPassageKey
                ? PASSAGE_KEY_PROMPT_DURATION
                : 1.5,
            loot.id === 'note' ? NOTE_COLLECTED_PROMPT_ICON : null
          );
        }
        s.meta.collected = s.level.boxSystem.boxes.filter(b => b.opened).length;
        if (s.meta.collected >= s.meta.target && s.meta.target > 0 && !s.level.missionSystem.isUnlocked()) {
          s.level.missionSystem.unlock(); s.meta.objective = s.level.missionSystem.getObjectiveText(s.meta.collected, s.meta.target);
          s.prompt = 'Extraction unlocked';
          if (collectedLoot?.id === 'note' || collectedLoot?.keyId === PASSAGE_KEY_ID) {
            this.#queueMessage(EXTRACTION_UNLOCKED_PROMPT, EXTRACTION_UNLOCKED_PROMPT_DURATION);
          } else {
            this.#setMessage(EXTRACTION_UNLOCKED_PROMPT, EXTRACTION_UNLOCKED_PROMPT_DURATION);
          }
          this.#overlay.flash(s, 0.26);
        }
      }
    }
    this.#syncHud(deltaTime);
  }

  // Render the current frame via the render system.
  render(p) { renderScene(p, this.#state, this.#overlay); }

  // Handle a key-down event: dispatch to screens or input system.
  onKeyPressed(key, keyCode) {
    this.#ensureAudioReadyForCurrentScreen();
    const s = this.#state;
    if (this.#handleNonPlayingKey(key)) {
      this.#playNonPlayingKeySfx(key, s.screen);
      const a = this.#audio.getState(); this.#state.audio.currentTrack = a.currentKey; this.#state.audio.muted = a.muted; this.#syncHud(); return;
    }
    this.#input.onKeyPressed(key, keyCode);
    if ((keyCode === 27 || keyCode === 'Escape' || key === 'Escape') && s.screen === SCREEN_STATES.PLAYING) {
      this.#togglePause();
      return;
    }
    const a = this.#audio.getState(); s.audio.currentTrack = a.currentKey; s.audio.muted = a.muted; this.#syncHud();
  }

  onKeyReleased(key, keyCode) {
    this.#input.onKeyReleased(key, keyCode);
    // Forward to screen manager for screens that need key release (e.g., tutorial skip)
    if (this.#state.screen !== SCREEN_STATES.PLAYING) {
      this.#overlay.screenManager.handleKeyUp(this.#state.screen, key, this.#state, this.#getApi());
    }
  }
  onWindowBlur() { this.#input.reset?.(); this.#syncHud(); }
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
