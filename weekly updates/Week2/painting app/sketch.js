let uiFont;
let bgLayer;
let drawLayer;
let brushColors;
let brushIndex = 0;
let sidebarWidth = 230; // widen sidebar to avoid text overlap
let swatchSize = 36;
let swatchGap = 16;
let brushSizes;
let brushSizeIndex = 1;
let componentScales;
let componentScaleIndex = 1;
let tool = 'brush';
let ui;
let frameMargin = 40;
let actionButtons;
let undoStack;
let maxUndo = 20;
let smoothX;
let smoothY;
let lastX;
let lastY;
let lineAnchor;
let colorMenuOpen = false;
let sizeMenuOpen = false;
let brushMenuOpen = false;
let scaleMenuOpen = false;
let brushTypes;
let brushTypeIndex = 0;
let layout;
let uiType = {
  title: 13,   // main headings
  label: 12,   // secondary labels
  button: 12,  // button text
  sublabel: 11 // smaller labels
};
// Per-brush ephemeral state for pro-grade dynamics (tapers, grain seeds)
let brushMemory = { inkW: null, softSeed: 0, bristleSeed: 0 };

function closeMenus() {
  colorMenuOpen = false;
  sizeMenuOpen = false;
  brushMenuOpen = false;
  scaleMenuOpen = false;
  componentMenuOpen = null;
}
let componentMenuOpen = null;
const shapeBtn = { w: 30, h: 22, gap: 6, rowPad: 8 };
let activeComponent = 'face';
let componentItems = [];
let examplePlaceIndex = 0;
let lassoState = 'idle';
let lassoPoints = [];
let lassoBounds = null;
let lassoImage = null;
let lassoOffsetX = 0;
let lassoOffsetY = 0;
let lassoParts = [];
let moveStartX = 0;
let moveStartY = 0;
let pendingComponentPlace = false;
let pendingComponentX = 0;
let pendingComponentY = 0;
// Three sample examples chosen from the reference set
let alienPresets = [
  // Sleek diamond face, rectangle body, wavy arms, tidy legs
  { name: 'REF1', face: 2, body: 1, armhand: 1, leg: 0, eyes: 0, mouth: 0, antenna: 1 },
  // Rounded face + oval body, crossed arms, arrow legs for a dynamic pose
  { name: 'REF2', face: 1, body: 0, armhand: 2, leg: 1, eyes: 1, mouth: 1, antenna: 0 },
  // Soft oval face with round body, wavy arms, angled legs
  { name: 'REF3', face: 0, body: 2, armhand: 1, leg: 2, eyes: 0, mouth: 0, antenna: 1 },
  // Sharp diamond face, round body, straight arms, arrow legs
  { name: 'REF4', face: 2, body: 2, armhand: 0, leg: 1, eyes: 1, mouth: 0, antenna: 0 },
  // Balanced round face + rectangle body, crossed arms, calm legs
  { name: 'REF5', face: 1, body: 1, armhand: 2, leg: 0, eyes: 0, mouth: 1, antenna: 1 },
  // Classic oval duo with straight arms and angled legs
  { name: 'REF6', face: 0, body: 0, armhand: 0, leg: 2, eyes: 1, mouth: 0, antenna: 0 }
];
let alienParts = {
  face: { label: 'FACE', options: ['OVAL', 'ROUND', 'DIAMOND'], index: 1 },     // default ROUND
  eyes: { label: 'EYES', options: ['DOT', 'LINE'], index: 0 },                    // default DOT
  mouth: { label: 'MOUTH', options: ['SMILE', 'LINE'], index: 0 },                // default SMILE
  antenna: { label: 'ANTENNA', options: ['SINGLE', 'DUAL'], index: 0 },           // default SINGLE
  body: { label: 'BODY', options: ['OVAL', 'RECTANGLE', 'ROUND'], index: 1 },     // default RECTANGLE
  armhand: { label: 'ARM & HAND', options: ['STRAIGHT', 'WAVE', 'CROSSED'], index: 0 }, // default STRAIGHT
  leg: { label: 'LEG', options: ['STRAIGHT', 'ARROW', 'ANGLE'], index: 0 }        // default STRAIGHT
};

// Flat shape palette (no category labels) for quick pick
const shapePalette = [
  { key: 'face', optIndex: 0 },    // OVAL
  { key: 'face', optIndex: 1 },    // ROUND
  { key: 'face', optIndex: 2 },    // DIAMOND
  { key: 'body', optIndex: 0 },    // OVAL body
  { key: 'body', optIndex: 1 },    // RECTANGLE
  { key: 'body', optIndex: 2 },    // ROUND body
  { key: 'eyes', optIndex: 0 },    // DOT
  { key: 'eyes', optIndex: 1 },    // LINE
  { key: 'mouth', optIndex: 0 },   // SMILE
  { key: 'mouth', optIndex: 1 },   // LINE
  { key: 'antenna', optIndex: 0 }, // SINGLE
  { key: 'antenna', optIndex: 1 }, // DUAL
  { key: 'armhand', optIndex: 0 }, // STRAIGHT arms
  { key: 'armhand', optIndex: 1 }, // WAVE arms
  { key: 'armhand', optIndex: 2 }, // CROSSED arms
  { key: 'leg', optIndex: 0 },     // STRAIGHT legs
  { key: 'leg', optIndex: 1 },     // ARROW legs
  { key: 'leg', optIndex: 2 }      // ANGLE legs
];

function getShapeGridInfo() {
  let usableW = sidebarWidth - 24;
  let perRow = floor((usableW + shapeBtn.gap) / (shapeBtn.w + shapeBtn.gap));
  perRow = max(1, perRow);
  let rows = ceil(shapePalette.length / perRow);
  let height = rows * (shapeBtn.h + shapeBtn.gap + shapeBtn.rowPad);
  return { perRow, rows, height };
}

function computeLayout() {
  let palette = getShapeGridInfo();
  let examplesH = alienPresets.length * 28; // match ACTIONS rhythm
  let y = 18;

  layout = {};
  layout.colorLabelY = y;
  layout.colorY = y + 26;
  y = layout.colorY + 46;

  layout.sizeLabelY = y;
  layout.sizeY = y + 26;
  y = layout.sizeY + 46;

  layout.brushLabelY = y;
  layout.brushY = y + 26;
  y = layout.brushY + 46;

  layout.scaleLabelY = y;
  layout.scaleY = y + 26;
  y = layout.scaleY + 46;

  layout.componentsLabelY = y;
  layout.componentsStartY = layout.componentsLabelY + 28;
  y = layout.componentsStartY + palette.height + 32; // extra breathing room below shapes

  layout.examplesLabelY = y;
  layout.examplesStartY = layout.examplesLabelY + 28;
  y = layout.examplesStartY + examplesH + 30;

  layout.actionsLabelY = y;
  layout.actionStartY = layout.actionsLabelY + 28;
}

function preload(){
  uiFont = loadFont('PressStart2P-Regular.ttf');
}

function setup() {
  createCanvas(600, 1000);
  bgLayer = createGraphics(width, height);
  drawLayer = createGraphics(width, height);
  brushColors = [
    color('#6CEAFF'),   // cold cyan
    color('#4AA3FF'),   // steel blue
    color('#B6E3FF'),   // ice blue
    color('#7A8BFF'),   // violet blue
    color('#CDE7F0')    // pale silver
  ];
  brushSizes = [2, 4, 8, 12];
  componentScales = [0.7, 1.0, 1.3, 1.6];
  // Notability-inspired brush set (4 distinct styles)
  brushTypes = [
    { name: 'PEN', mode: 'pen', alpha: 255, taper: 0.65, smooth: 0.35 },
    { name: 'PENCIL', mode: 'pencil', alpha: 140, jitter: 2.2, grain: 0.65 },
    { name: 'HIGHLIGHT', mode: 'highlighter', alpha: 70, bleed: 0.65 },
    { name: 'AIRBRUSH', mode: 'airbrush', alpha: 40, jitter: 0.0, trail: 2.2 }
  ];
  computeLayout();
  ui = {
    panel: '#F8F8F8',
    border: '#D0D0D0',
    shadow: '#E8E8E8',
    text: '#3A3A3A',
    active: '#0B0B0B',
    examples: '#56697A' // softer blue-grey for examples label & items
  };
  actionButtons = [];
  undoStack = [];

  buildCyberGradientBackground();
  
  noStroke();
  textSize(32);
  textFont(uiFont);
  fill(100);
  textAlign(CENTER, TOP);
  text("DRAW A PORTRAIT", width / 2, 30);
  
}

function drawSectionHeader(sidebarX, y, label) {
  fill(ui.text);
  textFont(uiFont);
  textStyle(NORMAL);
  textSize(uiType.title);
  textAlign(CENTER, TOP);
  text(label, sidebarX + sidebarWidth / 2, y);
}

function draw() {
  image(bgLayer, 0, 0);
  noStroke();
  fill(255, 255, 255, 90);
  rect(0, 0, width - sidebarWidth, height);
  drawFrame();
  drawDrawingLayer();
  drawComponentItems();
  drawLassoOverlay();
  drawUI();
  // drawing is handled by mouse events
}

function drawDrawingLayer() {
  let drawW = width - sidebarWidth;
  let innerW = drawW - frameMargin * 2;
  let innerH = height - frameMargin * 2;
  image(
    drawLayer,
    frameMargin,
    frameMargin,
    innerW,
    innerH,
    frameMargin,
    frameMargin,
    innerW,
    innerH
  );
}

function drawComponentItems() {
  if (componentItems.length === 0) return;
  for (let i = 0; i < componentItems.length; i++) {
    let it = componentItems[i];
    let idx = it.indices ? Object.assign({}, it.indices) : null;
    if (idx && idx.rot === undefined) idx.rot = it.rot || 0;
    stampComponent(it.type, it.x, it.y, it.size, it.color, idx);
  }
}

function drawLassoOverlay() {
  if (tool !== 'lasso') return;
  if (lassoState === 'selecting' && lassoPoints.length > 1) {
    noFill();
    stroke('#00FF66');
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < lassoPoints.length; i++) {
      vertex(lassoPoints[i].x, lassoPoints[i].y);
    }
    endShape();
  }
  if ((lassoState === 'selected' || lassoState === 'dragging') && lassoPoints.length > 2) {
    noFill();
    stroke('#FF3366');
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < lassoPoints.length; i++) {
      vertex(lassoPoints[i].x, lassoPoints[i].y);
    }
    endShape(CLOSE);
  }
}

function isInDrawArea(x, y) {
  let drawW = width - sidebarWidth;
  return (
    x >= frameMargin &&
    x <= drawW - frameMargin &&
    y >= frameMargin &&
    y <= height - frameMargin
  );
}

function drawFrame() {
  let drawW = width - sidebarWidth;
  // Psycho-Pass inspired: cool metallic frame
  noStroke();
  fill('#0E1116');
  rect(0, 0, drawW, height);

  // Outer metal band
  for (let i = 0; i < 10; i++) {
    let t = i / 9;
    let c = lerpColor(color('#0B0F14'), color('#26313D'), t);
    stroke(c);
    strokeWeight(1);
    noFill();
    rect(6 + i, 6 + i, drawW - 12 - i * 2, height - 12 - i * 2, 6);
  }

  // Inner cold edge
  stroke('#7AA6B2');
  strokeWeight(1);
  noFill();
  rect(frameMargin, frameMargin, drawW - frameMargin * 2, height - frameMargin * 2, 4);

  // Subtle scanline highlight
  stroke(255, 255, 255, 25);
  strokeWeight(1);
  for (let y = 10; y < height - 10; y += 8) {
    line(10, y, drawW - 10, y);
  }
}


function buildCyberGradientBackground() {
  let drawW = width - sidebarWidth;
  bgLayer.background('#FFFFFF');
}

function drawUI() {
  let sidebarX = width - sidebarWidth;
  noStroke();
  fill(ui.panel);
  rect(sidebarX, 0, sidebarWidth, height);

  drawSectionHeader(sidebarX, layout.colorLabelY, "COLOR");
  drawColorSelector(sidebarX, layout.colorY, false);

  drawSectionHeader(sidebarX, layout.sizeLabelY, "SIZE");
  drawSizeSelector(sidebarX, layout.sizeY, false);

  drawSectionHeader(sidebarX, layout.brushLabelY, "BRUSH");
  drawBrushSelector(sidebarX, layout.brushY, false);

  drawSectionHeader(sidebarX, layout.scaleLabelY, "SCALE");
  drawScaleSelector(sidebarX, layout.scaleY, false);

  drawSectionHeader(sidebarX, layout.componentsLabelY, "SHAPES");
  drawShapePalette(sidebarX, layout.componentsStartY);

  drawSectionHeader(sidebarX, layout.examplesLabelY, "EXAMPLES");
  drawExampleButtons(sidebarX, layout.examplesStartY);

  drawSectionHeader(sidebarX, layout.actionsLabelY, "ACTIONS");
  drawActionButtons(sidebarX);

  // Draw dropdown menus on top to avoid overlap
  if (colorMenuOpen) drawColorSelector(sidebarX, layout.colorY, true);
  if (sizeMenuOpen) drawSizeSelector(sidebarX, layout.sizeY, true);
  if (brushMenuOpen) drawBrushSelector(sidebarX, layout.brushY, true);
  if (scaleMenuOpen) drawScaleSelector(sidebarX, layout.scaleY, true);
  drawShapePalette(sidebarX, layout.componentsStartY, true);

  // footer toggles removed for now
}

function drawExcalidrawButton(x, y, w, h, active) {
  noStroke();
  fill(ui.shadow);
  rect(x + 2, y + 2, w, h, 8);
  fill(active ? ui.active : '#FFFFFF');
  rect(x, y, w, h, 8);
  stroke(ui.border);
  strokeWeight(1);
  noFill();
  rect(x, y, w, h, 8);
}

function drawPillButton(x, y, w, h, label, active = false) {
  drawExcalidrawButton(x, y, w, h, active);
  fill(active ? ui.panel : ui.text);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(uiType.button);
  text(label, x + w / 2, y + h / 2);
}

function drawColorSelector(sidebarX, y, drawMenu = true) {
  let x = sidebarX + 18;
  let w = sidebarWidth - 36;
  let h = 28;
  drawExcalidrawButton(x, y, w, h, false);
  noStroke();
  fill(brushColors[brushIndex]);
  rect(x + 8, y + 6, 16, 16, 4);
  fill(ui.text);
  textAlign(CENTER, CENTER);
  textSize(uiType.label);
  text("CURRENT", x + w / 2 + 10, y + 14);

  if (drawMenu && colorMenuOpen) {
    let cols = 5;
    let size = 18;
    let gap = 8;
    let startX = x;
    let startY = y + h + 8;
    let rowH = size + gap;
    let panelH = rowH;
    drawExcalidrawButton(startX, startY, w, panelH, false);
    for (let i = 0; i < brushColors.length; i++) {
      let cx = startX + 10 + i * (size + gap);
      let cy = startY + 5;
      noStroke();
      fill(brushColors[i]);
      rect(cx, cy, size, size, 4);
      if (i === brushIndex) {
        stroke(ui.active);
        strokeWeight(2);
        noFill();
        rect(cx - 2, cy - 2, size + 4, size + 4, 5);
      }
    }
  }
}

function drawSizeSelector(sidebarX, y, drawMenu = true) {
  let x = sidebarX + 18;
  let w = sidebarWidth - 36;
  let h = 28;
  drawExcalidrawButton(x, y, w, h, false);
  noStroke();
  fill(ui.text);
  textAlign(CENTER, CENTER);
  textSize(uiType.label);
  text("CURRENT", x + w / 2 - 8, y + 14);
  let s = brushSizes[brushSizeIndex];
  ellipse(x + w - 18, y + 14, s, s);

  if (drawMenu && sizeMenuOpen) {
    let size = 18;
    let gap = 8;
    let startX = x;
    let startY = y + h + 8;
    let panelH = size + 10;
    drawExcalidrawButton(startX, startY, w, panelH, false);
    for (let i = 0; i < brushSizes.length; i++) {
      let cx = startX + 12 + i * (size + gap);
      let cy = startY + 5;
      noStroke();
      fill(ui.text);
      ellipse(cx + size / 2, cy + size / 2, brushSizes[i], brushSizes[i]);
      if (i === brushSizeIndex) {
        stroke(ui.active);
        strokeWeight(2);
        noFill();
        rect(cx - 2, cy - 2, size + 4, size + 4, 5);
      }
    }
  }
}

function drawBrushSelector(sidebarX, y, drawMenu = true) {
  let x = sidebarX + 18;
  let w = sidebarWidth - 36;
  let h = 28;
  drawExcalidrawButton(x, y, w, h, false);
  noStroke();
  fill(ui.text);
  textAlign(LEFT, CENTER);
  textSize(uiType.label);
  text("CURRENT", x + 8, y + 14);
  textAlign(RIGHT, CENTER);
  text(brushTypes[brushTypeIndex].name, x + w - 10, y + 14);

  if (drawMenu && brushMenuOpen) {
    let startX = x;
    let panelH = brushTypes.length * 20 + 8;
    let startY = y - panelH - 8;
    if (startY < 6) startY = y + h + 8;
    drawExcalidrawButton(startX, startY, w, panelH, false);
    for (let i = 0; i < brushTypes.length; i++) {
      let rowY = startY + 4 + i * 20;
      if (i === brushTypeIndex) {
        noStroke();
        fill(0, 0, 0, 20);
        rect(startX + 4, rowY, w - 8, 18, 4);
      }
      fill(ui.text);
      textAlign(LEFT, CENTER);
      textSize(uiType.label);
      text(brushTypes[i].name, startX + 10, rowY + 9);
    }
  }
}

function drawScaleSelector(sidebarX, y, drawMenu = true) {
  let x = sidebarX + 18;
  let w = sidebarWidth - 36;
  let h = 28;
  drawExcalidrawButton(x, y, w, h, false);
  noStroke();
  fill(ui.text);
  textAlign(LEFT, CENTER);
  textSize(uiType.label);
  text("CURRENT", x + 8, y + 14);
  textAlign(RIGHT, CENTER);
  text(nf(componentScales[componentScaleIndex] * 100, 0, 0) + "%", x + w - 10, y + 14);

  if (drawMenu && scaleMenuOpen) {
    let startX = x;
    let panelH = componentScales.length * 20 + 8;
    let startY = y - panelH - 8;
    if (startY < 6) startY = y + h + 8;
    drawExcalidrawButton(startX, startY, w, panelH, false);
    for (let i = 0; i < componentScales.length; i++) {
      let rowY = startY + 4 + i * 20;
      if (i === componentScaleIndex) {
        noStroke();
        fill(0, 0, 0, 20);
        rect(startX + 4, rowY, w - 8, 18, 4);
      }
      fill(ui.text);
      textAlign(LEFT, CENTER);
      textSize(uiType.label);
      text(nf(componentScales[i] * 100, 0, 0) + "%", startX + 10, rowY + 9);
    }
  }
}

function drawShapePalette(sidebarX, y, drawMenus = false) {
  let x = sidebarX + 12;
  let w = sidebarWidth - 24;
  let grid = getShapeGridInfo();
  for (let r = 0; r < grid.rows; r++) {
    let yRow = y + r * (shapeBtn.h + shapeBtn.gap + shapeBtn.rowPad);
    noStroke();
    fill(ui.shadow);
    rect(x + 2, yRow + 1, w, shapeBtn.h + 4, 8);
    fill(ui.panel);
    stroke(ui.border);
    strokeWeight(1);
    rect(x, yRow, w, shapeBtn.h + 4, 8);
    for (let c = 0; c < grid.perRow; c++) {
      let idx = r * grid.perRow + c;
      if (idx >= shapePalette.length) break;
      let sp = shapePalette[idx];
      let bx = x + 6 + c * (shapeBtn.w + shapeBtn.gap);
      let by = yRow + 2;
      let active = (alienParts[sp.key].index === sp.optIndex);
      drawShapeIcon(sp.key, alienParts[sp.key].options[sp.optIndex], bx, by, shapeBtn.w, shapeBtn.h, active);
    }
  }
}

function drawShapeIcon(key, opt, x, y, w, h, active) {
  let cx = x + w / 2;
  let cy = y + h / 2;
  let size = min(w, h) * 0.35;
  // button chrome
  noStroke();
  fill(ui.shadow);
  rect(x + 1, y + 1, w, h, 6);
  fill('#FFFFFF');
  stroke(ui.border);
  strokeWeight(1);
  rect(x, y, w, h, 6);
  // highlight ring if active
  if (active) {
    stroke(ui.active);
    strokeWeight(2);
    noFill();
    rect(x + 2, y + 2, w - 4, h - 4, 5);
  }
  // icon stroke
  stroke(active ? ui.active : ui.text);
  strokeWeight(2);
  noFill();

  if (key === 'face' || key === 'body') {
    if (opt === 'OVAL') ellipse(cx, cy, size * 1.4, size * 1.8);
    else if (opt === 'ROUND') ellipse(cx, cy, size * 1.8, size * 1.8);
    else if (opt === 'DIAMOND') {
      beginShape();
      vertex(cx, cy - size * 1.4);
      vertex(cx + size * 1.4, cy);
      vertex(cx, cy + size * 1.4);
      vertex(cx - size * 1.4, cy);
      endShape(CLOSE);
    } else if (opt === 'RECTANGLE') {
      rect(cx - size * 1.5, cy - size, size * 3, size * 2, 6);
    }
  } else if (key === 'eyes') {
    if (opt === 'DOT') {
      ellipse(cx - size * 0.6, cy, size * 0.25, size * 0.25);
      ellipse(cx + size * 0.6, cy, size * 0.25, size * 0.25);
    } else {
      // LINE
      line(cx - size * 0.9, cy, cx - size * 0.2, cy);
      line(cx + size * 0.2, cy, cx + size * 0.9, cy);
    }
  } else if (key === 'mouth') {
    if (opt === 'SMILE') arc(cx, cy, size * 2, size * 0.9, 0, PI);
    if (opt === 'LINE') line(cx - size, cy, cx + size, cy);
  } else if (key === 'antenna') {
    if (opt === 'SINGLE') {
      line(cx, cy + size * 0.8, cx, cy - size * 1.0);
      ellipse(cx, cy - size * 1.0, size * 0.3, size * 0.3);
    } else {
      line(cx - size * 0.5, cy + size * 0.6, cx - size * 0.5, cy - size * 0.8);
      line(cx + size * 0.5, cy + size * 0.6, cx + size * 0.5, cy - size * 0.8);
      ellipse(cx - size * 0.5, cy - size * 0.8, size * 0.25, size * 0.25);
      ellipse(cx + size * 0.5, cy - size * 0.8, size * 0.25, size * 0.25);
    }
  } else if (key === 'armhand') {
    if (opt === 'STRAIGHT') line(cx - size * 1.4, cy, cx + size * 1.4, cy);
    else if (opt === 'WAVE') {
      beginShape();
      for (let i = 0; i <= 8; i++) {
        let t = i / 8;
        let px = lerp(cx - size * 1.4, cx + size * 1.4, t);
        let py = cy + sin(t * TWO_PI) * size * 0.35;
        vertex(px, py);
      }
      endShape();
    } else if (opt === 'CROSSED') {
      line(cx - size * 1.0, cy - size * 0.15, cx + size * 1.0, cy + size * 0.15);
      line(cx - size * 1.0, cy + size * 0.15, cx + size * 1.0, cy - size * 0.15);
    }
  } else if (key === 'leg') {
    if (opt === 'STRAIGHT') {
      line(cx - size * 0.5, cy, cx - size * 0.5, cy + size * 1.6);
      line(cx + size * 0.5, cy, cx + size * 0.5, cy + size * 1.6);
    } else if (opt === 'ARROW') {
      line(cx - size * 0.45, cy, cx - size * 0.45, cy + size * 1.2);
      line(cx + size * 0.45, cy, cx + size * 0.45, cy + size * 1.2);
      line(cx - size * 0.45, cy + size * 1.2, cx - size * 0.7, cy + size * 1.5);
      line(cx - size * 0.45, cy + size * 1.2, cx - size * 0.2, cy + size * 1.5);
      line(cx + size * 0.45, cy + size * 1.2, cx + size * 0.7, cy + size * 1.5);
      line(cx + size * 0.45, cy + size * 1.2, cx + size * 0.2, cy + size * 1.5);
    } else if (opt === 'ANGLE') {
      line(cx, cy, cx - size * 0.8, cy + size * 1.4);
      line(cx, cy, cx + size * 0.8, cy + size * 1.4);
    }
  }
}

function drawExampleButtons(sidebarX, y) {
  let x = sidebarX + 18;
  let w = sidebarWidth - 36;
  let h = 24;
  textStyle(NORMAL);
  textFont(uiFont); // match SHAPES & ACTIONS
  for (let i = 0; i < alienPresets.length; i++) {
    let rowY = y + i * 28; // same vertical rhythm as ACTIONS
    drawPillButton(x, rowY, w, h, "EX" + (i + 1), false);
  }
}

function drawActionButtons(sidebarX) {
  actionButtons = [
    { label: 'ERASE', action: 'erase', y: layout.actionStartY },
    { label: 'LASSO', action: 'lasso', y: layout.actionStartY + 28 },
    { label: 'UNDO', action: 'undo', y: layout.actionStartY + 56 },
    { label: 'CLEAR', action: 'clear', y: layout.actionStartY + 84 },
    { label: 'SAVE', action: 'save', y: layout.actionStartY + 112 }
  ];
  for (let i = 0; i < actionButtons.length; i++) {
    let b = actionButtons[i];
    let x = sidebarX + 18;
    let w = sidebarWidth - 36;
    let h = 24;
    let active = (b.action === 'erase' && tool === 'eraser') ||
                 (b.action === 'component' && tool === 'component') ||
                 (b.action === 'lasso' && tool === 'lasso');
    drawPillButton(x, b.y, w, h, b.label, active);
  }
}

function mousePressed() {
  let sidebarX = width - sidebarWidth;
  let inSidebar = (mouseX >= sidebarX && mouseX <= width);
  if (!inSidebar) {
    closeMenus();
  }
  if (inSidebar) {
    let panelX = sidebarX + 18;
    let panelW = sidebarWidth - 36;

    for (let i = 0; i < actionButtons.length; i++) {
      let b = actionButtons[i];
      let x = sidebarX + 18;
      let w = sidebarWidth - 36;
      let h = 24;
      if (mouseX >= x && mouseX <= x + w && mouseY >= b.y && mouseY <= b.y + h) {
        if (b.action === 'erase') tool = (tool === 'eraser') ? 'brush' : 'eraser';
        if (b.action === 'lasso') {
          tool = (tool === 'lasso') ? 'brush' : 'lasso';
          lassoState = 'idle';
          lassoPoints = [];
          lassoBounds = null;
          lassoImage = null;
          lassoOffsetX = 0;
          lassoOffsetY = 0;
          lassoParts = [];
        }
        if (b.action === 'undo') doUndo();
        if (b.action === 'clear') clearCanvas();
        if (b.action === 'save') saveCanvas('portrait', 'png');
        closeMenus();
        return;
      }
    }

    // Brush menu selection (handle first to avoid header toggles swallowing clicks)
    if (brushMenuOpen) {
      let panelH = brushTypes.length * 20 + 8;
      let startY = layout.brushY - panelH - 8;
      if (startY < 6) startY = layout.brushY + 28 + 8;
      if (mouseX >= panelX && mouseX <= panelX + panelW && mouseY >= startY && mouseY <= startY + panelH) {
        let idx = floor((mouseY - (startY + 4)) / 20);
        let rowY = startY + 4 + idx * 20;
        if (idx >= 0 && idx < brushTypes.length && mouseY >= rowY && mouseY <= rowY + 18) {
          brushTypeIndex = idx;
        }
        brushMenuOpen = false;
        return;
      }
    }

    // Color selector
    if (mouseY >= layout.colorY && mouseY <= layout.colorY + 28 && mouseX >= panelX && mouseX <= panelX + panelW) {
      colorMenuOpen = !colorMenuOpen;
      sizeMenuOpen = false;
      brushMenuOpen = false;
      scaleMenuOpen = false;
      componentMenuOpen = null;
      tool = 'brush';
      return;
    }
    if (colorMenuOpen) {
      let size = 18;
      let gap = 8;
      let startY = layout.colorY + 28 + 8;
      let startX = panelX + 10;
      for (let i = 0; i < brushColors.length; i++) {
        let cx = startX + i * (size + gap);
        let cy = startY + 5;
        if (mouseX >= cx && mouseX <= cx + size && mouseY >= cy && mouseY <= cy + size) {
          brushIndex = i;
          colorMenuOpen = false;
          return;
        }
      }
    }

    // Size selector
    if (mouseY >= layout.sizeY && mouseY <= layout.sizeY + 28 && mouseX >= panelX && mouseX <= panelX + panelW) {
      sizeMenuOpen = !sizeMenuOpen;
      colorMenuOpen = false;
      brushMenuOpen = false;
      scaleMenuOpen = false;
      componentMenuOpen = null;
      tool = 'brush';
      return;
    }
    if (sizeMenuOpen) {
      let size = 18;
      let gap = 8;
      let startY = layout.sizeY + 28 + 8;
      let startX = panelX + 12;
      for (let i = 0; i < brushSizes.length; i++) {
        let cx = startX + i * (size + gap);
        let cy = startY + 5;
        if (mouseX >= cx && mouseX <= cx + size && mouseY >= cy && mouseY <= cy + size) {
          brushSizeIndex = i;
          sizeMenuOpen = false;
          return;
        }
      }
    }

    // Brush type selector
    if (mouseY >= layout.brushY && mouseY <= layout.brushY + 28 && mouseX >= panelX && mouseX <= panelX + panelW) {
      brushMenuOpen = !brushMenuOpen;
      colorMenuOpen = false;
      sizeMenuOpen = false;
      scaleMenuOpen = false;
      componentMenuOpen = null;
      tool = 'brush';
      return;
    }

    // Scale selector
    if (mouseY >= layout.scaleY && mouseY <= layout.scaleY + 28 && mouseX >= panelX && mouseX <= panelX + panelW) {
      scaleMenuOpen = !scaleMenuOpen;
      colorMenuOpen = false;
      sizeMenuOpen = false;
      brushMenuOpen = false;
      componentMenuOpen = null;
      tool = 'component';
      return;
    }
    if (scaleMenuOpen) {
      let panelH = componentScales.length * 20 + 8;
      let startY = layout.scaleY - panelH - 8;
      if (startY < 6) startY = layout.scaleY + 28 + 8;
      for (let i = 0; i < componentScales.length; i++) {
        let rowY = startY + 4 + i * 20;
        if (mouseX >= panelX && mouseX <= panelX + panelW && mouseY >= rowY && mouseY <= rowY + 18) {
          componentScaleIndex = i;
          scaleMenuOpen = false;
          return;
        }
      }
    }

    // Shape palette (icon buttons)
    let grid = getShapeGridInfo();
    for (let r = 0; r < grid.rows; r++) {
      let yRow = layout.componentsStartY + r * (shapeBtn.h + shapeBtn.gap + shapeBtn.rowPad);
      for (let c = 0; c < grid.perRow; c++) {
        let idx = r * grid.perRow + c;
        if (idx >= shapePalette.length) break;
        let bx = sidebarX + 12 + 6 + c * (shapeBtn.w + shapeBtn.gap);
        let by = yRow + 2;
        if (mouseX >= bx && mouseX <= bx + shapeBtn.w && mouseY >= by && mouseY <= by + shapeBtn.h) {
          let sp = shapePalette[idx];
          alienParts[sp.key].index = sp.optIndex;
          activeComponent = sp.key;
          tool = 'component';
          return;
        }
      }
    }


    // Example buttons
    let exX = sidebarX + 18;
    let exW = sidebarWidth - 36;
    let exH = 24;
    for (let i = 0; i < alienPresets.length; i++) {
      let rowY = layout.examplesStartY + i * 28; // keep in sync with drawExampleButtons
      if (mouseX >= exX && mouseX <= exX + exW && mouseY >= rowY && mouseY <= rowY + exH) {
        let p = alienPresets[i];
        alienParts.face.index = p.face;
        alienParts.body.index = p.body;
        alienParts.armhand.index = p.armhand;
        alienParts.leg.index = p.leg;
        alienParts.eyes.index = p.eyes;
        alienParts.mouth.index = p.mouth;
        activeComponent = 'face';
        tool = 'component';
        pushUndo();
        let pos = nextExamplePosition();
        placeAlienPreset(pos.x, pos.y, p);
        return;
      }
    }
    closeMenus();
  } else if (tool === 'lasso' && isInDrawArea(mouseX, mouseY)) {
    if (lassoState === 'selected' && lassoBounds) {
      let x = lassoBounds.x + lassoOffsetX;
      let y = lassoBounds.y + lassoOffsetY;
      let inBox = (mouseX >= x && mouseX <= x + lassoBounds.w && mouseY >= y && mouseY <= y + lassoBounds.h);
      if (inBox || pointInPolygon(mouseX, mouseY, lassoPoints, lassoOffsetX, lassoOffsetY)) {
        lassoState = 'dragging';
        moveStartX = mouseX;
        moveStartY = mouseY;
        return;
      }
    }
    lassoState = 'selecting';
    lassoPoints = [{ x: mouseX, y: mouseY }];
    lassoBounds = null;
    moveStartX = mouseX;
    moveStartY = mouseY;
    return;
  } else if (tool === 'component' && isInDrawArea(mouseX, mouseY)) {
    pendingComponentPlace = true;
    pendingComponentX = mouseX;
    pendingComponentY = mouseY;
    closeMenus();
  } else if (tool === 'eraser' && isInDrawArea(mouseX, mouseY)) {
    let hit = hitComponent(mouseX, mouseY);
    if (hit !== -1) {
      pushUndo();
      componentItems.splice(hit, 1);
      return;
    }
  } else if ((tool === 'brush' || tool === 'eraser') && isInDrawArea(mouseX, mouseY)) {
    pushUndo();
    smoothX = mouseX;
    smoothY = mouseY;
    lastX = mouseX;
    lastY = mouseY;
    // reset per-stroke memory for natural variation
    brushMemory.inkW = random(0.85, 1.2);
    brushMemory.softSeed = random(10000);
    brushMemory.bristleSeed = random(10000);
    lineAnchor = { x: mouseX, y: mouseY };
    closeMenus();
  }

}

function mouseDragged() {
  if (pendingComponentPlace && keyIsDown(SHIFT)) {
    let dx = mouseX - pendingComponentX;
    let dy = mouseY - pendingComponentY;
    if (dx * dx + dy * dy > 16) {
      pendingComponentPlace = false;
    }
  }
  if (tool === 'lasso') {
    if (lassoState === 'selecting') {
      lassoPoints.push({ x: mouseX, y: mouseY });
      return;
    }
    if (lassoState === 'dragging') {
      lassoOffsetX = mouseX - moveStartX;
      lassoOffsetY = mouseY - moveStartY;
      return;
    }
  }
  if (tool !== 'brush' && tool !== 'eraser') return;
  if (!isInDrawArea(mouseX, mouseY) || !isInDrawArea(pmouseX, pmouseY)) return;
  if (keyIsDown(SHIFT)) return;

  let targetX = mouseX;
  let targetY = mouseY;
  smoothX = lerp(smoothX, targetX, 0.35);
  smoothY = lerp(smoothY, targetY, 0.35);
  drawStroke(lastX, lastY, smoothX, smoothY);
  lastX = smoothX;
  lastY = smoothY;
}

function mouseReleased() {
  if (pendingComponentPlace) {
    pushUndo();
    let c = brushColors[brushIndex];
    let indices = {
      face: alienParts.face.index,
      body: alienParts.body.index,
      armhand: alienParts.armhand.index,
      leg: alienParts.leg.index,
      eyes: alienParts.eyes.index,
      mouth: alienParts.mouth.index,
      antenna: alienParts.antenna.index
    };
    componentItems.push({
      type: activeComponent,
      x: pendingComponentX,
      y: pendingComponentY,
      size: getComponentBaseSize(),
      color: { r: red(c), g: green(c), b: blue(c) },
      indices
    });
    pendingComponentPlace = false;
    return;
  }
  if (tool === 'lasso') {
    if (lassoState === 'selecting') {
      if (lassoPoints.length < 3) {
        lassoState = 'idle';
        lassoPoints = [];
        return;
      }
      let bounds = polygonBounds(lassoPoints);
      lassoBounds = bounds;
      lassoImage = drawLayer.get(bounds.x, bounds.y, bounds.w, bounds.h);
      let mask = createGraphics(bounds.w, bounds.h);
      mask.noStroke();
      mask.fill(255);
      mask.beginShape();
      for (let i = 0; i < lassoPoints.length; i++) {
        mask.vertex(lassoPoints[i].x - bounds.x, lassoPoints[i].y - bounds.y);
      }
      mask.endShape(CLOSE);
      lassoImage.mask(mask);
      lassoOffsetX = 0;
      lassoOffsetY = 0;
      lassoState = 'selected';
      return;
    }
    if (lassoState === 'dragging' && lassoBounds && lassoImage) {
      // remove original area and paste moved once on release
      drawLayer.erase();
      drawLayer.beginShape();
      for (let i = 0; i < lassoPoints.length; i++) {
        drawLayer.vertex(lassoPoints[i].x, lassoPoints[i].y);
      }
      drawLayer.endShape(CLOSE);
      drawLayer.noErase();
      drawLayer.image(lassoImage, lassoBounds.x + lassoOffsetX, lassoBounds.y + lassoOffsetY);
      for (let i = 0; i < componentItems.length; i++) {
        let it = componentItems[i];
        if (pointInPolygon(it.x, it.y, lassoPoints, 0, 0)) {
          it.x += lassoOffsetX;
          it.y += lassoOffsetY;
        }
      }
      lassoState = 'idle';
      lassoPoints = [];
      lassoBounds = null;
      lassoImage = null;
      lassoOffsetX = 0;
      lassoOffsetY = 0;
      return;
    }
  }
  if (tool !== 'brush' && tool !== 'eraser') return;
  if (keyIsDown(SHIFT) && lineAnchor && isInDrawArea(mouseX, mouseY)) {
    drawStroke(lineAnchor.x, lineAnchor.y, mouseX, mouseY);
  }
  lineAnchor = null;
}

function keyPressed() {
  if (key === '1') brushIndex = 0;
  if (key === '2') brushIndex = 1;
  if (key === '3') brushIndex = 2;
  if (key === '4') brushIndex = 3;
  if (key === '5') brushIndex = 4;
  let k = (key && key.length === 1) ? key.toLowerCase() : '';
  if (k === 'e') tool = 'eraser';
  if (k === 'u') doUndo();
  if (k === 'c') clearCanvas();
  if (k === 's') saveCanvas('portrait', 'png');
  if (keyCode === ESCAPE) closeMenus();
}

function drawStroke(x1, y1, x2, y2) {
  let base = brushSizes[brushSizeIndex];
  let v = dist(x1, y1, x2, y2);
  let w = constrain(map(v, 0, 20, base * 1.6, base * 0.7), base * 0.6, base * 1.8);
  let bt = brushTypes[brushTypeIndex];
  if (bt.trail > 0) w *= (1 + bt.trail * 0.3);
  if (tool === 'eraser') {
    drawLayer.strokeCap(ROUND);
    drawLayer.strokeWeight(w);
    drawLayer.erase();
    drawLayer.line(x1, y1, x2, y2);
    drawLayer.noErase();
  } else {
    let c = brushColors[brushIndex];
    let r = red(c);
    let g = green(c);
    let b = blue(c);
    if (bt.mode === 'pen') {
      // smooth ink pen with taper based on velocity
      let speed = v + 0.001;
      let taper = map(speed, 0, 35, 1.15, 0.45);
      let easedW = lerp(w, w * taper, bt.taper);
      drawLayer.strokeCap(ROUND);
      drawLayer.strokeWeight(easedW);
      drawLayer.stroke(r, g, b, bt.alpha);
      drawLayer.line(x1, y1, x2, y2);
      // slight ghost to soften edges
      drawLayer.strokeWeight(easedW * (0.4 + bt.smooth));
      drawLayer.stroke(r, g, b, bt.alpha * 0.18);
      drawLayer.line(x1, y1, x2, y2);
      return;
    }
    if (bt.mode === 'pencil') {
      // textured graphite pencil
      drawLayer.strokeCap(SQUARE);
      let coreW = max(1, w * 0.22);
      drawLayer.strokeWeight(coreW);
      drawLayer.stroke(r, g, b, bt.alpha * 0.9);
      drawLayer.line(x1, y1, x2, y2);
      let grains = max(10, floor(v / 1.2));
      drawLayer.noStroke();
      randomSeed(brushMemory.bristleSeed);
      for (let i = 0; i < grains; i++) {
        let t = i / grains;
        let px = lerp(x1, x2, t) + random(-bt.jitter, bt.jitter);
        let py = lerp(y1, y2, t) + random(-bt.jitter, bt.jitter);
        let sz = max(1, w * 0.18);
        drawLayer.fill(r, g, b, bt.alpha * random(0.2, 0.8));
        drawLayer.circle(px, py, sz);
        // paper grain specks
        if (random() < bt.grain * 0.4) {
          drawLayer.fill(0, 0, 0, 25);
          drawLayer.circle(px + random(-1, 1), py + random(-1, 1), max(1, sz * 0.6));
        }
      }
      return;
    }
    if (bt.mode === 'highlighter') {
      // translucent bar with soft bleed like Notability
      let dx = x2 - x1;
      let dy = y2 - y1;
      let angle = atan2(dy, dx);
      let nx = cos(angle + HALF_PI);
      let ny = sin(angle + HALF_PI);
      let bar = w * 3.8;
      drawLayer.strokeCap(SQUARE);
      drawLayer.strokeWeight(bar);
      drawLayer.stroke(r, g, b, bt.alpha);
      drawLayer.line(x1, y1, x2, y2);
      // edge soften
      drawLayer.strokeWeight(bar * 1.6);
      drawLayer.stroke(r, g, b, bt.alpha * 0.22);
      drawLayer.line(x1 + nx * bar * 0.1, y1 + ny * bar * 0.1, x2 + nx * bar * 0.1, y2 + ny * bar * 0.1);
      drawLayer.line(x1 - nx * bar * 0.1, y1 - ny * bar * 0.1, x2 - nx * bar * 0.1, y2 - ny * bar * 0.1);
      return;
    }
    if (bt.mode === 'airbrush') {
      // soft spray with radial falloff
      let steps = max(6, floor(v / 1.2));
      for (let i = 0; i <= steps; i++) {
        let t = i / steps;
        let px = lerp(x1, x2, t);
        let py = lerp(y1, y2, t);
        let radius = w * 4.6;
        for (let s = 0; s < 34; s++) {
          let ang = random(TWO_PI);
          let rr = pow(random(), 0.7) * radius;
          let sx = px + cos(ang) * rr;
          let sy = py + sin(ang) * rr;
          drawLayer.noStroke();
          drawLayer.fill(r, g, b, bt.alpha);
          drawLayer.circle(sx, sy, max(1, w * 0.26));
        }
      }
      return;
    }
    if (bt.mode === 'calligraphy') {
      let angle = PI / 4; // 45° nib
      let dx = x2 - x1;
      let dy = y2 - y1;
      let theta = atan2(dy, dx);
      let widthFactor = 0.4 + 0.6 * abs(cos(theta - angle));
      let cw = w * 2.4 * widthFactor;
      let nx = cos(angle + HALF_PI);
      let ny = sin(angle + HALF_PI);
      let off = cw * 0.35;
      drawLayer.strokeCap(SQUARE);
      drawLayer.strokeWeight(cw);
      drawLayer.stroke(r, g, b, bt.alpha);
      drawLayer.line(x1 - nx * off, y1 - ny * off, x2 - nx * off, y2 - ny * off);
      drawLayer.strokeWeight(cw * 0.6);
      drawLayer.stroke(r, g, b, bt.alpha * 0.7);
      drawLayer.line(x1 + nx * off, y1 + ny * off, x2 + nx * off, y2 + ny * off);
      return;
    }
  }
}

function getComponentBaseSize() {
  return brushSizes[brushSizeIndex] * 10 * componentScales[componentScaleIndex];
}

function stampComponent(key, x, y, sizeOverride, colorOverride, indicesOverride) {
  let s = sizeOverride || getComponentBaseSize();
  let r = colorOverride ? colorOverride.r : red(brushColors[brushIndex]);
  let g = colorOverride ? colorOverride.g : green(brushColors[brushIndex]);
  let b = colorOverride ? colorOverride.b : blue(brushColors[brushIndex]);
  let rot = 0;
  let idx = indicesOverride || {
    face: alienParts.face.index,
    body: alienParts.body.index,
    armhand: alienParts.armhand.index,
    leg: alienParts.leg.index,
    eyes: alienParts.eyes.index,
    mouth: alienParts.mouth.index,
    antenna: alienParts.antenna.index
  };
  idx.eyes = constrain(idx.eyes, 0, alienParts.eyes.options.length - 1);

  drawLayer.push();
  drawLayer.translate(x, y);
  drawLayer.rotate(rot);
  drawLayer.noFill();
  drawLayer.stroke(r, g, b, 200);
  drawLayer.strokeWeight(2);
  let cx = 0, cy = 0;

  if (key === 'face') {
    let sf = s * 1.6;
    if (idx.face === 0) drawLayer.ellipse(cx, cy, sf * 1.1, sf * 1.6);   // OVAL vertical
    if (idx.face === 1) drawLayer.ellipse(cx, cy, sf * 1.3, sf * 1.3);   // ROUND 1:1
    if (idx.face === 2) { // DIAMOND
      drawLayer.beginShape();
      drawLayer.vertex(cx, cy - sf * 0.75);
      drawLayer.vertex(cx + sf * 0.65, cy);
      drawLayer.vertex(cx, cy + sf * 0.75);
      drawLayer.vertex(cx - sf * 0.65, cy);
      drawLayer.endShape(CLOSE);
    }
  }

  if (key === 'eyes') {
    if (idx.eyes === 0) {
      // dot eyes
      drawLayer.circle(cx - s * 0.3, cy, s * 0.16);
      drawLayer.circle(cx + s * 0.3, cy, s * 0.16);
    } else if (idx.eyes === 1) {
      // paired short lines (thin, square caps to avoid circles)
      let prevCap = drawingContext.lineCap;
      drawLayer.strokeCap(SQUARE);
      drawLayer.strokeWeight(2);
      drawLayer.line(cx - s * 0.45, cy, cx - s * 0.05, cy);
      drawLayer.line(cx + s * 0.05, cy, cx + s * 0.45, cy);
      drawLayer.strokeCap(prevCap || ROUND);
    }
  }


  if (key === 'mouth') {
    if (idx.mouth === 0) drawLayer.arc(cx, cy, s * 0.6, s * 0.25, 0, PI); // SMILE
    if (idx.mouth === 1) drawLayer.line(cx - s * 0.32, cy, cx + s * 0.32, cy); // LINE
  }

  if (key === 'antenna') {
    if (idx.antenna === 0) {
      drawLayer.line(cx, cy + s * 0.15, cx, cy - s * 0.9);
      drawLayer.circle(cx, cy - s * 1.0, s * 0.14);
    } else if (idx.antenna === 1) {
      drawLayer.line(cx - s * 0.18, cy + s * 0.15, cx - s * 0.3, cy - s * 0.78);
      drawLayer.line(cx + s * 0.18, cy + s * 0.15, cx + s * 0.3, cy - s * 0.78);
      drawLayer.circle(cx - s * 0.3, cy - s * 0.9, s * 0.12);
      drawLayer.circle(cx + s * 0.3, cy - s * 0.9, s * 0.12);
    } else {
      drawLayer.line(cx, cy + s * 0.15, cx, cy - s * 0.65);
      drawLayer.circle(cx - s * 0.24, cy - s * 0.82, s * 0.16);
      drawLayer.circle(cx + s * 0.24, cy - s * 0.82, s * 0.16);
    }
  }

  if (key === 'body') {
    if (idx.body === 0) drawLayer.ellipse(cx, cy, s * 1.0, s * 1.45); // OVAL body
    if (idx.body === 1) drawLayer.rect(cx - s * 0.75, cy - s * 0.6, s * 1.5, s * 1.2, 12); // RECTANGLE (rounded)
    if (idx.body === 2) drawLayer.ellipse(cx, cy, s * 1.35, s * 1.35); // ROUND
  }

  if (key === 'armhand') {
    if (idx.armhand === 0) {
      // straight horizontal
      let span = s * 1.4;
      drawLayer.line(cx - span, cy, cx + span, cy);
    } else if (idx.armhand === 1) {
      // wave
      let span = s * 1.4;
      let steps = 10;
      let amp = s * 0.12;
      drawLayer.noFill();
      drawLayer.beginShape();
      for (let i = 0; i <= steps; i++) {
        let t = i / steps;
        let px = lerp(cx - span, cx + span, t);
        let py = cy + sin(t * PI * 2) * amp;
        drawLayer.vertex(px, py);
      }
      drawLayer.endShape();
    } else if (idx.armhand === 2) {
      // crossed arms
      let span = s * 0.9;
      drawLayer.line(cx - span, cy + s * 0.05, cx + span, cy - s * 0.05);
      drawLayer.line(cx - span, cy - s * 0.05, cx + span, cy + s * 0.05);
    }
  }

  if (key === 'leg') {
    let legIdx = constrain(idx.leg, 0, 2);
    drawLayer.strokeCap(SQUARE);
    drawLayer.strokeWeight(3);
    if (legIdx === 0) {
      // straight legs (pure vertical)
      let offset = s * 0.18;
      let len = s * 1.1;
      drawLayer.line(cx - offset, cy, cx - offset, cy + len);
      drawLayer.line(cx + offset, cy, cx + offset, cy + len);
    } else if (legIdx === 1) {
      // arrow feet
      drawLayer.line(cx - s * 0.2, cy, cx - s * 0.2, cy + s * 0.9);
      drawLayer.line(cx + s * 0.2, cy, cx + s * 0.2, cy + s * 0.9);
      drawLayer.line(cx - s * 0.2, cy + s * 0.9, cx - s * 0.35, cy + s * 1.08);
      drawLayer.line(cx - s * 0.2, cy + s * 0.9, cx - s * 0.05, cy + s * 1.08);
      drawLayer.line(cx + s * 0.2, cy + s * 0.9, cx + s * 0.35, cy + s * 1.08);
      drawLayer.line(cx + s * 0.2, cy + s * 0.9, cx + s * 0.05, cy + s * 1.08);
    } else {
      // angled out (inverse V)
      drawLayer.line(cx, cy, cx - s * 0.38, cy + s * 0.95);
      drawLayer.line(cx, cy, cx + s * 0.38, cy + s * 0.95);
    }
  }

  drawLayer.pop();
}

function pushUndo() {
  if (undoStack.length >= maxUndo) undoStack.shift();
  undoStack.push({
    img: drawLayer.get(),
    components: cloneComponents()
  });
}

function doUndo() {
  if (undoStack.length === 0) return;
  let state = undoStack.pop();
  drawLayer.clear();
  if (state.img) drawLayer.image(state.img, 0, 0);
  componentItems = state.components || [];
}

function clearCanvas() {
  pushUndo();
  drawLayer.clear();
  componentItems = [];
}

function cloneComponents() {
  let out = [];
  for (let i = 0; i < componentItems.length; i++) {
    let it = componentItems[i];
    out.push({
      type: it.type,
      x: it.x,
      y: it.y,
      size: it.size,
      color: it.color ? { r: it.color.r, g: it.color.g, b: it.color.b } : null,
      indices: it.indices ? {
        face: it.indices.face,
        body: it.indices.body,
        armhand: it.indices.armhand,
        leg: it.indices.leg,
        eyes: it.indices.eyes,
        mouth: it.indices.mouth,
        antenna: it.indices.antenna
      } : null
    });
  }
  return out;
}

function cloneComponentsFrom(list) {
  let out = [];
  for (let i = 0; i < list.length; i++) {
    let it = list[i];
    out.push({
      type: it.type,
      x: it.x,
      y: it.y,
      size: it.size,
      color: it.color ? { r: it.color.r, g: it.color.g, b: it.color.b } : null,
      indices: it.indices ? {
        face: it.indices.face,
        body: it.indices.body,
        armhand: it.indices.armhand,
        leg: it.indices.leg,
        eyes: it.indices.eyes,
        mouth: it.indices.mouth,
        antenna: it.indices.antenna
      } : null
    });
  }
  return out;
}

function pointInPolygon(px, py, points, ox, oy) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    let xi = points[i].x + (ox || 0);
    let yi = points[i].y + (oy || 0);
    let xj = points[j].x + (ox || 0);
    let yj = points[j].y + (oy || 0);
    let intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi + 0.00001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonBounds(points) {
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (let i = 1; i < points.length; i++) {
    minX = min(minX, points[i].x);
    minY = min(minY, points[i].y);
    maxX = max(maxX, points[i].x);
    maxY = max(maxY, points[i].y);
  }
  return { x: floor(minX), y: floor(minY), w: ceil(maxX - minX), h: ceil(maxY - minY) };
}

function hitComponent(px, py) {
  for (let i = componentItems.length - 1; i >= 0; i--) {
    let it = componentItems[i];
    let r = it.size * 1.2;
    if (px >= it.x - r && px <= it.x + r && py >= it.y - r && py <= it.y + r) {
      return i;
    }
  }
  return -1;
}

function placeAlienPreset(x, y, preset) {
  let s = getComponentBaseSize();
  let c = brushColors[brushIndex];
  let color = { r: red(c), g: green(c), b: blue(c) };
  let indices = {
    face: preset.face,
    body: preset.body,
    armhand: preset.armhand,
    leg: preset.leg,
    eyes: preset.eyes,
    mouth: preset.mouth,
    antenna: preset.antenna || 0
  };
  let offsets = {
    face: { x: 0, y: -s * 1.05 },
    eyes: { x: 0, y: -s * 1.05 },
    mouth: { x: 0, y: -s * 0.7 },
    body: { x: 0, y: s * 0.55 },
    armhand: { x: 0, y: s * 0.35 },
    leg: { x: 0, y: s * 1.35 },
    antenna: { x: 0, y: -s * 1.6 }
  };

  componentItems.push({ type: 'face', x: x + offsets.face.x, y: y + offsets.face.y, size: s, color, indices });
  componentItems.push({ type: 'eyes', x: x + offsets.eyes.x, y: y + offsets.eyes.y, size: s, color, indices });
  componentItems.push({ type: 'mouth', x: x + offsets.mouth.x, y: y + offsets.mouth.y, size: s, color, indices });
  componentItems.push({ type: 'body', x: x + offsets.body.x, y: y + offsets.body.y, size: s, color, indices });
  componentItems.push({ type: 'armhand', x: x + offsets.armhand.x, y: y + offsets.armhand.y, size: s, color, indices });
  componentItems.push({ type: 'leg', x: x + offsets.leg.x, y: y + offsets.leg.y, size: s, color, indices });
  componentItems.push({ type: 'antenna', x: x + offsets.antenna.x, y: y + offsets.antenna.y, size: s, color, indices });
}

function nextExamplePosition() {
  let drawW = width - sidebarWidth - frameMargin * 2;
  let drawH = height - frameMargin * 2;
  let cols = 2;
  let rows = 3;
  let idx = examplePlaceIndex % (cols * rows);
  examplePlaceIndex++;
  let col = idx % cols;
  let row = floor(idx / cols);
  let x = frameMargin + drawW * (col + 0.5) / cols;
  let y = frameMargin + drawH * (row + 0.5) / rows;
  return { x, y };
}
