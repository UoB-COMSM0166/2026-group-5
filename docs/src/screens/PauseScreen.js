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
const NOTES_LIST_PADDING_Y = 18;
const NOTES_LIST_ROW_HEIGHT = 50;
const NOTES_LIST_ROW_GAP = 10;
const NOTE_READER_BODY_TOP = 58;
const NOTE_READER_BODY_BOTTOM = 22;
const NOTE_READER_LINE_HEIGHT = 28;
const NOTE_READER_PAGE_STEP = 5;

export class PauseScreen extends Screen {
  constructor() {
    super('pause', 'Escape to resume');
  }

  reset(state) {
    if (!state) return;
    const pause = this.#ensurePauseUi(state);
    pause.view = PAUSE_VIEWS.MENU;
    pause.menuIndex = 0;
    pause.notesIndex = 0;
    pause.selectedNoteId = null;
    pause.noteReaderScroll = 0;
  }

  handleKey(key, state, api) {
    const pause = this.#ensurePauseUi(state);

    if (key === 'Escape') {
      if (pause.view === PAUSE_VIEWS.MENU) {
        api.resumeGame?.();
      } else if (pause.view === PAUSE_VIEWS.NOTE_READER) {
        pause.view = PAUSE_VIEWS.NOTES;
        pause.noteReaderScroll = 0;
      } else {
        pause.view = PAUSE_VIEWS.MENU;
      }
      return true;
    }

    if (key === 'Backspace') {
      if (pause.view === PAUSE_VIEWS.NOTE_READER) {
        pause.view = PAUSE_VIEWS.NOTES;
        pause.noteReaderScroll = 0;
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
    const pause = this.#ensurePauseUi(state);
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
    state.prompt = 'Arrow Up / Down to scroll, Enter / Escape to return';
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
    const notes = this.#getCollectedNotes(state);

    if (!notes.length) {
      // No notes: only allow Escape/Backspace to return to menu, ignore other keys
      if (key === 'Escape' || key === 'Backspace') {
        pause.view = PAUSE_VIEWS.MENU;
        return true;
      }
      return true;
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
        pause.noteReaderScroll = 0;
      }
      return true;
    }

    return false;
  }

  #handleNoteReaderKey(key, pause) {
    if (key === 'ArrowUp') {
      pause.noteReaderScroll = Math.max(0, pause.noteReaderScroll - 1);
      return true;
    }

    if (key === 'ArrowDown') {
      pause.noteReaderScroll += 1;
      return true;
    }

    if (key === 'PageUp') {
      pause.noteReaderScroll = Math.max(0, pause.noteReaderScroll - NOTE_READER_PAGE_STEP);
      return true;
    }

    if (key === 'PageDown' || key === ' ') {
      pause.noteReaderScroll += NOTE_READER_PAGE_STEP;
      return true;
    }

    if (key === 'Home') {
      pause.noteReaderScroll = 0;
      return true;
    }

    if (key === 'End') {
      pause.noteReaderScroll = Number.MAX_SAFE_INTEGER;
      return true;
    }

    if (key === 'Enter') {
      pause.view = PAUSE_VIEWS.NOTES;
      pause.noteReaderScroll = 0;
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
    const notes = this.#getCollectedNotes(state);
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
      const visible = this.#getVisibleNoteWindow(notes, box.h, layout, pause.notesIndex);
      for (let i = visible.start; i < visible.end; i += 1) {
        const rowY = box.y + visible.paddingY + (i - visible.start) * (visible.rowH + visible.gap);
        this.#drawListRow(
          p,
          box.x + sx(18, layout),
          rowY,
          box.w - sx(36, layout),
          visible.rowH,
          notes[i].title,
          i === pause.notesIndex,
          layout
        );
      }

      if (notes.length > visible.rowsPerPage) {
        this.#drawListScrollCues(p, box, layout, visible.start > 0, visible.end < notes.length);
      }
    }

    this.#drawFooterHint(p, layout, 'ESC / Backspace to return');
    p.pop();
  }

  #drawNoteReaderView(p, state, layout, pause) {
    const notes = this.#getCollectedNotes(state);
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
    const textX = box.x + sx(22, layout);
    const textY = box.y + sy(NOTE_READER_BODY_TOP, layout);
    const textWidth = box.w - sx(44, layout);
    const lineHeight = sy(NOTE_READER_LINE_HEIGHT, layout);
    const textBottom = box.y + box.h - sy(NOTE_READER_BODY_BOTTOM, layout);
    const textHeight = Math.max(lineHeight, textBottom - textY);
    const linesPerPage = Math.max(1, Math.floor(textHeight / lineHeight));
    const lines = this.#wrapTextToLines(p, note.body, textWidth);
    const visible = this.#getVisibleTextWindow(lines, linesPerPage, pause.noteReaderScroll);

    pause.noteReaderScroll = visible.start;

    let yy = textY;
    for (let i = visible.start; i < visible.end; i += 1) {
      p.text(lines[i], textX, yy);
      yy += lineHeight;
    }

    if (lines.length > linesPerPage) {
      this.#drawListScrollCues(p, box, layout, visible.hasAbove, visible.hasBelow);
    }

    this.#drawFooterHint(p, layout, 'UP / DOWN scroll  |  ESC / Enter return');
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
    p.noStroke()
    p.fill(selected ? '#fff4d6' : '#4b2f24');
    setFont(p, Math.max(10, sx(12, layout)), FONTS.ui, selected ? 'bold' : 'normal');
    p.textAlign(p.LEFT, p.CENTER);
    p.text(text, x + sx(18, layout), y + h / 2 + sy(1, layout));
    p.pop();
  }

  #drawListScrollCues(p, box, layout, hasAbove, hasBelow) {
    const x = box.x + box.w - sx(28, layout);

    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    setFont(p, Math.max(11, sx(14, layout)), FONTS.ui, 'bold');
    p.noStroke();

    if (hasAbove) {
      p.fill('#6b4d37');
      p.text('^', x, box.y + sy(16, layout));
    }

    if (hasBelow) {
      p.fill('#6b4d37');
      p.text('v', x, box.y + box.h - sy(16, layout));
    }

    p.pop();
  }

  #ensurePauseUi(state) {
    state.ui.pause ??= {
      view: PAUSE_VIEWS.MENU,
      menuIndex: 0,
      notesIndex: 0,
      selectedNoteId: null
    };
    state.ui.pause.noteReaderScroll ??= 0;
    return state.ui.pause;
  }

  #getCollectedNotes(state) {
    return getNotesByIds(state.inventory?.notesCollected || [], state);
  }

  #getVisibleNoteWindow(notes, boxHeight, layout, selectedIndex) {
    const rowH = sy(NOTES_LIST_ROW_HEIGHT, layout);
    const gap = sy(NOTES_LIST_ROW_GAP, layout);
    const paddingY = sy(NOTES_LIST_PADDING_Y, layout);
    const availableHeight = Math.max(rowH, boxHeight - paddingY * 2);
    const rowsPerPage = Math.max(1, Math.floor((availableHeight + gap) / (rowH + gap)));
    const clampedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, notes.length - 1));
    const maxStart = Math.max(0, notes.length - rowsPerPage);
    const start = Math.min(Math.max(0, clampedIndex - rowsPerPage + 1), maxStart);

    return {
      rowH,
      gap,
      paddingY,
      rowsPerPage,
      start,
      end: Math.min(notes.length, start + rowsPerPage)
    };
  }

  #wrapTextToLines(p, text, maxWidth) {
    const paragraphs = String(text || '').split(/\n\s*\n/);
    const lines = [];

    for (let i = 0; i < paragraphs.length; i += 1) {
      const words = paragraphs[i].trim().split(/\s+/).filter(Boolean);
      let line = '';

      if (!words.length) {
        lines.push('');
      }

      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (p.textWidth(test) > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }

      if (line) lines.push(line);
      if (i < paragraphs.length - 1) lines.push('');
    }

    return lines;
  }

  #getVisibleTextWindow(lines, linesPerPage, scrollIndex) {
    const maxStart = Math.max(0, lines.length - linesPerPage);
    const start = Math.min(Math.max(0, scrollIndex), maxStart);

    return {
      start,
      end: Math.min(lines.length, start + linesPerPage),
      hasAbove: start > 0,
      hasBelow: start + linesPerPage < lines.length
    };
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
