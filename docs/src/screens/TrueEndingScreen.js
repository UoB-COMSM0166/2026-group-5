// True ending: timed cutscene sequence followed by transition to credits.
import { Screen } from './Screen.js';
import { getImage } from '../core/assetLoader.js';
import { SCREEN_STATES } from '../core/gameState.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx, sy, centerX } from '../utils/screenLayout.js';
import { drawPanelImage } from '../utils/cutsceneDraw.js';
import { clamp, fadeWindow } from '../utils/animation.js';
import { TRUE_ENDING_ASSETS, TRUE_ENDING_VIDEO_ASSETS } from './storyAssetCatalog.js';
import { CutscenePlaybackController } from './CutscenePlaybackController.js';

const KNIGHT_TEXT_COLOR = '#ff5c7a';
const TEXT_SCENE_BASE_MS = 1600;
const TEXT_MS_PER_LETTER = 90;
const TEXT_ONLY_EXTRA_MS = 300;
const TEXT_WITH_IMAGE_EXTRA_MS = 900;
const MAX_READING_DURATION_MS = 10500;
const TYPEWRITER_START_DELAY_MS = 450;
const TYPEWRITER_MS_PER_CHARACTER = 55;
const VISUAL_READY_PROGRESS = 0.35;
const REVEALED_IMAGE_PROGRESS = 0.35;

const SCENE_DEFINITIONS = Object.freeze([
  { minDuration: 3200, text: 'You are here' },
  { duration: 3200, images: ['scene1'] },
  { minDuration: 3600, text: 'I have been waiting for a while' },
  { duration: 3200, images: ['scene2'] },
  { minDuration: 5600, text: 'I knew you would find your way to me.', images: ['scene3'] },
  {
    minDuration: 6800,
    text: 'Through every gate, every shadow,\nevery lie this castle raised against you.',
    images: ['scene4']
  },
  { minDuration: 5600, text: 'Then you deserve to see what lies beneath it.', images: ['scene5'] },
  {
    minDuration: 7200,
    text: 'The Core is the hidden heart of this kingdom...\na power that sees the future before it unfolds.',
    images: ['scene6']
  },
  {
    minDuration: 6800,
    text: 'With it, no war, no betrayal, no weakness \nwould ever take us by surprise again.',
    images: ['scene7']
  },
  { minDuration: 3000, text: 'The dragon?' },
  { duration: 3400, images: ['scene8'] },
  {
    minDuration: 7200,
    text: 'It was made part of the seal, bound here \nso this power would never answer to one will alone.',
    images: ['scene9']
  },
  { minDuration: 3600, text: 'And now, at last, it is within our reach.' },
  { minDuration: 5200, text: 'Stand with me, and let us claim that future\ntogether.' },
  { duration: 5200, images: ['scene10'], imageMaxW: 900, imageMaxH: 430 },
  { minDuration: 3600, text: 'I am grateful for your offer', color: KNIGHT_TEXT_COLOR },
  {
    minDuration: 5600,
    text: 'but I came to save you,',
    color: KNIGHT_TEXT_COLOR,
    images: ['scene11'],
    imageMaxW: 680,
    imageMaxH: 300
  },
  { minDuration: 4200, text: 'not to place the world in chains.', color: KNIGHT_TEXT_COLOR },
  { duration: 3600, images: ['scene12'], imageMaxW: 760, imageMaxH: 360 },
  { duration: 1600, effect: 'whiteFlash' },
  { duration: 3400, images: ['scene13'], imageMaxW: 520, imageMaxH: 380 },
  {
    minDuration: 5600,
    text: 'I would rather prefer an uncertain dawn \nthan a chained tomorrow.',
    color: KNIGHT_TEXT_COLOR
  },
  {
    minDuration: 6200,
    text: 'We were never meant to be certain.',
    images: ['scene14a', 'scene14b']
  },
  { duration: 4200, images: ['scene15'], imageMaxW: 860, imageMaxH: 340 },
  {
    minDuration: 6200,
    text: 'To live is to doubt, to fail, and to choose again',
    images: ['scene16'],
    imageMaxW: 700,
    imageMaxH: 300
  },
  {
    minDuration: 5200,
    text: 'That is not weakness.',
    images: ['scene17'],
    imageMaxW: 620,
    imageMaxH: 260
  },
  { duration: 3600, images: ['scene18'], imageMaxW: 760, imageMaxH: 360 },
  {
    minDuration: 5600,
    text: 'That is freedom.',
    images: ['scene19'],
    imageMaxW: 760,
    imageMaxH: 340
  },
  { minDuration: 5200, text: 'And together, it is how we build a better tomorrow.' },
  { duration: 4600, images: ['scene20'], imageMaxW: 760, imageMaxH: 360 },
  { duration: 9000, video: 'finalFlight', hold: true, imageMaxW: 760, imageMaxH: 380 }
].map(applyReadableDuration));

const SCENES = createTimedScenes(SCENE_DEFINITIONS);

let endingVideo = null;
let endingVideoSceneStart = null;

function applyReadableDuration(scene) {
  if (!scene.text || scene.duration) return Object.freeze(scene);

  const letterCount = String(scene.text).replace(/[^A-Za-z0-9]/g, '').length;
  const extraMs = scene.images ? TEXT_WITH_IMAGE_EXTRA_MS : TEXT_ONLY_EXTRA_MS;
  const readableDuration = TEXT_SCENE_BASE_MS + letterCount * TEXT_MS_PER_LETTER + extraMs;
  const duration = Math.min(
    scene.maxDuration ?? MAX_READING_DURATION_MS,
    Math.max(scene.minDuration ?? 0, Math.round(readableDuration))
  );
  const { minDuration, maxDuration, ...timedScene } = scene;
  return Object.freeze({ ...timedScene, duration });
}

export class TrueEndingScreen extends Screen {
  #cutscene;

  constructor() {
    super('true_ending', 'Press Enter / E to advance');
    this.#cutscene = new CutscenePlaybackController();
  }

  reset() {
    this.#cutscene.reset();
    stopEndingVideo(true);
    getEndingVideo();
  }

  update(state, deltaTime, api) {
    this.#cutscene.continueIfComplete(state, api, SCENES, {
      onFinished: (nextState, nextApi) => this.#finishEnding(nextState, nextApi)
    });
  }

  handleKey(key, state, api) {
    return this.#cutscene.handleEnter(key, state, api, SCENES, {
      ...this.#getCutsceneOptions(),
      onFinished: (nextState, nextApi) => this.#finishEnding(nextState, nextApi)
    });
  }

  render(p, state) {
    const rawElapsed = state.screenTimeMs ?? 0;
    if (this.#cutscene.resetForFreshStart(rawElapsed)) {
      stopEndingVideo(true);
    }

    const elapsed = this.#cutscene.getElapsed(rawElapsed);
    const layout = getLayout(p);
    const assets = getAssets();
    const scene = getActiveScene(SCENES, elapsed);
    const progress = getSceneProgress(scene, elapsed);
    const revealedScenes = this.#cutscene.revealedScenes;
    const cutsceneOptions = this.#getCutsceneOptions();

    p.push();
    p.background(0);
    drawScene(p, layout, scene, elapsed, progress, assets, revealedScenes);
    drawHud(p, layout, elapsed, this.#cutscene.getPrompt(SCENES, scene, elapsed, progress, cutsceneOptions));
    p.pop();

    state.prompt = this.#cutscene.getPrompt(SCENES, scene, elapsed, progress, cutsceneOptions);
  }

  #getCutsceneOptions() {
    return {
      getProgress: getSceneProgress,
      hasText: hasSceneText,
      hasVisual: hasSceneImage,
      isSingleImageOnly: isSingleImageOnlyScene,
      isTextRevealed: (scene, elapsed, progress, revealedScenes) => (
        isSceneTextFullyShown(scene, elapsed, revealedScenes)
      ),
      isVisualRevealed: (scene, elapsed, progress, revealedScenes) => (
        isSceneVisualFullyShown(scene, progress, revealedScenes)
      )
    };
  }

  #finishEnding(state, api) {
    stopEndingVideo(true);
    api.setScreen?.(SCREEN_STATES.CREDITS);
    api.setMessage?.('Opening credits...', 1.0);
  }
}

function createTimedScenes(sceneDefinitions) {
  let start = 0;
  return Object.freeze(sceneDefinitions.map((scene) => {
    const end = start + scene.duration;
    const timedScene = Object.freeze({ ...scene, start, end });
    start = end;
    return timedScene;
  }));
}

function getAssets() {
  const assets = {};
  for (const [key, path] of Object.entries(TRUE_ENDING_ASSETS)) {
    assets[key] = getImage(path);
  }
  return assets;
}

function getActiveScene(sceneList, elapsed) {
  for (const scene of sceneList) {
    if (elapsed >= scene.start && elapsed < scene.end) return scene;
  }
  return sceneList[sceneList.length - 1];
}

function getSceneProgress(scene, elapsed) {
  return clamp((elapsed - scene.start) / Math.max(1, scene.end - scene.start), 0, 1);
}

function isSequenceFinished(sceneList, elapsed) {
  return elapsed >= sceneList[sceneList.length - 1].end;
}

function drawScene(p, layout, scene, elapsed, progress, assets, revealedScenes) {
  p.background(0);

  if (scene.effect === 'whiteFlash') {
    drawWhiteFlashScene(p, layout, elapsed, progress);
    return;
  }

  if (scene.video) {
    drawVideoScene(p, layout, scene, progress);
    return;
  }

  stopEndingVideo(false);

  if (scene.images) {
    drawSceneImages(p, layout, scene, progress, assets, revealedScenes);
  }

  if (scene.text) {
    if (scene.images) drawSceneText(p, layout, scene, elapsed, progress, revealedScenes);
    else drawTextOnlyScene(p, layout, scene, elapsed, progress, revealedScenes);
  }
}

function drawSceneImages(p, layout, scene, progress, assets, revealedScenes) {
  const images = scene.images.map((key) => assets[key]).filter(Boolean);
  if (!images.length) return;

  if (images.length >= 2) {
    drawTwoImageScene(p, layout, scene, progress, images[0], images[1], revealedScenes);
    return;
  }

  const centerYPos = getSingleImageCenterY(layout, scene);
  drawFittedImage(p, layout, images[0], centerYPos, {
    maxW: scene.imageMaxW ?? (scene.text ? 780 : 860),
    maxH: scene.imageMaxH ?? (scene.text ? 330 : 420),
    alpha: 255 * getImageRevealFade(scene, progress, revealedScenes, 0.30, scene.fadeOutStart ?? 0.82)
  });
}

function drawTwoImageScene(p, layout, scene, progress, leftImage, rightImage, revealedScenes) {
  if (!leftImage || !rightImage) return;

  const alpha = 255 * getImageRevealFade(scene, progress, revealedScenes, 0.30, scene.fadeOutStart ?? 0.84);
  const gap = sx(16, layout);
  const maxW = sx(scene.imageMaxW ?? 410, layout);
  const maxH = sy(scene.imageMaxH ?? 250, layout);
  const leftRect = fitRect(leftImage.width, leftImage.height, maxW, maxH);
  const rightRect = fitRect(rightImage.width, rightImage.height, maxW, maxH);
  const groupW = leftRect.w + gap + rightRect.w;
  const groupX = centerX(groupW, layout);
  const centerYPos = layout.offsetY + sy(240, layout);
  const groupH = Math.max(leftRect.h, rightRect.h);
  const y = centerYPos - groupH / 2;

  drawPanelImage(p, leftImage, groupX, y + (groupH - leftRect.h) / 2, leftRect.w, {
    alpha,
    h: leftRect.h,
    scale: 1
  });
  drawPanelImage(p, rightImage, groupX + leftRect.w + gap, y + (groupH - rightRect.h) / 2, rightRect.w, {
    alpha,
    h: rightRect.h,
    scale: 1
  });
}

function drawFittedImage(p, layout, img, centerYPos, opts = {}) {
  if (!img || !img.width || !img.height) return;

  const maxW = sx(opts.maxW ?? 860, layout);
  const maxH = sy(opts.maxH ?? 420, layout);
  const rect = fitRect(img.width, img.height, maxW, maxH);

  drawPanelImage(p, img, centerX(rect.w, layout), centerYPos - rect.h / 2, rect.w, {
    alpha: opts.alpha ?? 255,
    h: rect.h,
    scale: 1
  });
}

function drawVideoScene(p, layout, scene, progress) {
  const video = syncEndingVideo(scene);
  if (!video || !video.videoWidth || !video.videoHeight) return;

  const alpha = getFade(progress, 0.24, 1.0, true);
  const maxW = sx(scene.imageMaxW ?? 760, layout);
  const maxH = sy(scene.imageMaxH ?? 380, layout);
  const rect = fitRect(video.videoWidth, video.videoHeight, maxW, maxH);
  const x = centerX(rect.w, layout);
  const y = layout.offsetY + layout.height / 2 - rect.h / 2;
  const ctx = p.drawingContext;

  ctx.save();
  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(video, x, y, rect.w, rect.h);
  ctx.imageSmoothingEnabled = previousSmoothing;
  ctx.restore();
}

function fitRect(sourceW, sourceH, maxW, maxH) {
  if (!sourceW || !sourceH) return { w: 0, h: 0 };
  const aspect = sourceW / sourceH;
  let w = Math.min(maxW, maxH * aspect);
  let h = w / aspect;

  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }

  return { w, h };
}

function getSingleImageCenterY(layout, scene) {
  if (!scene.text) return layout.offsetY + layout.height / 2;
  return layout.offsetY + sy(235, layout);
}

function drawSceneText(p, layout, scene, elapsed, progress, revealedScenes) {
  drawTypewriterText(p, layout, scene, elapsed, progress, sy(456, layout), {
    fontSize: 18,
    fadeOutStart: scene.fadeOutStart ?? 0.88,
    revealedScenes
  });
}

function drawTypewriterText(p, layout, scene, elapsed, progress, centerYPos, opts = {}) {
  const alpha = 255 * fadeWindow(progress, 0.12, opts.fadeOutStart ?? 0.88);
  const textIn = getTypewriterProgress(scene, elapsed, opts.revealedScenes);
  const visible = typeText(scene.text || '', textIn);
  const color = scene.color || '#ffffff';
  const fontSize = Math.max(16, sx(opts.fontSize ?? 18, layout));
  const lineHeight = fontSize * 1.35;

  p.push();
  p.translate(layout.offsetX, layout.offsetY);

  const c = p.color(color);
  p.fill(p.red(c), p.green(c), p.blue(c), alpha);
  setFont(p, fontSize, FONTS.body);
  p.textLeading(lineHeight);
  p.textAlign(p.CENTER, p.CENTER);
  p.text(visible, layout.width / 2, centerYPos);

  if (textIn < 1) {
    const cursorAlpha = (0.45 + Math.sin(p.millis() * 0.02) * 0.55) * alpha;
    const lines = String(visible || '').split('\n');
    const lastLine = lines[lines.length - 1] || '';
    const lineIndex = Math.max(0, lines.length - 1);
    const cursorY = centerYPos + (lineIndex - (lines.length - 1) / 2) * lineHeight;

    p.fill(p.red(c), p.green(c), p.blue(c), cursorAlpha);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('|', layout.width / 2 + p.textWidth(lastLine) / 2 + sx(4, layout), cursorY);
  }

  p.pop();
}

function drawWhiteFlashScene(p, layout, elapsed, progress) {
  p.background(0);
  const alpha = 255 * fadeWindow(progress, 0.20, 0.55);

  p.push();
  p.noStroke();
  p.fill(255, 255, 255, alpha);
  p.rect(0, 0, p.width, p.height);
  p.pop();
}

function drawTextOnlyScene(p, layout, scene, elapsed, progress, revealedScenes) {
  p.background(0);
  drawTypewriterText(p, layout, scene, elapsed, progress, layout.height / 2, { revealedScenes });
}

function drawHud(p, layout, elapsed, prompt) {
  p.push();
  p.translate(layout.offsetX, layout.offsetY);
  const blink = (0.45 + Math.sin(elapsed * 0.008) * 0.55) * 255;
  p.fill(255, 255, 255, blink);
  setFont(p, Math.max(11, sx(12, layout)), FONTS.ui);
  p.textAlign(p.CENTER, p.CENTER);
  if (prompt) p.text(prompt, layout.width / 2, layout.height - sy(18, layout));
  p.pop();
}

function typeText(text, t) {
  return String(text || '').slice(0, Math.floor(String(text || '').length * clamp(t, 0, 1)));
}

function hasSceneText(scene) {
  return !!scene?.text;
}

function hasSceneImage(scene) {
  return !!scene?.images?.length;
}

function isSceneTextFullyShown(scene, elapsed, revealedScenes) {
  return !hasSceneText(scene) || revealedScenes.has(scene) || getTypewriterProgress(scene, elapsed) >= 1;
}

function isSceneVisualFullyShown(scene, progress, revealedScenes) {
  return !hasSceneImage(scene) || isSingleImageOnlyScene(scene) || revealedScenes.has(scene) || progress >= VISUAL_READY_PROGRESS;
}

function getTypewriterProgress(scene, elapsed, revealedScenes = new Set()) {
  if (revealedScenes.has(scene)) return 1;
  const textLength = Math.max(1, String(scene.text || '').length);
  const revealDuration = textLength * TYPEWRITER_MS_PER_CHARACTER;
  const sceneElapsed = Math.max(0, elapsed - scene.start - TYPEWRITER_START_DELAY_MS);
  return clamp(sceneElapsed / revealDuration, 0, 1);
}

function getFade(progress, fadeInEnd, fadeOutStart, hold = false) {
  if (hold && progress >= 1) return 1;
  return fadeWindow(progress, fadeInEnd, fadeOutStart);
}

function getImageRevealFade(scene, progress, revealedScenes, fadeInEnd, fadeOutStart) {
  const effectiveProgress = revealedScenes.has(scene)
    ? Math.max(progress, REVEALED_IMAGE_PROGRESS)
    : progress;
  return getFade(effectiveProgress, fadeInEnd, fadeOutStart, scene.hold);
}

function isSingleImageOnlyScene(scene) {
  return !hasSceneText(scene) && scene?.images?.length === 1;
}

function getEndingVideo() {
  if (endingVideo || typeof document === 'undefined') return endingVideo;

  const video = document.createElement('video');
  video.src = TRUE_ENDING_VIDEO_ASSETS.finalFlight;
  video.preload = 'auto';
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.style.position = 'fixed';
  video.style.left = '-9999px';
  video.style.top = '0';
  video.style.width = '1px';
  video.style.height = '1px';
  video.style.opacity = '0';
  video.style.pointerEvents = 'none';
  document.body.appendChild(video);
  endingVideo = video;
  return endingVideo;
}

function syncEndingVideo(scene) {
  const video = getEndingVideo();
  if (!video) return null;

  if (endingVideoSceneStart !== scene.start) {
    endingVideoSceneStart = scene.start;
    try {
      video.currentTime = 0;
    } catch (error) {}
  }

  if (video.paused || video.ended) {
    video.play().catch(() => {});
  }

  return video;
}

function stopEndingVideo(rewind) {
  if (!endingVideo) return;
  endingVideo.pause();
  endingVideoSceneStart = null;

  if (rewind) {
    try {
      endingVideo.currentTime = 0;
    } catch (error) {}
  }
}
