import { game, resetGame } from "../game.js";
import { setFont, FONTS } from "../utils/fonts.js";
import { getLayout, sx, sy } from "../utils/screenLayout.js";

const captured = new Image();
captured.src = "../assets/images/original/drawings/captured.png";

export function drawLoseScreen(ctx, canvas) {
  const now = performance.now();
  const t = Date.now() * 0.02;
  const layout = getLayout(canvas);
  const blinkAlpha = 0.6 + Math.sin(t * 0.7) * 0.4;

  const enterDuration = 100;
  const elapsed = now - game.stateEnteredAt;
  const enter = Math.min(elapsed / enterDuration, 1);

  ctx.save();
  ctx.globalAlpha = enter;
  ctx.fillStyle = "rgba(49, 34, 42, 0.94)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  ctx.translate(layout.offsetX, layout.offsetY);

  const contentY = (1 - enter) * sy(20, layout);
  const contentScale = 0.96 + enter * 0.04;
  ctx.translate(layout.width / 2, layout.height / 2 + contentY);
  ctx.scale(contentScale, contentScale);
  ctx.translate(-layout.width / 2, -layout.height / 2);

  ctx.globalAlpha = enter;

  drawCaptured(ctx, t, layout);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const shakeFade = enter;
  const shakeX = Math.sin(t * 2.8) * sx(1.5, layout) * shakeFade;
  const shakeY = Math.cos(t * 2.1) * sy(1.2, layout) * shakeFade;
  const glow = (12 + Math.sin(t * 3) * 6) * enter;

  setFont(ctx, Math.max(18, sx(22, layout)), FONTS.title);

  ctx.fillStyle = "rgba(60, 0, 0, 0.9)";
  ctx.fillText("GAME OVER", layout.width / 2 + sx(2, layout), sy(120, layout) + sy(2, layout));

  ctx.save();
  ctx.shadowColor = "#ff3b3b";
  ctx.shadowBlur = glow;
  ctx.fillStyle = "#ff8080";
  ctx.fillText("GAME OVER", layout.width / 2 + shakeX, sy(120, layout) + shakeY);
  ctx.restore();

  ctx.fillStyle = "#ffdada";
  setFont(ctx, Math.max(12, sx(18, layout)), FONTS.ui);
  ctx.fillText("Your journey ends here.", layout.width / 2, sy(195, layout));

  ctx.save();
  ctx.globalAlpha = enter * blinkAlpha;
  ctx.fillStyle = "#ffffff";
  setFont(ctx, Math.max(12, sx(12, layout)), FONTS.ui);
  ctx.fillText("Press R to retry", layout.width / 2, sy(265, layout));
  ctx.restore();

  ctx.restore();
}

function drawCaptured(ctx, t, layout) {
  if (!captured.complete || captured.naturalWidth === 0) return;

  const floatY = Math.sin(t * 2) * sy(4, layout);
  const w = sx(300, layout);
  const h = sy(300, layout);
  const x = layout.width / 2 - w / 2;
  const y = sy(270, layout)

    ctx.drawImage(captured, x, y, w, h);
}


export function handleLoseScreenKey(key) {
  if (key.toLowerCase() === "r") {
      resetGame();
  }
}