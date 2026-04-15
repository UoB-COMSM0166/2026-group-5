// Virtual design resolution used for responsive scaling.
export const BASE_W = 960;
export const BASE_H = 540;

// Compute scale factor and centering offsets for the current canvas size.
export function getLayout(p) {
  const scale = Math.min(p.width / BASE_W, p.height / BASE_H);
  const width = BASE_W * scale;
  const height = BASE_H * scale;
  const offsetX = (p.width - width) / 2;
  const offsetY = (p.height - height) / 2;
  return { scale, width, height, offsetX, offsetY };
}

// Scale a horizontal value by the layout scale factor.
export function sx(x, layout) {
  return x * layout.scale;
}

// Scale a vertical value by the layout scale factor.
export function sy(y, layout) {
  return y * layout.scale;
}

// Compute the x-offset to horizontally center an element of width w.
export function centerX(w, layout) {
  return layout.offsetX + (layout.width - w) / 2;
}

// Compute the y-offset to vertically center an element of height h.
export function centerY(h, layout) {
  return layout.offsetY + (layout.height - h) / 2;
}

// Compute x-translation to horizontally center a group bounded by [left, right].
export function centerGroupX(left, right, layout) {
  const groupWidth = right - left;
  return layout.offsetX + (layout.width - groupWidth) / 2 - left;
}

// Compute y-translation to vertically center a group bounded by [top, bottom].
export function centerGroupY(top, bottom, layout) {
  const groupHeight = bottom - top;
  return layout.offsetY + (layout.height - groupHeight) / 2 - top;
}
