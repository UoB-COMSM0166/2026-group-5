export function findNearbyChest(player, chests, tileSize) {
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  for (const chest of chests) {
    const cx = chest.x * tileSize + tileSize / 2;
    const cy = chest.y * tileSize + tileSize / 2;
    const dx = px - cx;
    const dy = py - cy;
    if (Math.hypot(dx, dy) <= tileSize * 1.1) {
      return chest;
    }
  }
  return null;
}
