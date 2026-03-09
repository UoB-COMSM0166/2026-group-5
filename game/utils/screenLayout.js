export const BASE_W = 960;
export const BASE_H = 540;

export function getLayout(canvas) {
  const scale = Math.min(canvas.width / BASE_W, canvas.height / BASE_H);
  const width = BASE_W * scale;
  const height = BASE_H * scale;
  const offsetX = (canvas.width - width) / 2;
  const offsetY = (canvas.height - height) / 2;

  return { scale, width, height, offsetX, offsetY };
}

export function sx(x, layout) {
  return x * layout.scale;
}

export function sy(y, layout) {
  return y * layout.scale;
}
