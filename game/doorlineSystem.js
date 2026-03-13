// doorlineSystem.js - Single swing door (linedoor1632.png) rotate 90° CCW around top hinge (pure script)
class DoorLineSystem {
  constructor(options = {}) {
    this.durationMs = options.durationMs ?? 300;
    this.groundLayerNames = new Set(options.groundLayerNames ?? ['floor', 'purplefloor']);
    this.layerName = options.layerName ?? 'door_lateral';

    this.renderer = null;

    // Map key "x,y" (top tile) -> door object
    this.doors = new Map();

    // Animation loop
    this._raf = null;
    this._animDoors = new Set(); // Set<doorObj>

    // Ground cache
    this.groundCanvas = null;
    this.groundCtx = null;
  }

  init(renderer) {
    this.renderer = renderer;
    this.buildIndex();
    this.buildGroundCache();
  }

  onResize() {
    this.buildGroundCache();
  }

  // Scan door_lateral layer for 83(top)/84(bottom) pairs
  buildIndex() {
    const r = this.renderer;
    const map = r.mapData;
    if (!map?.layers) return;

    this.doors.clear();
    const layer = map.layers.find(l => l.type === 'tilelayer' && l.name === this.layerName);
    if (!layer || !Array.isArray(layer.data)) return;

    const W = map.width, H = map.height;
    const idx = (x, y) => y * W + x;

    for (let y = 0; y < H - 1; y++) {
      for (let x = 0; x < W; x++) {
        const top = layer.data[idx(x, y)] || 0;
        const bot = layer.data[idx(x, y + 1)] || 0;
        if (top === 83 && bot === 84) {
          // Door object anchored at top tile (x,y)
          this.doors.set(`${x},${y}`, {
            x, y,
            layer,
            isOpen: false,
            angle: 0,         // current angle (0 closed, -PI/2 open)
            _anim: null,      // { opening, start, duration }
          });
        }
      }
    }

    console.log('[DoorLineSystem] doors built:', this.doors.size);
  }

  toggleDoorAt(tileX, tileY) {
    // Click can hit top or bottom tile; normalize to top tile if bottom is clicked
    const keyTop = `${tileX},${tileY}`;
    const keyAbove = `${tileX},${tileY - 1}`;

    let door = this.doors.get(keyTop);
    if (!door) door = this.doors.get(keyAbove);
    if (!door) return false;

    return this.toggleDoor(door);
  }

  toggleDoor(door) {
    if (door._anim) return false;

    if (!door.isOpen) {
      this.startAnim(door, true);  // opening
    } else {
      this.startAnim(door, false); // closing
    }
    return true;
  }

  startAnim(door, opening) {
    const r = this.renderer;

    door._anim = {
      opening,
      start: performance.now(),
      duration: this.durationMs,
    };

    // During animation, we always keep the tilelayer cleared (so we can draw rotated sprite ourselves)
    this.clearDoorTiles(door);

    this._animDoors.add(door);
    if (!this._raf) this._raf = requestAnimationFrame(this.step.bind(this));
  }

  clearDoorTiles(door) {
    const map = this.renderer.mapData;
    const W = map.width;
    const idx = (x, y) => y * W + x;

    door.layer.data[idx(door.x, door.y)] = 0;
    door.layer.data[idx(door.x, door.y + 1)] = 0;
  }

  restoreDoorTiles(door) {
    const map = this.renderer.mapData;
    const W = map.width;
    const idx = (x, y) => y * W + x;

    door.layer.data[idx(door.x, door.y)] = 83;
    door.layer.data[idx(door.x, door.y + 1)] = 84;
  }

  step(now) {
    const done = [];
    for (const door of this._animDoors) {
      const a = door._anim;
      if (!a) { done.push(door); continue; }

      const p = Math.min(1, Math.max(0, (now - a.start) / a.duration));

      // Angle: 0 -> -PI/2 when opening; -PI/2 -> 0 when closing
      if (a.opening) {
        door.angle = -Math.PI / 2 * p;
      } else {
        door.angle = -Math.PI / 2 * (1 - p);
      }

      if (p >= 1) {
        // End state
        if (a.opening) {
          door.isOpen = true;
          door.angle = -Math.PI / 2;
          // Keep tiles cleared when open
          this.clearDoorTiles(door);
        } else {
          door.isOpen = false;
          door.angle = 0;
          // Restore tiles when fully closed
          this.restoreDoorTiles(door);
        }
        door._anim = null;
        done.push(door);
      }
    }

    for (const d of done) this._animDoors.delete(d);

    // Re-render frame
    this.renderer.render();

    if (this._animDoors.size > 0) {
      this._raf = requestAnimationFrame(this.step.bind(this));
    } else {
      this._raf = null;
    }
  }

  // Ground cache 
  buildGroundCache() {
    const r = this.renderer;
    if (!r?.mapData) return;

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

  // Paste ground back for open/opening doors (2 cells) so the hole shows blue floor
  drawGroundOverlay() {
    const r = this.renderer;
    if (!this.groundCanvas) return;

    for (const door of this.doors.values()) {
      const openingAnim = door._anim && door._anim.opening;
      if (!(door.isOpen || openingAnim)) continue;

      const cells = [[door.x, door.y], [door.x, door.y + 1]];
      for (const [tx, ty] of cells) {
        const px = tx * r.BASE_TILE_SIZE * r.scale;
        const py = ty * r.BASE_TILE_SIZE * r.scale;
        const pw = r.BASE_TILE_SIZE * r.scale;
        const ph = r.BASE_TILE_SIZE * r.scale;
        r.ctx.drawImage(this.groundCanvas, px, py, pw, ph, px, py, pw, ph);
      }
    }
  }

  // Draw the rotating door sprite (16x32) around the top hinge, CCW 90° (negative angle in canvas coords)
  drawRotatingDoors() {
    const r = this.renderer;

    // Get the tileset image for firstgid 83
    const tsInfo = r.tilesetMap.get(83);
    if (!tsInfo || !tsInfo.image) return;
    const img = tsInfo.image;

    for (const door of this.doors.values()) {
      // Draw while opening animation, while open (static at -90°), and while closing animation
      if (!(door.isOpen || door._anim)) continue;

      const angle = door.angle;

      const px = door.x * r.BASE_TILE_SIZE * r.scale;
      const py = door.y * r.BASE_TILE_SIZE * r.scale;

      // Hinge at TOP CENTER of the doorway
      const hingeX = px + (r.BASE_TILE_SIZE * r.scale) / 2; // +8*scale
      const hingeY = py;                                    // top edge

      r.ctx.save();
      r.ctx.translate(hingeX, hingeY);
      r.ctx.rotate(angle); // negative => CCW visually (because y axis is down)

      // Draw the 16x32 sprite with its top-center at (0,0)
      const w = r.BASE_TILE_SIZE * r.scale;      // 16*scale
      const h = r.BASE_TILE_SIZE * 2 * r.scale;  // 32*scale
      r.ctx.drawImage(img, 0, 0, 16, 32, -w / 2, 0, w, h);

      r.ctx.restore();
    }
  }

  // Renderer hook
  afterRender() {
    this.drawGroundOverlay();
    this.drawRotatingDoors();
  }
}

window.DoorLineSystem = DoorLineSystem;
