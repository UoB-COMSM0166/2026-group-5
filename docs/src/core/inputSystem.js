// Keyboard input system: tracks pressed keys with timestamps for last-wins axis resolution.
export class InputSystem {
  #pressed;
  #interactPressed;
  #confirmPressed;
  #portalPlacePressed;
  #spaceHeld;
  #LEFT_CODES;
  #RIGHT_CODES;
  #UP_CODES;
  #DOWN_CODES;
  #SPRINT_CODES;

  // Set up key code sets for movement and sprint detection.
  constructor() {
    this.#pressed = new Map();
    this.#interactPressed = false;
    this.#confirmPressed = false;
    this.#portalPlacePressed = false;
    this.#spaceHeld = false;
    this.#LEFT_CODES = new Set(['KeyA', 'ArrowLeft']);
    this.#RIGHT_CODES = new Set(['KeyD', 'ArrowRight']);
    this.#UP_CODES = new Set(['KeyW', 'ArrowUp']);
    this.#DOWN_CODES = new Set(['KeyS', 'ArrowDown']);
    this.#SPRINT_CODES = new Set(['ShiftLeft', 'ShiftRight']);
  }

  // Record or remove a key press with a high-resolution timestamp.
  #setPressed(code, isDown) {
    if (!code) return;
    if (isDown) this.#pressed.set(code, performance.now());
    else this.#pressed.delete(code);
  }

  // Return the most recent press timestamp among a set of key codes.
  #latestTime(codes) {
    let best = -1;
    for (const code of codes) {
      const t = this.#pressed.get(code);
      if (typeof t === 'number' && t > best) best = t;
    }
    return best;
  }

  // Resolve a -1/0/+1 axis from two opposing key-code sets (last press wins).
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
    const isSpace = code === 'Space' || key === ' ' || k === 'spacebar';
    if (isSpace && !this.#spaceHeld) {
      this.#portalPlacePressed = true;
      this.#spaceHeld = true;
    }
    if (k === 'e') this.#interactPressed = true;
    if (k === 'enter' || isSpace) this.#confirmPressed = true;
  }

  onDomKeyUp(key, code = '') {
    this.#setPressed(code || key, false);
    const k = String(key || '').toLowerCase();
    if (code === 'Space' || key === ' ' || k === 'spacebar') this.#spaceHeld = false;
  }

  // Return current movement vector {x, y} and sprint flag.
  getMovement() {
    return {
      x: this.#axisValue(this.#LEFT_CODES, this.#RIGHT_CODES),
      y: this.#axisValue(this.#UP_CODES, this.#DOWN_CODES),
      sprint: this.#latestTime(this.#SPRINT_CODES) >= 0
    };
  }

  // Read and clear the one-shot interact flag (E key).
  consumeInteract() {
    const value = this.#interactPressed;
    this.#interactPressed = false;
    return value;
  }

  // Read and clear the one-shot confirm flag (Enter / Space).
  consumeConfirm() {
    const value = this.#confirmPressed;
    this.#confirmPressed = false;
    return value;
  }

  // Read and clear the one-shot portal placement flag (Space).
  consumePortalPlace() {
    const value = this.#portalPlacePressed;
    this.#portalPlacePressed = false;
    return value;
  }

  // Clear all tracked key state (used on window blur).
  reset() {
    this.#pressed.clear();
    this.#interactPressed = false;
    this.#confirmPressed = false;
    this.#portalPlacePressed = false;
    this.#spaceHeld = false;
  }

  debugPressed() {
    return Array.from(this.#pressed.keys());
  }
}
