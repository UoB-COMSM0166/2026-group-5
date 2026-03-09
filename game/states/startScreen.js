import { setGameState } from "../game.js";
import { setFont, FONTS } from "../utils/fonts.js";
import { getLayout, sx, sy } from "../utils/screenLayout.js";
import { resetIntroScreen } from "./introScreen.js";
const bg = new Image();
bg.src = "../assets/images/original/drawings/start_bg.png";

const dragon = new Image();
dragon.src = "../assets/images/original/npcs/dragon/dragon.png";

const titleImg = new Image();
titleImg.src = "../assets/images/original/drawings/title_logo.png";


const menu = {
    selectedIndex: 0,
    options: ["START GAME", "LOAD GAME", "TUTORIAL"]
};

export function drawStartScreen(ctx, canvas) {
    const t = performance.now() * 0.001;

    // Background always fills full canvas
    if (bg.complete && bg.naturalWidth > 0) {
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, "#f09a2c");
        grad.addColorStop(1, "#f5c443");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const layout = getLayout(canvas);

    ctx.save();
    ctx.translate(layout.offsetX, layout.offsetY);



    drawDragon(ctx, t, layout);
    drawTitle(ctx, canvas, t, layout);
    drawFloatingShapes(ctx, t, layout);
    drawMenuButtons(ctx, layout);

    ctx.restore();
}


function drawDragon(ctx, t, layout) {
    if (!dragon.complete || dragon.naturalWidth === 0) return;

    const floatY = Math.sin(t * 2) * sy(2, layout);
    const w = sx(600, layout);
    const h = sy(600, layout);

    ctx.drawImage(
        dragon,
        sx(-50, layout),
        layout.height - h + sy(140, layout) + floatY,
        w,
        h
    );
}

function drawTitle(ctx, canvas, t, layout) {
    const floatY = Math.sin(t * 2) * sy(6, layout);
    const pulse = 1 + Math.sin(t * 1.6) * 0.005;

    const x = sx(330, layout);
    const y = sy(0, layout);
    const w = sx(550, layout);
    const h = sy(210, layout);

    if (titleImg.complete && titleImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(pulse, pulse);
        ctx.drawImage(titleImg, -w / 2, -h / 2, w, h);
        ctx.restore();
    } else {
        drawPixelTitle(ctx, t, layout);
    }
}

function drawFloatingShapes(ctx, t, layout) {
    ctx.save();
    ctx.strokeStyle = "#ff4f8d";
    ctx.lineWidth = Math.max(2, sx(4, layout));

    ctx.beginPath();
    ctx.arc(
        sx(70, layout),
        sy(60, layout) + Math.sin(t * 1.7) * sy(8, layout),
        sx(24, layout),
        0,
        Math.PI * 2
    );
    ctx.stroke();

    const ty = sy(150, layout) + Math.sin(t * 1.3) * sy(10, layout);
    ctx.beginPath();
    ctx.moveTo(sx(110, layout), ty);
    ctx.lineTo(sx(105, layout), ty + sy(40, layout));
    ctx.lineTo(sx(70, layout), ty + sy(20, layout));
    ctx.closePath();
    ctx.stroke();

    ctx.save();
    ctx.translate(
        sx(860, layout),
        sy(200, layout) + Math.sin(t * 1.1) * sy(8, layout)
    );
    ctx.rotate(0.4 + Math.sin(t) * 0.08);
    ctx.strokeRect(
        -sx(20, layout),
        -sy(20, layout),
        sx(40, layout),
        sy(40, layout)
    );
    ctx.restore();

    ctx.stroke();

    ctx.restore();
}

function drawPixelTitle(ctx, t, layout) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const centerX = layout.width / 2;
    const y = sy(110, layout) + Math.sin(t * 2) * sy(4, layout);

    setFont(ctx, Math.max(16, sx(34, layout)), FONTS.title, "bold");
    ctx.fillStyle = "#ff4f8d";
    ctx.fillText("ESCAPE:", centerX + sx(4, layout), y + sy(4, layout));
    ctx.fillStyle = "#24327c";
    ctx.fillText("ESCAPE:", centerX, y);

    setFont(ctx, Math.max(28, sx(64, layout)), FONTS.title, "bold");
    ctx.fillStyle = "#ff4f8d";
    ctx.fillText("OH DEAR", centerX + sx(5, layout), y + sy(83, layout));
    ctx.fillStyle = "#24327c";
    ctx.fillText("OH DEAR", centerX, y + sy(78, layout));

    ctx.restore();
}

function drawMenuButtons(ctx, layout) {
    const startX = sx(560, layout);
    const startY = sy(330, layout);
    const w = sx(250, layout);
    const h = sy(58, layout);
    const gap = sy(24, layout);

    for (let i = 0; i < menu.options.length; i++) {
        const y = startY + i * (h + gap);
        const selected = i === menu.selectedIndex;
        drawButton(ctx, startX, y, w, h, menu.options[i], selected, layout);
    }
}

function drawButton(ctx, x, y, w, h, text, selected, layout) {
    ctx.save();

    roundRectFill(ctx, x + sx(6, layout), y + sy(6, layout), w, h, sx(18, layout), "#24152a");

    roundRectFill(
        ctx,
        x,
        y,
        w,
        h,
        sx(18, layout),
        selected ? "#e73b6e" : "#c92d59"
    );

    roundRectFill(
        ctx,
        x + sx(4, layout),
        y + sy(4, layout),
        w - sx(8, layout),
        h * 0.35,
        sx(12, layout),
        "rgba(255,255,255,0.14)"
    );

    ctx.lineWidth = selected ? sx(5, layout) : sx(4, layout);
    ctx.strokeStyle = selected ? "#fff4d6" : "#2a1730";
    roundRect(ctx, x, y, w, h, sx(18, layout));
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    setFont(ctx, Math.max(12, sx(18, layout)), FONTS.ui, "bold");
    ctx.fillStyle = "#ffd85a";
    ctx.fillText(text, x + w / 2, y + h / 2 + sy(1, layout));

    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function roundRectFill(ctx, x, y, w, h, r, fillStyle) {
    ctx.fillStyle = fillStyle;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
}

export function handleStartScreenKey(key) {
    if (key === "ArrowUp") {
        menu.selectedIndex =
            (menu.selectedIndex - 1 + menu.options.length) % menu.options.length;
    }

    if (key === "ArrowDown") {
        menu.selectedIndex =
            (menu.selectedIndex + 1) % menu.options.length;
    }

    if (key === "Enter") {
        const option = menu.options[menu.selectedIndex];

        if (option === "START GAME") {
            resetIntroScreen();
            setGameState("intro");
        } else if (option === "LOAD GAME") {
            console.log("Load game");
        } else if (option === "TUTORIAL") {
            console.log("Tutorial");
        }
    }
}