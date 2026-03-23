import { createGameCore } from './core/gameCore.js';

const game = createGameCore({ initialLevel: 'map1' });

function getCanvasSize() {
  const root = document.getElementById('game-root');
  const rect = root?.getBoundingClientRect();
  return {
    width: Math.max(640, Math.floor(rect?.width || 960)),
    height: Math.max(480, Math.floor(rect?.height || 640))
  };
}

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
    game.onKeyPressed?.(p.key, event?.code || p.keyCode);
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
}, document.getElementById('game-root'));

document.querySelectorAll('[data-level]').forEach((button) => {
  button.addEventListener('click', () => game.switchLevel?.(button.dataset.level));
});
document.getElementById('restartBtn')?.addEventListener('click', () => game.restartLevel?.());

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
