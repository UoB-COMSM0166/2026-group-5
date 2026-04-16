// Handcrafted story notes the player can collect from chests.
function buildBody(...paragraphs) {
  return paragraphs.join('\n\n');
}

const BASE_NOTES = Object.freeze([
  {
    id: 'note_1',
    title: 'Scribbled Guard Note',
    body: buildBody(
      'Boss say no snacks on watch. This rule unfair.',
      'Also no go upper hall after bell. If hear flap-flap, stay still. If hear big growl, stay more still. If hear princess asking about old doors, lower halls, or what answers to royal blood, go other way.',
      'I hate this castle.'
    )
  },
  {
    id: 'note_2',
    title: 'Patrol Report - West Stair',
    body: buildBody(
      'Patrol Report, West Stair, night cycle.',
      'Two guards lost formation after unauthorised entry attempt near the sealed mechanism. No evidence of dragon attack. No scorch marks. No structural collapse.',
      'The castle itself rejected passage.',
      'Additional note: lower-ranked guards continue to describe the event as "the door being mean." This description is unhelpful but not entirely inaccurate.'
    )
  },
  {
    id: 'note_3',
    title: 'Crumpled Watchroom Gossip Sheet',
    body: buildBody(
      'Princess weird.',
      'She not cry. She not scream. She not ask for rescue.',
      'She ask:',
      '"How old are the lower stones?" "Who has access to the underground halls?" "Can old locks still recognise blood?"',
      'We do not know. We are guards, not librarians.'
    )
  },
  {
    id: 'note_4',
    title: 'Cleaning Duty Complaint',
    body: buildBody(
      'Dear Boss,',
      'I do not want sweeping duty near gold room anymore.',
      'Dragon not problem. Dragon only stares. Very rude, yes, but manageable.',
      'Problem is chains under floor. They hum. They glow. They make teeth feel wrong.',
      'Requesting new assignment. Maybe moat.',
      '- Glim'
    )
  },
  {
    id: 'note_5',
    title: "Captain's Private Note",
    body: buildBody(
      'Officially, we are to maintain the simple version: the dragon stole the princess, the knight will arrive, the story will resolve itself.',
      'I have served in this castle long enough to distrust any story that neat.',
      'The prisoner is too calm. The dragon is too restrained. The doors obey rules no beast could invent.',
      'Something is being staged here. I would prefer not to be present when it ends.'
    )
  },
  {
    id: 'note_6',
    title: "Captain's Private Note",
    body: buildBody(
      'Stable duty moved again. Nobody wanted night watch near the upper courtyard, so Boss sent me.',
      'I heard the dragon land on the west tower. Very dramatic. Much wing. Much growling.',
      'Then he just sat there.',
      'Did not burn anything.',
      'Did not smash anything.',
      'Did not even eat the goat we left out.',
      'Just stared at the locked tower for a very long time.',
      'I think monsters are supposed to do more monster things.',
      '- Tob'
    )
  }

]);

const SECOND_PLAYTHROUGH_NOTES = Object.freeze([
  {
    id: 'note_1',
    title: 'Archive Tag - Restricted Record',
    body: buildBody(
      'FOUNDATION DIRECTIVE:',
      'Beneath the old castle lies the Throne Core, a royal engine designed to calculate the kingdom’s future through total causal prediction.',
      'At full function, the Core does not estimate outcomes. It determines them in advance.',
      'Succession disputes, unrest, betrayal, war, collapse - all become visible before they occur.',
      'The device was judged too dangerous for any crown to possess freely.',
      'It was therefore sealed beneath the castle and removed from the visible structure of rule.'
    )
  },
  {
    id: 'note_2',
    title: 'Folded Page Hidden in a Vanity',
    body: buildBody(
      'They smile at me as if that were power. They dress me in white as if that were power. They promise me a throne as if that were power.',
      'A throne inherited is still a leash if others built its limits.',
      'There is something beneath this castle older than crown and court. If it is real, then all this pageantry is only decoration around the true seat of rule.',
      'I was not born to decorate.'
    )
  },
  {
    id: 'note_3',
    title: 'Custodian Binding Record',
    body: buildBody(
      'CUSTODIAN STATUS: Bound successfully to site, lock, and succession structure.',
      'Instability persists. Subject displays long-term resistance to assigned symbolic role: "monster," "guardian," "royal threat."',
      'Subject continues to demonstrate attachment to unauthorised concept: freedom.',
      'Recommend ongoing suppression through oath architecture and bloodline dependency.'
    )
  },
  {
    id: 'note_4',
    title: 'Overheard Conversation Transcript',
    body: buildBody(
      'Partial transcript, recorded from outside upper chamber:',
      'PRINCESS: You should have left me at court if you wanted me ignorant.',
      'DRAGON: Ignorance never suited you.',
      'PRINCESS: No. And neither does a cage.',
      'DRAGON: Better this cage than a kingdom placing the lower door in your hands.',
      'PRINCESS: You say that as if you did not need me the moment you brought me here.',
      'DRAGON: Need is not trust.',
      'PRINCESS: Still, here we are. You with your chains. Me with my blood.',
      'DRAGON: And both of us foolish enough to think the other can be used safely.',
      'Transcript ends due to my immediate decision to leave before being noticed.',
    )
  },
  {
    id: 'note_5',
    title: "Founder's Warning",
    body: buildBody(
      'I built this engine to end uncertainty. I believed suffering came from ignorance, and that a kingdom which could foresee all things might become wise.',
      'Instead I built a throne for cowards.',
      'A ruler who knows the future does not govern through trust, law, or wisdom, but through preemption.',
      'To know every outcome is to murder choice before it is made. To govern by certainty is to turn every life into an equation.',
      'If a ruler finds this place, I have failed. If a hero finds this place, then heroism itself is in danger of becoming another tool.'
    )
  },
  {
    id: 'note_6',
    title: 'Access Record — Sealed Chamber',
    body: buildBody(
      'By final decree, no single living authority shall command the Core.',
      'Access is divided between two necessary keys:',
      'Key of Sovereignty - bound to the royal bloodline.',
      'Key of Custody - bound to the dragon attached to the castle.',
      'Neither key may activate the Core alone.',
      'Both must be present.',
      'Thus no monarch may rule through certainty without the Custodian, and no Custodian may unseal the Core without the blood of the crown.'
    )
  },
  {
    id: 'note_7',
    title: 'Final Message for the Knight',
    body: buildBody(
      'Knight,',
      'By now you must understand: the princess was never merely a victim, the dragon was never merely a beast, and you were never meant to be anything more than a useful piece in an old story.',
      'What lies below offers what all frightened hearts desire: control without trust, order without freedom, certainty without mercy.',
      'If you still wish to be noble, then do not claim it. Do not serve it. Do not save it. End it.'
    )
  }
]);

// Fast lookup tables for each playthrough's notes by id.
const BASE_LOOKUP = new Map(BASE_NOTES.map((note) => [note.id, note]));
const SECOND_LOOKUP = new Map(SECOND_PLAYTHROUGH_NOTES.map((note) => [note.id, note]));

function usesSecondPlaythroughNotes(context = {}) {
  if (context.levelId === 'map2' || context.levelId === 'map3') return true;
  return context.story?.currentPlaythrough === 2;
}

function getNoteLookup(context = {}) {
  return usesSecondPlaythroughNotes(context) ? SECOND_LOOKUP : BASE_LOOKUP;
}

// Retrieve a single note by id.
export function getNoteById(noteId, context = {}) {
  return getNoteLookup(context).get(noteId) || null;
}

// Retrieve multiple notes by an array of ids.
export function getNotesByIds(noteIds = [], context = {}) {
  return noteIds
    .map((id) => getNoteById(id, context))
    .filter(Boolean);
}
