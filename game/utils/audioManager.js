const TRACK_CONFIG = {
  start: {
    src: "./assets/audio/startScreen.mp3",
    volume: 0.3,
    loop: true
  },
  intro: {
    src: "./assets/audio/startScreen.mp3",
    volume: 0.3,
    loop: true
  },
  //playing: {
    //src: "./assets/audio/gameplay.mp3",
    //volume: 0.28,
    //loop: true
  //},
  //win: {
    //src: "./assets/audio/winScreen.mp3",
    //volume: 0.32,
    //loop: true
  //},
  lose: {
    src: "./assets/audio/loseScreen.mp3",
    volume: 0.35,
    loop: true
  }
};

const tracks = {};
let audioUnlocked = false;
let currentState = null;
let currentTrack = null;
let fadeFrame = null;
let muted = false;
let masterVolume = 1;

for (const [state, config] of Object.entries(TRACK_CONFIG)) {
  const audio = new Audio(config.src);
  audio.loop = config.loop ?? true;
  audio.preload = "auto";
  audio.volume = 0;
  tracks[state] = audio;
}

function getTargetVolume(state) {
  const config = TRACK_CONFIG[state];
  if (!config) return 0;
  if (muted) return 0;
  return (config.volume ?? 1) * masterVolume;
}

function cancelFade() {
  if (fadeFrame !== null) {
    cancelAnimationFrame(fadeFrame);
    fadeFrame = null;
  }
}

function setTrackVolume(track, volume) {
  track.volume = Math.max(0, Math.min(1, volume));
}

function stopTrack(track, resetTime = true) {
  if (!track) return;
  track.pause();
  if (resetTime) track.currentTime = 0;
  setTrackVolume(track, 0);
}

function fadeTrack(track, from, to, duration = 500, onComplete = null) {
  cancelFade();

  const startTime = performance.now();
  setTrackVolume(track, from);

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const volume = from + (to - from) * progress;

    setTrackVolume(track, volume);

    if (progress < 1) {
      fadeFrame = requestAnimationFrame(step);
    } else {
      fadeFrame = null;
      if (onComplete) onComplete();
    }
  }

  fadeFrame = requestAnimationFrame(step);
}

async function playTrackForState(state, fadeDuration = 500) {
  const nextTrack = tracks[state];

  if (!nextTrack) {
    if (currentTrack) {
      const oldTrack = currentTrack;
      currentTrack = null;
      currentState = state;

      fadeTrack(oldTrack, oldTrack.volume, 0, fadeDuration, () => {
        stopTrack(oldTrack);
      });
    } else {
      currentState = state;
    }
    return;
  }

  if (currentTrack === nextTrack) {
    currentState = state;
    return;
  }

  const previousTrack = currentTrack;
  const targetVolume = getTargetVolume(state);

  // Stop previous track immediately to avoid stacked playback
  if (previousTrack) {
    stopTrack(previousTrack);
  }

  currentTrack = nextTrack;
  currentState = state;

  try {
    nextTrack.currentTime = 0;
    setTrackVolume(nextTrack, 0);
    await nextTrack.play();
  } catch (err) {
    console.log("Audio play blocked or failed:", err);
    return;
  }

  fadeTrack(nextTrack, 0, targetVolume, fadeDuration);
}

export function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
}

export function syncStateAudio(state, options = {}) {
  const { fadeDuration = 500 } = options;

  if (!audioUnlocked) return;
  if (currentState === state && currentTrack === tracks[state]) return;

  playTrackForState(state, fadeDuration);
}

export function stopAllAudio() {
  cancelFade();

  for (const track of Object.values(tracks)) {
    stopTrack(track);
  }

  currentTrack = null;
  currentState = null;
}

export function setMuted(value) {
  muted = Boolean(value);

  if (currentTrack && currentState) {
    const targetVolume = getTargetVolume(currentState);
    setTrackVolume(currentTrack, targetVolume);
  }
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

export function setMasterVolume(value) {
  masterVolume = Math.max(0, Math.min(1, value));

  if (currentTrack && currentState && !muted) {
    const targetVolume = getTargetVolume(currentState);
    setTrackVolume(currentTrack, targetVolume);
  }
}

export function setStateTrackVolume(state, value) {
  if (!TRACK_CONFIG[state]) return;
  TRACK_CONFIG[state].volume = Math.max(0, Math.min(1, value));

  if (currentState === state && currentTrack && !muted) {
    const targetVolume = getTargetVolume(state);
    setTrackVolume(currentTrack, targetVolume);
  }
}

export function getAudioDebugState() {
  return {
    audioUnlocked,
    currentState,
    muted,
    masterVolume
  };
}