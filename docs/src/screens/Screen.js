// Screen abstract base class for all game states
// Implements Template Method pattern - subclasses must override abstract methods
export class Screen {
  #name;
  #promptText;

  constructor(name, promptText = '') {
    this.#name = name;
    this.#promptText = promptText;
  }

  get name() { return this.#name; }
  get promptText() { return this.#promptText; }

  // Abstract method: subclasses MUST implement
  render(p, state) {
    throw new Error(`Abstract method 'render' must be implemented by ${this.constructor.name}`);
  }

  // Optional hook: subclasses MAY override
  update(state, deltaTime) {
    // Default: no-op
  }

  // Optional hook: subclasses MAY override
  reset(_state) {
    // Default: no-op
  }

  // Optional hook: subclasses MAY override
  handleKey(key, state, api) {
    return false;
  }

  // Optional hook: subclasses MAY override
  handleMouse(mouseX, mouseY, p, state, api) {
    return false;
  }
}
