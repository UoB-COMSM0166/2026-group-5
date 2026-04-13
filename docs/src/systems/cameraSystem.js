// Camera: dead-zone follow, smooth lerp, world bounds clamping, viewport helpers, zoom support.
function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export class Camera {
  #x;
  #y;
  #width;
  #height;
  #deadZoneX;
  #deadZoneY;
  #smoothing;
  #worldWidth;
  #worldHeight;
  #targetX;
  #targetY;
  #zoom;
  #minZoom;
  #maxZoom;
  #zoomSmoothing;

  constructor(viewWidth, viewHeight) {
    this.#x = 0;
    this.#y = 0;
    this.#width = viewWidth;
    this.#height = viewHeight;
    this.#deadZoneX = Math.floor(viewWidth * 0.22);
    this.#deadZoneY = Math.floor(viewHeight * 0.18);
    this.#smoothing = 0.18;
    this.#worldWidth = viewWidth;
    this.#worldHeight = viewHeight;
    this.#targetX = 0;
    this.#targetY = 0;
    this.#zoom = 1;
    this.#minZoom = 1.0;
    this.#maxZoom = 2;
    this.#zoomSmoothing = 0.15;
  }

  get x() { return this.#x; }
  set x(v) { this.#x = v; }
  get y() { return this.#y; }
  set y(v) { this.#y = v; }
  get width() { return this.#width; }
  get height() { return this.#height; }
  get zoom() { return this.#zoom; }
  get worldWidth() { return this.#worldWidth; }
  get worldHeight() { return this.#worldHeight; }
  get deadZoneX() { return this.#deadZoneX; }
  get deadZoneY() { return this.#deadZoneY; }
  get smoothing() { return this.#smoothing; }
  get targetX() { return this.#targetX; }
  get targetY() { return this.#targetY; }
  get minZoom() { return this.#minZoom; }
  get maxZoom() { return this.#maxZoom; }

  resize(width, height) {
    this.#width = width;
    this.#height = height;
    this.#deadZoneX = Math.floor(width * 0.22);
    this.#deadZoneY = Math.floor(height * 0.18);
  }

  setZoom(zoom) {
    this.#zoom = clamp(zoom, this.#minZoom, this.#maxZoom);
  }

  changeZoom(delta, centerX, centerY) {
    const oldZoom = this.#zoom;
    const newZoom = clamp(oldZoom + delta, this.#minZoom, this.#maxZoom);

    if (newZoom !== oldZoom) {
      const worldX = centerX / oldZoom + this.#x;
      const worldY = centerY / oldZoom + this.#y;

      this.#zoom = newZoom;

      this.#x = worldX - centerX / newZoom;
      this.#y = worldY - centerY / newZoom;

      const maxX = Math.max(0, this.#worldWidth - this.#width / newZoom);
      const maxY = Math.max(0, this.#worldHeight - this.#height / newZoom);
      this.#x = clamp(this.#x, 0, maxX);
      this.#y = clamp(this.#y, 0, maxY);
    }

    return this.#zoom;
  }

  configureBounds(mapWidthTiles, mapHeightTiles, tileSize) {
    this.#worldWidth = Math.max(this.#width, mapWidthTiles * tileSize);
    this.#worldHeight = Math.max(this.#height, mapHeightTiles * tileSize);
    this.#x = clamp(this.#x, 0, Math.max(0, this.#worldWidth - this.#width));
    this.#y = clamp(this.#y, 0, Math.max(0, this.#worldHeight - this.#height));
  }

  update(player, deltaTime = 0) {
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;

    let targetX = this.#x;
    let targetY = this.#y;

    const effectiveDeadZoneX = this.#deadZoneX / this.#zoom;
    const effectiveDeadZoneY = this.#deadZoneY / this.#zoom;
    const effectiveWidth = this.#width / this.#zoom;
    const effectiveHeight = this.#height / this.#zoom;

    const leftEdge = this.#x + effectiveDeadZoneX;
    const rightEdge = this.#x + effectiveWidth - effectiveDeadZoneX;
    const topEdge = this.#y + effectiveDeadZoneY;
    const bottomEdge = this.#y + effectiveHeight - effectiveDeadZoneY;

    if (centerX < leftEdge) targetX = centerX - effectiveDeadZoneX;
    else if (centerX > rightEdge) targetX = centerX + effectiveDeadZoneX - effectiveWidth;

    if (centerY < topEdge) targetY = centerY - effectiveDeadZoneY;
    else if (centerY > bottomEdge) targetY = centerY + effectiveDeadZoneY - effectiveHeight;

    const maxX = Math.max(0, this.#worldWidth - effectiveWidth);
    const maxY = Math.max(0, this.#worldHeight - effectiveHeight);
    targetX = clamp(targetX, 0, maxX);
    targetY = clamp(targetY, 0, maxY);

    const blend = deltaTime > 0 ? 1 - Math.pow(1 - this.#smoothing, deltaTime * 60) : this.#smoothing;
    this.#x += (targetX - this.#x) * blend;
    this.#y += (targetY - this.#y) * blend;
    this.#x = clamp(this.#x, 0, maxX);
    this.#y = clamp(this.#y, 0, maxY);
    this.#targetX = targetX;
    this.#targetY = targetY;
  }

  worldToScreen(x, y) {
    return {
      x: (x - this.#x) * this.#zoom,
      y: (y - this.#y) * this.#zoom
    };
  }

  screenToWorld(x, y) {
    return {
      x: x / this.#zoom + this.#x,
      y: y / this.#zoom + this.#y
    };
  }

  isRectVisible(x, y, w, h, pad = 0) {
    const effectivePad = pad / this.#zoom;
    const effectiveWidth = this.#width / this.#zoom;
    const effectiveHeight = this.#height / this.#zoom;
    return (
      x + w >= this.#x - effectivePad &&
      y + h >= this.#y - effectivePad &&
      x <= this.#x + effectiveWidth + effectivePad &&
      y <= this.#y + effectiveHeight + effectivePad
    );
  }

  getVisibleTileBounds(tileSize, mapWidth, mapHeight) {
    const effectiveWidth = this.#width / this.#zoom;
    const effectiveHeight = this.#height / this.#zoom;
    const marginTiles = 10;
    const startCol = clamp(Math.floor(this.#x / tileSize) - marginTiles, 0, Math.max(0, mapWidth - 1));
    const endCol = clamp(Math.ceil((this.#x + effectiveWidth) / tileSize) + marginTiles, 0, mapWidth);
    const startRow = clamp(Math.floor(this.#y / tileSize) - marginTiles, 0, Math.max(0, mapHeight - 1));
    const endRow = clamp(Math.ceil((this.#y + effectiveHeight) / tileSize) + marginTiles, 0, mapHeight);
    return { startCol, endCol, startRow, endRow };
  }
}
