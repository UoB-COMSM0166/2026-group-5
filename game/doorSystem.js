// doorSystem.js - Door interaction + animation + ground overlay (pure script)
class DoorSystem {
  constructor(options = {}) {
    this.durationMs = options.durationMs ?? 300;
    this.groundLayerNames = new Set(options.groundLayerNames ?? ['floor', 'purplefloor']);
    this.doorLayerNames = new Set(options.doorLayerNames ?? ['door', 'door_lateral']);

    this.renderer = null;

    this.doorIndex = null;

    // animation
    this._doorRaf = null;
    this._animDoors = new Set(); // Set<doorObj>
    this._animCells = new Map(); // key "layerName:x,y" -> alpha(0..1)

    // ground cache
    this.groundCanvas = null;
    this.groundCtx = null;
  }

  init(renderer) {
    this.renderer = renderer;
    this.buildDoorIndex();
    this.buildGroundCache();
  }

  onResize() {
    this.buildGroundCache();
  }

  buildDoorIndex() {
    const r = this.renderer;
    this.doorIndex = new Map();

    const layers = r.mapData.layers.filter(l => l.type === 'tilelayer' && Array.isArray(l.data));
    const w = r.mapData.width;
    const h = r.mapData.height;

    const get = (layer, x, y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return 0;
      return layer.data[y * w + x] || 0;
    };

    for (const layer of layers) {
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          if (get(layer, x, y) === 59 &&
              get(layer, x + 1, y) === 60 &&
              get(layer, x, y + 1) === 61 &&
              get(layer, x + 1, y + 1) === 62) {

            const door = { kind: 'door2x2', layer, x, y, isOpen: false, _anim: null };

            this.doorIndex.set(`${x},${y}`, door);
            this.doorIndex.set(`${x+1},${y}`, door);
            this.doorIndex.set(`${x},${y+1}`, door);
            this.doorIndex.set(`${x+1},${y+1}`, door);
          }
        }
      }
    }

    for (const layer of layers) {
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w; x++) {
          if (get(layer, x, y) === 83 && get(layer, x, y + 1) === 84) {
            const door = { kind: 'door1x2', layer, x, y, isOpen: false, _anim: null };
            this.doorIndex.set(`${x},${y}`, door);
            this.doorIndex.set(`${x},${y+1}`, door);
          }
        }
      }
    }

    console.log('[DoorSystem] doorIndex built:', this.doorIndex.size);
  }

  toggleDoorAt(tileX, tileY) {
    if (!this.doorIndex) this.buildDoorIndex();
    const door = this.doorIndex.get(`${tileX},${tileY}`);
    if (!door) return false;
    return this.toggleDoorByObj(door);
  }

  toggleDoorByObj(door) {
    if (door._anim) return false;

    if (!door.isOpen) {
      this.startDoorAnimation(door, true);
      return true;
    } else {
      this.startDoorAnimation(door, false);
      return true;
    }
  }

  startDoorAnimation(door, opening) {
    door._anim = { opening, start: performance.now(), duration: this.durationMs };

    if (!opening) {
      this.restoreDoorTiles(door);
      door.isOpen = false;
    }

    this._animDoors.add(door);
    if (!this._doorRaf) this._doorRaf = requestAnimationFrame(this.stepDoorAnimations.bind(this));
  }

  restoreDoorTiles(door) {
    const r = this.renderer;
    const W = r.mapData.width;
    const set = (x, y, gid) => { door.layer.data[y * W + x] = gid; };

    if (door.kind === 'door2x2') {
      set(door.x, door.y, 59);
      set(door.x + 1, door.y, 60);
      set(door.x, door.y + 1, 61);
      set(door.x + 1, door.y + 1, 62);
    } else {
      set(door.x, door.y, 83);
      set(door.x, door.y + 1, 84);
    }
  }

  clearDoorTiles(door) {
    const r = this.renderer;
    const W = r.mapData.width;
    const set0 = (x, y) => { door.layer.data[y * W + x] = 0; };

    const cells = (door.kind === 'door2x2')
      ? [[door.x, door.y], [door.x+1, door.y], [door.x, door.y+1], [door.x+1, door.y+1]]
      : [[door.x, door.y], [door.x, door.y+1]];

    for (const [x, y] of cells) set0(x, y);
  }

  stepDoorAnimations(now) {
    this._animCells.clear();

    const done = [];
    for (const door of this._animDoors) {
      const a = door._anim;
      if (!a) { done.push(door); continue; }

      const p = Math.min(1, Math.max(0, (now - a.start) / a.duration));
      const alpha = a.opening ? (1 - p) : p;

      const cells = (door.kind === 'door2x2')
        ? [[door.x, door.y], [door.x+1, door.y], [door.x, door.y+1], [door.x+1, door.y+1]]
        : [[door.x, door.y], [door.x, door.y+1]];

      for (const [x, y] of cells) {
        this._animCells.set(`${door.layer.name}:${x},${y}`, alpha);
      }

      if (p >= 1) {
        if (a.opening) {
          this.clearDoorTiles(door);
          door.isOpen = true;
        }
        door._anim = null;
        done.push(door);
      }
    }

    for (const d of done) this._animDoors.delete(d);

    this.renderer.render();

    if (this._animDoors.size > 0) {
      this._doorRaf = requestAnimationFrame(this.stepDoorAnimations.bind(this));
    } else {
      this._doorRaf = null;
    }
  }

  buildGroundCache() {
    const r = this.renderer;
    if (!r || !r.mapData) return;

    this.groundCanvas = document.createElement('canvas');
    this.groundCanvas.width = r.canvas.width;
    this.groundCanvas.height = r.canvas.height;
    this.groundCtx = this.groundCanvas.getContext('2d');

    this.groundCtx.fillStyle = '#0f0f1a';
    this.groundCtx.fillRect(0, 0, this.groundCanvas.width, this.groundCanvas.height);

    const old = r.ctx;
    r.ctx = this.groundCtx;
    for (const layer of r.mapData.layers) {
      if (!layer.visible || layer.type !== 'tilelayer') continue;
      if (!this.groundLayerNames.has(layer.name)) continue;
      r.renderLayer(layer, -1);
    }
    r.ctx = old;
  }

  drawDoorGroundOverlay() {
    const r = this.renderer;
    if (!this.groundCanvas || !this.doorIndex) return;

    const uniqueDoors = new Set();
    for (const d of this.doorIndex.values()) uniqueDoors.add(d);

    for (const door of uniqueDoors) {
      const openingAnim = door._anim && door._anim.opening;
      if (!(door.isOpen || openingAnim)) continue;

      const cells = (door.kind === 'door2x2')
        ? [[door.x, door.y], [door.x+1, door.y], [door.x, door.y+1], [door.x+1, door.y+1]]
        : [[door.x, door.y], [door.x, door.y+1]];

      for (const [tx, ty] of cells) {
        const px = tx * r.BASE_TILE_SIZE * r.scale;
        const py = ty * r.BASE_TILE_SIZE * r.scale;
        const pw = r.BASE_TILE_SIZE * r.scale;
        const ph = r.BASE_TILE_SIZE * r.scale;
        r.ctx.drawImage(this.groundCanvas, px, py, pw, ph, px, py, pw, ph);
      }
    }
  }

  renderAnimatedDoors() {
    const r = this.renderer;
    if (!this._animCells || this._animCells.size === 0) return;

    const W = r.mapData.width;
    const layers = r.mapData.layers.filter(l => l.type === 'tilelayer' && Array.isArray(l.data));
    const doorLayers = layers.filter(l => this.doorLayerNames.has(l.name));

    for (const layer of doorLayers) {
      for (const [k, alpha] of this._animCells) {
        const [layerName, xy] = k.split(':');
        if (layerName !== layer.name) continue;

        const [xStr, yStr] = xy.split(',');
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);

        const gid = layer.data[y * W + x] || 0;
        if (!gid) continue;

        r.ctx.save();
        r.ctx.globalAlpha = alpha;
        r.drawTile(gid, x, y);
        r.ctx.restore();
      }
    }
  }

  afterRender() {
    this.drawDoorGroundOverlay();
    this.renderAnimatedDoors();
  }
}

window.DoorSystem = DoorSystem;
