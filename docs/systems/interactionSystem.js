// Interaction detection: finds nearby doors, chests, buttons, exit and dispatches actions.
export function findNearbyEntity(player, entities, tileSize, maxDistanceTiles = 1.25) {
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  const maxDistance = tileSize * maxDistanceTiles;
  let best = null;
  let bestDist = Infinity;
  for (const entity of entities) {
    const cx = entity.centerX ?? (entity.x + 0.5) * tileSize;
    const cy = entity.centerY ?? (entity.y + 0.5) * tileSize;
    const dist = Math.hypot(px - cx, py - cy);
    if (dist <= maxDistance && dist < bestDist) {
      best = entity;
      bestDist = dist;
    }
  }
  return best;
}

function getActorTileRect(actor, tileSize) {
  return {
    left: Math.floor(actor.x / tileSize),
    right: Math.floor((actor.x + actor.w - 1) / tileSize),
    top: Math.floor(actor.y / tileSize),
    bottom: Math.floor((actor.y + actor.h - 1) / tileSize)
  };
}

function actorOverlapsDoor(actor, door, tileSize) {
  const rect = getActorTileRect(actor, tileSize);
  return (door.tiles || []).some((tile) => tile.x >= rect.left && tile.x <= rect.right && tile.y >= rect.top && tile.y <= rect.bottom);
}

function findNearbyDoor(player, doors, tileSize, maxTileGap = 1) {
  const rect = getActorTileRect(player, tileSize);
  let best = null;
  let bestGap = Infinity;
  for (const door of doors) {
    let gap = Infinity;
    for (const tile of door.tiles || []) {
      const dx = tile.x < rect.left ? rect.left - tile.x : tile.x > rect.right ? tile.x - rect.right : 0;
      const dy = tile.y < rect.top ? rect.top - tile.y : tile.y > rect.bottom ? tile.y - rect.bottom : 0;
      gap = Math.min(gap, Math.max(dx, dy));
    }
    if (gap <= maxTileGap && gap < bestGap) {
      best = door;
      bestGap = gap;
    }
  }
  return best;
}

export function getInteractionPrompt(level) {
  const tileSize = level.settings.baseTile;
  const chest = findNearbyEntity(level.player, level.boxSystem.boxes, tileSize, 1.1);
  if (chest && !chest.opened) return { type: 'box', entity: chest, text: 'Press E to open chest' };

  const door = findNearbyDoor(level.player, level.doorSystem.doors, tileSize, 1);
  if (door) return { type: 'door', entity: door, text: door.open ? 'Press E to close door' : 'Press E to open door' };

  const button = level.roomSystem.getNearestButtonForPlayer(level.player, tileSize * 1.35);
  if (button) return { type: 'light', entity: button, text: level.roomSystem.isLit(button.roomId) ? 'Press E to turn lights off' : 'Press E to restore lights' };

  const mission = level.missionSystem;
  if (mission?.isUnlocked() && mission.getDistanceToExit(level.player) <= tileSize * 1.2) {
    return { type: 'exit', entity: mission.exit, text: mission.getInteractPrompt?.() || 'Press E to extract' };
  }
  return null;
}

export function tryInteract(level) {
  const prompt = getInteractionPrompt(level);
  if (!prompt) return { success: false, text: '' };

  if (prompt.type === 'box') {
    const changed = level.boxSystem.open(prompt.entity);
    return { success: changed, text: changed ? 'Chest opened' : '', kind: 'box', entity: prompt.entity };
  }
  if (prompt.type === 'door') {
    const tileSize = level.settings.baseTile;
    if (prompt.entity.open) {
      const blockedByPlayer = actorOverlapsDoor(level.player, prompt.entity, tileSize);
      const blockedByNpc = (level.npcs || []).some((npc) => actorOverlapsDoor(npc, prompt.entity, tileSize));
      if (blockedByPlayer || blockedByNpc) {
        return { success: false, text: 'Doorway blocked', kind: 'door', entity: prompt.entity };
      }
    }
    const changed = level.doorSystem.toggle(prompt.entity);
    return { success: changed, text: prompt.entity.open ? 'Door opened' : 'Door closed', kind: 'door', entity: prompt.entity };
  }
  if (prompt.type === 'light') {
    const roomId = prompt.entity.roomId;
    level.roomSystem.toggleRoom(roomId);
    return { success: true, text: level.roomSystem.rooms.get(roomId)?.lightOn ? 'Lights on' : 'Lights off', kind: 'light', entity: prompt.entity };
  }
  if (prompt.type === 'exit') {
    return { success: true, text: 'Extraction confirmed', kind: 'exit', entity: prompt.entity };
  }
  return { success: false, text: '' };
}
