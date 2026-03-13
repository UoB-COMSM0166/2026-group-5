import { game } from "../game.js";
import { drawStartScreen } from "./startScreen.js";
import { drawIntroScreen } from "./introScreen.js";
import { drawWinScreen } from "./winScreen.js";
import { drawLoseScreen } from "./loseScreen.js";

export const screenOverlaySystem = {
  p: null,

  init(p) {
    this.p = p;
  },

  afterRender() {
    if (!this.p) return;
    this.p.clear();
    if (game.state === "playing") return;

    if (game.state === "start") {
      drawStartScreen(this.p);
    } else if (game.state === "intro") {
      drawIntroScreen(this.p);
    } else if (game.state === "win") {
      drawWinScreen(this.p);
    } else if (game.state === "lose") {
      drawLoseScreen(this.p);
    }
  }
};
