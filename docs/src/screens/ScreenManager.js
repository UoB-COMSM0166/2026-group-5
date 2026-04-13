import { StartScreen } from './StartScreen.js';
import { IntroScreen } from './IntroScreen.js';
import { TutorialScreen } from './TutorialScreen.js';
import { PlayingScreen } from './PlayingScreen.js';
import { PauseScreen } from './PauseScreen.js';
import { WinScreen } from './WinScreen.js';
import { LoseScreen } from './LoseScreen.js';

export class ScreenManager {
  #screens;
  #currentScreen;

  constructor() {
    this.#screens = {
      start: new StartScreen(),
      intro: new IntroScreen(),
      tutorial: new TutorialScreen(),
      playing: new PlayingScreen(),
      pause: new PauseScreen(),
      win: new WinScreen(),
      lose: new LoseScreen()
    };
    this.#currentScreen = null;
  }

  getScreen(name) {
    return this.#screens[name] || null;
  }

  reset(screenName) {
    const screen = this.#screens[screenName];
    if (screen) screen.reset();
  }

  update(screenName, state, deltaTime) {
    const screen = this.#screens[screenName];
    if (screen && screen.update) screen.update(state, deltaTime);
  }

  render(screenName, p, state) {
    const screen = this.#screens[screenName];
    if (screen) screen.render(p, state);
  }

  handleKey(screenName, key, state, api) {
    const screen = this.#screens[screenName];
    if (screen && screen.handleKey) return screen.handleKey(key, state, api);
    return false;
  }

  handleMouse(screenName, mouseX, mouseY, p, state, api) {
    const screen = this.#screens[screenName];
    if (screen && screen.handleMouse) return screen.handleMouse(mouseX, mouseY, p, state, api);
    return false;
  }

  getPrompt(screenName) {
    const screen = this.#screens[screenName];
    return screen ? screen.promptText : '';
  }
}
