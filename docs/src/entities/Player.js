import { Entity } from './Entity.js';

export class Player extends Entity {
  #speed;
  #sprint;
  #stamina;
  #staminaMax;
  #staminaDrain;
  #staminaRecover;
  #staminaRecoverDelay;
  #recoverCooldown;
  #moveX;
  #moveY;
  #footsteps;
  #footstepTrailX;
  #footstepTrailY;
  #lastFootstepAt;
  #footstepSide;

  constructor(x, y, w, h, settings = {}) {
    super(x, y, w, h, 'player');
    this.#speed = settings.speed || 72;
    this.#sprint = settings.sprint || 1.65;
    this.#stamina = settings.staminaMax || 100;
    this.#staminaMax = settings.staminaMax || 100;
    this.#staminaDrain = settings.staminaDrain || 33;
    this.#staminaRecover = settings.staminaRecover || 18;
    this.#staminaRecoverDelay = settings.staminaRecoverDelay || 0.55;
    this.#recoverCooldown = 0;
    this.#moveX = 0;
    this.#moveY = 0;
    this.#footsteps = [];
    this.#footstepTrailX = null;
    this.#footstepTrailY = null;
    this.#lastFootstepAt = 0;
    this.#footstepSide = 1;
  }

  get speed() { return this.#speed; }
  set speed(v) { this.#speed = v; }
  get sprint() { return this.#sprint; }
  set sprint(v) { this.#sprint = v; }
  get stamina() { return this.#stamina; }
  set stamina(v) { this.#stamina = v; }
  get staminaMax() { return this.#staminaMax; }
  set staminaMax(v) { this.#staminaMax = v; }
  get staminaDrain() { return this.#staminaDrain; }
  set staminaDrain(v) { this.#staminaDrain = v; }
  get staminaRecover() { return this.#staminaRecover; }
  set staminaRecover(v) { this.#staminaRecover = v; }
  get staminaRecoverDelay() { return this.#staminaRecoverDelay; }
  set staminaRecoverDelay(v) { this.#staminaRecoverDelay = v; }
  get recoverCooldown() { return this.#recoverCooldown; }
  set recoverCooldown(v) { this.#recoverCooldown = v; }
  get moveX() { return this.#moveX; }
  set moveX(v) { this.#moveX = v; }
  get moveY() { return this.#moveY; }
  set moveY(v) { this.#moveY = v; }
  get footsteps() { return this.#footsteps; }
  set footsteps(v) { this.#footsteps = v; }
  get footstepTrailX() { return this.#footstepTrailX; }
  set footstepTrailX(v) { this.#footstepTrailX = v; }
  get footstepTrailY() { return this.#footstepTrailY; }
  set footstepTrailY(v) { this.#footstepTrailY = v; }
  get lastFootstepAt() { return this.#lastFootstepAt; }
  set lastFootstepAt(v) { this.#lastFootstepAt = v; }
  get footstepSide() { return this.#footstepSide; }
  set footstepSide(v) { this.#footstepSide = v; }
}
