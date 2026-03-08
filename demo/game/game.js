
(() => {
  'use strict';

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
      x: 12 * baseTile, y: 9 * baseTile, w: 10, h: 14,
      speedPatrol: 55, speedChase: 82,
      state: 'PATROL', facing: 'RIGHT', wpIndex: 0,
      waypoints: [wp(10, 9), wp(14, 9), wp(14, 14), wp(10, 14)],
      lastSeenX: 0, lastSeenY: 0, searchTimer: 0, loseSight: 0
    },
    {
      id: 'NPC-2',
      x: 28 * baseTile, y: 14 * baseTile, w: 10, h: 14,
      speedPatrol: 55, speedChase: 82,
      state: 'PATROL', facing: 'RIGHT', wpIndex: 0,
      waypoints: [wp(19, 9), wp(30, 9), wp(30, 20), wp(19, 20)],
      lastSeenX: 0, lastSeenY: 0, searchTimer: 0, loseSight: 0
    },
    {
      id: 'NPC-3',
      x: 28 * baseTile, y: 30 * baseTile, w: 10, h: 14,
      speedPatrol: 55, speedChase: 82,
      state: 'PATROL', facing: 'RIGHT', wpIndex: 0,
      waypoints: [wp(20, 20), wp(30, 20), wp(30, 30), wp(20, 30)],
      lastSeenX: 0, lastSeenY: 0, searchTimer: 0, loseSight: 0
    }
  ];

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
        `player=(${player.x.toFixed(1)}, ${player.y.toFixed(1)}) tile=(${tx}, ${ty}) scale=${mapRenderer ? mapRenderer.scale.toFixed(2) : '1.00'} collision=${showCollision} chests=${state.openedChests}/${chests.length} chasing=${chasing}`;
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
    if (!rectHitsCollision(nextX, actor.y, actor.w, actor.h)) {
      actor.x = nextX;
    }
    if (!rectHitsCollision(actor.x, nextY, actor.w, actor.h)) {
      actor.y = nextY;
    }
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
    const sprinting = keys['ShiftLeft'] || keys['ShiftRight'];
    if (sprinting) speed *= player.sprint;

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

    if (state.nearestChest) {
      state.prompt = '按 E 打开箱子';
    } else if (state.nearestDoor) {
      state.prompt = state.nearestDoor.open ? '按 E 关门' : '按 E 开门';
    }
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
    if (state.nearestDoor) {
      toggleDoor(state.nearestDoor);
    }
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

    while (true) {
      if (!(tx0 === Math.floor(x0 / baseTile) && ty0 === Math.floor(y0 / baseTile))) {
        if (isSolidTile(tx0, ty0)) return false;
      }
      if (tx0 === tx1 && ty0 === ty1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; tx0 += sx; }
      if (e2 < dx) { err += dx; ty0 += sy; }
    }
    return true;
  }

  function canSeePlayer(npc) {
    const nc = npcCenter(npc);
    const pc = playerCenter();
    const dx = pc.x - nc.x;
    const dy = pc.y - nc.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 112) return false;

    // Simple FOV: require target to be somewhat in front
    const facingVec =
      npc.facing === 'LEFT' ? {x:-1,y:0} :
      npc.facing === 'RIGHT' ? {x:1,y:0} :
      npc.facing === 'UP' ? {x:0,y:-1} : {x:0,y:1};
    const dirx = dx / (dist || 1);
    const diry = dy / (dist || 1);
    const dot = facingVec.x * dirx + facingVec.y * diry;
    if (dot < 0.15 && dist > 40) return false;

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
      const color = npc.state === 'CHASE' ? '#ff5555' : (npc.state === 'SEARCH' ? '#ffbb55' : '#ff77aa');
      ctx.fillStyle = color;
      ctx.fillRect(npc.x * scale, npc.y * scale, npc.w * scale, npc.h * scale);

      // facing indicator
      ctx.fillStyle = '#222';
      if (npc.facing === 'LEFT') ctx.fillRect(npc.x * scale, (npc.y + 4) * scale, 2 * scale, 2 * scale);
      if (npc.facing === 'RIGHT') ctx.fillRect((npc.x + npc.w - 2) * scale, (npc.y + 4) * scale, 2 * scale, 2 * scale);
      if (npc.facing === 'UP') ctx.fillRect((npc.x + 4) * scale, npc.y * scale, 2 * scale, 2 * scale);
      if (npc.facing === 'DOWN') ctx.fillRect((npc.x + 4) * scale, (npc.y + npc.h - 2) * scale, 2 * scale, 2 * scale);

      // debug sight cone line
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
    drawCollision(mapRenderer.ctx, mapRenderer.scale);
    drawEntities(mapRenderer.ctx, mapRenderer.scale);
    drawNPCs(mapRenderer.ctx, mapRenderer.scale);
    drawPlayer(mapRenderer.ctx, mapRenderer.scale);
    hudInfo();
    drawUI();
  }

  function frame(ts) {
    if (!lastT) lastT = ts;
    const dt = Math.min((ts - lastT) / 1000, 1 / 20);
    lastT = ts;

    updatePlayer(dt);
    updateNPCs(dt);
    updateInteractionTargets();

    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) message = '';
    }

    if (mapRenderer && mapRenderer.isReady) {
      mapRenderer.render();
      afterRender();
    }
    requestAnimationFrame(frame);
  }

  async function init() {
    try {
      mapRenderer = new TiledMapRenderer('mapCanvas', 'basic test');
      await mapRenderer.init();
      findSpawn();

      document.getElementById('loading').style.display = 'none';
      document.getElementById('zoomInBtn').addEventListener('click', () => mapRenderer.setZoom(mapRenderer.scale * 1.2));
      document.getElementById('zoomOutBtn').addEventListener('click', () => mapRenderer.setZoom(mapRenderer.scale / 1.2));
      document.getElementById('resetBtn').addEventListener('click', () => mapRenderer.resetView());
      document.getElementById('gridBtn').addEventListener('click', () => mapRenderer.toggleGrid());
      document.getElementById('collisionBtn').addEventListener('click', () => { showCollision = !showCollision; });

      drawUI();
      requestAnimationFrame(frame);
    } catch (err) {
      console.error(err);
      const loading = document.getElementById('loading');
      loading.textContent = '加载失败：' + err.message;
      loading.style.color = '#ff8080';
    }
  }

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'Backquote') showCollision = !showCollision;
    if (e.code === 'KeyE' && !e.repeat) tryInteract();
  }, { passive:false });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  window.addEventListener('blur', () => {
    for (const key in keys) keys[key] = false;
  });

  window.addEventListener('load', init);
})();
