// Tile-based collision: blocked checks, rect movement, line-of-sight, vision ray casting.
export function isBlocked(collision, tx, ty) {
  if (!collision.length) return false;
  if (ty < 0 || ty >= collision.length) return true;
  if (tx < 0 || tx >= collision[0].length) return true;
  return collision[ty][tx] === 1;
}

export function getEntityCollisionRect(entity, nextX = entity.x, nextY = entity.y) {
  const insetX = Math.max(0, entity?.collisionInsetX || 0);
  const insetY = Math.max(0, entity?.collisionInsetY || 0);
  const width = Math.max(1, (entity?.w || 1) - insetX * 2);
  const height = Math.max(1, (entity?.h || 1) - insetY * 2);
  return {
    x: nextX + insetX,
    y: nextY + insetY,
    w: width,
    h: height
  };
}

export function isBlockedByWorld(levelOrCollision, tx, ty, tileSize = 16) {
  const collision = Array.isArray(levelOrCollision) ? levelOrCollision : levelOrCollision?.collision || [];
  if (isBlocked(collision, tx, ty)) return true;
  const level = Array.isArray(levelOrCollision) ? null : levelOrCollision;
  if (level?.doorSystem?.blocksTile?.(tx, ty)) return true;
  return false;
}

export function canMoveToRect(entity, nextX, nextY, collision, tileSize, level = null) {
  const rect = getEntityCollisionRect(entity, nextX, nextY);
  const left = Math.floor(rect.x / tileSize);
  const right = Math.floor((rect.x + rect.w - 1) / tileSize);
  const top = Math.floor(rect.y / tileSize);
  const bottom = Math.floor((rect.y + rect.h - 1) / tileSize);

  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      if (level ? isBlockedByWorld(level, tx, ty, tileSize) : isBlocked(collision, tx, ty)) {
        return false;
      }
    }
  }
  return true;
}

export function hasLineOfSight(collision, x1, y1, x2, y2, tileSize, step = 6, level = null) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist <= step) return true;
  const steps = Math.max(1, Math.ceil(dist / step));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const sx = x1 + dx * t;
    const sy = y1 + dy * t;
    const tx = Math.floor(sx / tileSize);
    const ty = Math.floor(sy / tileSize);
    if (level ? isBlockedByWorld(level, tx, ty, tileSize) : isBlocked(collision, tx, ty)) {
      return false;
    }
  }
  return true;
}


export function castVisionRay(levelOrCollision, x1, y1, angle, maxDistance, tileSize, step = 4) {
  const level = Array.isArray(levelOrCollision) ? null : levelOrCollision;
  const collision = Array.isArray(levelOrCollision) ? levelOrCollision : levelOrCollision?.collision || [];
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let lastX = x1;
  let lastY = y1;
  const steps = Math.max(1, Math.ceil(maxDistance / step));
  for (let i = 1; i <= steps; i += 1) {
    const dist = Math.min(maxDistance, i * step);
    const sx = x1 + dx * dist;
    const sy = y1 + dy * dist;
    const tx = Math.floor(sx / tileSize);
    const ty = Math.floor(sy / tileSize);
    if (level ? isBlockedByWorld(level, tx, ty, tileSize) : isBlocked(collision, tx, ty)) {
      return { x: lastX, y: lastY, distance: Math.hypot(lastX - x1, lastY - y1), blocked: true };
    }
    lastX = sx;
    lastY = sy;
  }
  return { x: lastX, y: lastY, distance: Math.hypot(lastX - x1, lastY - y1), blocked: false };
}
