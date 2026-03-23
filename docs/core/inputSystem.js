export function createInputSystem() {
  const pressed = new Map();
  let interactPressed = false;
  let confirmPressed = false;

  const LEFT_CODES = new Set(['KeyA', 'ArrowLeft']);
  const RIGHT_CODES = new Set(['KeyD', 'ArrowRight']);
  const UP_CODES = new Set(['KeyW', 'ArrowUp']);
  const DOWN_CODES = new Set(['KeyS', 'ArrowDown']);
  const SPRINT_CODES = new Set(['ShiftLeft', 'ShiftRight']);

  function setPressed(code, isDown) {
    if (!code) return;
    if (isDown) pressed.set(code, performance.now());
    else pressed.delete(code);
  }

  function latestTime(codes) {
    let best = -1;
    for (const code of codes) {
      const t = pressed.get(code);
      if (typeof t === 'number' && t > best) best = t;
    }
    return best;
  }

  function axisValue(negativeCodes, positiveCodes) {
    const neg = latestTime(negativeCodes);
    const pos = latestTime(positiveCodes);
    if (neg < 0 && pos < 0) return 0;
    if (neg === pos) return 0;
    return neg > pos ? -1 : 1;
  }

  function reset() {
    pressed.clear();
    interactPressed = false;
    confirmPressed = false;
  }

  function getMovement() {
    return {
      x: axisValue(LEFT_CODES, RIGHT_CODES),
      y: axisValue(UP_CODES, DOWN_CODES),
      sprint: latestTime(SPRINT_CODES) >= 0
    };
  }

  function onDomKeyDown(key, code = '') {
    setPressed(code || key, true);
    const k = String(key || '').toLowerCase();
    if (k === 'e') interactPressed = true;
    if (k === 'enter' || key === ' ') confirmPressed = true;
  }

  function onDomKeyUp(key, code = '') {
    setPressed(code || key, false);
  }

  return {
    onKeyPressed(key, code) {
      onDomKeyDown(key, code);
    },
    onKeyReleased(key, code) {
      onDomKeyUp(key, code);
    },
    onDomKeyDown,
    onDomKeyUp,
    getMovement,
    consumeInteract() {
      const value = interactPressed;
      interactPressed = false;
      return value;
    },
    consumeConfirm() {
      const value = confirmPressed;
      confirmPressed = false;
      return value;
    },
    reset,
    debugPressed() {
      return Array.from(pressed.keys());
    }
  };
}
