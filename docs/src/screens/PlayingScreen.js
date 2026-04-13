import { Screen } from './Screen.js';

export class PlayingScreen extends Screen {
  constructor() {
    super('playing', 'Find the chests');
  }

  handleKey(key, state, api) {
    // Playing screen doesn't handle keys directly - they're handled by GameCore
    return false;
  }

  render(p, state) {
    // Playing screen is rendered by renderScene in GameCore
    // This method is intentionally empty as the actual rendering happens elsewhere
  }
}
