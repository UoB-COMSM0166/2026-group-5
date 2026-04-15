// Draw an image panel with optional alpha, scale, and offset.
export function drawPanelImage(p, img, x, y, w, opts = {}) {
  if (!img) return;

  const alpha = opts.alpha ?? 255;
  const scale = opts.scale ?? 1;
  const offsetX = opts.offsetX ?? 0;
  const offsetY = opts.offsetY ?? 0;
  const h = opts.h ?? (img.height * (w / img.width));

  const drawW = w * scale;
  const drawH = h * scale;
  const drawX = x + offsetX - (drawW - w) / 2;
  const drawY = y + offsetY - (drawH - h) / 2;

  p.push();
  p.tint(255, alpha);
  p.image(img, drawX, drawY, drawW, drawH);
  p.pop();
}
