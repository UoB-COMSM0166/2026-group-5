// A* pathfinding on tile grid with actor-width awareness.
import { isBlockedByWorld, getEntityCollisionRect } from './collisionSystem.js';

class MinHeap {
  constructor(compare) {
    this.items = [];
    this.compare = compare;
  }

  get size() {
    return this.items.length;
  }

  push(value) {
    this.items.push(value);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (!this.items.length) return null;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return first;
  }

  bubbleUp(index) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.compare(this.items[current], this.items[parent]) >= 0) break;
      [this.items[current], this.items[parent]] = [this.items[parent], this.items[current]];
      current = parent;
    }
  }

  bubbleDown(index) {
    let current = index;
    const length = this.items.length;
    while (true) {
      const left = current * 2 + 1;
      const right = current * 2 + 2;
      let next = current;

      if (left < length && this.compare(this.items[left], this.items[next]) < 0) next = left;
      if (right < length && this.compare(this.items[right], this.items[next]) < 0) next = right;
      if (next === current) break;

      [this.items[current], this.items[next]] = [this.items[next], this.items[current]];
      current = next;
    }
  }
}

function toKey(tx, ty) {
  return `${tx},${ty}`;
}

function manhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function getActorTiles(actor, tx, ty, tileSize) {
  const insetX = Math.max(0, actor?.collisionInsetX || 0);
  const insetY = Math.max(0, actor?.collisionInsetY || 0);
  const rectX = tx * tileSize + insetX;
  const rectY = ty * tileSize + insetY;
  const rectW = Math.max(1, (actor?.w || 1) - insetX * 2);
  const rectH = Math.max(1, (actor?.h || 1) - insetY * 2);
  const left = Math.floor(rectX / tileSize);
  const top = Math.floor(rectY / tileSize);
  const right = Math.floor((rectX + rectW - 1) / tileSize);
  const bottom = Math.floor((rectY + rectH - 1) / tileSize);
  const tiles = [];
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) tiles.push({ x, y });
  }
  return tiles;
}

export function getActorTilePosition(actor, tileSize) {
  const rect = getEntityCollisionRect(actor, actor.x, actor.y);
  return {
    tx: Math.floor(rect.x / tileSize),
    ty: Math.floor(rect.y / tileSize)
  };
}

export function getPointTilePosition(x, y, tileSize) {
  return {
    tx: Math.floor(x / tileSize),
    ty: Math.floor(y / tileSize)
  };
}

export function isTileWalkableForActor(level, actor, tx, ty, tileSize = level?.settings?.baseTile || 16) {
  const collision = level?.collision || [];
  if (!collision.length) return false;
  const maxY = collision.length;
  const maxX = collision[0]?.length || 0;
  if (tx < 0 || ty < 0 || tx >= maxX || ty >= maxY) return false;
  for (const tile of getActorTiles(actor, tx, ty, tileSize)) {
    if (isBlockedByWorld(level, tile.x, tile.y, tileSize)) return false;
  }
  return true;
}

export function findPath(level, actor, startTile, goalTile, options = {}) {
  const tileSize = options.tileSize || level?.settings?.baseTile || 16;
  const maxIterations = options.maxIterations || 5000;
  const start = { tx: startTile.tx, ty: startTile.ty };
  const goal = { tx: goalTile.tx, ty: goalTile.ty };

  if (start.tx === goal.tx && start.ty === goal.ty) return [start];
  if (!isTileWalkableForActor(level, actor, goal.tx, goal.ty, tileSize)) return [];

  const open = new MinHeap((a, b) => a.f - b.f || a.g - b.g);
  open.push({ tx: start.tx, ty: start.ty, g: 0, f: manhattan(start.tx, start.ty, goal.tx, goal.ty) });
  const cameFrom = new Map();
  const gScore = new Map([[toKey(start.tx, start.ty), 0]]);
  const closed = new Set();
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];

  let iterations = 0;
  while (open.size && iterations < maxIterations) {
    iterations += 1;
    const current = open.pop();
    if (!current) break;
    const currentKey = toKey(current.tx, current.ty);
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    if (current.tx === goal.tx && current.ty === goal.ty) {
      const path = [{ tx: current.tx, ty: current.ty }];
      let walkKey = currentKey;
      while (cameFrom.has(walkKey)) {
        const prev = cameFrom.get(walkKey);
        path.push({ tx: prev.tx, ty: prev.ty });
        walkKey = toKey(prev.tx, prev.ty);
      }
      path.reverse();
      return path;
    }

    for (const dir of dirs) {
      const nextTx = current.tx + dir.x;
      const nextTy = current.ty + dir.y;
      const nextKey = toKey(nextTx, nextTy);
      if (closed.has(nextKey)) continue;
      if (!isTileWalkableForActor(level, actor, nextTx, nextTy, tileSize)) continue;

      const tentativeG = current.g + 1;
      const knownG = gScore.get(nextKey);
      if (knownG != null && tentativeG >= knownG) continue;

      cameFrom.set(nextKey, { tx: current.tx, ty: current.ty });
      gScore.set(nextKey, tentativeG);
      open.push({
        tx: nextTx,
        ty: nextTy,
        g: tentativeG,
        f: tentativeG + manhattan(nextTx, nextTy, goal.tx, goal.ty)
      });
    }
  }

  return [];
}

export function tilePathToWorldPath(path, tileSize) {
  return (path || []).map((node) => ({
    tx: node.tx,
    ty: node.ty,
    x: node.tx * tileSize,
    y: node.ty * tileSize,
    centerX: node.tx * tileSize + tileSize / 2,
    centerY: node.ty * tileSize + tileSize / 2
  }));
}
