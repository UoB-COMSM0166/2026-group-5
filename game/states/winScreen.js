import { resetGame } from "../game.js";
import { setFont, FONTS } from "../utils/fonts.js";
import { getLayout, sx, sy } from "../utils/screenLayout.js";

export function drawWinScreen(ctx, canvas) {
  const t = Date.now() * 0.004;
  const pulse = 1 + Math.sin(t) * 0.03;
  const alpha = 0.6 + Math.sin(t * 1.8) * 0.4;
  const layout = getLayout(canvas);

  ctx.fillStyle = "rgba(0, 30, 10, 0.9)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(layout.offsetX, layout.offsetY);

  // Title effect
  ctx.save();
  ctx.translate(layout.width / 2, sy(170, layout));
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "#61ffb0";
  setFont(ctx, Math.max(18, sx(22, layout)), FONTS.title);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("YOU WIN!", 0, 0);
  ctx.restore();

  // Normal text settings
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#d9ffe9";
  setFont(ctx, Math.max(12, sx(12, layout)), FONTS.ui);
  ctx.fillText("Princess is now safe and sound!", layout.width / 2, sy(245, layout));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffffff";
  setFont(ctx, Math.max(12, sx(12, layout)), FONTS.ui);
  ctx.fillText("Press R to restart", layout.width / 2, sy(315, layout));
  ctx.restore();
  ctx.restore();
}

export function handleWinScreenKey(key) {
  if (key.toLowerCase() === "r") {
    resetGame();
  }
}