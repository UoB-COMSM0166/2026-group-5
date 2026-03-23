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
