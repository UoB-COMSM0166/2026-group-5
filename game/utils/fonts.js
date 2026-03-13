export const FONTS = {
  title: "Press Start 2P",
  ui: "Press Start 2P",
  body: "VT323",
  retro: "Press Start 2P",
};

export function setFont(p, size = 16, family = FONTS.ui, style = "normal") {
  p.textFont(family);
  p.textSize(size);

  if (style === "bold") {
    p.textStyle(p.BOLD);
  } else if (style === "italic") {
    p.textStyle(p.ITALIC);
  } else {
    p.textStyle(p.NORMAL);
  }
}