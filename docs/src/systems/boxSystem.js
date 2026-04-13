// Chest system: parses chest tiles from map data, handles open state and lid animation.
function getCell(layer, width, x, y) {
  return layer.data[y * width + x] || 0;
}

export class BoxSystem {
  #boxes;

  constructor(mapData, existingChests = [], tileSize = 16) {
    this.#boxes = [];

    for (const chest of existingChests) {
      const w = chest.w || 1;
      const h = chest.h || 1;
      this.#boxes.push({
        id: chest.id,
        x: chest.x,
        y: chest.y,
        w,
        h,
        renderW: chest.renderW || w,
        renderH: chest.renderH || h,
        renderOffsetX: chest.renderOffsetX || 0,
        renderOffsetY: chest.renderOffsetY || 0,
        opened: !!chest.opened,
        anim: chest.opened ? 1 : 0,
        angle: chest.opened ? (-110 * Math.PI / 180) : 0,
        centerX: (chest.x + w / 2) * tileSize,
        centerY: (chest.y + h / 2) * tileSize,
        lootPulse: chest.opened ? 1 : 0
      });
    }

    if (this.#boxes.length) return;
    if (!mapData?.layers) return;
    const layer = mapData.layers.find((entry) => String(entry.name || '').toLowerCase() === 'box' && entry.type === 'tilelayer');
    if (!layer || !Array.isArray(layer.data)) return;

    const width = mapData.width || 0;
    const height = mapData.height || 0;
    const seen = new Set(this.#boxes.map((box) => `${box.x},${box.y}`));

    for (let y = 0; y < height - 1; y += 1) {
      for (let x = 0; x < width - 1; x += 1) {
        if (seen.has(`${x},${y}`)) continue;
        const tl = getCell(layer, width, x, y);
        const tr = getCell(layer, width, x + 1, y);
        const bl = getCell(layer, width, x, y + 1);
        const br = getCell(layer, width, x + 1, y + 1);
        if (tl === 15 && tr === 15 && bl === 15 && br === 15) {
          this.#boxes.push({
            id: `box-${this.#boxes.length + 1}`,
            x,
            y,
            w: 2,
            h: 2,
            opened: false,
            anim: 0,
            angle: 0,
            centerX: (x + 1) * tileSize,
            centerY: (y + 1) * tileSize,
            lootPulse: 0
          });
          seen.add(`${x},${y}`);
        }
      }
    }
  }

  get boxes() { return this.#boxes; }

  open(box) {
    if (!box || box.opened) return false;
    box.opened = true;
    box.lootPulse = 1;
    return true;
  }

  update(deltaTime) {
    for (const box of this.#boxes) {
      const target = box.opened ? 1 : 0;
      box.anim += (target - box.anim) * Math.min(1, deltaTime * 5);
      if (Math.abs(target - box.anim) < 0.001) box.anim = target;
      box.angle = (-110 * Math.PI / 180) * box.anim;
      box.lootPulse = Math.max(0, box.lootPulse - deltaTime * 0.85);
    }
  }
}
