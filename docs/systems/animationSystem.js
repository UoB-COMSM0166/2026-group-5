// Character animation: frame cycling, one-shot triggers, sprite sheet rect lookup.
const DIRECTIONS = ['down', 'left', 'right', 'up'];

function clampFrame(frame, max) {
  return ((frame % max) + max) % max;
}

export function ensureAnimState(entity, defaults = {}) {
  entity.anim ??= {};
  entity.anim.mode ??= defaults.mode || 'idle';
  entity.anim.facing ??= defaults.facing || 'down';
  entity.anim.frame ??= 0;
  entity.anim.timer ??= 0;
  entity.anim.bob ??= 0;
  entity.anim.flipX ??= false;
  entity.anim.frameCount ??= defaults.frameCount || 4;
  entity.anim.lockedMode ??= null;
  entity.anim.lockedTimer ??= 0;
  entity.anim.variant ??= defaults.variant || 'default';
  entity.anim.lastMode ??= entity.anim.mode;
  return entity.anim;
}

export function triggerOneShotAnimation(entity, mode, duration = 0.28, options = {}) {
  const anim = ensureAnimState(entity, options);
  anim.lockedMode = mode;
  anim.lockedTimer = duration;
  if (options.facing) anim.facing = options.facing;
  if (options.variant) anim.variant = options.variant;
  anim.timer = 0;
  return anim;
}

export function facingToRow(facing) {
  return Math.max(0, DIRECTIONS.indexOf(facing || 'down'));
}

function normalizeVisualMode(mode, moving) {
  if (mode === 'return') return moving ? 'walk' : 'idle';
  return mode;
}

export function updateHumanoidAnimation(entity, deltaTime, moving, facing, config = {}) {
  const anim = ensureAnimState(entity, config);
  const walkFrameDuration = config.walkFrameDuration || 0.12;
  const idleFrameDuration = config.idleFrameDuration || 0.35;
  const interactFrameDuration = config.interactFrameDuration || 0.09;
  const alertFrameDuration = config.alertFrameDuration || 0.1;
  const bobSpeed = config.bobSpeed || 10;
  const bobAmount = config.bobAmount || 1.5;
  const frameCount = config.frameCount || 4;

  if (facing) anim.facing = facing;
  anim.frameCount = frameCount;

  let desiredMode = config.modeOverride || (moving ? 'walk' : 'idle');
  if (anim.lockedTimer > 0 && anim.lockedMode) {
    anim.lockedTimer -= deltaTime;
    desiredMode = anim.lockedMode;
    if (anim.lockedTimer <= 0) {
      anim.lockedMode = null;
      anim.lockedTimer = 0;
      desiredMode = config.modeOverride || (moving ? 'walk' : 'idle');
    }
  }
  desiredMode = normalizeVisualMode(desiredMode, moving);

  if (anim.lastMode !== desiredMode) {
    anim.timer = 0;
    anim.lastMode = desiredMode;
  }
  anim.mode = desiredMode;
  anim.timer += deltaTime;

  if (desiredMode === 'interact') {
    const interactFrames = config.interactFrames || [0, 1, 2, 3];
    const cycle = Math.floor(anim.timer / interactFrameDuration);
    anim.frame = interactFrames[Math.min(cycle, interactFrames.length - 1)];
    anim.bob *= Math.max(0, 1 - deltaTime * 10);
  } else if (desiredMode === 'alert') {
    const alertFrames = config.alertFrames || [3, 2, 3, 1];
    const cycle = Math.floor(anim.timer / alertFrameDuration);
    anim.frame = alertFrames[cycle % alertFrames.length];
    anim.bob = Math.sin(anim.timer * (bobSpeed + 4)) * (bobAmount * 0.65);
  } else if (moving || desiredMode === 'walk') {
    const cycle = Math.floor(anim.timer / walkFrameDuration);
    const walkFrames = config.walkFrames || [0, 1, 2, 1];
    anim.frame = walkFrames[cycle % walkFrames.length];
    anim.bob = Math.sin(anim.timer * bobSpeed) * bobAmount;
  } else {
    const idleFrames = config.idleFrames || [0, 0, 3, 0];
    const cycle = Math.floor(anim.timer / idleFrameDuration);
    anim.frame = idleFrames[cycle % idleFrames.length];
    anim.bob *= Math.max(0, 1 - deltaTime * 8);
  }

  anim.frame = clampFrame(anim.frame, frameCount);
  return anim;
}

export function getFrameRect(img, anim, options = {}) {
  if (!img) return null;
  const frameCount = options.frameCount || anim?.frameCount || 4;
  const rows = options.rows || 4;
  const frameW = Math.floor(img.width / frameCount);
  const frameH = Math.floor(img.height / rows);
  const row = facingToRow(anim?.facing || 'down');
  const col = clampFrame(anim?.frame || 0, frameCount);
  return {
    sx: col * frameW,
    sy: row * frameH,
    sw: frameW,
    sh: frameH
  };
}
