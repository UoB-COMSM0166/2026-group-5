export const BASE_W = 960;
export const BASE_H = 540;

export function getLayout(p) {
  const scale = Math.min(p.width / BASE_W, p.height / BASE_H);
  const width = BASE_W * scale;
  const height = BASE_H * scale;
  const offsetX = (p.width - width) / 2;
  const offsetY = (p.height - height) / 2;
  return { scale, width, height, offsetX, offsetY };
}

export function sx(x, layout) {
  return x * layout.scale;
}

export function sy(y, layout) {
  return y * layout.scale;
}

export function centerX(w, layout) {
  return layout.offsetX + (layout.width - w) / 2;
}

export function centerY(h, layout) {
  return layout.offsetY + (layout.height - h) / 2;
}

export function centerGroupX(left, right, layout) {
  const groupWidth = right - left;
  return layout.offsetX + (layout.width - groupWidth) / 2 - left;
}

export function centerGroupY(top, bottom, layout) {
  const groupHeight = bottom - top;
  return layout.offsetY + (layout.height - groupHeight) / 2 - top;
}
