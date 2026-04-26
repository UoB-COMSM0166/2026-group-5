// Screen state enum and central GameState class holding all runtime game data.
import { Inventory } from '../systems/lootTable.js';

// All possible screen/state identifiers the game can be in.
export const SCREEN_STATES = Object.freeze({
  START: 'start',
  PLAYTHROUGH_SELECT: 'playthrough_select',
  DIFFICULTY_SELECT: 'difficulty_select',
  INTRO: 'intro',
  TUTORIAL: 'tutorial',
  MAP_SELECT: 'map_select',
  PLAYING: 'playing',
  PAUSE: 'pause',
  FALSE_ENDING: 'false_ending',
  TRUE_ENDING: 'true_ending',
  WIN: 'win',
  LOSE: 'lose',
  CREDITS: 'credits'
});

// Centralised game state: tracks screen, level, inventory, UI, audio, and story progress.
export class GameState {
  #screen;
  #previousScreen;
  #levelId;
  #level;
  #prompt;
  #meta;
  #ui;
  #audio;
  #inventory;
  #camera;
  #loading;
  #story;
  #screenEnteredAt;
  #screenTimeMs;
  #nearestLightButton;

  // Initialise every state field to its default starting value.
  constructor() {
    this.#screen = SCREEN_STATES.START;
    this.#previousScreen = SCREEN_STATES.START;
    this.#levelId = null;
    this.#level = null;
    this.#prompt = 'Press Enter / E to start';
    this.#meta = {
      collected: 0,
      target: 0,
      startedAt: 0,
      detectedBy: null,
      elapsedMs: 0,
      objective: 'Collect all chests',
      exitDistanceText: '-',
      levelSession: 0
    };
    this.#ui = {
      message: '',
      messageTimer: 0,
      messageIcon: null,
      messageQueue: [],
      overlayAlpha: 0,
      flashAlpha: 0,
      tutorial: {
        pageIndex: 0,
        turnDir: 0,
        turnT: 0,
        turning: false
      },
      pause: {
        view: 'menu',
        menuIndex: 0,
        notesIndex: 0,
        selectedNoteId: null
      }
    };
    this.#audio = {
      muted: false,
      unlocked: false,
      currentTrack: null
    };
    this.#inventory = new Inventory();
    this.#camera = null;
    this.#loading = {
      ready: false,
      message: 'Loading assets...',
      error: ''
    };
    this.#story = {
      currentPlaythrough: 1,
      secondPlaythroughUnlocked: false,
      selectedRoute: null,
      introVariant: 'first'
    };
    this.#screenEnteredAt = 0;
    this.#screenTimeMs = 0;
    this.#nearestLightButton = null;
  }

  get screen() { return this.#screen; }
  set screen(v) { this.#screen = v; }
  get previousScreen() { return this.#previousScreen; }
  set previousScreen(v) { this.#previousScreen = v; }
  get levelId() { return this.#levelId; }
  set levelId(v) { this.#levelId = v; }
  get level() { return this.#level; }
  set level(v) { this.#level = v; }
  get prompt() { return this.#prompt; }
  set prompt(v) { this.#prompt = v; }
  get meta() { return this.#meta; }
  set meta(v) { this.#meta = v; }
  get ui() { return this.#ui; }
  set ui(v) { this.#ui = v; }
  get audio() { return this.#audio; }
  set audio(v) { this.#audio = v; }
  get inventory() { return this.#inventory; }
  set inventory(v) { this.#inventory = v; }
  get camera() { return this.#camera; }
  set camera(v) { this.#camera = v; }
  get loading() { return this.#loading; }
  set loading(v) { this.#loading = v; }
  get story() { return this.#story; }
  set story(v) { this.#story = v; }
  get screenEnteredAt() { return this.#screenEnteredAt; }
  set screenEnteredAt(v) { this.#screenEnteredAt = v; }
  get screenTimeMs() { return this.#screenTimeMs; }
  set screenTimeMs(v) { this.#screenTimeMs = v; }
  get nearestLightButton() { return this.#nearestLightButton; }
  set nearestLightButton(v) { this.#nearestLightButton = v; }
}

// Factory wrapper for backward compatibility.
export function createGameState() {
  return new GameState();
}
