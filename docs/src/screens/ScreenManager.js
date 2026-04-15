// Screen router: maps screen state names to Screen instances and delegates lifecycle calls.
import { StartScreen } from './StartScreen.js';
import { IntroScreen } from './StoryIntroScreen.js';
import { TutorialScreen } from './StoryTutorialScreen.js';
import { PlaythroughSelectScreen } from './PlaythroughSelectScreen.js';
import { MapSelectScreen } from './MapSelectScreen.js';
import { DifficultySelectScreen } from './DifficultySelectScreen.js';
import { PlayingScreen } from './PlayingScreen.js';
import { PauseScreen } from './PauseScreen.js';
import { FalseEndingScreen } from './FalseEndingScreen.js';
import { TrueEndingScreen } from './TrueEndingScreen.js';
import { WinScreen } from './WinScreen.js';
import { LoseScreen } from './LoseScreen.js';
import { CreditsScreen } from './CreditsScreen.js';

// Holds all screen instances and forwards update/render/input to the active one.
export class ScreenManager {
  #screens;
  #currentScreen;

  constructor() {
    this.#screens = {
      start: new StartScreen(),
      playthrough_select: new PlaythroughSelectScreen(),
      difficulty_select: new DifficultySelectScreen(),
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

  // Look up a screen instance by its state key.
  getScreen(name) {
    return this.#screens[name] || null;
  }

  // Reset the named screen when transitioning into it.
  reset(screenName, state) {
    const screen = this.#screens[screenName];
    if (screen) screen.reset(state);
  }

  // Tick the active screen's per-frame logic.
  update(screenName, state, deltaTime, api) {
    const screen = this.#screens[screenName];
    if (screen && screen.update) screen.update(state, deltaTime, api);
  }

  // Draw the active screen.
  render(screenName, p, state) {
    const screen = this.#screens[screenName];
    if (screen) screen.render(p, state);
  }

  // Forward a key event to the active screen.
  handleKey(screenName, key, state, api) {
    const screen = this.#screens[screenName];
    if (screen && screen.handleKey) return screen.handleKey(key, state, api);
    return false;
  }

  // Forward a mouse event to the active screen.
  handleMouse(screenName, mouseX, mouseY, p, state, api) {
    const screen = this.#screens[screenName];
    if (screen && screen.handleMouse) return screen.handleMouse(mouseX, mouseY, p, state, api);
    return false;
  }

  // Forward a key release event to the active screen.
  handleKeyUp(screenName, key, state, api) {
    const screen = this.#screens[screenName];
    if (screen && screen.onKeyUp) return screen.onKeyUp(key, state, api);
    return false;
  }

  // Return the prompt text for the active screen.
  getPrompt(screenName) {
    const screen = this.#screens[screenName];
    return screen ? screen.promptText : '';
  }
}
