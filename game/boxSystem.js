// boxSystem.js - Chest open/close animation 
class BoxSystem {
  constructor(options = {}) {
    this.durationMs = options.durationMs ?? 300;
    this.layerName = options.layerName ?? 'box';
    this.closedGid = options.closedGid ?? 15;
    this.groundLayerNames = new Set(options.groundLayerNames ?? ['floor', 'purplefloor']);

    this.renderer = null;

    this.boxes = new Map(); // "ax,ay" -> box
    this._raf = null;
    this._animBoxes = new Set();

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

  buildIndex() {
    const r = this.renderer;
    const map = r.mapData;
    if (!map?.layers) return;

    this.boxes.clear();

    const layer = map.layers.find(l => l.type === 'tilelayer' && l.name === this.layerName);
    if (!layer || !Array.isArray(layer.data)) {
      console.warn('[BoxSystem] box layer not found:', this.layerName);
      return;
    }

    const W = map.width, H = map.height;
    const idx = (x, y) => y * W + x;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const g = layer.data[idx(x, y)] || 0;
        if (g === this.closedGid) {
          this.boxes.set(`${x},${y}`, {
            ax: x,
            ay: y,
            layer,
            isOpen: false,
            angle: 0,
            _anim: null,
            saved: null,
          });
        }
      }
    }

    console.log('[BoxSystem] boxes built:', this.boxes.size);
  }

  toggleBoxAt(tileX, tileY) {
    const candidates = [
      [tileX, tileY],
      [tileX - 1, tileY],
      [tileX, tileY + 1],
      [tileX - 1, tileY + 1],
    ];

    let box = null;
    for (const [ax, ay] of candidates) {
      box = this.boxes.get(`${ax},${ay}`);
      if (box) break;
    }
    if (!box) return false;

    return this.toggleBox(box);
  }

  toggleBox(box) {
    if (box._anim) return false;
    this.startAnim(box, !box.isOpen);
    return true;
  }

  startAnim(box, opening) {
    if (!box.saved) box.saved = this.captureArea(box);

    box._anim = { opening, start: performance.now(), duration: this.durationMs };
    this.clearArea(box);

    this._animBoxes.add(box);
    if (!this._raf) this._raf = requestAnimationFrame(this.step.bind(this));
  }

  step(now) {
    const done = [];
    const openAngle = -110 * Math.PI / 180;

    for (const box of this._animBoxes) {
      const a = box._anim;
      if (!a) { done.push(box); continue; }

      const p = Math.min(1, Math.max(0, (now - a.start) / a.duration));
      box.angle = a.opening ? (openAngle * p) : (openAngle * (1 - p));

      if (p >= 1) {
        if (a.opening) {
          box.isOpen = true;
          box.angle = openAngle;
          this.clearArea(box);
        } else {
          box.isOpen = false;
          box.angle = 0;
          this.restoreArea(box);
        }
        box._anim = null;
        done.push(box);
      }
    }

    for (const b of done) this._animBoxes.delete(b);

    this.renderer.render();

    if (this._animBoxes.size > 0) this._raf = requestAnimationFrame(this.step.bind(this));
    else this._raf = null;
  }

  areaCells(box) {
    const ax = box.ax, ay = box.ay;
    return [
      [ax, ay - 1], [ax + 1, ay - 1],
      [ax, ay],     [ax + 1, ay],
    ];
  }

  captureArea(box) {
    const map = this.renderer.mapData;
    const W = map.width, H = map.height;
    const idx = (x, y) => y * W + x;
    const store = {};

    for (const [x, y] of this.areaCells(box)) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      store[`${x},${y}`] = box.layer.data[idx(x, y)] || 0;
    }
    return store;
  }

  clearArea(box) {
    const map = this.renderer.mapData;
    const W = map.width, H = map.height;
    const idx = (x, y) => y * W + x;

    for (const [x, y] of this.areaCells(box)) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      box.layer.data[idx(x, y)] = 0;
    }
  }

  restoreArea(box) {
    if (!box.saved) return;
    const map = this.renderer.mapData;
    const W = map.width, H = map.height;
    const idx = (x, y) => y * W + x;

    for (const [k, gid] of Object.entries(box.saved)) {
      const [xs, ys] = k.split(',');
      const x = parseInt(xs, 10), y = parseInt(ys, 10);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      box.layer.data[idx(x, y)] = gid;
    }
  }

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

  drawGroundOverlay() {
    const r = this.renderer;
    if (!this.groundCanvas) return;

    for (const box of this.boxes.values()) {
      if (!(box.isOpen || box._anim)) continue;

      for (const [tx, ty] of this.areaCells(box)) {
        const px = tx * r.BASE_TILE_SIZE * r.scale;
        const py = ty * r.BASE_TILE_SIZE * r.scale;
        const pw = r.BASE_TILE_SIZE * r.scale;
        const ph = r.BASE_TILE_SIZE * r.scale;
        r.ctx.drawImage(this.groundCanvas, px, py, pw, ph, px, py, pw, ph);
      }
    }
  }

  drawBoxes() {
    const r = this.renderer;
    const ts = r.tilesetMap.get(this.closedGid);
    if (!ts || !ts.image) return;
    const img = ts.image;

    for (const box of this.boxes.values()) {
      if (!(box.isOpen || box._anim)) continue;

      const px = box.ax * r.BASE_TILE_SIZE * r.scale;
      const py = (box.ay - 1) * r.BASE_TILE_SIZE * r.scale;

      const w = 2 * r.BASE_TILE_SIZE * r.scale;
      const h = 2 * r.BASE_TILE_SIZE * r.scale;

      // Base: bottom half (y=16..32)
      r.ctx.drawImage(img, 0, 16, 32, 16, px, py + h/2, w, h/2);

      // Lid: top half (y=0..16), rotate around hinge line at y=16
      const hingeX = px + w/2;
      const hingeY = py + h/2;

      r.ctx.save();
      r.ctx.translate(hingeX, hingeY);
      r.ctx.rotate(box.angle);
      r.ctx.drawImage(img, 0, 0, 32, 16, -w/2, -h/2, w, h/2);
      r.ctx.restore();
    }
  }

  afterRender() {
    this.drawGroundOverlay();
    this.drawBoxes();
  }
}

window.BoxSystem = BoxSystem;
