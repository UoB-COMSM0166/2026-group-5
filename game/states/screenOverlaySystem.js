import { game } from "../game.js";
import { drawStartScreen } from "./startScreen.js";
import { drawIntroScreen } from "./introScreen.js";
import { drawWinScreen } from "./winScreen.js";
import { drawLoseScreen } from "./loseScreen.js";

export const screenOverlaySystem = {
  renderer: null,

  init(renderer) {
    this.renderer = renderer;
  },

  afterRender() {
    if (!this.renderer) return;

    const { ctx, canvas } = this.renderer;

    if (game.state === "playing") return;

    if (game.state === "start") {
      drawStartScreen(ctx, canvas);
    } else if (game.state === "intro") {
      drawIntroScreen(ctx, canvas);
    } else if (game.state === "win") {
      drawWinScreen(ctx, canvas);
    } else if (game.state === "lose") {
      drawLoseScreen(ctx, canvas);
    }
  }
};
