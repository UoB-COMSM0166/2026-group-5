export function getTileDarkness(level, tx, ty) {
  const roomId = level.roomSystem.getRoomId(tx, ty);
  if (roomId <= 1) return 0;
  const room = level.roomSystem.rooms.get(roomId);
  if (!room) return 0;
  const base = room.lightOn ? 0 : 0.62;
  return Math.min(0.8, base + room.alert * 0.08);
}
