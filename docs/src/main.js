// Entry point: creates p5.js canvas, boots game core, wires DOM buttons and keyboard.
import { createGameCore } from './core/gameCore.js';

const game = createGameCore({ initialLevel: 'map1' });

function getCanvasSize() {
  return { width: 960, height: 640 };
}

// Whole-layout scaling - game + HUD + stamina scale as one unit like a PNG
function updateLayoutScale() {
  const layout = document.querySelector('.game-layout');
  const topbar = document.querySelector('.topbar');
  if (!layout) return;

  // Design dimensions of .game-layout (padding + grid + gap)
  const designWidth = 16 + 960 + 16 + 260 + 16;   // 1268px
  const designHeight = 16 + 640 + 16;               // 672px

  const topbarHeight = topbar?.offsetHeight || 52;
  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight - topbarHeight;

  const scaleX = availableWidth / designWidth;
  const scaleY = availableHeight / designHeight;
  const scale = Math.min(scaleX, scaleY);

  layout.style.setProperty('--layout-scale', scale);
}

window.addEventListener('load', updateLayoutScale);
window.addEventListener('resize', updateLayoutScale);

new window.p5((p) => {
  p.setup = async () => {
    const { width, height } = getCanvasSize();
    const canvas = p.createCanvas(width, height);
    canvas.parent('game-root');
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
    const { width, height } = getCanvasSize();
    p.resizeCanvas(width, height);
    game.onResize?.(width, height);
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
