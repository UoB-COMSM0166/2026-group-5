// Keyboard input: tracks pressed keys with timestamps for last-wins axis resolution.
export class InputSystem {
  #pressed;
  #interactPressed;
  #confirmPressed;
  #LEFT_CODES;
  #RIGHT_CODES;
  #UP_CODES;
  #DOWN_CODES;
  #SPRINT_CODES;

  constructor() {
    this.#pressed = new Map();
    this.#interactPressed = false;
    this.#confirmPressed = false;
    this.#LEFT_CODES = new Set(['KeyA', 'ArrowLeft']);
    this.#RIGHT_CODES = new Set(['KeyD', 'ArrowRight']);
    this.#UP_CODES = new Set(['KeyW', 'ArrowUp']);
    this.#DOWN_CODES = new Set(['KeyS', 'ArrowDown']);
    this.#SPRINT_CODES = new Set(['ShiftLeft', 'ShiftRight']);
  }

  #setPressed(code, isDown) {
    if (!code) return;
    if (isDown) this.#pressed.set(code, performance.now());
    else this.#pressed.delete(code);
  }

  #latestTime(codes) {
    let best = -1;
    for (const code of codes) {
      const t = this.#pressed.get(code);
      if (typeof t === 'number' && t > best) best = t;
    }
    return best;
  }

  #axisValue(negativeCodes, positiveCodes) {
    const neg = this.#latestTime(negativeCodes);
    const pos = this.#latestTime(positiveCodes);
    if (neg < 0 && pos < 0) return 0;
    if (neg === pos) return 0;
    return neg > pos ? -1 : 1;
  }

  onKeyPressed(key, code) {
    this.onDomKeyDown(key, code);
  }

  onKeyReleased(key, code) {
    this.onDomKeyUp(key, code);
  }

  onDomKeyDown(key, code = '') {
    this.#setPressed(code || key, true);
    const k = String(key || '').toLowerCase();
    if (k === 'e') this.#interactPressed = true;
    if (k === 'enter' || key === ' ') this.#confirmPressed = true;
  }

  onDomKeyUp(key, code = '') {
    this.#setPressed(code || key, false);
  }

  getMovement() {
    return {
      x: this.#axisValue(this.#LEFT_CODES, this.#RIGHT_CODES),
      y: this.#axisValue(this.#UP_CODES, this.#DOWN_CODES),
      sprint: this.#latestTime(this.#SPRINT_CODES) >= 0
    };
  }

  consumeInteract() {
    const value = this.#interactPressed;
    this.#interactPressed = false;
    return value;
  }

  consumeConfirm() {
    const value = this.#confirmPressed;
    this.#confirmPressed = false;
    return value;
  }

  reset() {
    this.#pressed.clear();
    this.#interactPressed = false;
    this.#confirmPressed = false;
  }

  debugPressed() {
    return Array.from(this.#pressed.keys());
  }
}
