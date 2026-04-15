import { Entity } from './Entity.js';

// NPC entity with patrol, search, chase state, vision, and pathfinding data.
export class NPC extends Entity {
  #id;
  #state;
  #stateChangedAt;
  #waypoints;
  #wpIndex;
  #alert;
  #alertLevel;
  #alertThreshold;
  #alertCooldown;
  #lastSeenX;
  #lastSeenY;
  #searchTargetX;
  #searchTargetY;
  #searchBaseX;
  #searchBaseY;
  #searchReason;
  #searchTimer;
  #searchScanStepTimer;
  #searchScanIndex;
  #searchMoveTargetX;
  #searchMoveTargetY;
  #roomLightResponse;
  #collisionInsetX;
  #collisionInsetY;
  #speedPatrol;
  #speedChase;
  #patrolRouteJoined;
  #patrolForward;
  #doorCloseTarget;
  #stuckSampleTimer;
  #stuckOriginX;
  #stuckOriginY;
  #homeX;
  #homeY;
  #vision;

  // Initialise NPC behaviour parameters, waypoints, and tracking fields.
  constructor(x, y, w, h, settings = {}) {
    super(x, y, w, h, 'npc');
    this.#id = settings.id || `npc-${Math.random().toString(36).slice(2, 8)}`;
    this.#state = settings.state || 'PATROL';
    this.#stateChangedAt = 0;
    this.#waypoints = settings.waypoints || [];
    this.#wpIndex = 0;
    this.#alert = 0;
    this.#alertLevel = 0;
    this.#alertThreshold = settings.alertThreshold || 1.0;
    this.#alertCooldown = settings.alertCooldown || 0.5;
    this.#lastSeenX = null;
    this.#lastSeenY = null;
    this.#searchTargetX = null;
    this.#searchTargetY = null;
    this.#searchBaseX = null;
    this.#searchBaseY = null;
    this.#searchReason = '';
    this.#searchTimer = 0;
    this.#searchScanStepTimer = 0;
    this.#searchScanIndex = 0;
    this.#searchMoveTargetX = null;
    this.#searchMoveTargetY = null;
    this.#roomLightResponse = null;
    this.#collisionInsetX = settings.collisionInsetX || 2;
    this.#collisionInsetY = settings.collisionInsetY || 2;
    this.#speedPatrol = settings.speedPatrol || 55;
    this.#speedChase = settings.speedChase || 82;
    this.#patrolRouteJoined = false;
    this.#patrolForward = true;
    this.#doorCloseTarget = null;
    this.#stuckSampleTimer = 0;
    this.#stuckOriginX = x;
    this.#stuckOriginY = y;
    this.#homeX = settings.homeX ?? x;
    this.#homeY = settings.homeY ?? y;
    this.#vision = null;
  }

  get state() { return this.#state; }
  set state(v) { this.#state = v; }
  get waypoints() { return this.#waypoints; }
  set waypoints(v) { this.#waypoints = v; }
  get wpIndex() { return this.#wpIndex; }
  set wpIndex(v) { this.#wpIndex = v; }
  get alert() { return this.#alert; }
  set alert(v) { this.#alert = v; }
  get alertThreshold() { return this.#alertThreshold; }
  set alertThreshold(v) { this.#alertThreshold = v; }
  get alertCooldown() { return this.#alertCooldown; }
  set alertCooldown(v) { this.#alertCooldown = v; }
  get lastSeenX() { return this.#lastSeenX; }
  set lastSeenX(v) { this.#lastSeenX = v; }
  get lastSeenY() { return this.#lastSeenY; }
  set lastSeenY(v) { this.#lastSeenY = v; }
  get searchTargetX() { return this.#searchTargetX; }
  set searchTargetX(v) { this.#searchTargetX = v; }
  get searchTargetY() { return this.#searchTargetY; }
  set searchTargetY(v) { this.#searchTargetY = v; }
  get searchBaseX() { return this.#searchBaseX; }
  set searchBaseX(v) { this.#searchBaseX = v; }
  get searchBaseY() { return this.#searchBaseY; }
  set searchBaseY(v) { this.#searchBaseY = v; }
  get searchReason() { return this.#searchReason; }
  set searchReason(v) { this.#searchReason = v; }
  get searchTimer() { return this.#searchTimer; }
  set searchTimer(v) { this.#searchTimer = v; }
  get searchScanStepTimer() { return this.#searchScanStepTimer; }
  set searchScanStepTimer(v) { this.#searchScanStepTimer = v; }
  get searchMoveTargetX() { return this.#searchMoveTargetX; }
  set searchMoveTargetX(v) { this.#searchMoveTargetX = v; }
  get searchMoveTargetY() { return this.#searchMoveTargetY; }
  set searchMoveTargetY(v) { this.#searchMoveTargetY = v; }
  get roomLightResponse() { return this.#roomLightResponse; }
  set roomLightResponse(v) { this.#roomLightResponse = v; }
  get collisionInsetX() { return this.#collisionInsetX; }
  set collisionInsetX(v) { this.#collisionInsetX = v; }
  get collisionInsetY() { return this.#collisionInsetY; }
  set collisionInsetY(v) { this.#collisionInsetY = v; }
  get speedPatrol() { return this.#speedPatrol; }
  set speedPatrol(v) { this.#speedPatrol = v; }
  get speedChase() { return this.#speedChase; }
  set speedChase(v) { this.#speedChase = v; }
  get id() { return this.#id; }
  set id(v) { this.#id = v; }
  get stateChangedAt() { return this.#stateChangedAt; }
  set stateChangedAt(v) { this.#stateChangedAt = v; }
  get alertLevel() { return this.#alertLevel; }
  set alertLevel(v) { this.#alertLevel = v; }
  get searchScanIndex() { return this.#searchScanIndex; }
  set searchScanIndex(v) { this.#searchScanIndex = v; }
  get patrolForward() { return this.#patrolForward; }
  set patrolForward(v) { this.#patrolForward = v; }
  get patrolRouteJoined() { return this.#patrolRouteJoined; }
  set patrolRouteJoined(v) { this.#patrolRouteJoined = v; }
  get homeX() { return this.#homeX; }
  set homeX(v) { this.#homeX = v; }
  get homeY() { return this.#homeY; }
  set homeY(v) { this.#homeY = v; }
  get vision() { return this.#vision; }
  set vision(v) { this.#vision = v; }
  get doorCloseTarget() { return this.#doorCloseTarget; }
  set doorCloseTarget(v) { this.#doorCloseTarget = v; }
  get stuckSampleTimer() { return this.#stuckSampleTimer; }
  set stuckSampleTimer(v) { this.#stuckSampleTimer = v; }
  get stuckOriginX() { return this.#stuckOriginX; }
  set stuckOriginX(v) { this.#stuckOriginX = v; }
  get stuckOriginY() { return this.#stuckOriginY; }
  set stuckOriginY(v) { this.#stuckOriginY = v; }
}
