// Animation and interpolation utilities: clamp, lerp, easing, fade windows.
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function rangeProgress(t, start, end) {
  return clamp((t - start) / Math.max(0.0001, end - start), 0, 1);
}

export function smoothAppear(t, start, end) {
  return easeOutCubic(rangeProgress(t, start, end));
}

export function fadeWindow(t, fadeInEnd = 0.18, fadeOutStart = 0.88) {
  const a = clamp(t / Math.max(0.0001, fadeInEnd), 0, 1);
  const b = clamp((1 - t) / Math.max(0.0001, 1 - fadeOutStart), 0, 1);
  return Math.min(a, b, 1);
}
