// Pause menu: resume, read collected notes, or exit to title.
import { Screen } from './Screen.js';
import { setFont, FONTS } from '../utils/fonts.js';
import { getLayout, sx, sy, centerGroupY } from '../utils/screenLayout.js';
import { getNotesByIds } from '../data/notesData.js';

const PAUSE_VIEWS = Object.freeze({
  MENU: 'menu',
  NOTES: 'notes',
  NOTE_READER: 'note_reader'
});

const MAIN_MENU_OPTIONS = Object.freeze([
  { id: 'resume', label: 'RESUME' },
  { id: 'notes', label: 'READ NOTES' },
  { id: 'title', label: 'EXIT TO TITLE' }
]);

function ensurePauseUi(state) {
  state.ui.pause ??= {
    view: PAUSE_VIEWS.MENU,
    menuIndex: 0,
    notesIndex: 0,
    selectedNoteId: null
  };
  return state.ui.pause;
}

function getCollectedNotes(state) {
  return getNotesByIds(state.inventory?.notesCollected || []);
}

export class PauseScreen extends Screen {
  constructor() {
    super('pause', 'Escape to resume');
  }

  reset(state) {
    if (!state) return;
    const pause = ensurePauseUi(state);
    pause.view = PAUSE_VIEWS.MENU;
    pause.menuIndex = 0;
    pause.notesIndex = 0;
    pause.selectedNoteId = null;
  }

  handleKey(key, state, api) {
    const pause = ensurePauseUi(state);

    if (key === 'Escape') {
      if (pause.view === PAUSE_VIEWS.MENU) {
        api.resumeGame?.();
      } else if (pause.view === PAUSE_VIEWS.NOTE_READER) {
        pause.view = PAUSE_VIEWS.NOTES;
      } else {
        pause.view = PAUSE_VIEWS.MENU;
      }
      return true;
    }

    if (key === 'Backspace') {
      if (pause.view === PAUSE_VIEWS.NOTE_READER) {
        pause.view = PAUSE_VIEWS.NOTES;
      } else if (pause.view !== PAUSE_VIEWS.MENU) {
        pause.view = PAUSE_VIEWS.MENU;
      } else {
        api.resumeGame?.();
      }
      return true;
    }

    if (pause.view === PAUSE_VIEWS.MENU) return this.#handleMainMenuKey(key, pause, api);
    if (pause.view === PAUSE_VIEWS.NOTES) return this.#handleNotesListKey(key, state, pause);
    if (pause.view === PAUSE_VIEWS.NOTE_READER) return this.#handleNoteReaderKey(key, pause);
    return false;
  }

  render(p, state) {
    const pause = ensurePauseUi(state);
    const layout = getLayout(p);

    this.#drawOverlay(p);
    this.#drawFrame(p, layout);

    if (pause.view === PAUSE_VIEWS.MENU) {
      this.#drawPauseMenuView(p, layout, pause);
      state.prompt = 'Arrow Up / Down to choose, Enter to confirm, Escape to resume';
      return;
    }

    if (pause.view === PAUSE_VIEWS.NOTES) {
      this.#drawNotesListView(p, state, layout, pause);
      state.prompt = 'Arrow Up / Down to choose a note, Enter to read, Escape to go back';
      return;
    }

    this.#drawNoteReaderView(p, state, layout, pause);
    state.prompt = 'Enter, Backspace, or Escape to return';
  }

  #handleMainMenuKey(key, pause, api) {
    if (key === 'ArrowUp') {
      pause.menuIndex = (pause.menuIndex - 1 + MAIN_MENU_OPTIONS.length) % MAIN_MENU_OPTIONS.length;
      api.setMessage?.(MAIN_MENU_OPTIONS[pause.menuIndex].label, 0.5);
      return true;
    }

    if (key === 'ArrowDown') {
      pause.menuIndex = (pause.menuIndex + 1) % MAIN_MENU_OPTIONS.length;
      api.setMessage?.(MAIN_MENU_OPTIONS[pause.menuIndex].label, 0.5);
      return true;
    }

    if (key !== 'Enter') return false;

    const selected = MAIN_MENU_OPTIONS[pause.menuIndex]?.id;
    if (selected === 'resume') {
      api.resumeGame?.();
      return true;
    }

    if (selected === 'notes') {
      pause.view = PAUSE_VIEWS.NOTES;
      pause.notesIndex = 0;
      return true;
    }

    if (selected === 'title') {
      api.exitToTitle?.();
      return true;
    }

    return false;
  }

  #handleNotesListKey(key, state, pause) {
    const notes = getCollectedNotes(state);

    if (!notes.length) {
      if (key === 'Enter') {
        pause.view = PAUSE_VIEWS.MENU;
        return true;
      }
      return false;
    }

    if (key === 'ArrowUp') {
      pause.notesIndex = (pause.notesIndex - 1 + notes.length) % notes.length;
      return true;
    }

    if (key === 'ArrowDown') {
      pause.notesIndex = (pause.notesIndex + 1) % notes.length;
      return true;
    }

    if (key === 'Enter') {
      const selected = notes[pause.notesIndex];
      if (selected) {
        pause.selectedNoteId = selected.id;
        pause.view = PAUSE_VIEWS.NOTE_READER;
      }
      return true;
    }

    return false;
  }

  #handleNoteReaderKey(key, pause) {
    if (key === 'Enter') {
      pause.view = PAUSE_VIEWS.NOTES;
      return true;
    }
    return false;
  }

  #drawOverlay(p) {
    p.push();
    p.noStroke();
    p.fill(0, 0, 0, 165);
    p.rect(0, 0, p.width, p.height);
    p.pop();
  }

  #drawFrame(p, layout) {
    const panelW = sx(760, layout);
    const panelH = sy(430, layout);
    const panelX = layout.offsetX + (layout.width - panelW) / 2;
    const panelY = layout.offsetY + (layout.height - panelH) / 2;

    p.push();
    p.noStroke();
    p.fill('#24152a');
    p.rect(panelX + sx(8, layout), panelY + sy(8, layout), panelW, panelH, sx(22, layout));
    p.fill('#352509');
    p.rect(panelX, panelY, panelW, panelH, sx(22, layout));
    p.fill('#ffbb3d');
    p.rect(panelX + sx(8, layout), panelY + sy(8, layout), panelW - sx(16, layout), sy(52, layout), sx(14, layout));
    p.noFill();
    p.stroke('#fff4d6');
    p.strokeWeight(Math.max(2, sx(4, layout)));
    p.rect(panelX, panelY, panelW, panelH, sx(22, layout));
    p.pop();
  }

  #drawHeader(p, layout, title, subtitle = '') {
    const panelW = sx(760, layout);
    const panelH = sy(430, layout);
    const panelX = layout.offsetX + (layout.width - panelW) / 2;
    const panelY = layout.offsetY + (layout.height - panelH) / 2;

    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    setFont(p, Math.max(14, sx(20, layout)), FONTS.title, 'bold');
    p.fill('#ff4f8d');
    p.text(title, panelX + panelW / 2 + sx(3, layout), panelY + sy(38, layout) + sy(3, layout));
    p.fill('#24327c');
    p.text(title, panelX + panelW / 2, panelY + sy(38, layout));

    if (subtitle) {
      p.fill('#fff4d6');
      setFont(p, Math.max(9, sx(10, layout)), FONTS.ui);
      p.text(subtitle, panelX + panelW / 2, panelY + sy(75, layout));
    }

    p.pop();
  }

  #drawPauseMenuView(p, layout, pause) {
    this.#drawHeader(p, layout, 'PAUSED', 'Choose an option');

    const panelW = sx(760, layout);
    const panelH = sy(430, layout);
    const panelX = layout.offsetX + (layout.width - panelW) / 2;
    const panelY = layout.offsetY + (layout.height - panelH) / 2;
    const w = sx(310, layout);
    const h = sy(52, layout);
    const gap = sy(18, layout);
    const totalH = MAIN_MENU_OPTIONS.length * h + (MAIN_MENU_OPTIONS.length - 1) * gap;
    const startX = panelX + (panelW - w) / 2;
    const startY = panelY + sy(130, layout) + centerGroupY(0, totalH, { ...layout, offsetY: 0 }) * 0.12;

    for (let i = 0; i < MAIN_MENU_OPTIONS.length; i += 1) {
      const option = MAIN_MENU_OPTIONS[i];
      const y = startY + i * (h + gap);
      this.#drawButton(p, startX, y, w, h, option.label, i === pause.menuIndex, true, layout);
    }
  }

  #drawNotesListView(p, state, layout, pause) {
    const notes = getCollectedNotes(state);
    this.#drawHeader(
      p,
      layout,
      'READ NOTES',
      notes.length ? 'Enter to open note' : 'No notes collected yet'
    );

    const box = this.#getContentBox(layout);

    p.push();
    p.noStroke();
    p.fill('#efe2c8');
    p.rect(box.x, box.y, box.w, box.h, sx(16, layout));

    if (!notes.length) {
      p.fill('#4b2f24');
      setFont(p, Math.max(16, sx(22, layout)), FONTS.body);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('No notes found yet.', box.x + box.w / 2, box.y + box.h / 2);
    } else {
      const rowH = sy(50, layout);
      for (let i = 0; i < notes.length; i += 1) {
        const rowY = box.y + sy(18, layout) + i * (rowH + sy(10, layout));
        this.#drawListRow(
          p,
          box.x + sx(18, layout),
          rowY,
          box.w - sx(36, layout),
          rowH,
          notes[i].title,
          i === pause.notesIndex,
          layout
        );
      }
    }

    this.#drawFooterHint(p, layout, 'ESC / Backspace to return');
    p.pop();
  }

  #drawNoteReaderView(p, state, layout, pause) {
    const notes = getCollectedNotes(state);
    const note =
      notes.find((entry) => entry.id === pause.selectedNoteId)
      || notes[pause.notesIndex]
      || { title: 'Unknown Note', body: 'No text available.' };

    this.#drawHeader(p, layout, 'NOTE', note.title);
    const box = this.#getContentBox(layout);

    p.push();
    p.noStroke();
    p.fill('#efe2c8');
    p.rect(box.x, box.y, box.w, box.h, sx(16, layout));
    p.fill('#4b2f24');
    setFont(p, Math.max(11, sx(14, layout)), FONTS.ui, 'bold');
    p.textAlign(p.LEFT, p.TOP);
    p.text(note.title, box.x + sx(22, layout), box.y + sy(18, layout));
    setFont(p, Math.max(16, sx(22, layout)), FONTS.body);
    this.#drawWrappedText(
      p,
      note.body,
      box.x + sx(22, layout),
      box.y + sy(58, layout),
      box.w - sx(44, layout),
      sy(28, layout)
    );
    this.#drawFooterHint(p, layout, 'ESC / Backspace to notes list');
    p.pop();
  }

  #getContentBox(layout) {
    const panelW = sx(760, layout);
    const panelH = sy(430, layout);
    const panelX = layout.offsetX + (layout.width - panelW) / 2;
    const panelY = layout.offsetY + (layout.height - panelH) / 2;

    return {
      x: panelX + sx(28, layout),
      y: panelY + sy(96, layout),
      w: panelW - sx(56, layout),
      h: panelH - sy(134, layout)
    };
  }

  #drawButton(p, x, y, w, h, text, selected, enabled, layout) {
    p.push();
    p.noStroke();
    p.fill('#24152a');
    p.rect(x + sx(6, layout), y + sy(6, layout), w, h, sx(18, layout));
    p.fill(enabled ? (selected ? '#e73b6e' : '#c92d59') : '#8f6b78');
    p.rect(x, y, w, h, sx(18, layout));
    p.fill(255, 255, 255, enabled ? 35 : 18);
    p.rect(x + sx(4, layout), y + sy(4, layout), w - sx(8, layout), h * 0.35, sx(12, layout));
    p.noFill();
    p.stroke(enabled ? (selected ? '#fff4d6' : '#2a1730') : '#5c4850');
    p.strokeWeight(selected && enabled ? sx(5, layout) : sx(4, layout));
    p.rect(x, y, w, h, sx(18, layout));
    p.noStroke();
    p.fill(enabled ? '#ffd85a' : '#ead7c2');
    p.textAlign(p.CENTER, p.CENTER);
    setFont(p, Math.max(10, sx(14, layout)), FONTS.ui, 'bold');
    p.text(text, x + w / 2, y + h / 2 + sy(1, layout));
    p.pop();
  }

  #drawListRow(p, x, y, w, h, text, selected, layout) {
    p.push();
    p.noStroke();
    p.fill(selected ? '#c92d59' : '#d7c7aa');
    p.rect(x, y, w, h, sx(12, layout));
    p.noFill();
    p.stroke(selected ? '#fff4d6' : '#6b4d37');
    p.strokeWeight(selected ? sx(4, layout) : sx(2, layout));
    p.rect(x, y, w, h, sx(12, layout));
    p.noStroke();
    p.fill(selected ? '#fff4d6' : '#4b2f24');
    setFont(p, Math.max(10, sx(12, layout)), FONTS.ui, selected ? 'bold' : 'normal');
    p.textAlign(p.LEFT, p.CENTER);
    p.text(text, x + sx(18, layout), y + h / 2 + sy(1, layout));
    p.pop();
  }

  #drawWrappedText(p, text, x, y, maxWidth, lineHeight) {
    const words = String(text || '').split(/\s+/);
    let line = '';
    let yy = y;

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (p.textWidth(test) > maxWidth && line) {
        p.text(line, x, yy);
        line = word;
        yy += lineHeight;
      } else {
        line = test;
      }
    }

    if (line) p.text(line, x, yy);
  }

  #drawFooterHint(p, layout, text) {
    const panelW = sx(760, layout);
    const panelH = sy(430, layout);
    const panelX = layout.offsetX + (layout.width - panelW) / 2;
    const panelY = layout.offsetY + (layout.height - panelH) / 2;
    p.fill('#fff4d6');
    setFont(p, Math.max(9, sx(10, layout)), FONTS.ui);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(text, panelX + panelW / 2, panelY + panelH - sy(18, layout));
  }
}
