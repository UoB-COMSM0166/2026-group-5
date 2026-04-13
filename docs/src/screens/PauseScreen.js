import { Screen } from './Screen.js';
import { SCREEN_STATES } from '../core/gameState.js';

export class PauseScreen extends Screen {
  constructor() {
    super('pause', 'Paused');
  }

  handleKey(key, state, api) {
    if (key === 'p' || key === 'P' || key === 'Enter') {
      api.setScreen(SCREEN_STATES.PLAYING);
      return true;
    }
    return false;
  }

  render(p, state) {
    p.push();
    p.noStroke();
    p.fill(0, 0, 0, 150);
    p.rect(0, 0, p.width, p.height);
    p.fill('#ffffff');
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(36);
    p.text('Paused', p.width / 2, p.height / 2 - 16);
    p.textSize(18);
    p.text('Press P or Enter to continue', p.width / 2, p.height / 2 + 24);
    p.pop();
  }
}
