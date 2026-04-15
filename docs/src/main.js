// Entry point: creates p5.js canvas, boots game core, wires DOM buttons and keyboard.
import { createGameCore } from './core/gameCore.js';

const game = createGameCore({ initialLevel: 'map1' });
let p5Instance = null;

const DESIGN_W = 960;
const DESIGN_H = 640;

function getLayoutScale() {
  const layout = document.querySelector('.game-layout');
  return parseFloat(layout?.style.getPropertyValue('--layout-scale')) || 1;
}

function getCanvasSize() {
  return { width: DESIGN_W, height: DESIGN_H };
}

let debugScaleInfo = {};
let showScaleDebug = false;

function applyCanvasDensity(density) {
  p5Instance.pixelDensity(density);
  p5Instance.resizeCanvas(DESIGN_W, DESIGN_H);
  const cvs = document.querySelector('#game-root canvas');
  if (cvs) { cvs.style.width = ''; cvs.style.height = ''; }
  p5Instance.noSmooth();
}

function updateLayoutScale() {
  const layout = document.querySelector('.game-layout');
  const topbar = document.querySelector('.topbar');
  if (!layout) return;

  const designWidth = 16 + DESIGN_W + 16 + 260 + 16;
  const designHeight = 16 + DESIGN_H + 16;

  const topbarHeight = topbar?.offsetHeight || 52;
  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight - topbarHeight;

  const sx = availableWidth / designWidth;
  const sy = availableHeight / designHeight;
  const layoutScale = Math.min(sx, sy);

  layout.style.setProperty('--layout-scale', layoutScale);

  if (p5Instance) {
    const dpr = window.devicePixelRatio || 1;
    const density = layoutScale * dpr;
    const cvs = document.querySelector('#game-root canvas');
    const oldDensity = p5Instance.pixelDensity();

    debugScaleInfo = {
      layoutScale: layoutScale.toFixed(4),
      dpr: dpr.toFixed(2),
      density: density.toFixed(4),
      oldDensity: oldDensity.toFixed(4),
      logicalSize: `${p5Instance.width}x${p5Instance.height}`,
      bufferSize: cvs ? `${cvs.width}x${cvs.height}` : 'N/A',
      cssSize: cvs ? `${cvs.clientWidth}x${cvs.clientHeight}` : 'N/A',
      innerWindow: `${window.innerWidth}x${window.innerHeight}`,
      topbarH: topbarHeight,
    };
    console.log('[SCALE DEBUG]', debugScaleInfo);

    if (Math.abs(oldDensity - density) > 0.01) {
      applyCanvasDensity(density);
      debugScaleInfo.bufferSize = cvs ? `${cvs.width}x${cvs.height}` : 'N/A';
      debugScaleInfo.cssSize = cvs ? `${cvs.clientWidth}x${cvs.clientHeight}` : 'N/A';
      console.log('[SCALE DEBUG] after resize:', debugScaleInfo);
    }
  }
}

window.addEventListener('load', updateLayoutScale);
window.addEventListener('resize', updateLayoutScale);

new window.p5((p) => {
  p.setup = async () => {
    p5Instance = p;
    const { width, height } = getCanvasSize();
    const s = getLayoutScale();
    const dpr = window.devicePixelRatio || 1;
    p.pixelDensity(s * dpr);
    const canvas = p.createCanvas(width, height);
    canvas.parent('game-root');
    canvas.elt.style.width = '';
    canvas.elt.style.height = '';
    try {
      canvas.elt.tabIndex = 0;
      canvas.elt.setAttribute('aria-label', 'game canvas');
      canvas.elt.focus();
    } catch (e) {}
    p.noSmooth();
    try {
      await game.loadAssets(p);
    } catch (error) {
      console.error('Asset load error:', error);
    }
    game.setup();
    game.onResize?.(p.width, p.height);

    // Nudge: force browser reflow/recomposite to fix stale canvas rendering.
    // Temporarily shift layout scale, wait one frame, then restore.
    setTimeout(() => {
      const layout = document.querySelector('.game-layout');
      if (!layout) return;
      const real = getLayoutScale();
      layout.style.setProperty('--layout-scale', real * 0.99);
      layout.offsetHeight; // force synchronous reflow
      requestAnimationFrame(() => {
        layout.style.setProperty('--layout-scale', real);
        requestAnimationFrame(() => updateLayoutScale());
      });
    }, 200);
  };

  p.draw = () => {
    p.background(10, 12, 18);
    const dt = Math.min(0.05, p.deltaTime / 1000 || 0.016);
    game.update(dt);
    game.render(p);

    if (showScaleDebug) {
      const cvs = document.querySelector('#game-root canvas');
      const info = [
        `layoutScale: ${debugScaleInfo.layoutScale}`,
        `dpr: ${debugScaleInfo.dpr}`,
        `pixelDensity: ${p.pixelDensity().toFixed(4)}`,
        `p.width x p.height: ${p.width}x${p.height}`,
        `buffer (canvas.width x height): ${cvs ? cvs.width : '?'}x${cvs ? cvs.height : '?'}`,
        `css (clientW x clientH): ${cvs ? cvs.clientWidth : '?'}x${cvs ? cvs.clientHeight : '?'}`,
        `window.inner: ${window.innerWidth}x${window.innerHeight}`,
        `expected buffer: ${Math.round(DESIGN_W * p.pixelDensity())}x${Math.round(DESIGN_H * p.pixelDensity())}`,
        `ratio buf/css: ${cvs ? (cvs.width / cvs.clientWidth).toFixed(3) : '?'}`,
        `F8 = force refresh | F9 = toggle this`,
      ];
      p.push();
      p.resetMatrix();
      p.noStroke();
      p.fill(0, 0, 0, 180);
      p.rect(4, 4, 380, info.length * 16 + 8, 6);
      p.fill(0, 255, 100);
      p.textSize(12);
      p.textAlign(p.LEFT, p.TOP);
      p.textFont('monospace');
      info.forEach((line, i) => p.text(line, 10, 10 + i * 16));
      p.pop();
    }
  };

  p.keyPressed = (event) => {
    if (event) event.preventDefault?.();
    if (p.keyCode === 120) { // F9
      showScaleDebug = !showScaleDebug;
      return false;
    }
    if (p.keyCode === 119) { // F8
      console.log('[SCALE DEBUG] F8 forced refresh');
      const dpr2 = window.devicePixelRatio || 1;
      const s2 = getLayoutScale();
      applyCanvasDensity(s2 * dpr2);
      return false;
    }
    game.onKeyPressed?.(p.key, p.keyCode);
    return false;
  };

  p.keyReleased = (event) => {
    if (event) event.preventDefault?.();
    game.onKeyReleased?.(p.key, event?.code || p.keyCode);
    return false;
  };

  p.windowResized = () => {
    updateLayoutScale();
  };

  p.mouseWheel = (event) => {
    game.onMouseWheel?.(event.delta, p.mouseX, p.mouseY);
    return false;
  };

  p.mousePressed = () => {
    game.onMousePressed?.(p.mouseX, p.mouseY, p.mouseButton, p);
    return false;
  };
}, document.getElementById('game-root'));

window.addEventListener('blur', () => game.onWindowBlur?.());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.onWindowBlur?.(); });


window.addEventListener('keydown', (event) => {
  if (event.repeat) {
    const key = String(event.key || '').toLowerCase();
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)) {
      event.preventDefault();
    }
  }
  game.onDomKeyDown?.(event.key, event.code);
}, { passive: false });

window.addEventListener('keyup', (event) => {
  game.onDomKeyUp?.(event.key, event.code);
}, { passive: false });

// Tips rotation system
const TIPS = [
  "Lights off reduces NPC's field of view.",
  "NPC slower when opening doors.",
  "NPC vision blocked by obstacles.",
  "Try hiding behind obstacles when chased.",
  "Chests may have keys.",
  "Chests may hold secret notes.",
  "NPC runs faster when chasing.",
  "NPC alert increases with sight time.",
  "NPC notices lights off and doors closed.",
  "Fog clears as you explore.",
  "NPC spots footprints left while sprinting."
];

let currentTipIndex = 0;
let tipsInterval = null;

function rotateTips() {
  const tipsElement = document.getElementById('tips-text');
  if (!tipsElement) return;

  // Pick a random tip different from current
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * TIPS.length);
  } while (newIndex === currentTipIndex && TIPS.length > 1);

  currentTipIndex = newIndex;
  tipsElement.textContent = TIPS[currentTipIndex];
}

function startTipsRotation() {
  if (tipsInterval) clearInterval(tipsInterval);
  tipsInterval = setInterval(rotateTips, 5000);
}

function stopTipsRotation() {
  if (tipsInterval) {
    clearInterval(tipsInterval);
    tipsInterval = null;
  }
}

// Start rotation when page loads
window.addEventListener('load', () => {
  startTipsRotation();
});

// Pause when tab is hidden, resume when visible
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopTipsRotation();
  } else {
    startTipsRotation();
  }
});
