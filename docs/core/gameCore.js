import { SCREEN_STATES, createGameState } from './gameState.js';
import { createInputSystem } from './inputSystem.js';
import { loadAssetsAsync, getAssetState } from './assetLoader.js';
import { bootstrapLegacyMaps, getMap } from '../maps/mapManager.js';
import { createRuntimeLevel } from '../maps/mapFactory.js';
import { updatePlayer, triggerPlayerAction } from '../systems/playerSystem.js';
import { getInteractionPrompt, tryInteract } from '../systems/interactionSystem.js';
import { updateNpcs } from '../systems/npcSystem.js';
import { renderScene } from '../render/renderSystem.js';
import { createAudioSystem } from '../systems/audioSystem.js';
import { createScreenOverlaySystem } from '../systems/screenOverlaySystem.js';
import { createCamera, configureCameraBounds, resizeCamera, updateCamera } from '../systems/cameraSystem.js';
import { handleStartScreenKey, resetStartScreen } from '../states/startScreen.js';
import { handleIntroScreenKey, resetIntroScreen } from '../states/introScreen.js';

function ensureRoomMatrices() {
  if (window.RoomMatrices) return;
  window.RoomMatrices = {
    map1: window.RoomLightCamera?.ROOM_MATRICES?.[1] || [],
    map2: window.RoomLightCamera?.ROOM_MATRICES?.[2] || [],
    map3: window.RoomLightCamera?.ROOM_MATRICES?.[3] || []
  };
}

export function createGameCore({ initialLevel = 'map2' } = {}) {
  const state = createGameState();
  const input = createInputSystem();
  const audio = createAudioSystem();
  const overlay = createScreenOverlaySystem();
  let currentLevelId = initialLevel;
  const camera = createCamera(960, 640);

  function syncHud() {
    document.getElementById('screenState')?.replaceChildren(document.createTextNode(state.screen));
    document.getElementById('levelName')?.replaceChildren(document.createTextNode(state.levelId || '-'));
    document.getElementById('promptText')?.replaceChildren(document.createTextNode(state.prompt || '-'));
    const assetState = getAssetState();
    document.getElementById('assetState')?.replaceChildren(document.createTextNode(`${assetState.imageCount}/${assetState.requestedCount}${assetState.failedCount ? ` fallback ${assetState.failedCount}` : ''}`));
  }

  function setMessage(text, seconds = 1.5) {
    state.ui.message = text;
    state.ui.messageTimer = seconds;
  }

  function markMissionStart() {
    state.meta.startedAt = performance.now();
  }

  function loadLevel(levelId) {
    const config = getMap(levelId);
    if (!config) throw new Error(`Unknown level: ${levelId}`);
    state.levelId = levelId;
    state.level = createRuntimeLevel(levelId, config);
    configureCameraBounds(camera, state.level.mapWidth, state.level.mapHeight, state.level.settings.baseTile);
    camera.x = 0;
    camera.y = 0;
    state.camera = camera;
    state.meta.collected = state.level.boxSystem.boxes.filter((box) => box.opened).length;
    state.meta.target = state.level.boxSystem.boxes.length;
    state.meta.detectedBy = null;
    state.meta.elapsedMs = 0;
    state.meta.startedAt = 0;
    state.meta.objective = state.level.missionSystem.getObjectiveText(state.meta.collected, state.meta.target);
    state.meta.exitDistanceText = state.level.missionSystem.isUnlocked() ? `${state.level.missionSystem.getDistanceToExit(state.level.player).toFixed(0)} px` : 'locked';
    state.prompt = 'Arrow Up / Down to choose, Enter to confirm';
    syncHud();
  }

  function setScreen(screen) {
    input.reset?.();
    state.previousScreen = state.screen;
    state.screen = screen;
    state.screenEnteredAt = performance.now();
    state.screenTimeMs = 0;
    if (screen === SCREEN_STATES.START) state.prompt = 'Arrow Up / Down to choose, Enter to confirm';
    if (screen === SCREEN_STATES.INTRO) state.prompt = 'Press Enter to skip';
    if (screen === SCREEN_STATES.PLAYING) state.prompt = 'Find the chests';
    if (screen === SCREEN_STATES.PAUSE) state.prompt = 'Paused';
    audio.sync(screen);
    const audioState = audio.getState();
    state.audio.currentTrack = audioState.currentKey;
    state.audio.muted = audioState.muted;
    syncHud();
  }

  function restartLevel() {
    loadLevel(currentLevelId);
    state.nearestLightButton = null;
    resetStartScreen();
    resetIntroScreen();
    setScreen(SCREEN_STATES.START);
    overlay.flash(state, 0.3);
  }

  function switchLevel(levelId) {
    currentLevelId = levelId;
    loadLevel(levelId);
    resetStartScreen();
    resetIntroScreen();
    setScreen(SCREEN_STATES.START);
    overlay.flash(state, 0.3);
  }

  function togglePause() {
    if (state.screen === SCREEN_STATES.PLAYING) setScreen(SCREEN_STATES.PAUSE);
    else if (state.screen === SCREEN_STATES.PAUSE) setScreen(SCREEN_STATES.PLAYING);
  }

  const api = { setScreen, setMessage, markMissionStart, restartLevel };

  function handleNonPlayingKey(key) {
    if (state.screen === SCREEN_STATES.START) return handleStartScreenKey(key, state, api);
    if (state.screen === SCREEN_STATES.INTRO) return handleIntroScreenKey(key, state, api);
    if (state.screen === SCREEN_STATES.WIN || state.screen === SCREEN_STATES.LOSE) {
      if (key.toLowerCase() === 'r' || key === 'Enter') {
        restartLevel();
        return true;
      }
    }
    return false;
  }

  return {
    async loadAssets(p) {
      state.loading.message = 'Loading assets...';
      try {
        const result = await loadAssetsAsync(p);
        state.loading.ready = true;
        state.loading.message = result.failedCount > 0 ? `Loaded with ${result.failedCount} fallback asset(s)` : 'Assets loaded';
      } catch (error) {
        state.loading.error = error?.message || String(error);
        throw error;
      }
      syncHud();
    },
    setup() {
      bootstrapLegacyMaps();
      ensureRoomMatrices();
      loadLevel(currentLevelId);
      resetStartScreen();
      resetIntroScreen();
      setScreen(SCREEN_STATES.START);
      setMessage('Ready.', 1.2);
    },
    update(deltaTime) {
      state.screenTimeMs = performance.now() - state.screenEnteredAt;
      overlay.update(state, deltaTime);
      if (state.ui.messageTimer > 0) {
        state.ui.messageTimer -= deltaTime;
        if (state.ui.messageTimer <= 0) state.ui.message = '';
      }

      if (state.screen !== SCREEN_STATES.PLAYING) {
        syncHud();
        return;
      }

      state.meta.elapsedMs = Math.max(0, performance.now() - state.meta.startedAt);
      updatePlayer(state.level.player, input.getMovement(), state.level, deltaTime);
      if (state.camera) updateCamera(state.camera, state.level.player, deltaTime);
      state.level.doorSystem.update(deltaTime);
      state.level.boxSystem.update(deltaTime);
      state.level.roomSystem.update(deltaTime);
      state.level.missionSystem.update(deltaTime);

      const detectedBy = updateNpcs(state.level, deltaTime);
      if (detectedBy) {
        triggerPlayerAction(state.level.player, 'alert', 0.32);
        state.meta.detectedBy = detectedBy;
        setScreen(SCREEN_STATES.LOSE);
        overlay.flash(state, 0.45);
        setMessage('You were spotted', 2);
        syncHud();
        return;
      }

      state.meta.objective = state.level.missionSystem.getObjectiveText(state.meta.collected, state.meta.target);
      state.meta.exitDistanceText = state.level.missionSystem.isUnlocked() ? `${state.level.missionSystem.getDistanceToExit(state.level.player).toFixed(0)} px` : 'locked';

      const prompt = getInteractionPrompt(state.level);
      state.nearestLightButton = prompt?.type === 'light' ? prompt.entity : null;
      state.prompt = prompt?.text || (state.level.missionSystem.isUnlocked() ? 'Head to extraction' : 'Find the chests');
      if (input.consumeInteract()) {
        const result = tryInteract(state.level);
        if (result.success) {
          triggerPlayerAction(state.level.player, result.kind === 'light' ? 'alert' : 'interact', result.kind === 'light' ? 0.22 : 0.28);
          setMessage(result.text, 1.2);
          overlay.flash(state, result.kind === 'light' ? 0.12 : 0.18);
        }
        if (result.success && result.kind === 'exit') {
          setScreen(SCREEN_STATES.WIN);
          overlay.flash(state, 0.28);
          setMessage('Extraction confirmed', 1.4);
          syncHud();
          return;
        }
        if (result.success && result.kind === 'light') {
          const roomId = result.entity?.roomId;
          if (roomId) setMessage(state.level.roomSystem.isLit(roomId) ? `Room ${roomId} restored` : `Room ${roomId} darkened`, 1.3);
        }
        if (result.success && result.kind === 'door') setMessage(result.entity.open ? 'Door opened' : 'Door closed', 1);
        if (result.success && result.kind === 'box') {
          state.meta.collected = state.level.boxSystem.boxes.filter((box) => box.opened).length;
          if (state.meta.collected >= state.meta.target && state.meta.target > 0 && !state.level.missionSystem.isUnlocked()) {
            state.level.missionSystem.unlock();
            state.meta.objective = state.level.missionSystem.getObjectiveText(state.meta.collected, state.meta.target);
            state.prompt = 'Extraction unlocked';
            setMessage('All chests secured. Reach extraction.', 2);
            overlay.flash(state, 0.26);
          }
        }
      }
      syncHud();
    },
    render(p) {
      renderScene(p, state, overlay);
    },
    onKeyPressed(key, keyCode) {
      audio.unlock();
      const handledByScreen = handleNonPlayingKey(key);
      if (handledByScreen) {
        const audioState = audio.getState();
        state.audio.currentTrack = audioState.currentKey;
        state.audio.muted = audioState.muted;
        syncHud();
        return;
      }
      input.onKeyPressed(key, keyCode);
      const lower = String(key).toLowerCase();
      if (keyCode === 27) togglePause();
      if (lower === 'r') restartLevel();
      if (lower === '1') switchLevel('map1');
      if (lower === '2') switchLevel('map2');
      if (lower === '3') switchLevel('map3');
      if (lower === 'b') state.debug.showRooms = !state.debug.showRooms;
      if (lower === 'c') state.debug.showCollision = !state.debug.showCollision;
      if (lower === 'v') state.debug.showVision = !state.debug.showVision;
      if (lower === 'g') state.debug.showCamera = !state.debug.showCamera;
      if (lower === 'p') togglePause();
      if (lower === 'h' && state.level) {
        const next = state.level.player.characterVariant === 'default' ? 'stealth' : 'default';
        state.level.player.characterVariant = next;
        setMessage(`Player skin: ${next}`, 1);
      }
      if (lower === 'm') {
        state.audio.muted = audio.toggleMute();
        setMessage(state.audio.muted ? 'Muted' : 'Unmuted', 1);
      }
      const audioState = audio.getState();
      state.audio.currentTrack = audioState.currentKey;
      state.audio.muted = audioState.muted;
      syncHud();
    },
    onKeyReleased(key, keyCode) {
      input.onKeyReleased(key, keyCode);
    },
    onWindowBlur() {
      input.reset?.();
      if (state.screen === SCREEN_STATES.PLAYING) setMessage('Input reset', 0.6);
      syncHud();
    },

    onDomKeyDown(key, code) {
      input.onDomKeyDown?.(key, code);
    },
    onDomKeyUp(key, code) {
      input.onDomKeyUp?.(key, code);
    },

    syncInputSnapshot(snapshot) {
      input.syncMovementFromSnapshot?.(snapshot);
    },
    onResize(width, height) {
      resizeCamera(camera, width, height);
      if (state.level) configureCameraBounds(camera, state.level.mapWidth, state.level.mapHeight, state.level.settings.baseTile);
      state.camera = camera;
    },
    switchLevel,
    restartLevel,
    getState() { return state; }
  };
}
