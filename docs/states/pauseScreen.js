export function renderPauseScreen(p) {
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
