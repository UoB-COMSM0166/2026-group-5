import { Screen } from './Screen.js';
import { getImage } from '../core/assetLoader.js';
import { SCREEN_STATES } from '../core/gameState.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx, sy, centerX } from '../utils/screenLayout.js';
import { drawPanelImage } from '../utils/cutsceneDraw.js';
import { clamp, smoothAppear, fadeWindow } from '../utils/animation.js';
import { TRUE_ENDING_ASSETS } from './storyAssetCatalog.js';

const SCENES = Object.freeze([
  { start: 0, end: 4200, text: 'You are here' },
  { start: 4200, end: 6800, draw: drawPrincessThroneScene },
  { start: 6800, end: 14000, text: 'I have been waiting for a while' },
  { start: 14000, end: 16800, draw: drawCrownCloseScene },
  { start: 16800, end: 19800, draw: drawPrincessPanelScene },
  { start: 19800, end: 24400, text: 'There is something I want to show you' },
  { start: 24400, end: 29400, draw: drawThroneCoreRoomScene },
  { start: 29400, end: 34200, text: 'I guess you already know the situation' },
  { start: 34200, end: 39200, draw: drawChainedDragonScene },
  { start: 39200, end: 44600, text: 'Would you like to be part of it?' },
  { start: 44600, end: 51600, draw: drawConfrontationPanelsScene },
  { start: 51600, end: 55200, text: 'Thank you, but', color: '#ff5c7a' },
  { start: 55200, end: 59000, text: 'My answer is no', color: '#ff5c7a' },
  { start: 59000, end: 60600, draw: drawWhiteFlashScene },
  { start: 60600, end: 67000, draw: drawKnightLeavesScene },
  { start: 67000, end: 73000, draw: drawDragonSkyScene },
  { start: 73000, end: 80800, draw: drawCastlePeaceScene }
]);

export class TrueEndingScreen extends Screen {
  #timeOffsetMs;

  constructor() {
    super('true_ending', 'Press Enter to skip to next scene');
    this.#timeOffsetMs = 0;
  }

  reset() {
    this.#timeOffsetMs = 0;
  }

  handleKey(key, state, api) {
    if (key !== 'Enter') return false;

    const elapsed = (state.screenTimeMs ?? 0) + this.#timeOffsetMs;
    const currentSceneIndex = SCENES.findIndex((scene) => elapsed >= scene.start && elapsed < scene.end);

    if (isSequenceFinished(SCENES, elapsed) || currentSceneIndex < 0) {
      this.#timeOffsetMs = 0;
      api.setScreen?.(SCREEN_STATES.CREDITS);
      api.setMessage?.('Opening credits...', 1.0);
      return true;
    }

    const isLastScene = currentSceneIndex === SCENES.length - 1;
    if (isLastScene) {
      this.#timeOffsetMs += SCENES[currentSceneIndex].end - elapsed;
      api.setMessage?.('Final scene...', 0.6);
      return true;
    }

    const nextScene = SCENES[currentSceneIndex + 1];
    const nextSceneDuration = nextScene.end - nextScene.start;
    const jumpOffsetInsideScene = Math.min(650, Math.floor(nextSceneDuration * 0.18));
    const targetElapsed = nextScene.start + jumpOffsetInsideScene;
    this.#timeOffsetMs += targetElapsed - elapsed;
    api.setMessage?.('Skipping scene...', 0.5);
    return true;
  }

  render(p, state) {
    if ((state.screenTimeMs || 0) < 50) {
      this.#timeOffsetMs = 0;
    }

    const rawElapsed = state.screenTimeMs ?? 0;
    const elapsed = rawElapsed + this.#timeOffsetMs;
    const layout = getLayout(p);
    const assets = getAssets();
    const scene = getActiveScene(SCENES, elapsed);
    const progress = getSceneProgress(scene, elapsed);

    p.push();
    p.background(0);
    if (scene.text) drawTextOnlyScene(p, layout, scene, progress);
    else scene.draw(p, layout, elapsed, progress, assets);
    drawHud(p, layout, elapsed);
    p.pop();

    state.prompt = isSequenceFinished(SCENES, elapsed)
      ? 'Press Enter to continue'
      : this.promptText;
  }
}

function getAssets() {
  return {
    princessThrone: getImage(TRUE_ENDING_ASSETS.princessThrone),
    crownClose: getImage(TRUE_ENDING_ASSETS.crownClose),
    princessPanel: getImage(TRUE_ENDING_ASSETS.princessPanel),
    throneCoreRoom: getImage(TRUE_ENDING_ASSETS.throneCoreRoom),
    chainedDragon: getImage(TRUE_ENDING_ASSETS.chainedDragon),
    confrontationPanels: getImage(TRUE_ENDING_ASSETS.confrontationPanels),
    brokenChains: getImage(TRUE_ENDING_ASSETS.brokenChains),
    swordLowered: getImage(TRUE_ENDING_ASSETS.swordLowered),
    knightLeaves: getImage(TRUE_ENDING_ASSETS.knightLeaves),
    dragonSky: getImage(TRUE_ENDING_ASSETS.dragonSky),
    castlePeace: getImage(TRUE_ENDING_ASSETS.castlePeace)
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

function drawCenteredFadeScene(p, layout, progress, img, widthPx, fadeOutStart = 0.7) {
  p.background(0);
  if (!img || img.width <= 0) return;

  const panelFade = fadeWindow(progress, 0.3, fadeOutStart);
  const w = sx(widthPx, layout);
  const h = img.height * (w / img.width);
  const x = centerX(w, layout);
  const y = layout.offsetY + (layout.height - h) / 2;

  drawPanelImage(p, img, x, y, w, {
    alpha: 255 * panelFade,
    scale: 1
  });
}

function drawPrincessThroneScene(p, layout, elapsed, progress, assets) {
  drawCenteredFadeScene(p, layout, progress, assets.princessThrone, 760);
}

function drawCrownCloseScene(p, layout, elapsed, progress, assets) {
  drawCenteredFadeScene(p, layout, progress, assets.crownClose, 360);
}

function drawPrincessPanelScene(p, layout, elapsed, progress, assets) {
  drawCenteredFadeScene(p, layout, progress, assets.princessPanel, 560);
}

function drawThroneCoreRoomScene(p, layout, elapsed, progress, assets) {
  drawCenteredFadeScene(p, layout, progress, assets.throneCoreRoom, 900);
}

function drawChainedDragonScene(p, layout, elapsed, progress, assets) {
  drawCenteredFadeScene(p, layout, progress, assets.chainedDragon, 700);
}

function drawConfrontationPanelsScene(p, layout, elapsed, progress, assets) {
  drawCenteredFadeScene(p, layout, progress, assets.confrontationPanels, 860);
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

function drawKnightLeavesScene(p, layout, elapsed, progress, assets) {
  drawCenteredFadeScene(p, layout, progress, assets.knightLeaves, 860);
}

function drawDragonSkyScene(p, layout, elapsed, progress, assets) {
  drawCenteredFadeScene(p, layout, progress, assets.dragonSky, 900);
}

function drawCastlePeaceScene(p, layout, elapsed, progress, assets) {
  drawCenteredFadeScene(p, layout, progress, assets.castlePeace, 900, 1.0);
}

function drawTextOnlyScene(p, layout, scene, progress) {
  p.background(0);

  const alpha = 255 * fadeWindow(progress, 0.12, 0.88);
  const textIn = smoothAppear(progress, 0.18, 0.58);
  const visible = typeText(scene.text || '', textIn);
  const color = scene.color || '#ffffff';

  p.push();
  p.translate(layout.offsetX, layout.offsetY);

  const c = p.color(color);
  p.fill(p.red(c), p.green(c), p.blue(c), alpha);
  setFont(p, Math.max(16, sx(18, layout)), FONTS.body);
  p.textAlign(p.CENTER, p.CENTER);
  p.text(visible, layout.width / 2, layout.height / 2);

  if (textIn < 1) {
    const cursorAlpha = (0.45 + Math.sin(p.millis() * 0.02) * 0.55) * alpha;
    p.fill(p.red(c), p.green(c), p.blue(c), cursorAlpha);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('|', layout.width / 2 + p.textWidth(visible) / 2 + sx(4, layout), layout.height / 2);
  }

  p.pop();
}

function drawHud(p, layout, elapsed) {
  const finished = isSequenceFinished(SCENES, elapsed);

  p.push();
  p.translate(layout.offsetX, layout.offsetY);
  const blink = (0.45 + Math.sin(elapsed * 0.008) * 0.55) * 255;
  p.fill(255, 255, 255, blink);
  setFont(p, Math.max(11, sx(12, layout)), FONTS.ui);
  p.textAlign(p.CENTER, p.CENTER);
  p.text(
    finished ? 'Press ENTER to continue' : 'Press ENTER to skip',
    layout.width / 2,
    layout.height - sy(18, layout)
  );
  p.pop();
}

function typeText(text, t) {
  return String(text || '').slice(0, Math.floor(String(text || '').length * clamp(t, 0, 1)));
}
