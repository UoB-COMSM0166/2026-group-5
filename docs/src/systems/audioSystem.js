// Audio: track switching per screen state, mute toggle, user-gesture unlock.
// Track sources and gain values intentionally mirror the reference story audio script.
// Audio track definitions: file path, volume, and looping flag.
const TRACK_CONFIG = Object.freeze({
  start: { src: './assets/audio/startScreen.mp3', volume: 0.3, loop: true },
  intro: { src: './assets/audio/intro.mp3', volume: 0.25, loop: true },
  playing: { src: './assets/audio/gameplay.mp3', volume: 0.2, loop: true },
  playing_map1: { src: './assets/audio/mapFoyer.mp3', volume: 0.2, loop: true },
  playing_map2: { src: './assets/audio/mapLibrary.mp3', volume: 0.2, loop: true },
  playing_map3: { src: './assets/audio/mapSalon.mp3', volume: 0.2, loop: true },
  win: { src: './assets/audio/winScreen.mp3', volume: 0.28, loop: true },
  lose: { src: './assets/audio/loseScreen.mp3', volume: 0.3, loop: true },
  false_ending: { src: './assets/audio/intro.mp3', volume: 0.24, loop: true },
  true_ending: { src: './assets/audio/trueEnding.mp3', volume: 0.28, loop: true }
});

// Sound effects.
const SFX_CONFIG = Object.freeze({
  cursor: { src: './assets/audio/sfxCursor.wav', volume: 1, cooldownMs: 85 },
  select: { src: './assets/audio/sfxSelect.wav', volume: 1, cooldownMs: 120 },
  portal: { src: './assets/audio/sfxPortal.mp3', volume: 1, cooldownMs: 180 },
  treasure: { src: './assets/audio/sfxTreasure.mp3', volume: 1, cooldownMs: 200 },
  doorOpen: { src: './assets/audio/sfxDoorOpen.mp3', volume: 1, cooldownMs: 120 },
  doorClose: { src: './assets/audio/sfxDoorClose.mp3', volume: 1, cooldownMs: 120 },
  doorLocked: { src: './assets/audio/sfxDoorLocked.wav', volume: 1, cooldownMs: 160 },
  lightSwitch: { src: './assets/audio/sfxLightSwitch.wav', volume: 1, cooldownMs: 120 },
  alert: { src: './assets/audio/sfxAlert.mp3', volume: 1, cooldownMs: 220 },
  running: { src: './assets/audio/sfxRunning.mp3', volume: 0.9, cooldownMs: 0, loop: true },
  teleportIn: { src: './assets/audio/sfxTeleportIn.mp3', volume: 1, cooldownMs: 120 },
  teleportOut: { src: './assets/audio/sfxTeleportOut.mp3', volume: 1, cooldownMs: 120 }
});

// Mapping from screen state to the track key that should play.
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

const PLAYING_LEVEL_TRACK_MAP = Object.freeze({
  map1: 'playing_map1',
  map2: 'playing_map2',
  map3: 'playing_map3'
});

// Manages background music playback, muting, and screen-based track switching.
export class AudioSystem {
  #tracks;
  #sfx;
  #lastSfxAt;
  #activeLoopingSfx;
  #currentKey;
  #muted;
  #unlocked;

  // Initialise audio state; tracks are lazily loaded on first play.
  constructor() {
    this.#tracks = new Map();
    this.#sfx = new Map();
    this.#lastSfxAt = new Map();
    this.#activeLoopingSfx = new Set();
    this.#currentKey = null;
    this.#muted = false;
    this.#unlocked = false;
  }

  // returns the track key for a screen
  getTrackKeyForScreen(screenKey, levelId = null) {
    return this.#resolveTrackKey(screenKey, levelId);
  }

  // Resolve the track key to play for a given screen state
  #resolveTrackKey(screenKey, levelId = null) {
    const baseKey = SCREEN_TRACK_MAP[screenKey] || screenKey;
    if (baseKey !== 'playing') {
      return baseKey;
    }
    const mapKey = String(levelId || '').toLowerCase();
    return PLAYING_LEVEL_TRACK_MAP[mapKey] || 'playing';
  }

  // Lazily create an Audio element for a track key if not yet loaded.
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
    if (!config || this.#muted) {
      return 0;
    }
    return Math.max(0, Math.min(1, config.volume ?? 1));
  }

  // computes SFX volume
  #targetSfxVolume(key) {
    const config = SFX_CONFIG[key];
    if (!config || this.#muted) {
      return 0;
    }
    return Math.max(0, Math.min(1, config.volume ?? 1));
  }

  // create an audio element for an SFX key if not loaded
  #ensureSfx(key) {
    if (!SFX_CONFIG[key]) {
      return null;
    }
    if (this.#sfx.has(key)) {
      return this.#sfx.get(key);
    }
    try {
      const cfg = SFX_CONFIG[key];
      const audio = new Audio(cfg.src);
      audio.loop = !!cfg.loop;
      audio.preload = 'auto';
      audio.volume = 0;
      this.#sfx.set(key, audio);
      return audio;
    } catch {
      return null;
    }
  }

  // Resume the browser AudioContext to satisfy autoplay policies.
  unlock() { this.#unlocked = true; }

  // Stop the currently playing track and reset its position.
  stopAll() {
    for (const track of this.#tracks.values()) {
      try {
        track.pause();
        track.currentTime = 0;
        track.volume = 0;
      } catch {}
    }
    for (const clip of this.#sfx.values()) {
      try {
        clip.pause();
        clip.currentTime = 0;
        clip.volume = 0;
      } catch {}
    }
    this.#activeLoopingSfx.clear();
    this.#currentKey = null;
  }

  // play a one-shot sound effect by key with built-in anti-spam throttling
  playSfx(key, options = {}) {
    if (!this.#unlocked) {
      return false;
    }
    const cfg = SFX_CONFIG[key];
    if (!cfg) {
      return false;
    }
    const now = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
    const cooldownMs = Math.max(0, options.cooldownMs ?? cfg.cooldownMs ?? 0);
    const lastAt = this.#lastSfxAt.get(key) ?? -Infinity;
    if (now - lastAt < cooldownMs) {
      return false;
    }
    const clip = this.#ensureSfx(key);
    if (!clip) {
      return false;
    }
    this.#lastSfxAt.set(key, now);
    try {
      clip.pause();
      clip.currentTime = 0;
      clip.volume = this.#targetSfxVolume(key);
      const playback = clip.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }

  // play a one-shot SFX after a delay
  playSfxDelayed(key, delayMs = 0, options = {}) {
    const waitMs = Math.max(0, delayMs | 0);
    if (waitMs === 0) return this.playSfx(key, options);
    if (typeof setTimeout !== 'function') return this.playSfx(key, options);
    setTimeout(() => {
      this.playSfx(key, options);
    }, waitMs);
    return true;
  }

  // start/stop a looping SFX clip (used for continuous sounds like running)
  setLoopingSfx(key, active) {
    const cfg = SFX_CONFIG[key];
    if (!cfg) return false;
    const clip = this.#ensureSfx(key);
    if (!clip) return false;
    const shouldPlay = !!active && this.#unlocked;
    if (!shouldPlay) {
      this.#activeLoopingSfx.delete(key);
      try {
        clip.pause();
        clip.currentTime = 0;
        clip.loop = !!cfg.loop;
        clip.volume = this.#targetSfxVolume(key);
      } catch {}
      return true;
    }

    clip.loop = true;
    clip.volume = this.#targetSfxVolume(key);
    if (this.#activeLoopingSfx.has(key)) return true;
    this.#activeLoopingSfx.add(key);
    try {
      clip.currentTime = 0;
      const playback = clip.play();
      if (playback && typeof playback.catch === 'function') playback.catch(() => {
        this.#activeLoopingSfx.delete(key);
      });
      return true;
    } catch {
      this.#activeLoopingSfx.delete(key);
      return false;
    }
  }

  // Switch to the appropriate track for the given screen state.
  async sync(stateKey, levelId = null) {
    const trackKey = this.#resolveTrackKey(stateKey, levelId);
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

  // Toggle the muted state and update the active track volume.
  toggleMute() {
    this.#muted = !this.#muted;
    if (this.#currentKey) {
      const track = this.#ensureTrack(this.#currentKey);
      if (track) track.volume = this.#targetVolume(this.#currentKey);
    }
    for (const [key, clip] of this.#sfx.entries()) {
      try { clip.volume = this.#targetSfxVolume(key); } catch {}
    }
    return this.#muted;
  }

  // Explicitly set the muted flag and update the active track volume.
  setMuted(value) {
    this.#muted = !!value;
    if (this.#currentKey) {
      const track = this.#ensureTrack(this.#currentKey);
      if (track) track.volume = this.#targetVolume(this.#currentKey);
    }
    for (const [key, clip] of this.#sfx.entries()) {
      try { clip.volume = this.#targetSfxVolume(key); } catch {}
    }
  }

  // Return current audio state snapshot.
  getState() { return { currentKey: this.#currentKey, muted: this.#muted, unlocked: this.#unlocked }; }
}
