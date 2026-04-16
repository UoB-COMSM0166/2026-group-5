// Interaction detection: finds nearby doors, chests, buttons, exit and dispatches actions.
import { DOOR_STATES } from './doorSystem.js';
import { hasKey } from './lootTable.js';

// Find the closest entity to the player within a tile-based radius.
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

// Get the tile-coordinate bounding rectangle for an actor.
function getActorTileRect(actor, tileSize) {
  return {
    left: Math.floor(actor.x / tileSize),
    right: Math.floor((actor.x + actor.w - 1) / tileSize),
    top: Math.floor(actor.y / tileSize),
    bottom: Math.floor((actor.y + actor.h - 1) / tileSize)
  };
}

// Check if an actor's tile rect overlaps any door tile.
function actorOverlapsDoor(actor, door, tileSize) {
  const rect = getActorTileRect(actor, tileSize);
  return (door.tiles || []).some((tile) => tile.x >= rect.left && tile.x <= rect.right && tile.y >= rect.top && tile.y <= rect.bottom);
}

// Find the nearest door within maxTileGap tiles of the player.
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

// Determine which interaction prompt to show (exit > chest > door > button).
export function getInteractionPrompt(level) {
  const tileSize = level.settings.baseTile;
  const mission = level.missionSystem;

  // Extraction should take priority once unlocked, otherwise overlapping exit doors
  // can trap the player in a door prompt and block the ending transition.
  if (mission?.isUnlocked() && mission.getDistanceToExit(level.player) <= tileSize * 1.2) {
    return { type: 'exit', entity: mission.exit, text: mission.getInteractPrompt?.() || 'Press E to extract' };
  }

  const chest = findNearbyEntity(level.player, level.boxSystem.boxes, tileSize, 1.8);
  if (chest && !chest.opened) return { type: 'box', entity: chest, text: 'Press E to open chest' };

  const door = findNearbyDoor(level.player, level.doorSystem.doors, tileSize, 1);
  if (door && !door.visualOnly && door.cooldown <= 0) {
    if (door.state === DOOR_STATES.LOCKED) return { type: 'door', entity: door, text: 'Press E to unlock (key)' };
    if (door.state === DOOR_STATES.OPEN) return { type: 'door', entity: door, text: 'Press E to close door' };
    return { type: 'door', entity: door, text: 'Press E to open door' };
  }

  const button = level.roomSystem.getNearestButtonForPlayer(level.player, tileSize * 1.35);
  if (button) return { type: 'light', entity: button, text: level.roomSystem.isLit(button.roomId) ? 'Press E to turn lights off' : 'Press E to restore lights' };
  return null;
}

// Execute the player's interact action on the nearest interactable entity.
export function tryInteract(level, inventory) {
  const prompt = getInteractionPrompt(level);
  if (!prompt) return { success: false, text: '' };

  if (prompt.type === 'box') {
    const changed = level.boxSystem.open(prompt.entity);
    return { success: changed, text: changed ? 'Chest opened' : '', kind: 'box', entity: prompt.entity };
  }
  if (prompt.type === 'door') {
    const door = prompt.entity;
    const tileSize = level.settings.baseTile;

    if (door.state === DOOR_STATES.LOCKED) {
      if (inventory && hasKey(inventory, door.keyId)) {
        // Keys are not consumed - they persist and can unlock multiple doors
        level.doorSystem.unlock(door, door.keyId);
        return { success: true, text: 'Door unlocked', kind: 'door', entity: door };
      }
      return { success: false, text: `Need key: ${door.keyId}`, kind: 'door', entity: door };
    }

    if (door.state === DOOR_STATES.OPEN) {
      const blockedByPlayer = actorOverlapsDoor(level.player, door, tileSize);
      const blockedByNpc = (level.npcs || []).some((npc) => actorOverlapsDoor(npc, door, tileSize));
      if (blockedByPlayer || blockedByNpc) {
        return { success: false, text: 'Doorway blocked', kind: 'door', entity: door };
      }
      const closed = level.doorSystem.close(door);
      return { success: closed, text: 'Door closed', kind: 'door', entity: door };
    }

    // CLOSED → OPEN
    const opened = level.doorSystem.open(door);
    return { success: opened, text: 'Door opened', kind: 'door', entity: door };
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
