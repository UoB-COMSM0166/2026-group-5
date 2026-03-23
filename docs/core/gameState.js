// Screen state enum and initial game state factory.
export const SCREEN_STATES = Object.freeze({
  START: 'start',
  INTRO: 'intro',
  PLAYING: 'playing',
  PAUSE: 'pause',
  WIN: 'win',
  LOSE: 'lose'
});

export function createGameState() {
  return {
    screen: SCREEN_STATES.START,
    previousScreen: SCREEN_STATES.START,
    levelId: null,
    level: null,
    prompt: 'Press Enter to start',
    meta: {
      collected: 0,
      target: 0,
      startedAt: 0,
      detectedBy: null,
      elapsedMs: 0,
      objective: 'Collect all chests',
      exitDistanceText: '-'
    },
    ui: {
      message: '',
      messageTimer: 0,
      overlayAlpha: 0,
      flashAlpha: 0,
      vignette: 0.18
    },
    audio: {
      muted: false,
      unlocked: false,
      currentTrack: null
    },
    debug: {
      showCollision: false,
      showRooms: false,
      showLayers: false,
      showCamera: false
    },
    camera: null,
    loading: {
      ready: false,
      message: 'Loading assets...',
      error: ''
    }
  };
}
