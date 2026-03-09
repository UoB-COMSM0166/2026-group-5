export const FONTS = {
  title: "'Press Start 2P'",
  ui: "'Press Start 2P'",
  dialogue: "'VT323'",
  retro: "'Press Start 2P'",
};

export function setFont(ctx, size = 16, family = FONTS.ui, style = "") {
  ctx.font = `${style ? style + " " : ""}${size}px ${family}`;
}