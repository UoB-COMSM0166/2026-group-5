// Mission: exit placement, unlock gating (all chests), distance and prompt helpers.
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

export class MissionSystem {
  #exit;

  constructor(collision, baseTile, spawnTile, totalChests = 0, objective = {}) {
    const fixedExit = objective?.exitTile || null;
    const exitTile = fixedExit || chooseExitTile(collision, spawnTile.x, spawnTile.y);
    this.#exit = {
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
  }

  get exit() { return this.#exit; }

  unlock() {
    this.#exit.unlocked = true;
    this.#exit.label = 'Extraction ready';
  }

  update(deltaTime) {
    this.#exit.pulse += deltaTime * (this.#exit.unlocked ? 2.8 : 1.2);
    this.#exit.hintPulse += deltaTime * 1.6;
  }

  isUnlocked() {
    return !!this.#exit.unlocked;
  }

  getObjectiveText(collected, target) {
    if (!this.#exit.unlocked) return `Collect all chests (${collected}/${target})`;
    return 'Reach extraction';
  }

  getDistanceToExit(player) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const ex = this.#exit.x + this.#exit.w / 2;
    const ey = this.#exit.y + this.#exit.h / 2;
    return Math.hypot(px - ex, py - ey);
  }

  isPlayerInside(player, margin = 6) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    return px >= this.#exit.x - margin && px <= this.#exit.x + this.#exit.w + margin && py >= this.#exit.y - margin && py <= this.#exit.y + this.#exit.h + margin;
  }

  getInteractPrompt() {
    return this.#exit.unlocked ? 'Press E to extract' : 'Locked extraction';
  }
}
