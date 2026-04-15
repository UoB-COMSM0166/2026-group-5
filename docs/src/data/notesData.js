// Handcrafted story notes the player can collect from chests.
function buildBody(...paragraphs) {
  return paragraphs.join('\n\n');
}

const FIRST_PLAYTHROUGH_NOTES = Object.freeze([
  {
    id: 'note_1',
    title: 'Scribbled Guard Note',
    body: buildBody(
      'Boss say no snacks on watch. This rule unfair.',
      'Also no go upper hall after bell. If hear flap-flap, stay still. If hear big growl, stay more still. If hear princess talking to herself, go other way.',
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
  }
]);

const SECOND_PLAYTHROUGH_NOTES = Object.freeze([
  {
    id: 'note_1',
    title: 'Archive Tag - Restricted Bloodline Record',
    body: buildBody(
      'ACCESS PRINCIPLE:',
      'Sovereign clearance alone is insufficient. Custodian clearance alone is insufficient.',
      'Core functions remain sealed unless both living keys are present.',
      'Do not duplicate this record. Do not discuss this record in the hearing of the court. Do not allow descendants to understand the full mechanism.'
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
      'PRINCESS: You need me. DRAGON: I need what is in your blood. That is not the same thing.',
      'PRINCESS: And I need what they buried inside you. DRAGON: You speak of power like it belongs to the first hand that reaches for it.',
      'PRINCESS: Better mine than theirs. DRAGON: There is no "better" once that door opens.',
      'Transcript ends due to my immediate decision to leave before being noticed.'
    )
  },
  {
    id: 'note_5',
    title: "Founder's Warning",
    body: buildBody(
      'I built this engine to end uncertainty. I believed suffering came from ignorance, and that a kingdom which could foresee all things might become wise.',
      'Instead I built a throne for cowards.',
      'To know every outcome is to murder choice before it is made. To govern by certainty is to turn every life into an equation.',
      'If a ruler finds this place, I have failed. If a hero finds this place, then heroism itself is in danger of becoming another tool.'
    )
  },
  {
    id: 'note_6',
    title: 'Final Message for the Knight',
    body: buildBody(
      'Knight,',
      'By now you must understand: the princess was never only a victim, the dragon was never only a beast, and you were never meant to be more than a useful piece in an old story.',
      'The machine below offers what all frightened hearts desire: control without trust, order without freedom, certainty without mercy.',
      'If you still wish to be noble, then do not claim it. Do not serve it. Do not save it. End it.'
    )
  }
]);

const FIRST_LOOKUP = new Map(FIRST_PLAYTHROUGH_NOTES.map((note) => [note.id, note]));
const SECOND_LOOKUP = new Map(SECOND_PLAYTHROUGH_NOTES.map((note) => [note.id, note]));

function usesSecondPlaythroughNotes(context = {}) {
  if (context.levelId === 'map2' || context.levelId === 'map3') return true;
  return context.story?.currentPlaythrough === 2;
}

function getNoteLookup(context = {}) {
  return usesSecondPlaythroughNotes(context) ? SECOND_LOOKUP : FIRST_LOOKUP;
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
