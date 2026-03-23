
function isWalkable(collision, x, y) {
  if (!collision || !collision.length) return true;
  if (y < 0 || y >= collision.length || x < 0 || x >= collision[0].length) return false;
  return collision[y][x] === 0;
}

function edgeBias(width, height, x, y) {
  const dx = Math.min(x, width - 1 - x);
  const dy = Math.min(y, height - 1 - y);
  return Math.min(dx, dy);
}

function chooseExitTile(collision, spawnX, spawnY) {
  const height = collision?.length || 0;
  const width = collision?.[0]?.length || 0;
  let best = { x: Math.max(1, spawnX), y: Math.max(1, spawnY), score: -Infinity };
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!isWalkable(collision, x, y)) continue;
      const dist = Math.hypot(x - spawnX, y - spawnY);
      const edge = edgeBias(width, height, x, y);
      const score = dist - edge * 0.8;
      if (score > best.score) best = { x, y, score };
    }
  }
  return { x: best.x, y: best.y };
}

export function createMissionSystem(collision, baseTile, spawnTile, totalChests = 0, levelId = "") {
  const fixedExit = levelId === "map1" ? { x: 54, y: 11 } : null;
  const exitTile = fixedExit || chooseExitTile(collision, spawnTile.x, spawnTile.y);
  const exit = {
    tileX: exitTile.x,
    tileY: exitTile.y,
    x: exitTile.x * baseTile,
    y: exitTile.y * baseTile,
    w: baseTile,
    h: baseTile,
    unlocked: totalChests <= 0,
    pulse: 0,
    hintPulse: 0,
    label: totalChests > 0 ? 'Locked extraction' : 'Extraction'
  };

  return {
    exit,
    unlock() {
      exit.unlocked = true;
      exit.label = 'Extraction ready';
    },
    update(deltaTime) {
      exit.pulse += deltaTime * (exit.unlocked ? 2.8 : 1.2);
      exit.hintPulse += deltaTime * 1.6;
    },
    isUnlocked() {
      return !!exit.unlocked;
    },
    getObjectiveText(collected, target) {
      if (!exit.unlocked) return `Collect all chests (${collected}/${target})`;
      return 'Reach extraction';
    },
    getDistanceToExit(player) {
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      const ex = exit.x + exit.w / 2;
      const ey = exit.y + exit.h / 2;
      return Math.hypot(px - ex, py - ey);
    },
    isPlayerInside(player, margin = 6) {
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      return px >= exit.x - margin && px <= exit.x + exit.w + margin && py >= exit.y - margin && py <= exit.y + exit.h + margin;
    },
    getInteractPrompt() {
      return exit.unlocked ? 'Press E to extract' : 'Locked extraction';
    }
  };
}
