import { resetGame } from "../game.js";
import { setFont, FONTS } from "../utils/fonts.js";
import { getLayout, sx, sy } from "../utils/screenLayout.js";

export function drawWinScreen(p) {
  const t = p.millis() * 0.002;
  const layout = getLayout(p);
  const alpha = (0.45 + Math.sin(t * 3) * 0.55) * 255;
  const pulse = 1 + Math.sin(t * 2.2) * 0.03;

  p.push();
  p.noStroke();
  p.fill(10, 40, 25, 240);
  p.rect(0, 0, p.width, p.height);

  p.translate(layout.offsetX, layout.offsetY);

  // Title effect
  p.push();
  p.translate(layout.width / 2, sy(170, layout));
  p.scale(pulse);
  p.fill("#61ffb0");
  setFont(p, Math.max(18, sx(22, layout)), FONTS.title);
  p.textAlign(p.CENTER, p.CENTER);
  p.text("YOU WIN!", 0, 0);
  p.pop();

  // Normal text settings
  p.textAlign(p.CENTER, p.CENTER);
  p.fill("#d9ffe9");
  setFont(p, Math.max(12, sx(12, layout)), FONTS.ui);
  p.text("Princess is now safe and sound!", layout.width / 2, sy(245, layout));
  p.fill(255, 255, 255, alpha);
  setFont(p, Math.max(12, sx(12, layout)), FONTS.ui);
  p.text("Press R to restart", layout.width / 2, sy(315, layout));

  p.pop();
}

export function handleWinScreenKey(key) {
  if (key.toLowerCase() === "r") {
    resetGame();
  }
}