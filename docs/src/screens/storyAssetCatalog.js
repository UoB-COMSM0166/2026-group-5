// Image asset path constants for intro, false ending, and true ending cutscenes.
export const INTRO_ASSETS = Object.freeze({
  castle: './assets/images/cutscenes/intro/1.png',
  princessWindow: './assets/images/cutscenes/intro/2-1.png',
  princessScreens: './assets/images/cutscenes/intro/2-2.png',
  princessLabFull: './assets/images/cutscenes/intro/2-3.png',
  princessClose: './assets/images/cutscenes/intro/3-1.png',
  claw: './assets/images/cutscenes/intro/3-2.png',
  dragonSky: './assets/images/cutscenes/intro/4-1.png',
  panicTown: './assets/images/cutscenes/intro/4-2.png',
  swordClose: './assets/images/cutscenes/intro/5-1.png',
  knightHelmet: './assets/images/cutscenes/intro/5-2.png',
  knightFull: './assets/images/cutscenes/intro/5-3.png',
  gate: './assets/images/cutscenes/intro/6.png'
});

export const FALSE_ENDING_ASSETS = Object.freeze({
  handReach: './assets/images/cutscenes/endings/false-ending/1.png',
  grapArm: './assets/images/cutscenes/endings/false-ending/2.png',
  princessClose: './assets/images/cutscenes/endings/false-ending/3.png',
  knightPrincess: './assets/images/cutscenes/endings/false-ending/4.png',
  gateStrike: './assets/images/cutscenes/endings/false-ending/5-1.png',
  handTouch: './assets/images/cutscenes/endings/false-ending/5-2.png',
  escapeWalk: './assets/images/cutscenes/endings/false-ending/6.png',
  finalChamber: './assets/images/cutscenes/endings/false-ending/7.png'
});

export const TRUE_ENDING_ASSETS = Object.freeze({
  scene1: './assets/images/cutscenes/endings/true-ending/1.png',
  scene2: './assets/images/cutscenes/endings/true-ending/2.png',
  scene3: './assets/images/cutscenes/endings/true-ending/3.png',
  scene4: './assets/images/cutscenes/endings/true-ending/4.png',
  scene5: './assets/images/cutscenes/endings/true-ending/5.png',
  scene6: './assets/images/cutscenes/endings/true-ending/6.png',
  scene7: './assets/images/cutscenes/endings/true-ending/7.png',
  scene8: './assets/images/cutscenes/endings/true-ending/8.png',
  scene9: './assets/images/cutscenes/endings/true-ending/9.png',
  scene10: './assets/images/cutscenes/endings/true-ending/10.png',
  scene11: './assets/images/cutscenes/endings/true-ending/11.png',
  scene12: './assets/images/cutscenes/endings/true-ending/12.png',
  scene13: './assets/images/cutscenes/endings/true-ending/13.png',
  scene14a: './assets/images/cutscenes/endings/true-ending/14-1.png',
  scene14b: './assets/images/cutscenes/endings/true-ending/14-2.png',
  scene15: './assets/images/cutscenes/endings/true-ending/15.png',
  scene16: './assets/images/cutscenes/endings/true-ending/16.png',
  scene17: './assets/images/cutscenes/endings/true-ending/17.png',
  scene18: './assets/images/cutscenes/endings/true-ending/18.png',
  scene19: './assets/images/cutscenes/endings/true-ending/19.png',
  scene20: './assets/images/cutscenes/endings/true-ending/20.png'
});

export const TRUE_ENDING_VIDEO_ASSETS = Object.freeze({
  finalFlight: './assets/images/cutscenes/endings/true-ending/21.mp4'
});

export const STORY_SCREEN_ASSET_PATHS = Object.freeze([
  ...Object.values(INTRO_ASSETS),
  ...Object.values(FALSE_ENDING_ASSETS),
  ...Object.values(TRUE_ENDING_ASSETS)
]);
