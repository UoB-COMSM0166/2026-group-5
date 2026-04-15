// Handcrafted story notes the player can collect from chests.
const BASE_NOTES = Object.freeze([
  {
    id: 'note_1',
    title: 'Crimson Memo',
    body: 'The princess has not slept for three nights. She keeps asking whether the dragon is truly our enemy, or merely a prisoner in a larger design.'
  },
  {
    id: 'note_2',
    title: 'Guard Report',
    body: 'Outer corridors secured. Strange noises continue beyond the sealed rooms. Morale is low. Several guards insist they heard chains dragging below the throne hall.'
  },
  {
    id: 'note_3',
    title: 'Laboratory Fragment',
    body: 'Core readings remain unstable. Her Highness requested another test despite the risks. No one dares question her directly anymore.'
  },
  {
    id: 'note_4',
    title: 'Burned Letter',
    body: 'If this reaches anyone, do not trust appearances. The rescue story is too neat. Too clean. Something was wrong long before the dragon came.'
  },
  {
    id: 'note_5',
    title: 'Strange Entry',
    body: 'A recovered page mentions the throne room power source pulsing whenever the princess is alone with it.'
  },
  {
    id: 'note_6',
    title: 'Hidden Warning',
    body: 'This note warns the guards to follow the rescue script exactly and never speak about the chained beast.'
  }
]);

// Fast lookup table for base notes by id.
const NOTE_LOOKUP = new Map(BASE_NOTES.map((note) => [note.id, note]));

// Retrieve a single note by id.
export function getNoteById(noteId) {
  return NOTE_LOOKUP.get(noteId) || null;
}

// Retrieve multiple notes by an array of ids.
export function getNotesByIds(noteIds = []) {
  return noteIds
    .map((id) => getNoteById(id))
    .filter(Boolean);
}
