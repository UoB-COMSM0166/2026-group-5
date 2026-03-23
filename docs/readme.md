# v7 — Stealth Puzzle Game

A top-down stealth game made with p5.js. Players move through tiled maps, collect chests, avoid NPC patrols, toggle room lights, and reach the extraction point to complete levels.

## How to Run

Open `index.html` in vscode with live server.

## Folder Structure

```Plain Text

game-v7/
├── index.html            Canvas container, HUD, control buttons
├── main.js               p5.js sketch entry, DOM setup
├── style.css             Page layout and button styles
├── p5.js                 p5.js library (local copy)
│
├── core/
│   ├── gameCore.js       Main game loop, screen transitions, level loading
│   ├── gameState.js      Screen state enum, global state manager
│   ├── inputSystem.js    Keyboard input handling
│   └── assetLoader.js    Async image loader for tiles/sprites
│
├── systems/
│   ├── playerSystem.js   Player movement, stamina, footsteps
│   ├── npcSystem.js      NPC vision, alert, state updates
│   ├── npcStateMachine.js NPC patrol/search/chase states
│   ├── npcTrackerSystem.js NPC pathfinding, edge-following
│   ├── pathfindingSystem.js A* pathfinding on tile grid
│   ├── collisionSystem.js Collision checks, LOS detection
│   ├── doorSystem.js     Door toggle and animation
│   ├── boxSystem.js      Chest open/close animation
│   ├── roomSystem.js     Room lighting, button logic
│   ├── lightingSystem.js Per-tile darkness calculation
│   ├── missionSystem.js  Exit unlock, mission prompts
│   ├── interactionSystem.js E-key interactions (doors/chests/lights)
│   ├── cameraSystem.js   Camera follow with smooth lerp
│   ├── audioSystem.js    Background audio, mute toggle
│   ├── animationSystem.js Sprite animation frame control
│   └── screenOverlaySystem.js Screen effects (vignette/flash)
│
├── render/
│   ├── renderSystem.js   Combine map/lighting/entities/HUD rendering
│   ├── mapRenderer_p5.js Tile map drawing
│   ├── entityRenderer_p5.js Draw NPCs/player/chests/doors
│   ├── lightingRenderer_p5.js Darkness overlay, glow effects
│   ├── tilesetCatalog.js Map tile image config
│   └── spriteCatalog.js  Character sprite path config
│
├── maps/
│   ├── mapManager.js     Map registry and initialization
│   ├── mapFactory.js     Build playable levels from config
│   ├── legacyDataAdapter.js Normalize old map configs
│   ├── map1.js           Map 1 config (collision/NPCs/rooms)
│   ├── map2.js           Map 2 config
│   └── map3.js           Map 3 config
│
├── states/
│   ├── startScreen.js    Title screen with menu
│   ├── introScreen.js    Intro text with typewriter effect
│   ├── winScreen.js      Victory screen
│   ├── loseScreen.js     Game over screen
│   └── pauseScreen.js    Pause menu overlay
│
├── utils/
│   ├── fonts.js          Font constants and helpers
│   └── screenLayout.js   Responsive screen scaling
│
├── assets/               Audio, images, font files
├── tilesets/             Tile set images
└── docs/
    ├── assets_manifest.md Asset replacement guide
    └── character_assets.md Sprite naming rules
```

## Key Functions

|Function|File|Purpose|
|---|---|---|
|`createGameCore`|`core/gameCore.js`|Create game instance with update/render loop|
|`updatePlayer`|`systems/playerSystem.js`|Handle player movement/stamina/footsteps|
|`updateNpcs`|`systems/npcSystem.js`|Update all NPC vision/alert/state|
|`runNpcTracker`|`systems/npcTrackerSystem.js`|Control NPC movement algorithms|
|`findPath`|`systems/pathfindingSystem.js`|A* pathfinding logic|
|`canMoveToRect`|`systems/collisionSystem.js`|Check if entity can move to position|
|`hasLineOfSight`|`systems/collisionSystem.js`|Check LOS between two points|
|`tryInteract`|`systems/interactionSystem.js`|Handle E-key interactions|
|`createRuntimeLevel`|`maps/mapFactory.js`|Build playable level from map config|
|`renderScene`|`render/renderSystem.js`|Draw all game visuals|
|`renderEntities`|`render/entityRenderer_p5.js`|Draw all game entities|
## Controls

|Key|Action|
|---|---|
|WASD / Arrow Keys|Move|
|Shift|Sprint (uses stamina)|
|E / Enter|Interact with objects|
|R|Restart current level|
