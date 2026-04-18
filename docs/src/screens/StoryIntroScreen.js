// Story intro: timed cutscene sequence with text and images before the tutorial.
import { Screen } from './Screen.js';
import { getImage } from '../core/assetLoader.js';
import { SCREEN_STATES } from '../core/gameState.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx, sy, centerX, centerGroupX } from '../utils/screenLayout.js';
import { drawPanelImage } from '../utils/cutsceneDraw.js';
import { clamp, lerp, smoothAppear, fadeWindow } from '../utils/animation.js';
import { INTRO_ASSETS } from './storyAssetCatalog.js';
import { CutscenePlaybackController } from './CutscenePlaybackController.js';

const REVEALED_VISUAL_PROGRESS = 0.84;
const VISUAL_READY_PROGRESS = 0.84;

const FIRST_PLAYTHROUGH_SCENES = Object.freeze([
  { start: 0, end: 4500, caption: 'In a prosperous kingdom, all was quiet.', draw: drawCastleScene },
  { start: 4500, end: 9200, caption: 'The princess watched over the realm from her chamber.', draw: drawPrincessLabScene },
  { start: 9200, end: 11800, caption: 'Until...', draw: drawClawScene },
  {
    start: 11800,
    end: 18000,
    caption: 'The dragon attacked and carried the princess away!',
    caption2: 'The kingdom fell into panic.',
    draw: drawDragonScene
  },
  { start: 18000, end: 24500, caption: 'One brave knight rose to the challenge.', draw: drawKnightScene },
  { start: 24500, end: 28000, caption: 'Your adventure begins now!', draw: drawGateScene }
]);

const SECOND_PLAYTHROUGH_SCENES = Object.freeze([
  { start: 0, end: 4500, text: 'The princess has gone missing again.' },
  { start: 4500, end: 8200, text: 'This time, something feels different.' }
]);

export class IntroScreen extends Screen {
  #cutscene;

  constructor() {
    super('intro', 'Press Enter to advance');
    this.#cutscene = new CutscenePlaybackController();
  }

  reset() {
    this.#cutscene.reset();
  }

  update(state, deltaTime, api) {
    this.#cutscene.continueIfComplete(state, api, this.#getScenes(state), {
      onFinished: (nextState, nextApi) => this.#continueAfterIntro(nextState, nextApi)
    });
  }

  handleKey(key, state, api) {
    return this.#cutscene.handleEnter(key, state, api, this.#getScenes(state), {
      ...this.#getCutsceneOptions(),
      onFinished: (nextState, nextApi) => this.#continueAfterIntro(nextState, nextApi)
    });
  }

  render(p, state) {
    const rawElapsed = state.screenTimeMs ?? 0;
    this.#cutscene.resetForFreshStart(rawElapsed);
    const elapsed = this.#cutscene.getElapsed(rawElapsed);
    const layout = getLayout(p);
    const scenes = this.#getScenes(state);
    const scene = getActiveScene(scenes, elapsed);
    const progress = getSceneProgress(scene, elapsed);
    const revealedScenes = this.#cutscene.revealedScenes;
    const cutsceneOptions = this.#getCutsceneOptions();

    p.push();
    p.background(0);

    if (state.story?.introVariant === 'second') {
      drawSecondPlaythroughTextScene(p, layout, scene, progress, revealedScenes);
    } else {
      const introAssets = getIntroAssets();
      const visualProgress = getSceneVisualProgress(scene, progress, revealedScenes);
      scene.draw(p, layout, elapsed, visualProgress, introAssets);
      drawSceneCaption(p, layout, scene, progress, revealedScenes);
    }

    drawIntroHud(p, layout, elapsed, state, this.#cutscene.getHudPrompt(scenes, scene, elapsed, progress, cutsceneOptions));
    p.pop();

    state.prompt = this.#cutscene.getPrompt(scenes, scene, elapsed, progress, cutsceneOptions);
  }

  #getScenes(state) {
    return state.story?.introVariant === 'second'
      ? SECOND_PLAYTHROUGH_SCENES
      : FIRST_PLAYTHROUGH_SCENES;
  }

  #continueAfterIntro(state, api) {
    if (state.story?.currentPlaythrough === 2) {
      api.setScreen?.(SCREEN_STATES.MAP_SELECT);
      api.setMessage?.('Choose your route...', 1.0);
      return;
    }

    // First playthrough: always load map1
    api.loadStoryLevel?.('map1');
    api.markMissionStart?.();
    api.setScreen?.(SCREEN_STATES.PLAYING);
  }

  #getCutsceneOptions() {
    return {
      getProgress: getSceneProgress,
      hasText: hasSceneText,
      hasVisual: hasSceneImage,
      isTextRevealed: (scene, elapsed, progress, revealedScenes) => (
        isSceneTextFullyShown(scene, progress, revealedScenes)
      ),
      isVisualRevealed: (scene, elapsed, progress, revealedScenes) => (
        isSceneVisualFullyShown(scene, progress, revealedScenes)
      )
    };
  }
}

function getIntroAssets() {
  return {
    castle: getImage(INTRO_ASSETS.castle),
    princessWindow: getImage(INTRO_ASSETS.princessWindow),
    princessScreens: getImage(INTRO_ASSETS.princessScreens),
    princessLabFull: getImage(INTRO_ASSETS.princessLabFull),
    princessClose: getImage(INTRO_ASSETS.princessClose),
    claw: getImage(INTRO_ASSETS.claw),
    dragonSky: getImage(INTRO_ASSETS.dragonSky),
    panicTown: getImage(INTRO_ASSETS.panicTown),
    swordClose: getImage(INTRO_ASSETS.swordClose),
    knightHelmet: getImage(INTRO_ASSETS.knightHelmet),
    knightFull: getImage(INTRO_ASSETS.knightFull),
    gate: getImage(INTRO_ASSETS.gate)
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

function getTotalDuration(sceneList) {
  return sceneList[sceneList.length - 1].end;
}

function isSequenceFinished(sceneList, elapsed) {
  return elapsed >= getTotalDuration(sceneList);
}

function drawSecondPlaythroughTextScene(p, layout, scene, progress, revealedScenes) {
  const alpha = 255 * fadeWindow(progress, 0.12, 0.88);
  const textIn = getTextRevealProgress(scene, progress, revealedScenes);
  const visible = typeText(scene.text || '', textIn);

  p.push();
  p.translate(layout.offsetX, layout.offsetY);

  p.noStroke();
  p.fill(255, 255, 255, alpha);
  setFont(p, Math.max(18, sx(22, layout)), FONTS.body);
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

function drawCastleScene(p, layout, elapsed, progress, introAssets) {
  p.background(0);

  const panelIn = smoothAppear(progress, 0.1, 0.6);
  const panelFade = fadeWindow(progress, 0.12, 0.9);
  const w = sx(1040, layout);
  const x = centerX(w, layout);

  drawPanelImage(p, introAssets.castle, x, layout.offsetY + sy(120, layout), w, {
    alpha: 255 * panelIn * panelFade,
    scale: lerp(0.96, 1.03, panelIn),
    offsetY: lerp(sy(16, layout), 0, panelIn)
  });
}

function drawPrincessLabScene(p, layout, elapsed, progress, introAssets) {
  p.background(0);

  const leftIn = smoothAppear(progress, 0.02, 0.30);
  const topIn = smoothAppear(progress, 0.16, 0.44);
  const fullIn = smoothAppear(progress, 0.30, 0.7);
  const sceneFade = fadeWindow(progress, 0.12, 0.9);
  const dx = centerGroupX(sx(35, layout), sx(1000, layout), layout);

  drawPanelImage(p, introAssets.princessLabFull, sx(160, layout) + dx, layout.offsetY + sy(130, layout), sx(750, layout), {
    alpha: 255 * fullIn * sceneFade,
    scale: lerp(0.97, 1.01, fullIn)
  });

  drawPanelImage(p, introAssets.princessWindow, sx(100, layout) + dx, layout.offsetY + sy(55, layout), sx(300, layout), {
    alpha: 255 * leftIn * sceneFade,
    scale: lerp(0.94, 1.0, leftIn),
    offsetX: lerp(-sx(18, layout), 0, leftIn),
    offsetY: lerp(sy(12, layout), 0, leftIn)
  });

  drawPanelImage(p, introAssets.princessScreens, sx(450, layout) + dx, layout.offsetY + sy(40, layout), sx(400, layout), {
    alpha: 255 * topIn * sceneFade,
    scale: lerp(0.94, 1.0, topIn),
    offsetY: lerp(-sy(18, layout), 0, topIn)
  });
}

function drawClawScene(p, layout, elapsed, progress, assets) {
  p.background(0);

  const eyeIn = smoothAppear(progress, 0.02, 0.40);
  const clawIn = smoothAppear(progress, 0.5, 0.82);
  const sceneFade = fadeWindow(progress, 0.08, 0.92);
  const eyeW = sx(380, layout);
  const clawW = sx(470, layout);
  const gap = sx(50, layout);
  const groupW = eyeW + gap + clawW;
  const groupX = centerX(groupW, layout);
  const eyeX = groupX + sx(100, layout);
  const clawX = groupX + eyeW + gap;
  const eyeY = layout.offsetY + sy(80, layout);
  const clawY = layout.offsetY + sy(250, layout);

  drawPanelImage(p, assets.princessClose, eyeX, eyeY, eyeW, {
    alpha: 255 * eyeIn * sceneFade,
    scale: lerp(0.96, 1.04, eyeIn),
    offsetX: -20
  });

  drawPanelImage(p, assets.claw, clawX, clawY, clawW, {
    alpha: 255 * clawIn * sceneFade,
    scale: lerp(1.08, 1.0, clawIn),
    offsetX: lerp(sx(120, layout), 0, clawIn),
    offsetY: lerp(-sy(40, layout), 0, clawIn)
  });
}

function drawDragonScene(p, layout, elapsed, progress, introAssets) {
  p.background(0);

  const skyIn = smoothAppear(progress, 0.02, 0.30);
  const townIn = smoothAppear(progress, 0.40, 0.70);
  const sceneFade = fadeWindow(progress, 0.08, 0.95);
  const dx = centerGroupX(sx(80, layout), sx(980, layout), layout);

  p.push();
  if (progress > 0.48) {
    const shake = (progress - 0.48) * 12;
    p.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  drawPanelImage(p, introAssets.dragonSky, sx(80, layout) + dx, layout.offsetY + sy(50, layout), sx(600, layout), {
    alpha: 255 * skyIn * sceneFade,
    scale: lerp(0.97, 1.0, skyIn),
    offsetX: lerp(sx(25, layout), 0, skyIn)
  });

  drawPanelImage(p, introAssets.panicTown, sx(340, layout) + dx, layout.offsetY + sy(200, layout), sx(600, layout), {
    alpha: 255 * townIn * sceneFade,
    scale: lerp(0.97, 1.02, townIn),
    offsetY: lerp(sy(20, layout), 0, townIn)
  });
  p.pop();
}

function drawKnightScene(p, layout, elapsed, progress, introAssets) {
  p.background(0);

  const swordIn = smoothAppear(progress, 0.02, 0.20);
  const helmetIn = smoothAppear(progress, 0.20, 0.50);
  const fullIn = smoothAppear(progress, 0.40, 0.78);
  const sceneFade = fadeWindow(progress, 0.08, 0.92);
  const dx = centerGroupX(sx(35, layout), sx(785, layout), layout);

  drawPanelImage(p, introAssets.knightFull, sx(100, layout) + dx, layout.offsetY + sy(80, layout), sx(600, layout), {
    alpha: 255 * fullIn * sceneFade,
    scale: lerp(0.97, 1.02, fullIn)
  });

  drawPanelImage(p, introAssets.knightHelmet, sx(25, layout) + dx, layout.offsetY + sy(60, layout), sx(200, layout), {
    alpha: 245 * helmetIn * sceneFade,
    scale: lerp(0.94, 1.0, helmetIn),
    offsetX: lerp(-sx(35, layout), 0, helmetIn)
  });

  drawPanelImage(p, introAssets.swordClose, sx(500, layout) + dx, layout.offsetY + sy(300, layout), sx(350, layout), {
    alpha: 245 * swordIn * sceneFade,
    scale: lerp(0.94, 1.0, swordIn),
    offsetX: lerp(sx(40, layout), 0, swordIn)
  });
}

function drawGateScene(p, layout, elapsed, progress, introAssets) {
  p.background(0);

  const panelIn = smoothAppear(progress, 0.02, 0.7);
  const panelFade = fadeWindow(progress, 0.08, 1.0);
  const w = sx(1050, layout);
  const x = centerX(w, layout);

  drawPanelImage(p, introAssets.gate, x, layout.offsetY + sy(80, layout), w, {
    alpha: 255 * panelIn * panelFade,
    scale: lerp(0.97, 1.05, panelIn),
    offsetY: lerp(sy(16, layout), 0, panelIn)
  });
}

function drawSceneCaption(p, layout, scene, progress, revealedScenes) {
  const revealT = getCaptionRevealProgress(scene, progress, revealedScenes);
  const fadeOut = clamp((1 - progress) / 0.16, 0, 1);
  const alpha = 255 * Math.min(1, fadeOut);
  if (alpha <= 1 || revealT <= 0) return;

  let visibleCaption = '';
  let visibleCaption2 = '';

  if (scene.caption2) {
    const split = 0.55;
    if (revealT < split) {
      visibleCaption = typeText(scene.caption, revealT / split);
    } else {
      visibleCaption = scene.caption;
      visibleCaption2 = typeText(scene.caption2, (revealT - split) / (1 - split));
    }
  } else {
    visibleCaption = typeText(scene.caption, revealT);
  }

  p.push();
  p.translate(layout.offsetX, layout.offsetY);

  const boxW = Math.min(layout.width * 0.82, sx(520, layout));
  const boxH = scene.caption2 ? sy(72, layout) : sy(48, layout);
  const boxX = (layout.width - boxW) / 2;
  const boxY = layout.height - boxH - sy(24, layout);

  p.noStroke();
  p.fill(0, 0, 0, 150);
  p.rect(boxX, boxY, boxW, boxH, 12);

  p.fill(255, 255, 255, alpha);
  setFont(p, Math.max(12, sx(14, layout)), FONTS.body);
  p.textAlign(p.CENTER, p.CENTER);

  if (scene.caption2) {
    p.text(visibleCaption, layout.width / 2, boxY + sy(20, layout));
    p.text(visibleCaption2, layout.width / 2, boxY + sy(46, layout));
  } else {
    p.text(visibleCaption, layout.width / 2, boxY + boxH / 2);
  }

  if (revealT < 1) {
    const cursorAlpha = (0.45 + Math.sin(p.millis() * 0.02) * 0.55) * alpha;
    p.fill(255, 255, 255, cursorAlpha);
    p.textAlign(p.LEFT, p.CENTER);
    const currentLine = scene.caption2 && visibleCaption2 ? visibleCaption2 : visibleCaption;
    const currentY = scene.caption2 && visibleCaption2
      ? boxY + sy(46, layout)
      : (scene.caption2 ? boxY + sy(20, layout) : boxY + boxH / 2);
    p.text('|', layout.width / 2 + p.textWidth(currentLine) / 2 + sx(4, layout), currentY);
  }

  p.pop();
}

function drawIntroHud(p, layout, elapsed, state, prompt) {
  const title = state.story?.introVariant === 'second' ? 'Second Playthrough' : 'Introduction';

  p.push();
  p.translate(layout.offsetX, layout.offsetY);
  p.fill('#ffffff');
  setFont(p, Math.max(16, sx(20, layout)), FONTS.title);
  p.textAlign(p.CENTER, p.CENTER);
  p.text(title, layout.width / 2, sy(16, layout));

  p.noStroke();
  const blink = (0.45 + Math.sin(elapsed * 0.007) * 0.55) * 255;
  p.fill(255, 255, 255, blink);
  setFont(p, Math.max(11, sx(12, layout)), FONTS.ui);
  if (prompt) p.text(prompt, layout.width / 2, layout.height - sy(18, layout));
  p.pop();
}

function typeText(text, t) {
  return String(text || '').slice(0, Math.floor(String(text || '').length * clamp(t, 0, 1)));
}

function hasSceneText(scene) {
  return !!(scene?.text || scene?.caption || scene?.caption2);
}

function hasSceneImage(scene) {
  return typeof scene?.draw === 'function';
}

function isSceneTextFullyShown(scene, progress, revealedScenes) {
  if (!hasSceneText(scene)) return true;
  if (revealedScenes.has(scene)) return true;
  return scene.text
    ? getTextRevealProgress(scene, progress) >= 1
    : getCaptionRevealProgress(scene, progress) >= 1;
}

function getTextRevealProgress(scene, progress, revealedScenes = new Set()) {
  if (revealedScenes.has(scene)) return 1;
  return smoothAppear(progress, 0.18, 0.58);
}

function getCaptionRevealProgress(scene, progress, revealedScenes = new Set()) {
  if (revealedScenes.has(scene)) return 1;
  return clamp((progress - 0.18) / (0.82 - 0.18), 0, 1);
}

function isSceneVisualFullyShown(scene, progress, revealedScenes) {
  return !hasSceneImage(scene) || revealedScenes.has(scene) || progress >= VISUAL_READY_PROGRESS;
}

function getSceneVisualProgress(scene, progress, revealedScenes) {
  return revealedScenes.has(scene) ? Math.max(progress, REVEALED_VISUAL_PROGRESS) : progress;
}
