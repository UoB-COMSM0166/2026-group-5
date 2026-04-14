import { StartScreen } from './StartScreen.js';
import { IntroScreen } from './StoryIntroScreen.js';
import { TutorialScreen } from './StoryTutorialScreen.js';
import { PlaythroughSelectScreen } from './PlaythroughSelectScreen.js';
import { MapSelectScreen } from './MapSelectScreen.js';
import { PlayingScreen } from './PlayingScreen.js';
import { PauseScreen } from './PauseScreen.js';
import { FalseEndingScreen } from './FalseEndingScreen.js';
import { TrueEndingScreen } from './TrueEndingScreen.js';
import { WinScreen } from './WinScreen.js';
import { LoseScreen } from './LoseScreen.js';
import { CreditsScreen } from './CreditsScreen.js';

export class ScreenManager {
  #screens;
  #currentScreen;

  constructor() {
    this.#screens = {
      start: new StartScreen(),
      playthrough_select: new PlaythroughSelectScreen(),
      intro: new IntroScreen(),
      tutorial: new TutorialScreen(),
      map_select: new MapSelectScreen(),
      playing: new PlayingScreen(),
      pause: new PauseScreen(),
      false_ending: new FalseEndingScreen(),
      true_ending: new TrueEndingScreen(),
      win: new WinScreen(),
      lose: new LoseScreen(),
      credits: new CreditsScreen()
    };
    this.#currentScreen = null;
  }

  getScreen(name) {
    return this.#screens[name] || null;
  }

  reset(screenName, state) {
    const screen = this.#screens[screenName];
    if (screen) screen.reset(state);
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
