# README – Jinni Changes

The commits and notes in this update identify the additions and modifications made by Jinni.

## New files
- `states/startScreen.js`
- `states/introScreen.js`
- `states/winScreen.js`
- `states/loseScreen.js`
- `utils/fonts.js`
- `utils/audioManager.js`
- `utils/screenLayout.js`
- `utils/screenOverlaySystem.js`
- new visual assets for the screen flow -> see `assets/images/original/drawings/`
- new audio assets for the screen flow -> see  `assets/audio/`

## Modified files from `map2_renderer_v1`
- `game.js`
- `index.map2.html`
- `renderer.remap_doors.js`

## New functionality
- start screen state
- intro screen state
- win screen state
- lose screen state
- screen overlay rendering system
- state-based audio handling
- mute toggle support
- game state transitions
- full reset flow for restarting
- debug shortcuts for testing states
- new keyboard shortcuts for state switching and audio control
- new fonts for screen/UI presentation
- new screen visuals
- new screen audio

## Modified functionality (all highlighted in the script - search for "Jinni")
game.js: 
- refactored into an ES module
- added full game state system: start / intro / playing / win / lose
- connected screen overlay handlers
- added state-based audio sync
- added resetGame()
- split keyboard input depending on the current state
- added debug shortcuts and mute

index.map2.html
- changed game.js to module loading
- added Google Fonts for UI/screens

## New shortcuts
- `1` → switch to `win`
- `2` → switch to `lose`
- `3` → switch to `start`
- `4` → switch to `intro`
- `5` → switch to `playing`
- `M` → mute / unmute audio
- `Escape` → return to start screen during gameplay
