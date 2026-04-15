// Map factory: ES6 Level class - builds a runtime level from map spec
import { DoorSystem } from '../systems/doorSystem.js';
import { BoxSystem } from '../systems/boxSystem.js';
import { RoomSystem } from '../systems/roomSystem.js';
import { MissionSystem } from '../systems/missionSystem.js';
import { Player } from '../entities/Player.js';
import { NPC } from '../entities/NPC.js';

export class Level {
  #id;
  #settings;
  #collision;
  #player;
  #npcs;
  #source;
  #spec;
  #mapData;
  #mapWidth;
  #mapHeight;
  #worldWidth;
  #worldHeight;
  #doorSystem;
  #boxSystem;
  #roomSystem;
  #missionSystem;

  constructor(levelId, spec) {
    this.#id = levelId;
    this.#settings = this.#buildSettings(spec);
    this.#collision = this.#clone(spec?.collisionMatrix || []);
    this.#mapData = this.#clone(spec?.mapData || null);
    const roomMatrix = this.#clone(spec?.roomMatrix || []);

    const spawnTile = {
      x: spec?.defaultSpawn?.x || 2,
      y: spec?.defaultSpawn?.y || 2
    };

    this.#player = this.#createPlayer(spawnTile, spec);
    this.#npcs = (spec?.npcs || []).map((npc) => this.#normalizeNpc(npc));

    this.#mapWidth = this.#mapData?.width || (this.#collision[0]?.length || 0);
    this.#mapHeight = this.#mapData?.height || (this.#collision.length || 0);
    this.#worldWidth = this.#mapWidth * this.#settings.baseTile;
    this.#worldHeight = this.#mapHeight * this.#settings.baseTile;

    const entities = this.#clone(spec?.entities || { doors: [], chests: [] });

    this.#doorSystem = new DoorSystem(this.#mapData, this.#settings.baseTile, entities.doors || [], this.#collision);
    this.#boxSystem = new BoxSystem(this.#mapData, entities.chests || [], this.#settings.baseTile);
    this.#roomSystem = new RoomSystem(roomMatrix, {
      baseTile: this.#settings.baseTile,
      searchDuration: this.#settings.searchDuration,
      normalVisionMultiplier: this.#settings.normalVisionMultiplier,
      darkVisionMultiplier: this.#settings.darkVisionMultiplier,
      chaseVisionMultiplier: this.#settings.chaseVisionMultiplier,
      doors: [...this.#doorSystem.doors],
      manualButtons: spec?.manualLightButtons || []
    });
    this.#roomSystem.attachNpcs(this.#npcs);

    this.#missionSystem = new MissionSystem(this.#collision, this.#settings.baseTile, spawnTile, this.#boxSystem.boxes.length, spec?.objective || {});

    this.#source = spec?.source || spec;
    this.#spec = spec;
  }

  // Getters
  get id() { return this.#id; }
  get settings() { return { ...this.#settings }; }
  get collision() { return this.#collision; }
  get player() { return this.#player; }
  get npcs() { return [...this.#npcs]; }
  get source() { return this.#source; }
  get spec() { return this.#spec; }
  get mapData() { return this.#mapData; }
  get mapWidth() { return this.#mapWidth; }
  get mapHeight() { return this.#mapHeight; }
  get worldWidth() { return this.#worldWidth; }
  get worldHeight() { return this.#worldHeight; }
  get doorSystem() { return this.#doorSystem; }
  get boxSystem() { return this.#boxSystem; }
  get roomSystem() { return this.#roomSystem; }
  get missionSystem() { return this.#missionSystem; }

  // Private helper methods
  #clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  #tileToPixel(tile) {
    return tile * this.#settings.baseTile;
  }

  #buildSettings(spec) {
    return {
      baseTile: spec?.settings?.baseTile || 16,
      visionRange: spec?.settings?.visionRange || 112,
      searchDuration: spec?.settings?.searchDuration || 3.5,
      chaseVisionMultiplier: spec?.settings?.chaseVisionMultiplier || 1.2,
      darkVisionMultiplier: spec?.settings?.darkVisionMultiplier || 0.6,
      normalVisionMultiplier: spec?.settings?.normalVisionMultiplier || 1,
      lightingMode: spec?.settings?.lightingMode || 'tile_darkness',
      ...this.#clone(spec?.settings || {})
    };
  }

  #createPlayer(spawnTile, spec) {
    const x = this.#tileToPixel(spawnTile.x) + (spec?.player?.spawnOffsetX || 0);
    const y = this.#tileToPixel(spawnTile.y) + (spec?.player?.spawnOffsetY || 0);
    return new Player(x, y, 12, 12, {
      facing: String(spec?.player?.facing || 'down').toLowerCase(),
      characterVariant: spec?.player?.characterVariant || 'default',
      speed: spec?.player?.speed,
      sprint: spec?.player?.sprint,
      staminaMax: spec?.player?.staminaMax,
      staminaDrain: spec?.player?.staminaDrain,
      staminaRecover: spec?.player?.staminaRecover,
      staminaRecoverDelay: spec?.player?.staminaRecoverDelay
    });
  }

  #normalizeNpc(npc) {
    const x = this.#tileToPixel(npc.x);
    const y = this.#tileToPixel(npc.y);
    const waypoints = (npc.waypoints || []).map((point) => ({
      x: this.#tileToPixel(point.x),
      y: this.#tileToPixel(point.y)
    }));
    return new NPC(x, y, 12, 12, {
      id: npc.id,
      homeX: x,
      homeY: y,
      collisionInsetX: npc.collisionInsetX ?? 1,
      collisionInsetY: npc.collisionInsetY ?? 2,
      facing: String(npc.facing || 'down').toLowerCase(),
      waypoints,
      alertThreshold: npc.alertThreshold,
      alertCooldown: npc.alertCooldown,
      speedPatrol: npc.speedPatrol,
      speedChase: npc.speedChase
    });
  }
}

// Backward compatibility - factory function wraps class
export function createRuntimeLevel(levelId, spec) {
  return new Level(levelId, spec);
}
