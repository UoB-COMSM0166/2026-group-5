# Design Document

> Outline

1. Map & Sprite Dimensions
2. Game Loop
3. Player
4. NPC (Guards)
5. Map & Collision
6. Stealth System
7. Interactive Objects
8. Portal System
9. Loot & Inventory
10. Camera System


## 0. Map & Sprite Dimensions

All three maps use `baseTile = 16` px (16×16 per tile).

| Map | Grid (W×H) | Pixels | Rooms | NPCs |
|-----|-----------|--------|-------|------|
| Map1 | 60×40 | 960×640 | 4 | 3 |
| Map2 | 60×40 | 960×640 | 7 | 3 |
| Map3 | 60×40 | 960×640 | 9 | 5 |

Player hitbox defaults to `w = 12, h = 12` px in `mapFactory.js` but every map config overrides it to `w = 10, h = 14` px. NPC hitbox is `w = 12, h = 12` px with insets `collisionInsetX = 1, collisionInsetY = 2`.

## 1. Game Loop

### Entry point: `GameCore` class (`gameCore.js`)

`update(deltaTime)` runs every frame in this order:

1. Screen time — tick screen timer
2. Overlay — update UI overlay
3. Intro animation — play if active (blocks player input)
4. Player update — `updatePlayer(player, movement, level, deltaTime)`
5. Running SFX — sync sprint sound
6. Portal — placement & teleport check
7. Camera — `camera.update(player, deltaTime)`
8. Room exploration — reveal fog of war
9. Door system — `doorSystem.update(deltaTime, entities)`
10. Box / Room / Mission — tick subsystems
11. NPC update — `updateNpcs(level, deltaTime)`, returns `detectedBy` (catching NPC's id)
12. Win/Lose check — caught → LOSE; exit interaction → WIN
13. HUD sync — throttled DOM update every 100 ms

Rendering goes through `render(p)` → `renderScene(p, state, overlay)`. Pressing `Esc` toggles PLAYING ↔ PAUSE; while paused `update()` returns immediately.

Screen state machine:
```
START → PLAYTHROUGH_SELECT → DIFFICULTY_SELECT → MAP_SELECT → PLAYING ↔ PAUSE
PLAYING → WIN / LOSE / FALSE_ENDING / TRUE_ENDING
```

## 2. Player

### Movement (`playerSystem.js`)

WASD / arrow keys to walk, Shift to sprint. Input uses a last-key-wins axis resolver (`InputSystem`). `moveActor(player, dx, dy, level)` does axis-independent collision — X first, then Y, each checked with `canMoveToRect`.

Speed parameters (code defaults, overridable per map):

| Parameter | Code default | Map1 | Map2 | Map3 | Description |
|-----------|-------------|------|------|------|-------------|
| `speed` | 72 px/s | 110 | 100 | 100 | Walk speed |
| `sprint` | 1.65× | 1.55× | 1.5× | 1.5× | Sprint multiplier |
| `staminaMax` | 100 | 120 | 120 | 120 | Max stamina |
| `staminaDrain` | 33/s | 22 | 22 | 22 | Sprint drain rate |
| `staminaRecover` | 18/s | 20 | 20 | 20 | Recovery rate |
| `staminaRecoverDelay` | 0.55 s | 1.5 s | 1.5 s | 1.5 s | Delay before recovery kicks in |

Facing is set by the input axis with the larger absolute value (up / down / left / right).

### Footprint System

While sprinting or inside an NPC's vision cone, footprints are dropped along the path every `footstepStride` pixels. They alternate left/right (`sideOffset = 3` px) and trail behind by `backOffset = 6` px.

| Parameter | Code default | Map1 | Map2 | Map3 |
|-----------|-------------|------|------|------|
| `footstepStride` | 7 px | 7 | 6 | 6 |
| `maxFootsteps` | 50 | 50 | 60 | 60 |
| `footstepLifetime` | 3000 ms | 3000 | 3500 | 3500 |

### Stamina Bar UI

`updateStaminaBar(player)` updates the `#stamina-fill` DOM element width and colour class in real time (≤20% → critical, ≤40% → low).

### Interaction (`interactionSystem.js`)

Press **E** to interact. Priority: Exit > Chest > Door > Light Button. Ranges: Chest `1.8 tiles`, Door `1 tile gap`, Light Button `1.35 tiles`, Exit `1.2 tiles`. Keys are never consumed — once picked up they unlock any number of matching doors.

## 3. NPC (Guards)

### Base Attributes (`NPC.js`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `speedPatrol` | 55 px/s | Patrol speed |
| `speedChase` | 82 px/s | Chase speed |
| `collisionInsetX` | 2 (default) / 1 (map config) | Collision inset X |
| `collisionInsetY` | 2 (default) / 2 (map config) | Collision inset Y |
| `alertThreshold` | 1.0 | Alert threshold |
| `alertCooldown` | 0.5 s | Alert cooldown |

Per-map speed breakdown:

| Map | NPC ID | speedPatrol | speedChase |
|-----|--------|-------------|------------|
| Map1 | NPC-1 / NPC-2 / NPC-3 | 55 | 82 |
| Map2 | NPC-2-1 | 55 | 82 |
| Map2 | NPC-2-2 | 50 | 80 |
| Map2 | NPC-2-3 | 60 | 85 |
| Map3 | npc1–npc5 (all) | 55 | 82 |

### State Machine (`npcStateMachine.js`)

Three-state FSM — PATROL, SEARCH, CHASE:

```
PATROL ──(spots player + alertLevel ≥ 20)──► CHASE
PATROL ──(light off / footprint / door opened)──► SEARCH
CHASE  ──(loses sight + alertLevel ≤ 10)──► SEARCH
SEARCH ──(timer done + alertLevel = 0)──► PATROL
SEARCH ──(spots player + alertLevel ≥ 20)──► CHASE
```

Thresholds:
- `ALERT_CHASE_THRESHOLD = 20` — alertLevel ≥ 20 while seeing the player → enter CHASE
- `ALERT_SEARCH_THRESHOLD = 10` — alertLevel ≤ 10 after losing sight → drop to SEARCH
- `SEARCH_ALERT_BONUS = 5` — instant +5 on entering SEARCH
- `MIN_STATE_HOLD_MS = 1000` — minimum 1 s between transitions

Alert level (`updateNpcAlertLevel`) rises at `+34/s` when the player is visible (~0.6 s from 0 to 20) and decays at `−18/s` otherwise. Clamped 0–100.

### NPC Door & Light Interaction

NPCs can open any door including locked ones. Timings: open `NPC_OPEN = 0.5 s`, pass `NPC_PASS = 0.2 s`, close `NPC_CLOSE = 0.5 s`. Chase-state open is also `0.5 s`.

If a patrolling NPC notices its room's light is off it enters SEARCH(LIGHT), navigates to the switch, wanders 2 s, flips the light back on, then resumes PATROL. Similarly, spotting an open door triggers SEARCH(OPEN_DOOR) — the NPC reaches the door, searches 2 s, closes it, and goes back to patrolling.

### Tracking Algorithms (`npcTrackerSystem.js`)

The tracker uses three movement profiles in a strategy-pattern structure. Each profile represents a different NPC movement context while sharing the same lower-level movement pipeline.

| Profile          | Function             | Design role                                                                                                              |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `steering_chase` | `trackSteeringChase` | Chase profile. The NPC moves directly toward the target when reachable and uses A* when direct movement is not possible. |
| `path_smooth`    | `trackPathSmooth`    | General navigation profile. The NPC follows a smoothed A* path.                                                          |
| `patrol_route`   | `trackDirectPatrol`  | Patrol profile. The NPC follows the current waypoint queue.                                                              |

All profiles funnel through `moveToward()`. This keeps obstacle avoidance and steering behaviour consistent across chase, general movement, and patrol movement.


#### Pathfinding Design

Long-range route planning is handled by A* pathfinding in `pathfindingSystem.js`. The system is designed for a tile grid without diagonal movement, so it uses Manhattan distance as the heuristic:

```text
h(n) = |x_n - x_goal| + |y_n - y_goal|
```

Because movement is limited to horizontal and vertical tile steps, this heuristic does not overestimate the actual path cost.

The travelled cost is calculated as:

```text
g(n) = g(parent) + 1
```

The total node score is:

```text
f(n) = g(n) + h(n)
```

This combines the known cost from the start node with the estimated remaining distance to the goal. Nodes are prioritised by the lowest score, with ties broken by lower `f` and then lower `g`.

Walkability checks use `isBlocked()` together with `doorSystem.isDoorTile()`. Door tiles are treated as passable even when closed, allowing NPCs to plan routes through doors because they can force doors open.

#### Local Steering Design

A* provides the route, while context-based steering controls short-range movement and obstacle avoidance in `moveToward()`.

The steering system samples 12 directions around the NPC at 30-degree intervals:

```text
θ_i = (i / 12) × 2π
```

Each ray receives an interest weight based on alignment with the target direction:

```text
w_i = max(0, d_i · v_target)
```

Here, `d_i` is the ray direction and `v_target` is the desired target direction. The dot product gives higher weight to rays that point closer to the target direction.

Obstacle checks then adjust these weights:

| Obstacle condition            | Weight adjustment            |
| ----------------------------- | ---------------------------- |
| Wall detected within `d_near` | Weight set to `0`            |
| Wall detected within `d_far`  | Weight scaled down to `0.12` |

The final steering vector is calculated as the weighted sum of all ray directions:

```text
s = Σ(d_i × w_i)
```

The resulting vector is normalised and scaled by `stepDistance` before being applied to NPC movement.


#### Recovery and Separation Design

The tracker includes anti-stuck recovery to handle cases where an NPC stops progressing toward its target.

| Stuck duration | Recovery behaviour          |
| -------------- | --------------------------- |
| After `0.8s`   | Re-plan the path            |
| After `1.8s`   | Apply a perpendicular nudge |
| Last resort    | Use wall-following          |

The system also calls `applyNpcSeparation()` to push overlapping NPCs apart. This prevents multiple NPCs from occupying the same position during movement.


### Catch Condition

In CHASE state, if the NPC centre is within `12 px` of the player centre the game triggers LOSE.

## 4. Map & Collision

### Map Structure (`mapFactory.js` → `Level` class)

Each Level holds a 2D `collision` matrix (0 = walkable, 1 = blocked), `mapData` from Tiled (layers + tile GIDs), a `roomMatrix` for lighting/fog, and a `settings` object. Subsystems attached: `doorSystem`, `boxSystem`, `roomSystem`, `missionSystem`, `portalSystem`.

### Settings Across Maps

| Parameter | Description | Map1 | Map2 | Map3 |
|-----------|------------|------|------|------|
| `baseTile` | Tile size | 16 | 16 | 16 |
| `visionRange` | NPC base vision (px) | 112 | 120 | 120 |
| `searchDuration` | Search duration (s) | 3 | 4 | 4 |
| `searchRadius` | Search radius (px) | 48 | 55 | 55 |
| `footstepStride` | Footprint spacing (px) | 7 | 6 | 6 |
| `footstepLifetime` | Footprint lifetime (ms) | 3000 | 3500 | 3500 |
| `maxFootsteps` | Max footprints | 50 | 60 | 60 |
| `unexploredOpacity` | Unexplored opacity | 250 | 250 | 249 |
| `unexploredFadeDuration` | Fog fade-out (ms) | 1000 | 1000 | 1000 |
| `initialZoom` | Starting zoom | 1.7 | 1.7 | 1.7 |

Map1 is the easiest (shorter vision, quicker searches). Map2 and Map3 share the same tuning but have bigger layouts and more guards.

### Collision System (`collisionSystem.js`)

- `isBlocked(collision, tx, ty)` — tile-level check; out of bounds counts as blocked
- `isBlockedByWorld(level, tx, ty)` — tile collision + door collision
- `canMoveToRect(entity, nextX, nextY, collision, tileSize, level)` — AABB test with `collisionInset`
- `hasLineOfSight(collision, x1, y1, x2, y2, tileSize, step, level)` — raycast LOS, default `step = 6` px, samples tiles along the ray
- `castVisionRay(level, x1, y1, angle, maxDistance, tileSize, step)` — angular raycast for vision-cone polygon rendering

## 5. Stealth System

### Vision (`npcSystem.js`)

The vision cone originates from the NPC centre, ±45° around facing direction (total spread = 90°). Base range is `visionRange` (Map1: 112 px, Map2/3: 120 px), scaled by state and lighting:

| Condition | Multiplier | Map1 effective | Map2/3 effective |
|-----------|-----------|----------------|------------------|
| Dark room (any state) | `darkVisionMultiplier = 0.6` | 67 px | 72 px |
| Normal patrol (lit) | `normalVisionMultiplier = 1.0` | 112 px | 120 px |
| SEARCH (lit) | `0.9` | 101 px | 108 px |
| CHASE (lit) | `chaseVisionMultiplier = 1.2` | 134 px | 144 px |

`hasLineOfSight()` samples along the ray — walls and closed doors block it, so NPCs can't build alert behind cover. `getNpcVisionPolygon()` fires a `castVisionRay` every 0.01 rad within the spread and returns polygon vertices for drawing.

### Footprint Tracking

A patrolling NPC that spots a footprint in its cone (with clear LOS) enters SEARCH(FOOTSTEP) and heads toward the nearest one. Search radius = `searchRadius` (Map1: 48 px, Map2/3: 55 px).

### Search Behaviour

For non-LIGHT searches the NPC sets `searchTimer = 2 s` and wanders randomly around the search origin (`getReachableSearchPoint`, radius = `searchRadius`). For LIGHT searches it navigates toward the switch first (`searchTimer = -1` until arrival), then wanders within `3 tiles` of the switch for 2 s. In both cases a new random target is picked every `0.5 s`.

## 6. Interactive Objects

### Door System (`doorSystem.js`)

Doors have three states: `LOCKED` → `CLOSED` ↔ `OPEN`. Two types exist — `single` (1×2 sliding) and `double` (2×2 double-leaf) — each with a slide direction (left / right / up / down). The `anim` value interpolates 0→1 at speed 4: `door.anim += (target − door.anim) × min(1, deltaTime × 4)`.

`unlock(door, keyId)` permanently clears the keyId on match, turning the door into a regular toggle. NPCs can force-open any door including locked ones; closing restores the LOCKED state. Closed doors are solid (`collision = 1` on their tiles); opening clears it. If an entity is on a closing door's tiles it gets pushed to the nearest walkable tile over `PUSH_DURATION = 0.5 s`. There's a `MIN_STATE = 0.2 s` cooldown after each state change.

### Lighting System (`roomSystem.js`)

Each room tracks a `lightOn` flag, on by default. Pressing E near a switch calls `toggleRoom` and notifies NPCs in the same room (`notifyNpcsOfLightChange`). The switch interaction zone covers 2 rows below the button, 3 tiles wide. Notified NPCs set `roomLightResponse`, consumed during PATROL to trigger SEARCH(LIGHT).

### Chest System (`boxSystem.js`)

Press E near a chest to open it and get a Key or Note. Opening every chest on the map unlocks the exit (`missionSystem.unlock()`).

| Map | Total | Keys | Notes |
|-----|-------|------|-------|
| Map1 | 8 | 2 | 6 |
| Map2 | 11 | 4 | 7 |
| Map3 | 11 | 4 | 7 |

## 7. Portal System (`portalSystem.js`)

Press **Space** to place a portal ahead of the player — up to 2 at a time (blue / red, alternating). Placement scans the 3 tiles in front for a valid spot. Trigger radius is tile size × `triggerScale = 1.5`, cooldown `0.2 s`, exit offset `exitOffsetTiles = 0.45` × tileSize. A chasing NPC that sees the player teleport enters SEARCH(PORTAL_CONFUSED) for `1.1 s`.

## 8. Loot & Inventory (`lootTable.js`)

Two item types: `key` and `note` (note fragment). Keys persist in the inventory once picked up and can be reused indefinitely.

### Loot Tables

**Map1** (8 chests = 2 keys + 6 notes):

| Chest ID | Drop | Key Name |
|----------|------|----------|
| chest_1 | key_exit | Passage Key |
| chest_7 | key_doorA | Hall Key |
| remaining 6 | note | — |

**Map2** (11 chests = 4 keys + 7 notes):

| Chest ID | Drop | Key Name |
|----------|------|----------|
| chest-2-1 | key_A | Archive Key |
| chest-2-4 | key_B | Restricted Key |
| chest-2-6 | key_exit | Passage Key |
| chest-2-9 | key_D | Bloodline Key |
| remaining 7 | note | — |

**Map3** (11 chests = 4 keys + 7 notes):

| Chest ID | Drop | Key Name |
|----------|------|----------|
| chest-3-1 | key_exit | Passage Key |
| chest-3-4 | key_A | Vanity Key |
| chest-3-9 | key_C | Chain Key |
| chest-3-11 | key_B | Crown Key |
| remaining 7 | note | — |

### Door–Key Mapping

| Map | Doors | Locked Doors | Exit Door | Exit Key |
|-----|-------|-------------|-----------|----------|
| Map1 | 5 (3 double + 2 single) | door_3 (key_exit), door_4 (key_doorA) | door_3 | key_exit |
| Map2 | 9 (3 double + 6 single) | door_B (key_D), door_C (key_A), door_H (key_B), door_I (key_A), door_K (key_exit) | door_K | key_exit |
| Map3 | 10 (6 double + 4 single) | door_A (key_C), door_B (key_B), door_E (key_A), door_J (key_exit) | door_J | key_exit |

### Win Condition

- Map1: unlock `door_3` (requires `key_exit`) → WIN / FALSE_ENDING
- Map2: unlock `door_K` (requires `key_exit`) → WIN / TRUE_ENDING
- Map3: unlock `door_J` (requires `key_exit`) → WIN / TRUE_ENDING


## 9. Camera System (`cameraSystem.js`)

The camera uses dead-zone follow with smooth lerp, centred on the player. Dead-zone is `X = 22%` viewport width, `Y = 18%` viewport height. Smoothing factor is `0.18`, frame-rate independent: `blend = 1 − (1 − 0.18)^(dt × 60)`. Mouse wheel controls zoom; `minZoom` is computed dynamically (capped so at most 60×40 tiles are visible), `maxZoom = 2.0`. Initial zoom is `1.7` on all three maps. The camera clamps to the map edges.

Unexplored rooms are covered at `unexploredOpacity` (Map1/2: 250, Map3: 249) and fade out on entry (all maps: `1000 ms`).


## 10. Audio System

BGM switches automatically based on screen state and levelId. SFX list: `treasure` (chest open), `lightSwitch`, `doorOpen` / `doorClose`, `doorLocked`, `cursor` / `select` (menus), `running` (sprint loop), `alert` (NPC enters chase), `portal` / `teleportIn` / `teleportOut`. The `running` loop only plays while the player is moving, sprinting, and has stamina left.


## Architecture Overview

```
GameCore (gameCore.js)
├── InputSystem (inputSystem.js)        — keyboard input
├── AudioSystem (audioSystem.js)        — audio management
├── ScreenOverlaySystem                 — screen management & UI
├── Camera (cameraSystem.js)            — camera follow & zoom
└── Level (mapFactory.js)               — runtime level
    ├── Player (Player.js)              — player entity
    │   └── playerSystem.js             — movement, stamina, footprints
    ├── NPC[] (NPC.js)                  — NPC entities
    │   ├── npcSystem.js                — vision, alerting, state dispatch
    │   ├── npcStateMachine.js          — state transition logic
    │   └── npcTrackerSystem.js         — tracking & obstacle avoidance
    │       └── pathfindingSystem.js    — A* pathfinding
    ├── DoorSystem (doorSystem.js)      — door state & animation
    ├── BoxSystem (boxSystem.js)        — chests
    ├── RoomSystem (roomSystem.js)      — room lighting & fog
    ├── MissionSystem (missionSystem.js)— objectives & exit
    ├── PortalSystem (portalSystem.js)  — portals
    └── collisionSystem.js              — tile collision & line of sight
```
