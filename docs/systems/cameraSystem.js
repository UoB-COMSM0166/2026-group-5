function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createCamera(viewWidth, viewHeight) {
  return {
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
    deadZoneX: Math.floor(viewWidth * 0.22),
    deadZoneY: Math.floor(viewHeight * 0.18),
    smoothing: 0.18,
    worldWidth: viewWidth,
    worldHeight: viewHeight,
    targetX: 0,
    targetY: 0
  };
}

export function resizeCamera(camera, width, height) {
  camera.width = width;
  camera.height = height;
  camera.deadZoneX = Math.floor(width * 0.22);
  camera.deadZoneY = Math.floor(height * 0.18);
}

export function configureCameraBounds(camera, mapWidthTiles, mapHeightTiles, tileSize) {
  camera.worldWidth = Math.max(camera.width, mapWidthTiles * tileSize);
  camera.worldHeight = Math.max(camera.height, mapHeightTiles * tileSize);
  camera.x = clamp(camera.x, 0, Math.max(0, camera.worldWidth - camera.width));
  camera.y = clamp(camera.y, 0, Math.max(0, camera.worldHeight - camera.height));
}

export function updateCamera(camera, player, deltaTime = 0) {
  const centerX = player.x + player.w / 2;
  const centerY = player.y + player.h / 2;

  let targetX = camera.x;
  let targetY = camera.y;

  const leftEdge = camera.x + camera.deadZoneX;
  const rightEdge = camera.x + camera.width - camera.deadZoneX;
  const topEdge = camera.y + camera.deadZoneY;
  const bottomEdge = camera.y + camera.height - camera.deadZoneY;

  if (centerX < leftEdge) targetX = centerX - camera.deadZoneX;
  else if (centerX > rightEdge) targetX = centerX + camera.deadZoneX - camera.width;

  if (centerY < topEdge) targetY = centerY - camera.deadZoneY;
  else if (centerY > bottomEdge) targetY = centerY + camera.deadZoneY - camera.height;

  const maxX = Math.max(0, camera.worldWidth - camera.width);
  const maxY = Math.max(0, camera.worldHeight - camera.height);
  targetX = clamp(targetX, 0, maxX);
  targetY = clamp(targetY, 0, maxY);

  const blend = deltaTime > 0 ? 1 - Math.pow(1 - camera.smoothing, deltaTime * 60) : camera.smoothing;
  camera.x += (targetX - camera.x) * blend;
  camera.y += (targetY - camera.y) * blend;
  camera.x = clamp(camera.x, 0, maxX);
  camera.y = clamp(camera.y, 0, maxY);
  camera.targetX = targetX;
  camera.targetY = targetY;
}

export function worldToScreen(camera, x, y) {
  return { x: x - camera.x, y: y - camera.y };
}

export function isRectVisible(camera, x, y, w, h, pad = 0) {
  return (
    x + w >= camera.x - pad &&
    y + h >= camera.y - pad &&
    x <= camera.x + camera.width + pad &&
    y <= camera.y + camera.height + pad
  );
}

export function getVisibleTileBounds(camera, tileSize, mapWidth, mapHeight) {
  const startCol = clamp(Math.floor(camera.x / tileSize), 0, Math.max(0, mapWidth - 1));
  const endCol = clamp(Math.ceil((camera.x + camera.width) / tileSize), 0, mapWidth);
  const startRow = clamp(Math.floor(camera.y / tileSize), 0, Math.max(0, mapHeight - 1));
  const endRow = clamp(Math.ceil((camera.y + camera.height) / tileSize), 0, mapHeight);
  return { startCol, endCol, startRow, endRow };
}
