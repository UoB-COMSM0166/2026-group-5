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
  }
]);

const GENERATED_BODIES = Object.freeze([
  'A recovered page mentions the throne room power source pulsing whenever the princess is alone with it.',
  'This note warns the guards to follow the rescue script exactly and never speak about the chained beast.',
  'Someone scribbled that the dragon looked terrified, not furious, when the alarms began.',
  'A margin comment reads: If the knight arrives, do not let him see the lower chamber.',
  'The page describes court officials rehearsing a version of events before anyone went missing.',
  'A torn memo says the kingdom is safer when the monster remains visible and the machinery remains hidden.'
]);

const NOTE_LOOKUP = new Map(BASE_NOTES.map((note) => [note.id, note]));

function makeGeneratedNote(noteId) {
  const match = String(noteId || '').match(/(\d+)$/);
  const index = match ? Number(match[1]) : 0;
  if (!index) return null;

  return {
    id: noteId,
    title: `Recovered Log ${index}`,
    body: GENERATED_BODIES[(index - 1) % GENERATED_BODIES.length]
  };
}

export function getNoteById(noteId) {
  return NOTE_LOOKUP.get(noteId) || makeGeneratedNote(noteId);
}

export function getNotesByIds(noteIds = []) {
  return noteIds
    .map((id) => getNoteById(id))
    .filter(Boolean);
}
