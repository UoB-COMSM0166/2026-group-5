// [Jinni][NEW] Added screen overlay system and per-screen input handlers
import { screenOverlaySystem } from './states/screenOverlaySystem.js';
import { handleStartScreenKey } from './states/startScreen.js';
import { handleIntroScreenKey } from './states/introScreen.js';
import { handleWinScreenKey } from './states/winScreen.js';
import { handleLoseScreenKey } from './states/loseScreen.js';
import { preloadStartScreen } from './states/startScreen.js';
import { preloadLoseScreen } from './states/loseScreen.js';

// [Jinni][NEW] P5 setup
let overlayP5 = null;

function createOverlayP5() {
  const mapCanvas = document.getElementById("mapCanvas");
  if (!mapCanvas) return;

  const parent = mapCanvas.parentElement;
  if (!parent) return;

  const existingHost = document.getElementById("p5-overlay-host");
  if (existingHost) existingHost.remove();

  parent.style.position = "relative";

  const host = document.createElement("div");
  host.id = "p5-overlay-host";
  host.style.position = "absolute";
  host.style.left = "0";
  host.style.top = "0";
  host.style.width = "100%";
  host.style.height = "100%";
  host.style.pointerEvents = "none";
  host.style.zIndex = "20";

  parent.appendChild(host);

  overlayP5 = new window.p5((p) => {
    p.setup = async function () {
      p.createCanvas(
        mapCanvas.clientWidth || mapCanvas.width,
        mapCanvas.clientHeight || mapCanvas.height
      );
      p.canvas.style.background = "transparent";
      
      await preloadStartScreen(p);
      await preloadLoseScreen(p);

      p.clear();
      screenOverlaySystem.init(p);
    };

    p.draw = function () {};
  }, host);
}

// [Jinni][NEW] Added state-based audio management imports
import { unlockAudio, syncStateAudio, toggleMute } from "./utils/audioManager.js";

let mapRenderer = null;
let showCollision = false;
const collision = window.CollisionMatrix || [];
const entityData = window.LevelEntities || { doors: [], chests: [] };
const rows = collision.length;
const cols = rows ? collision[0].length : 0;
const baseTile = 16;
const keys = Object.create(null);

let lastT = 0;
let message = '';
let messageTimer = 0;

// [Jinni][EDIT] Expanded global game state to support screen flow (start, intro, playing, win, lose)
export const game = {
  state: 'start',
  stateEnteredAt: performance.now()
};

// [Jinni][NEW] Centralized game state transitions and synchronized audio changes with fade
export function setGameState(next) {
  game.state = next;
  game.stateEnteredAt = performance.now();

  // [Jinni][NEW] Sync background music whenever the game state changes
  syncStateAudio(game.state, { fadeDuration: 600 }); 
}

// [Jinni][NEW] Utility helpers for screen timing and active gameplay checks
export function getStateTime() {
  return performance.now() - game.stateEnteredAt;
}

export function isPlaying() {
  return game.state === 'playing';
}

const player = {
  x: 0, y: 0,
  w: 10, h: 14,
  speed: 110,
  sprint: 1.55,
  color: '#33ff66'
};

const doors = (entityData.doors || []).map(d => ({
  id: d.id,
  kind: d.kind,
  tiles: d.tiles,
  open: false
}));

const chests = (entityData.chests || []).map(c => ({
  id: c.id,
  x: c.x,
  y: c.y,
  opened: false
}));

function wp(tx, ty) {
  return { x: tx * baseTile + baseTile / 2, y: ty * baseTile + baseTile / 2 };
}

const npcs = [
  {
    id: 'NPC-1',
    x: 7 * baseTile, y: 8 * baseTile, w: 10, h: 14,
    speedPatrol: 55, speedChase: 82,
    state: 'PATROL', facing: 'RIGHT', wpIndex: 0,
    waypoints: [wp(7, 8), wp(25, 7), wp(25, 25), wp(8, 25), wp(25, 25), wp(25, 7), wp(7, 8)],
    lastSeenX: 0, lastSeenY: 0, searchTimer: 0, loseSight: 0
  },
  {
    id: 'NPC-2',
    x: 31 * baseTile, y: 6 * baseTile, w: 10, h: 14,
    speedPatrol: 55, speedChase: 82,
    state: 'PATROL', facing: 'RIGHT', wpIndex: 0,
    waypoints: [wp(31, 6), wp(31, 18), wp(54, 18), wp(31, 18), wp(31, 6)],
    lastSeenX: 0, lastSeenY: 0, searchTimer: 0, loseSight: 0
  },
  {
    id: 'NPC-3',
    x: 10 * baseTile, y: 30 * baseTile, w: 10, h: 14,
    speedPatrol: 55, speedChase: 82,
    state: 'PATROL', facing: 'RIGHT', wpIndex: 0,
    waypoints: [wp(10, 30), wp(50, 30), wp(10, 30)],
    lastSeenX: 0, lastSeenY: 0, searchTimer: 0, loseSight: 0
  }
];

const initialNpcStates = npcs.map(npc => ({
  x: npc.x,
  y: npc.y,
  state: npc.state,
  facing: npc.facing,
  wpIndex: npc.wpIndex,
  lastSeenX: npc.lastSeenX,
  lastSeenY: npc.lastSeenY,
  searchTimer: npc.searchTimer,
  loseSight: npc.loseSight
}));

const state = {
  openedChests: 0,
  nearestDoor: null,
  nearestChest: null,
  prompt: '',
  playerDetected: false
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function hudInfo() {
  const tx = Math.floor((player.x + player.w / 2) / baseTile);
  const ty = Math.floor((player.y + player.h / 2) / baseTile);
  const chasing = npcs.filter(n => n.state === 'CHASE').length;
  const debug = document.getElementById('debug-info');
  if (debug) {
    debug.textContent =
      `state=${game.state} player=(${player.x.toFixed(1)}, ${player.y.toFixed(1)}) tile=(${tx}, ${ty}) scale=${mapRenderer ? mapRenderer.scale.toFixed(2) : '1.00'} collision=${showCollision} chests=${state.openedChests}/${chests.length} chasing=${chasing}`;
  }
}

function setMessage(text, seconds = 1.3) {
  message = text;
  messageTimer = seconds;
}

function isSolidTile(tx, ty) {
  if (ty < 0 || ty >= rows || tx < 0 || tx >= cols) return true;
  return collision[ty][tx] === 1;
}

function setSolidTile(tx, ty, solid) {
  if (ty < 0 || ty >= rows || tx < 0 || tx >= cols) return;
  collision[ty][tx] = solid ? 1 : 0;
}

function rectHitsCollision(x, y, w, h) {
  const left = Math.floor(x / baseTile);
  const right = Math.floor((x + w - 1) / baseTile);
  const top = Math.floor(y / baseTile);
  const bottom = Math.floor((y + h - 1) / baseTile);
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (isSolidTile(tx, ty)) return true;
    }
  }
  return false;
}

function rectIntersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function tileRect(tx, ty) {
  return { x: tx * baseTile, y: ty * baseTile, w: baseTile, h: baseTile };
}

function playerCenter() {
  return { x: player.x + player.w / 2, y: player.y + player.h / 2 };
}

function npcCenter(npc) {
  return { x: npc.x + npc.w / 2, y: npc.y + npc.h / 2 };
}

function findSpawn() {
  const s = window.DefaultSpawn || { x: 1, y: 1 };
  player.x = s.x * baseTile + 3;
  player.y = s.y * baseTile + 1;
}

function moveActor(actor, dx, dy) {
  const nextX = actor.x + dx;
  const nextY = actor.y + dy;
  if (!rectHitsCollision(nextX, actor.y, actor.w, actor.h)) actor.x = nextX;
  if (!rectHitsCollision(actor.x, nextY, actor.w, actor.h)) actor.y = nextY;
  const maxX = cols * baseTile - actor.w;
  const maxY = rows * baseTile - actor.h;
  actor.x = clamp(actor.x, 0, maxX);
  actor.y = clamp(actor.y, 0, maxY);
}

function updatePlayer(dt) {
  let ix = 0, iy = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) ix -= 1;
  if (keys['ArrowRight'] || keys['KeyD']) ix += 1;
  if (keys['ArrowUp'] || keys['KeyW']) iy -= 1;
  if (keys['ArrowDown'] || keys['KeyS']) iy += 1;

  const len = Math.hypot(ix, iy) || 1;
  ix /= len;
  iy /= len;

  let speed = player.speed;
  if (keys['ShiftLeft'] || keys['ShiftRight']) speed *= player.sprint;

  moveActor(player, ix * speed * dt, iy * speed * dt);
}

function updateInteractionTargets() {
  state.nearestDoor = null;
  state.nearestChest = null;
  state.prompt = '';

  const pc = playerCenter();
  let bestDoorDist = Infinity;
  for (const door of doors) {
    let best = Infinity;
    for (const t of door.tiles) {
      const cx = t.x * baseTile + baseTile / 2;
      const cy = t.y * baseTile + baseTile / 2;
      const d = Math.hypot(pc.x - cx, pc.y - cy);
      if (d < best) best = d;
    }
    if (best < bestDoorDist && best <= 24) {
      bestDoorDist = best;
      state.nearestDoor = door;
    }
  }

  let bestChestDist = Infinity;
  for (const chest of chests) {
    if (chest.opened) continue;
    const cx = chest.x * baseTile + baseTile / 2;
    const cy = chest.y * baseTile + baseTile / 2;
    const d = Math.hypot(pc.x - cx, pc.y - cy);
    if (d < bestChestDist && d <= 22) {
      bestChestDist = d;
      state.nearestChest = chest;
    }
  }

  if (state.nearestChest) state.prompt = '按 E 打开箱子';
  else if (state.nearestDoor) state.prompt = state.nearestDoor.open ? '按 E 关门' : '按 E 开门';
}

function canCloseDoor(door) {
  for (const t of door.tiles) {
    const rect = tileRect(t.x, t.y);
    if (rectIntersects(player, rect)) return false;
    for (const npc of npcs) {
      if (rectIntersects(npc, rect)) return false;
    }
  }
  return true;
}

function toggleDoor(door) {
  if (!door) return;
  if (door.open) {
    if (!canCloseDoor(door)) {
      setMessage('门口有人，不能关门');
      return;
    }
    for (const t of door.tiles) setSolidTile(t.x, t.y, true);
    door.open = false;
    setMessage('门已关闭');
  } else {
    for (const t of door.tiles) setSolidTile(t.x, t.y, false);
    door.open = true;
    setMessage('门已打开');
  }
}

function openChest(chest) {
  if (!chest || chest.opened) return;
  chest.opened = true;
  state.openedChests += 1;
  setMessage(`打开箱子 ${state.openedChests}/${chests.length}`);
}

function tryInteract() {
  if (state.nearestChest) {
    openChest(state.nearestChest);
    return;
  }
  if (state.nearestDoor) toggleDoor(state.nearestDoor);
}

// [Jinni][NEW] Added reusable full game reset for restarting from screens or state transitions
export function resetGame() {
  findSpawn();

  state.openedChests = 0;
  state.nearestDoor = null;
  state.nearestChest = null;
  state.prompt = '';
  state.playerDetected = false;

  message = '';
  messageTimer = 0;

  for (const chest of chests) chest.opened = false;
  for (const door of doors) {
    door.open = false;
    for (const t of door.tiles) setSolidTile(t.x, t.y, true);
  }

  npcs.forEach((npc, index) => {
    const initial = initialNpcStates[index];
    npc.x = initial.x;
    npc.y = initial.y;
    npc.state = initial.state;
    npc.facing = initial.facing;
    npc.wpIndex = initial.wpIndex;
    npc.lastSeenX = initial.lastSeenX;
    npc.lastSeenY = initial.lastSeenY;
    npc.searchTimer = initial.searchTimer;
    npc.loseSight = initial.loseSight;
  });

  setGameState('start');
}

function lineOfSight(x0, y0, x1, y1) {
  let tx0 = Math.floor(x0 / baseTile);
  let ty0 = Math.floor(y0 / baseTile);
  const tx1 = Math.floor(x1 / baseTile);
  const ty1 = Math.floor(y1 / baseTile);

  let dx = Math.abs(tx1 - tx0);
  let dy = Math.abs(ty1 - ty0);
  let sx = tx0 < tx1 ? 1 : -1;
  let sy = ty0 < ty1 ? 1 : -1;
  let err = dx - dy;

  let x = tx0;
  let y = ty0;

  while (!(x === tx1 && y === ty1)) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    if (x === tx1 && y === ty1) break;
    if (isVisionBlocker(x, y)) return false;
  }
  return true;
}

function isVisionBlocker(tx, ty) {
  if (ty < 0 || ty >= rows || tx < 0 || tx >= cols) return true;
  if (collision[ty][tx] === 1) return true;
  for (const door of doors) {
    for (const tile of door.tiles || []) {
      if (tile.x === tx && tile.y === ty && !door.open) return true;
    }
  }
  return false;
}

function canSeePlayer(npc) {
  const nc = npcCenter(npc);
  const pc = playerCenter();
  const dx = pc.x - nc.x;
  const dy = pc.y - nc.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 112) return false;

  const angle = Math.atan2(dy, dx);
  let minAngle, maxAngle;

  switch (npc.facing) {
    case 'RIGHT':
      minAngle = -Math.PI / 4;
      maxAngle = Math.PI / 4;
      break;
    case 'DOWN':
      minAngle = Math.PI / 4;
      maxAngle = 3 * Math.PI / 4;
      break;
    case 'LEFT':
      minAngle = 3 * Math.PI / 4;
      maxAngle = 5 * Math.PI / 4;
      break;
    case 'UP':
      minAngle = -3 * Math.PI / 4;
      maxAngle = -Math.PI / 4;
      break;
    default:
      return false;
  }

  let normalizedAngle = angle;
  if (normalizedAngle > Math.PI) normalizedAngle -= 2 * Math.PI;
  if (normalizedAngle < -Math.PI) normalizedAngle += 2 * Math.PI;

  let inRange = false;
  if (minAngle <= maxAngle) inRange = normalizedAngle >= minAngle && normalizedAngle <= maxAngle;
  else inRange = normalizedAngle >= minAngle || normalizedAngle <= maxAngle;

  if (!inRange) return false;
  return lineOfSight(nc.x, nc.y, pc.x, pc.y);
}

function seek(npc, tx, ty, speed, dt) {
  const nc = npcCenter(npc);
  const dx = tx - nc.x;
  const dy = ty - nc.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;

  const ux = dx / dist;
  const uy = dy / dist;
  if (Math.abs(ux) > Math.abs(uy)) npc.facing = ux >= 0 ? 'RIGHT' : 'LEFT';
  else npc.facing = uy >= 0 ? 'DOWN' : 'UP';

  moveActor(npc, ux * speed * dt, uy * speed * dt);
  return dist < 8;
}

function updateNPC(npc, dt) {
  const sees = canSeePlayer(npc);
  if (sees) {
    const pc = playerCenter();
    npc.lastSeenX = pc.x;
    npc.lastSeenY = pc.y;
    npc.state = 'CHASE';
    npc.loseSight = 0;
  } else if (npc.state === 'CHASE') {
    npc.loseSight += 1;
    if (npc.loseSight >= 10) {
      npc.state = 'SEARCH';
      npc.searchTimer = 2.2;
    }
  }

  if (npc.state === 'PATROL') {
    const target = npc.waypoints[npc.wpIndex];
    if (seek(npc, target.x, target.y, npc.speedPatrol, dt)) {
      npc.wpIndex = (npc.wpIndex + 1) % npc.waypoints.length;
    }
  } else if (npc.state === 'CHASE') {
    seek(npc, npc.lastSeenX, npc.lastSeenY, npc.speedChase, dt);
  } else if (npc.state === 'SEARCH') {
    npc.searchTimer -= dt;
    if (seek(npc, npc.lastSeenX, npc.lastSeenY, npc.speedPatrol, dt) || npc.searchTimer <= 0) {
      npc.state = 'PATROL';
    }
  }
}

function updateNPCs(dt) {
  state.playerDetected = false;
  for (const npc of npcs) {
    updateNPC(npc, dt);
    if (npc.state === 'CHASE') state.playerDetected = true;
  }
}

function drawPlayer(ctx, scale) {
  ctx.save();
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x * scale, player.y * scale, player.w * scale, player.h * scale);
  ctx.fillStyle = '#0d3';
  ctx.fillRect((player.x + 2) * scale, (player.y + 2) * scale, 2 * scale, 2 * scale);
  ctx.fillRect((player.x + player.w - 4) * scale, (player.y + 2) * scale, 2 * scale, 2 * scale);
  ctx.restore();
}

function drawNPCs(ctx, scale) {
  ctx.save();
  for (const npc of npcs) {
    const nc = npcCenter(npc);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
    ctx.beginPath();

    let startAngle, endAngle;
    switch (npc.facing) {
      case 'RIGHT':
        startAngle = -Math.PI / 4;
        endAngle = Math.PI / 4;
        break;
      case 'DOWN':
        startAngle = Math.PI / 4;
        endAngle = 3 * Math.PI / 4;
        break;
      case 'LEFT':
        startAngle = 3 * Math.PI / 4;
        endAngle = 5 * Math.PI / 4;
        break;
      case 'UP':
        startAngle = -3 * Math.PI / 4;
        endAngle = -Math.PI / 4;
        break;
      default:
        startAngle = -Math.PI / 4;
        endAngle = Math.PI / 4;
    }

    ctx.moveTo(nc.x * scale, nc.y * scale);
    ctx.arc(nc.x * scale, nc.y * scale, 112 * scale, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    const color = npc.state === 'CHASE' ? '#ff5555' : (npc.state === 'SEARCH' ? '#ffbb55' : '#ff77aa');
    ctx.fillStyle = color;
    ctx.fillRect(npc.x * scale, npc.y * scale, npc.w * scale, npc.h * scale);

    ctx.fillStyle = '#222';
    if (npc.facing === 'LEFT') ctx.fillRect(npc.x * scale, (npc.y + 4) * scale, 2 * scale, 2 * scale);
    if (npc.facing === 'RIGHT') ctx.fillRect((npc.x + npc.w - 2) * scale, (npc.y + 4) * scale, 2 * scale, 2 * scale);
    if (npc.facing === 'UP') ctx.fillRect((npc.x + 4) * scale, npc.y * scale, 2 * scale, 2 * scale);
    if (npc.facing === 'DOWN') ctx.fillRect((npc.x + 4) * scale, (npc.y + npc.h - 2) * scale, 2 * scale, 2 * scale);

    const c = npcCenter(npc);
    ctx.strokeStyle = npc.state === 'CHASE' ? 'rgba(255,100,100,.75)' : 'rgba(255,255,255,.25)';
    ctx.lineWidth = Math.max(1, scale);
    ctx.beginPath();
    ctx.moveTo(c.x * scale, c.y * scale);
    if (npc.facing === 'LEFT') ctx.lineTo((c.x - 14) * scale, c.y * scale);
    if (npc.facing === 'RIGHT') ctx.lineTo((c.x + 14) * scale, c.y * scale);
    if (npc.facing === 'UP') ctx.lineTo(c.x * scale, (c.y - 14) * scale);
    if (npc.facing === 'DOWN') ctx.lineTo(c.x * scale, (c.y + 14) * scale);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCollision(ctx, scale) {
  if (!showCollision || !collision.length) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 60, 60, 0.28)';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (collision[y][x] === 1) {
        ctx.fillRect(x * baseTile * scale, y * baseTile * scale, baseTile * scale, baseTile * scale);
      }
    }
  }
  ctx.restore();
}

function drawEntities(ctx, scale) {
  ctx.save();

  for (const door of doors) {
    if (!door.open) continue;
    ctx.fillStyle = 'rgba(80, 200, 255, 0.28)';
    ctx.strokeStyle = 'rgba(120, 230, 255, 0.85)';
    ctx.lineWidth = Math.max(1, scale);
    for (const t of door.tiles) {
      ctx.fillRect(t.x * baseTile * scale, t.y * baseTile * scale, baseTile * scale, baseTile * scale);
      ctx.strokeRect(t.x * baseTile * scale + 1, t.y * baseTile * scale + 1, baseTile * scale - 2, baseTile * scale - 2);
    }
  }

  for (const chest of chests) {
    const x = chest.x * baseTile * scale;
    const y = chest.y * baseTile * scale;
    if (chest.opened) {
      ctx.fillStyle = 'rgba(255, 220, 120, 0.20)';
      ctx.strokeStyle = 'rgba(255, 220, 120, 0.95)';
    } else {
      ctx.fillStyle = 'rgba(255, 180, 40, 0.18)';
      ctx.strokeStyle = 'rgba(255, 180, 40, 0.95)';
    }
    ctx.lineWidth = Math.max(1, scale);
    ctx.fillRect(x, y, baseTile * scale, baseTile * scale);
    ctx.strokeRect(x + 1, y + 1, baseTile * scale - 2, baseTile * scale - 2);
    if (chest.opened) {
      ctx.beginPath();
      ctx.moveTo(x + 3 * scale, y + 8 * scale);
      ctx.lineTo(x + 7 * scale, y + 12 * scale);
      ctx.lineTo(x + 13 * scale, y + 4 * scale);
      ctx.stroke();
    }
  }

  if (state.nearestDoor) {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(1, scale);
    for (const t of state.nearestDoor.tiles) {
      ctx.strokeRect(t.x * baseTile * scale + 1, t.y * baseTile * scale + 1, baseTile * scale - 2, baseTile * scale - 2);
    }
  }
  if (state.nearestChest) {
    const x = state.nearestChest.x * baseTile * scale;
    const y = state.nearestChest.y * baseTile * scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(1, scale);
    ctx.strokeRect(x + 1, y + 1, baseTile * scale - 2, baseTile * scale - 2);
  }

  ctx.restore();
}

function drawUI() {
  const info = document.getElementById('info');
  if (!info) return;
  let promptLine = state.prompt ? `<p>${state.prompt}</p>` : '<p>靠近门或箱子后按 E 交互。</p>';
  let msgLine = message ? `<p>${message}</p>` : '';
  let danger = state.playerDetected ? '<p style="color:#ff8080;">警报：你已被发现</p>' : '<p style="color:#9fd4ff;">状态：未被发现</p>';
  info.innerHTML = `
    <p>
      Map Size: <span id="map-size">${cols}×${rows}</span> |
      Tile Size: <span id="tile-size">${baseTile}</span> |
      Doors: <span id="door-count">${doors.length}</span> |
      Chests: <span id="chest-count">${state.openedChests}/${chests.length}</span> |
      NPCs: <span id="npc-count">${npcs.length}</span>
    </p>
    <p>WASD / 方向键移动，Shift 加速，E 交互，~ 显示碰撞。</p>
    ${danger}
    ${promptLine}
    ${msgLine}
  `;
}

function afterRender() {
  if (!mapRenderer || !mapRenderer.ctx) return;
  const ctx = mapRenderer.ctx;
  const scale = mapRenderer.scale;

  drawCollision(ctx, scale);
  drawEntities(ctx, scale);
  drawNPCs(ctx, scale);
  drawPlayer(ctx, scale);
  hudInfo();
  drawUI();

  if (overlayP5 && mapRenderer?.canvas) {
    const w = mapRenderer.canvas.clientWidth || mapRenderer.canvas.width;
    const h = mapRenderer.canvas.clientHeight || mapRenderer.canvas.height;

    if (overlayP5.width !== w || overlayP5.height !== h) {
      overlayP5.resizeCanvas(w, h);
    }
  }

  // [Jinni][NEW] Render overlay screens after the main game world so menus/screens appear on top
  screenOverlaySystem.afterRender();
}

function frame(ts) {
  if (!lastT) lastT = ts;
  const dt = Math.min((ts - lastT) / 1000, 1 / 20);
  lastT = ts;

  if (isPlaying()) {
    updatePlayer(dt);
    updateNPCs(dt);
    updateInteractionTargets();

    if (state.playerDetected) setGameState('lose');
    else if (state.openedChests >= chests.length) setGameState('win');

    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) message = '';
    }
  }

  if (mapRenderer && mapRenderer.isReady) {
    mapRenderer.render();
    afterRender();
  }
  requestAnimationFrame(frame);
}

async function init() {
  try {
    mapRenderer = new window.TiledMapRenderer('mapCanvas', 'basic test');
    // [Jinni][NEW] Initialize overlay screen system on top of the map renderer
    await mapRenderer.init();
    createOverlayP5();
    findSpawn();

    document.getElementById('loading').style.display = 'none';

    // [Jinni][NEW] Unlock browser audio on first user interaction to allow music playback
    function unlockAndSyncAudio() {
      unlockAudio();
      syncStateAudio(game.state, { fadeDuration: 0 });
    }

    window.addEventListener("keydown", unlockAndSyncAudio, { once: true });
    window.addEventListener("click", unlockAndSyncAudio, { once: true });

    document.getElementById('zoomInBtn').addEventListener('click', () => {
      if (!mapRenderer) return;
      mapRenderer.scale += 0.5;
      mapRenderer.resizeCanvas();
      mapRenderer.render();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
      if (!mapRenderer) return;
      if (mapRenderer.scale <= 0.5) return;
      mapRenderer.scale -= 0.5;
      mapRenderer.resizeCanvas();
      mapRenderer.render();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      if (!mapRenderer) return;
      mapRenderer.scale = 2;
      mapRenderer.showGrid = false;
      mapRenderer.resizeCanvas();
      mapRenderer.render();
    });

    document.getElementById('gridBtn').addEventListener('click', () => {
      if (!mapRenderer) return;
      mapRenderer.showGrid = !mapRenderer.showGrid;
      mapRenderer.render();
    });

    document.getElementById('collisionBtn').addEventListener('click', () => {
      showCollision = !showCollision;
      if (mapRenderer) mapRenderer.render();
    });

    drawUI();
    requestAnimationFrame(frame);
  } catch (err) {
    console.error(err);
    const loading = document.getElementById('loading');
    loading.textContent = '加载失败：' + err.message;
    loading.style.color = '#ff8080';
  }
}


// [Jinni][EDIT] Refactored keyboard handling so input is routed by current game state
window.addEventListener('keydown', (e) => {

  // [Jinni][NEW] Added debug shortcuts for manually testing win/lose/start/intro/playing states
  if (e.code === 'Digit1') {
    setGameState('win');
    e.preventDefault();
    return;
  }

  if (e.code === 'Digit2') {
    setGameState('lose');
    e.preventDefault();
    return;
  }

  if (e.code === 'Digit3') {
    setGameState('start');
    e.preventDefault();
    return;
  }

  if (e.code === 'Digit4') {
    setGameState('intro');
    e.preventDefault();
    return;
  }

  if (e.code === 'Digit5') {
    setGameState('playing');
    e.preventDefault();
    return;
  }

  // [Jinni][NEW] Added global mute toggle shortcut
  if (e.code === 'KeyM') {
    toggleMute();
    e.preventDefault();
    return;
  }

  // [Jinni][NEW] Non-gameplay input is now handled by dedicated screen controllers
  if (!isPlaying()) {
    if (game.state === 'start') handleStartScreenKey(e.key);
    else if (game.state === 'intro') handleIntroScreenKey(e.key);
    else if (game.state === 'win') handleWinScreenKey(e.key);
    else if (game.state === 'lose') handleLoseScreenKey(e.key);

    if (['Enter', 'KeyR', 'Escape', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    return;
  }

  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }

  // [Jinni][NEW] Allow returning to start screen during gameplay
  if (e.code === 'Escape') setGameState('start');
  if (e.code === 'Backquote') showCollision = !showCollision;
  if (e.code === 'KeyE' && !e.repeat) tryInteract();
}, { passive: false });

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

window.addEventListener('blur', () => {
  for (const key in keys) keys[key] = false;
});

window.addEventListener('load', init);
