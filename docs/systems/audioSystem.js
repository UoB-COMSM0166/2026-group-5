const TRACK_CONFIG = {
  start: { src: './assets/audio/startScreen.mp3', volume: 0.3, loop: true },
  intro: { src: './assets/audio/startScreen.mp3', volume: 0.25, loop: true },
  playing: { src: './assets/audio/gameplay.mp3', fallback: './assets/audio/gameplay.wav', volume: 0.2, loop: true },
  win: { src: './assets/audio/winScreen.mp3', fallback: './assets/audio/winScreen.wav', volume: 0.28, loop: true },
  lose: { src: './assets/audio/loseScreen.mp3', volume: 0.3, loop: true },
  pause: { src: './assets/audio/startScreen.mp3', volume: 0.12, loop: true }
};

export function createAudioSystem() {
  const tracks = new Map();
  let currentKey = null;
  let muted = false;
  let unlocked = false;

  function ensureTrack(key) {
    if (!TRACK_CONFIG[key]) return null;
    if (tracks.has(key)) return tracks.get(key);
    try {
      const cfg = TRACK_CONFIG[key];
      const audio = new Audio(cfg.src);
      audio.loop = cfg.loop ?? true;
      audio.preload = 'auto';
      audio.volume = 0;
      audio.onerror = () => {
        if (cfg.fallback) audio.src = cfg.fallback;
      };
      tracks.set(key, audio);
      return audio;
    } catch {
      return null;
    }
  }

  function targetVolume(key) {
    const config = TRACK_CONFIG[key];
    if (!config || muted) return 0;
    return Math.max(0, Math.min(1, config.volume ?? 1));
  }

  function stopAll() {
    for (const track of tracks.values()) {
      try {
        track.pause();
        track.currentTime = 0;
        track.volume = 0;
      } catch {}
    }
    currentKey = null;
  }

  async function sync(stateKey) {
    if (!unlocked || currentKey === stateKey) return;
    const next = ensureTrack(stateKey);
    if (!next) {
      stopAll();
      currentKey = stateKey;
      return;
    }
    for (const [key, track] of tracks.entries()) {
      if (key !== stateKey) {
        try { track.pause(); track.currentTime = 0; track.volume = 0; } catch {}
      }
    }
    try {
      next.volume = targetVolume(stateKey);
      next.currentTime = 0;
      await next.play();
      currentKey = stateKey;
    } catch {
      currentKey = stateKey;
    }
  }

  return {
    unlock() { unlocked = true; },
    sync,
    toggleMute() {
      muted = !muted;
      if (currentKey) {
        const track = ensureTrack(currentKey);
        if (track) track.volume = targetVolume(currentKey);
      }
      return muted;
    },
    setMuted(value) { muted = !!value; },
    stopAll,
    getState() { return { currentKey, muted, unlocked }; }
  };
}
