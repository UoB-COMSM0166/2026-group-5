// False ending: timed cutscene sequence that unlocks the second playthrough.
import { Screen } from './Screen.js';
import { getImage } from '../core/assetLoader.js';
import { SCREEN_STATES } from '../core/gameState.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx, sy, centerX } from '../utils/screenLayout.js';
import { drawPanelImage } from '../utils/cutsceneDraw.js';
import { clamp, lerp, smoothAppear, fadeWindow } from '../utils/animation.js';
import { FALSE_ENDING_ASSETS } from './storyAssetCatalog.js';
import { CutscenePlaybackController } from './CutscenePlaybackController.js';

const REVEALED_VISUAL_PROGRESS = 0.58;
const VISUAL_READY_PROGRESS = 0.50;

const SCENES = Object.freeze([
  { start: 0, end: 3600, draw: drawHandReachScene, imageCount: 1 },
  { start: 3600, end: 7200, draw: drawGrapArmScene, imageCount: 1 },
  { start: 7200, end: 9800, draw: drawPrincessCloseScene, imageCount: 1 },
  { start: 9800, end: 13200, text: 'you came' },
  { start: 13200, end: 17800, draw: drawKnightPrincessScene, imageCount: 1 },
  { start: 17800, end: 22200, text: 'I know I can always trust you' },
  { start: 22200, end: 26800, draw: drawGateStrikeHandTouchScene, imageCount: 2 },
  { start: 26800, end: 30200, draw: drawEscapeScene, imageCount: 1 },
  { start: 30200, end: 35600, text: 'Just as I know that it will be back' },
  { start: 35600, end: 40200, draw: drawFinalChamberScene, imageCount: 1 }
]);

export class FalseEndingScreen extends Screen {
  #cutscene;

  constructor() {
    super('false_ending', 'Press Enter to advance');
    this.#cutscene = new CutscenePlaybackController();
  }

  reset() {
    this.#cutscene.reset();
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
    this.#cutscene.resetForFreshStart(rawElapsed);
    const elapsed = this.#cutscene.getElapsed(rawElapsed);
    const layout = getLayout(p);
    const assets = getAssets();
    const scene = getActiveScene(SCENES, elapsed);
    const progress = getSceneProgress(scene, elapsed);
    const revealedScenes = this.#cutscene.revealedScenes;
    const cutsceneOptions = this.#getCutsceneOptions();

    p.push();
    p.background(0);
    if (scene.text) drawTextOnlyScene(p, layout, scene, progress, revealedScenes);
    else scene.draw(p, layout, elapsed, getSceneVisualProgress(scene, progress, revealedScenes), assets);
    drawHud(p, layout, elapsed, this.#cutscene.getHudPrompt(SCENES, scene, elapsed, progress, cutsceneOptions));
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
        isSceneTextFullyShown(scene, progress, revealedScenes)
      ),
      isVisualRevealed: (scene, elapsed, progress, revealedScenes) => (
        isSceneVisualFullyShown(scene, progress, revealedScenes)
      )
    };
  }

  #finishEnding(state, api) {
    state.story.secondPlaythroughUnlocked = true;
    api.setScreen?.(SCREEN_STATES.PLAYTHROUGH_SELECT);
    api.setMessage?.('Second playthrough unlocked', 1.2);
  }
}

function getAssets() {
  return {
    handReach: getImage(FALSE_ENDING_ASSETS.handReach),
    princessClose: getImage(FALSE_ENDING_ASSETS.princessClose),
    grapArm: getImage(FALSE_ENDING_ASSETS.grapArm),
    knightPrincess: getImage(FALSE_ENDING_ASSETS.knightPrincess),
    gateStrike: getImage(FALSE_ENDING_ASSETS.gateStrike),
    handTouch: getImage(FALSE_ENDING_ASSETS.handTouch),
    escapeWalk: getImage(FALSE_ENDING_ASSETS.escapeWalk),
    finalChamber: getImage(FALSE_ENDING_ASSETS.finalChamber)
  };
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

function drawCenteredFadeScene(p, layout, progress, img, widthPx, fadeOutStart = 0.72) {
  const panelFade = fadeWindow(progress, 0.30, fadeOutStart);
  const w = sx(widthPx, layout);
  const h = img?.height ? img.height * (w / img.width) : 0;
  const x = centerX(w, layout);
  const y = layout.offsetY + (layout.height - h) / 2;
  drawPanelImage(p, img, x, y, w, { alpha: 255 * panelFade, scale: 1 });
}

function drawHandReachScene(p, layout, elapsed, progress, assets) {
  p.background(0);
  drawCenteredFadeScene(p, layout, progress, assets.handReach, 820);
}

function drawPrincessCloseScene(p, layout, elapsed, progress, assets) {
  p.background(0);
  drawCenteredFadeScene(p, layout, progress, assets.princessClose, 820);
}

function drawGrapArmScene(p, layout, elapsed, progress, assets) {
  p.background(0);
  drawCenteredFadeScene(p, layout, progress, assets.grapArm, 820);
}

function drawKnightPrincessScene(p, layout, elapsed, progress, assets) {
  p.background(0);
  drawCenteredFadeScene(p, layout, progress, assets.knightPrincess, 820);
}

function drawGateStrikeHandTouchScene(p, layout, elapsed, progress, assets) {
  p.background(0);

  const gateIn = smoothAppear(progress, 0.04, 0.24);
  const handIn = smoothAppear(progress, 0.26, 0.50);
  const sceneFade = fadeWindow(progress, 0.08, 0.74);
  const gateW = sx(450, layout);
  const handW = sx(450, layout);
  const gap = sx(20, layout);
  const gateH = assets.gateStrike.height * (gateW / assets.gateStrike.width);
  const handH = assets.handTouch.height * (handW / assets.handTouch.width);
  const groupW = gateW + gap + handW;
  const startX = centerX(groupW, layout);
  const centerYPos = layout.offsetY + layout.height / 2;

  drawPanelImage(p, assets.gateStrike, startX, centerYPos - gateH / 2, gateW, {
    alpha: 255 * gateIn * sceneFade,
    scale: 1
  });

  drawPanelImage(p, assets.handTouch, startX + gateW + gap, centerYPos - handH / 2, handW, {
    alpha: 255 * handIn * sceneFade,
    scale: 1
  });
}

function drawEscapeScene(p, layout, elapsed, progress, assets) {
  p.background(0);
  drawCenteredFadeScene(p, layout, progress, assets.escapeWalk, 820);
}

function drawFinalChamberScene(p, layout, elapsed, progress, assets) {
  p.background(0);
  drawCenteredFadeScene(p, layout, progress, assets.finalChamber, 820);
}

function drawTextOnlyScene(p, layout, scene, progress, revealedScenes) {
  const alpha = 255 * fadeWindow(progress, 0.12, 0.88);
  const textIn = getTextRevealProgress(scene, progress, revealedScenes);
  const visible = typeText(scene.text || '', textIn);

  p.push();
  p.translate(layout.offsetX, layout.offsetY);
  p.fill(255, 255, 255, alpha);
  setFont(p, Math.max(16, sx(18, layout)), FONTS.body);
  p.textAlign(p.CENTER, p.CENTER);
  p.text(visible, layout.width / 2, layout.height / 2);

  if (textIn < 1) {
    const cursorAlpha = (0.45 + Math.sin(p.millis() * 0.02) * 0.55) * alpha;
    p.fill(255, 255, 255, cursorAlpha);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('|', layout.width / 2 + p.textWidth(visible) / 2 + sx(4, layout), layout.height / 2);
  }
  p.pop();
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
  return typeof scene?.draw === 'function';
}

function isSceneTextFullyShown(scene, progress, revealedScenes) {
  return !hasSceneText(scene) || revealedScenes.has(scene) || getTextRevealProgress(scene, progress) >= 1;
}

function isSceneVisualFullyShown(scene, progress, revealedScenes) {
  return !hasSceneImage(scene) || isSingleImageOnlyScene(scene) || revealedScenes.has(scene) || progress >= VISUAL_READY_PROGRESS;
}

function getTextRevealProgress(scene, progress, revealedScenes = new Set()) {
  if (revealedScenes.has(scene)) return 1;
  return smoothAppear(progress, 0.18, 0.58);
}

function getSceneVisualProgress(scene, progress, revealedScenes) {
  return revealedScenes.has(scene) ? Math.max(progress, REVEALED_VISUAL_PROGRESS) : progress;
}

function isSingleImageOnlyScene(scene) {
  return !hasSceneText(scene) && scene?.imageCount === 1;
}
