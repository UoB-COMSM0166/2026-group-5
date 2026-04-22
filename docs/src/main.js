// Entry point: creates p5.js canvas, boots game core, wires DOM buttons and keyboard.
import { createGameCore } from './core/gameCore.js';

const game = createGameCore({ initialLevel: 'map1' });
//window.__game = game; // for testing purpose
let p5Instance = null;

// Loading screen elements
const loadingScreen = document.getElementById('loading-screen');
const loadingProgressBar = document.getElementById('loading-progress-bar');
const loadingPercent = document.getElementById('loading-percent');
const loadingTipText = document.getElementById('loading-tip-text');
let loadingTipIdx = 0;
let loadingTipInterval = null;

// Update loading progress UI
function updateLoadingProgress(completed, total) {
  const percent = Math.round((completed / total) * 100);
  if (loadingProgressBar) {
    loadingProgressBar.style.width = `${percent}%`;
  }
  if (loadingPercent) {
    loadingPercent.textContent = percent;
  }
}

// Hide loading screen with fade-out animation
function hideLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    // Remove from DOM after animation completes
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }
}

const DESIGN_W = 960;
const DESIGN_H = 640;

function getLayoutScale() {
  const layout = document.querySelector('.game-layout');
  return parseFloat(layout?.style.getPropertyValue('--layout-scale')) || 1;
}

function getCanvasSize() {
  return { width: DESIGN_W, height: DESIGN_H };
}


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

    if (Math.abs(oldDensity - density) > 0.01) {
      applyCanvasDensity(density);
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
    // Start loading tip rotation
    loadingTipInterval = setInterval(() => {
      if (!loadingTipText) return;
      let next;
      do { next = Math.floor(Math.random() * TIPS.length); } while (next === loadingTipIdx && TIPS.length > 1);
      loadingTipIdx = next;
      loadingTipText.style.transition = 'opacity 0.3s';
      loadingTipText.style.opacity = '0';
      setTimeout(() => {
        loadingTipText.textContent = TIPS[loadingTipIdx];
        loadingTipText.style.opacity = '1';
      }, 300);
    }, 3000);
    try {
      // Load assets with progress tracking
      await game.loadAssets(p, ({ completed, total }) => {
        updateLoadingProgress(completed, total);
      });
    } catch (error) {
      // Asset load error handled silently
    }
    if (loadingTipInterval) clearInterval(loadingTipInterval);
    game.setup();
    game.onResize?.(p.width, p.height);

    // Hide loading screen after everything is ready
    setTimeout(() => {
      hideLoadingScreen();
    }, 300);

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

  };

  p.keyPressed = (event) => {
    if (event) event.preventDefault?.();
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
