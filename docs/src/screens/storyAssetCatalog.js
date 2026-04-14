export const INTRO_ASSETS = Object.freeze({
  castle: './assets/images/original/drawings/intro/1.png',
  princessWindow: './assets/images/original/drawings/intro/2-1.png',
  princessScreens: './assets/images/original/drawings/intro/2-2.png',
  princessLabFull: './assets/images/original/drawings/intro/2-3.png',
  princessClose: './assets/images/original/drawings/intro/3-1.png',
  claw: './assets/images/original/drawings/intro/3-2.png',
  dragonSky: './assets/images/original/drawings/intro/4-1.png',
  panicTown: './assets/images/original/drawings/intro/4-2.png',
  swordClose: './assets/images/original/drawings/intro/5-1.png',
  knightHelmet: './assets/images/original/drawings/intro/5-2.png',
  knightFull: './assets/images/original/drawings/intro/5-3.png',
  gate: './assets/images/original/drawings/intro/6.png'
});

export const FALSE_ENDING_ASSETS = Object.freeze({
  handReach: './assets/images/original/drawings/endings/false_ending/1.png',
  princessClose: './assets/images/original/drawings/endings/false_ending/2.png',
  swordGrip: './assets/images/original/drawings/endings/false_ending/3.png',
  knightPrincess: './assets/images/original/drawings/endings/false_ending/4.png',
  gateStrike: './assets/images/original/drawings/endings/false_ending/5-1.png',
  handTouch: './assets/images/original/drawings/endings/false_ending/5-2.png',
  escapeWalk: './assets/images/original/drawings/endings/false_ending/6.png',
  finalChamber: './assets/images/original/drawings/endings/false_ending/7.png'
});

export const TRUE_ENDING_ASSETS = Object.freeze({
  princessThrone: './assets/images/original/drawings/endings/true_ending/1.png',
  crownClose: './assets/images/original/drawings/endings/true_ending/2.png',
  princessPanel: './assets/images/original/drawings/endings/true_ending/2-1.png',
  throneCoreRoom: './assets/images/original/drawings/endings/true_ending/3.png',
  chainedDragon: './assets/images/original/drawings/endings/true_ending/4.png',
  confrontationPanels: './assets/images/original/drawings/endings/true_ending/5.png',
  brokenChains: './assets/images/original/drawings/endings/true_ending/6-1.png',
  swordLowered: './assets/images/original/drawings/endings/true_ending/6-2.png',
  knightLeaves: './assets/images/original/drawings/endings/true_ending/6-3.png',
  dragonSky: './assets/images/original/drawings/endings/true_ending/7.png',
  castlePeace: './assets/images/original/drawings/endings/true_ending/8.png'
});

export const STORY_SCREEN_ASSET_PATHS = Object.freeze([
  ...Object.values(INTRO_ASSETS),
  ...Object.values(FALSE_ENDING_ASSETS),
  ...Object.values(TRUE_ENDING_ASSETS)
]);
