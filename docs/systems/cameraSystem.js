// Camera: dead-zone follow, smooth lerp, world bounds clamping, viewport helpers, zoom support.
function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
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
    targetY: 0,
    zoom: 1,
    minZoom: 1.0,
    maxZoom: 2,
    zoomSmoothing: 0.15
  };
}

export function resizeCamera(camera, width, height) {
  camera.width = width;
  camera.height = height;
  camera.deadZoneX = Math.floor(width * 0.22);
  camera.deadZoneY = Math.floor(height * 0.18);
}

export function setCameraZoom(camera, zoom) {
  camera.zoom = clamp(zoom, camera.minZoom, camera.maxZoom);
}

export function changeCameraZoom(camera, delta, centerX, centerY) {
  const oldZoom = camera.zoom;
  const newZoom = clamp(oldZoom + delta, camera.minZoom, camera.maxZoom);
  
  if (newZoom !== oldZoom) {
    // Calculate world point under center position before zoom
    const worldX = centerX / oldZoom + camera.x;
    const worldY = centerY / oldZoom + camera.y;
    
    // Apply new zoom
    camera.zoom = newZoom;
    
    // Adjust camera position to keep world point under center
    camera.x = worldX - centerX / newZoom;
    camera.y = worldY - centerY / newZoom;
    
    // Clamp to world bounds
    const maxX = Math.max(0, camera.worldWidth - camera.width / newZoom);
    const maxY = Math.max(0, camera.worldHeight - camera.height / newZoom);
    camera.x = clamp(camera.x, 0, maxX);
    camera.y = clamp(camera.y, 0, maxY);
  }
  
  return camera.zoom;
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

  // Adjust dead zone based on zoom
  const effectiveDeadZoneX = camera.deadZoneX / camera.zoom;
  const effectiveDeadZoneY = camera.deadZoneY / camera.zoom;
  const effectiveWidth = camera.width / camera.zoom;
  const effectiveHeight = camera.height / camera.zoom;

  const leftEdge = camera.x + effectiveDeadZoneX;
  const rightEdge = camera.x + effectiveWidth - effectiveDeadZoneX;
  const topEdge = camera.y + effectiveDeadZoneY;
  const bottomEdge = camera.y + effectiveHeight - effectiveDeadZoneY;

  if (centerX < leftEdge) targetX = centerX - effectiveDeadZoneX;
  else if (centerX > rightEdge) targetX = centerX + effectiveDeadZoneX - effectiveWidth;

  if (centerY < topEdge) targetY = centerY - effectiveDeadZoneY;
  else if (centerY > bottomEdge) targetY = centerY + effectiveDeadZoneY - effectiveHeight;

  const maxX = Math.max(0, camera.worldWidth - effectiveWidth);
  const maxY = Math.max(0, camera.worldHeight - effectiveHeight);
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
  return { 
    x: (x - camera.x) * camera.zoom, 
    y: (y - camera.y) * camera.zoom 
  };
}

export function screenToWorld(camera, x, y) {
  return {
    x: x / camera.zoom + camera.x,
    y: y / camera.zoom + camera.y
  };
}

export function isRectVisible(camera, x, y, w, h, pad = 0) {
  const effectivePad = pad / camera.zoom;
  const effectiveWidth = camera.width / camera.zoom;
  const effectiveHeight = camera.height / camera.zoom;
  return (
    x + w >= camera.x - effectivePad &&
    y + h >= camera.y - effectivePad &&
    x <= camera.x + effectiveWidth + effectivePad &&
    y <= camera.y + effectiveHeight + effectivePad
  );
}

export function getVisibleTileBounds(camera, tileSize, mapWidth, mapHeight) {
  const effectiveWidth = camera.width / camera.zoom;
  const effectiveHeight = camera.height / camera.zoom;
  // Margin must cover max tile offset: 128px tiles have 112px offset (128-16=112)
  // 10 tiles * 16 = 160px > 112px, ensures large tiles at edges are included
  const marginTiles = 10;
  const startCol = clamp(Math.floor(camera.x / tileSize) - marginTiles, 0, Math.max(0, mapWidth - 1));
  const endCol = clamp(Math.ceil((camera.x + effectiveWidth) / tileSize) + marginTiles, 0, mapWidth);
  const startRow = clamp(Math.floor(camera.y / tileSize) - marginTiles, 0, Math.max(0, mapHeight - 1));
  const endRow = clamp(Math.ceil((camera.y + effectiveHeight) / tileSize) + marginTiles, 0, mapHeight);
  return { startCol, endCol, startRow, endRow };
}
