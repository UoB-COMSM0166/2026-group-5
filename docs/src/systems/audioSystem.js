// Audio: track switching per screen state, mute toggle, user-gesture unlock.
// Track sources and gain values intentionally mirror the reference story audio script.
const TRACK_CONFIG = Object.freeze({
  start: { src: './assets/audio/startScreen.mp3', volume: 0.3, loop: true },
  intro: { src: './assets/audio/intro.mp3', volume: 0.25, loop: true },
  playing: { src: './assets/audio/gameplay.mp3', fallback: './assets/audio/gameplay.wav', volume: 0.2, loop: true },
  win: { src: './assets/audio/winScreen.mp3', fallback: './assets/audio/winScreen.wav', volume: 0.28, loop: true },
  lose: { src: './assets/audio/loseScreen.mp3', volume: 0.3, loop: true },
  false_ending: { src: './assets/audio/intro.mp3', volume: 0.24, loop: true },
  true_ending: { src: './assets/audio/intro.mp3', volume: 0.28, loop: true }
});

const SCREEN_TRACK_MAP = Object.freeze({
  start: 'start',
  playthrough_select: 'start',
  intro: 'intro',
  tutorial: 'intro',
  map_select: 'start',
  playing: 'playing',
  pause: 'playing',
  false_ending: 'false_ending',
  true_ending: 'true_ending',
  win: 'win',
  lose: 'lose',
  credits: 'true_ending'
});

export class AudioSystem {
  #tracks;
  #currentKey;
  #muted;
  #unlocked;

  constructor() {
    this.#tracks = new Map();
    this.#currentKey = null;
    this.#muted = false;
    this.#unlocked = false;
  }

  getTrackKeyForScreen(screenKey) {
    return this.#resolveTrackKey(screenKey);
  }

  #resolveTrackKey(screenKey) {
    return SCREEN_TRACK_MAP[screenKey] || screenKey;
  }

  #ensureTrack(key) {
    if (!TRACK_CONFIG[key]) return null;
    if (this.#tracks.has(key)) return this.#tracks.get(key);
    try {
      const cfg = TRACK_CONFIG[key];
      const audio = new Audio(cfg.src);
      audio.loop = cfg.loop ?? true;
      audio.preload = 'auto';
      audio.volume = 0;
      audio.onerror = () => {
        if (cfg.fallback) audio.src = cfg.fallback;
      };
      this.#tracks.set(key, audio);
      return audio;
    } catch {
      return null;
    }
  }

  #targetVolume(key) {
    const config = TRACK_CONFIG[key];
    if (!config || this.#muted) return 0;
    return Math.max(0, Math.min(1, config.volume ?? 1));
  }

  unlock() { this.#unlocked = true; }

  stopAll() {
    for (const track of this.#tracks.values()) {
      try {
        track.pause();
        track.currentTime = 0;
        track.volume = 0;
      } catch {}
    }
    this.#currentKey = null;
  }

  async sync(stateKey) {
    const trackKey = this.#resolveTrackKey(stateKey);
    if (!this.#unlocked || this.#currentKey === trackKey) return;
    const next = this.#ensureTrack(trackKey);
    if (!next) {
      this.stopAll();
      this.#currentKey = trackKey;
      return;
    }
    for (const [key, track] of this.#tracks.entries()) {
      if (key !== trackKey) {
        try { track.pause(); track.currentTime = 0; track.volume = 0; } catch {}
      }
    }
    this.#currentKey = trackKey;
    try {
      next.volume = this.#targetVolume(trackKey);
      next.currentTime = 0;
      await next.play();
    } catch {
      // Keep the desired track key even if playback is blocked or falls back silently.
    }
  }

  toggleMute() {
    this.#muted = !this.#muted;
    if (this.#currentKey) {
      const track = this.#ensureTrack(this.#currentKey);
      if (track) track.volume = this.#targetVolume(this.#currentKey);
    }
    return this.#muted;
  }

  setMuted(value) {
    this.#muted = !!value;
    if (this.#currentKey) {
      const track = this.#ensureTrack(this.#currentKey);
      if (track) track.volume = this.#targetVolume(this.#currentKey);
    }
  }

  getState() { return { currentKey: this.#currentKey, muted: this.#muted, unlocked: this.#unlocked }; }
}
