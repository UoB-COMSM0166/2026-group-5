import { getStateTime, setGameState } from "../game.js";
import { setFont, FONTS } from "../utils/fonts.js";
import { getLayout, sx, sy } from "../utils/screenLayout.js";

let skipRequested = false;

export function resetIntroScreen() {
  skipRequested = false;
}

// Provisional
const introLines = [
  { text: "A motivating story of how ", delay: 0 },
  { text: "a normie like you" , delay: 1400},
  { text: "saves the princess from misery.", delay: 2200, gapAfter: 30 },

  { text: "But who knows,", delay: 4200 },
  { text: "maybe you're her real misery.", delay: 5500, gapAfter: 30 },

  { text: "Who gave you the confidence to think", delay: 7200},
  { text: "that you are the savior, mate?", delay: 9100, gapAfter: 30 },

  { text: "Nah,", delay: 11500 },
  { text: "just shut up and play the game.", delay: 12000 }
];



export function drawIntroScreen(p) {
    
  if (getStateTime() < 50) {
    skipRequested = false;
  }
    
  const rawElapsed = getStateTime();
  const elapsed = skipRequested ? 999999 : rawElapsed;
  const t = elapsed * 0.0025;
  const layout = getLayout(p);

  p.push();
  p.noStroke();
  p.fill(5, 5, 15, 240);
  p.rect(0, 0, p.width, p.height);

  p.translate(layout.offsetX, layout.offsetY);
  p.textAlign(p.CENTER, p.CENTER);

  p.fill("#9be7ff");
  setFont(p, Math.max(16, sx(20, layout)), FONTS.title);
  p.text("Introduction", layout.width / 2, sy(10, layout));

  p.fill("#ffffff");
  setFont(p, Math.max(14, sx(20, layout)), FONTS.body || FONTS.ui);

  const startY = sy(70, layout);
  const lineSpacing = sy(42, layout);

  let y = startY;

  for (let i = 0; i < introLines.length; i++) {
    const item = introLines[i];
    const line = revealText(item.text, elapsed, item.delay);

    p.text(line, layout.width / 2, y);

    y += lineSpacing;

    if (item.gapAfter) {
      y += sy(item.gapAfter, layout);
    }
  }

  const lastIndex = introLines.length - 1;
  const allVisible = 
    lastIndex >= 0 && 
    isFullyVisible(
      introLines[lastIndex].text,
      elapsed,
      introLines[lastIndex].delay
    );

  if (allVisible) {
    const alpha = (0.45 + Math.sin(t * 3) * 0.55) * 255;
    p.fill(255, 255, 255, alpha);
    setFont(p, Math.max(12, sx(12, layout)), FONTS.ui);
    p.text("Press ENTER to continue", layout.width / 2, sy(550, layout));
  }
  p.pop();
}

function revealText(text, elapsed, delay) {
  const chars = Math.max(0, Math.floor((elapsed - delay) / 50));
  return text.slice(0, chars);
}

function isFullyVisible(text, elapsed, delay) {
  return (elapsed - delay) / 50 >= text.length;
}

export function handleIntroScreenKey(key) {
  if (key !== "Enter") return;

  const lastIndex = introLines.length - 1;
  const elapsed = getStateTime();

  const allVisible =
    lastIndex >= 0 &&
    isFullyVisible(
      introLines[lastIndex].text,
      elapsed,
      introLines[lastIndex].delay
    );

  if (!allVisible && !skipRequested) {
    skipRequested = true;
    return;
  }

  skipRequested = false;
  setGameState("playing");
}