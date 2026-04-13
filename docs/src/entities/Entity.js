// Base entity class for game actors (Player, NPC)
export class Entity {
  #x;
  #y;
  #w;
  #h;
  #facing;
  #moving;
  #anim;
  #characterType;
  #characterVariant;

  constructor(x, y, w, h, characterType = 'entity') {
    this.#x = x;
    this.#y = y;
    this.#w = w;
    this.#h = h;
    this.#facing = 'down';
    this.#moving = false;
    this.#anim = { mode: 'idle', frame: 0, timer: 0, facing: 'down' };
    this.#characterType = characterType;
    this.#characterVariant = 'default';
  }

  get x() { return this.#x; }
  set x(v) { this.#x = v; }
  get y() { return this.#y; }
  set y(v) { this.#y = v; }
  get w() { return this.#w; }
  get h() { return this.#h; }

  get facing() { return this.#facing; }
  set facing(v) { this.#facing = v; }

  get moving() { return this.#moving; }
  set moving(v) { this.#moving = v; }

  get anim() { return this.#anim; }
  set anim(v) { this.#anim = v; }

  get characterType() { return this.#characterType; }
  set characterType(v) { this.#characterType = v; }

  get characterVariant() { return this.#characterVariant; }
  set characterVariant(v) { this.#characterVariant = v; }

  get centerX() { return this.#x + this.#w / 2; }
  get centerY() { return this.#y + this.#h / 2; }
}
