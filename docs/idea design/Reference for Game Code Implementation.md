# Final Reference for Game Code Implementation

> The following describes the concrete features that need to be implemented for the game demo code blocks. After tasks are assigned to individuals, each person should add details for their own module and coordinate interfaces with other teammates as needed. The details in this document are for reference only. When actually coding, you can read papers and open‑source game code, then adjust features or parameters and sync progress after adjustments.

---

## Outline

1. Overview: Map and character sizes  
2. GameLoop  
3. Player  
4. NPC (Guards)  
5. Map  
6. Stealth System  

---

## 0. Map and Character Sizes

- The map is roughly 40×24 tiles, each tile is 16×16 pixels.  
- The player and NPC sprites are 1.5 tiles tall, with the bottom 1 tile as the **collision area**, and collision is calculated on that bottom tile only.

---

## 1. GameLoop

- Input reading + event dispatch.[^1]

- Difficulties:  
  1. Per‑frame order: **Input → Update → Rules → Render**.  
  2. The exact order of reading and updating map, NPC, and player state each frame needs to be discussed with people working on other parts, and decided based on the concrete execution logic.

- Time control interfaces:  
  - Pause (Pause: updates stop but the UI is still displayed).[^3][^1]  
  - Time‑scale (adjustable time scale for slow motion / debugging).[^1]

---

## 2. Player

- Movement: **See video1 for example.** Use WASD to walk and hold Shift to sprint. Walking and sprinting speeds are configurable (each walk step is 8 pixels, sprint is 16 pixels). While sprinting, the 3×3 tiles around the player are the footstep sound range, shown with a yellow light overlay as feedback. Each triggered tile should remain highlighted for at least 1 second. This sound area can pass through walls/doors and ignores all obstacles. If it overlaps an NPC’s alert area, treat it as an anomaly and mark that tile with a red question‑mark tile.

- Interaction: Within interaction range, press E to interact with objects (doors, lights, exit, etc.), used for opening/closing doors, switching lights on/off, and triggering exit victory. (If we later add items, keys 1/2/3/4 on the keyboard can be used to switch active items; whether to add items depends on the demo scope.)[^2][^1]

- Camera control: *Difficult part.* **See video2 for example.** The default camera view size is fixed and does not affect player movement. It is used to observe vision and plan routes. An extra camera mode is used to view the global map.

- Example: If the overall demo map is 40×24 tiles, with 4–5 rooms, each room is on average about 10×6 tiles.

- Default camera view: The view covers 15×9 tiles, roughly 1.5 rooms, so you can see one full room and part of two neighboring rooms. The camera view size does not change. Choose one of the two options below:  
  1. Always center on the player and follow the player.  
  2. Center on the room the protagonist is currently in; within this room, the view is fixed but can see parts of adjacent rooms on all four sides, and the center room switches as the player enters different rooms.

- Extra camera view: Choose one of the two options below:  
  1. No zooming; camera view is fixed to 10×6 tiles. While holding the arrow keys, move the camera to view other rooms. Whether the game state is paused during this (for example, whether NPCs stop moving) is configurable. When the key is released, smoothly return to the default view (exact return duration to be tuned after testing).  
  2. Use only the M key to toggle a global map. When viewing the global map, all game state is paused, effectively showing a zoomed‑out map.

- Overall map visibility: Initially, only the room where the player starts is visible; other rooms are black or covered by fog. As the player opens doors to other rooms, these opened rooms become permanently visible in both the default and extra camera views.

---

## 3. NPC (Guards)

- Patrol path system: Default state.  
  - Guards patrol along predefined waypoints; a simple random‑walk variant can be added as an option.[^3][^1]

- Can open doors and turn on the light:  
  - Guards can open doors to pass through, but slower than the player; door‑opening time is controlled by a parameter (roughly 3× the player’s door‑opening time).[^3][^1]  
  - When the light in the room where an NPC is located is turned off, the NPC immediately goes to the light switch to turn the light back on.

- AI FSM states (at least include these) *Difficult part.* **See video3 for example.**[^2][^1][^3]  
  - NPC alert progress bar logic: When the player is inside the alert range, the bar increases over time; when the player leaves the range, the alert value gradually decreases. Max value is 100.

  - Patrol:  
    - Trigger condition: Default state, or when other states transition back into Patrol.  
    - Behavior: Moves along a fixed route.  
    - Alert area: Uses a level‑1 normal‑size alert zone.  
    - Notes: Lowest priority; can transition immediately to other states.

  - Investigate:  
    - Trigger condition: Only triggered by environmental anomalies while in Patrol or Investigate state. Anomalies include: light state changes in the NPC’s current room, door state changes seen within the alert area, sprint “noise” overlapping the alert area, etc.  
    - Behavior: When switching from Patrol into Investigate, alert value immediately increases by 30. When an anomaly occurs, mark the tile where it happened as an anomaly with a red question mark (noise position, or the switch positions for lights and doors), and move towards that anomaly.  
    - Alert area: If the light in the room is off, alert area shrinks to level 0. If the light is on, alert area is level 2.  
    - Notes: The priority of anomaly targets in the patrol route is sorted by anomaly occurrence time; the NPC finishes the previously planned anomaly route before switching to the next one. When reaching an anomaly tile and there is no player in the alert area, the NPC stops for 1 second at that tile to represent a “search” action, then the anomaly disappears. After switching into Chase, all anomalies created by door changes and noise disappear; only light‑off anomalies remain. When all anomalies on the map are gone, transition back to Patrol.

  - Search:  
    - Trigger condition: Only from Chase. After alert value drops below 50 and stays below for 1 second, and the NPC loses line‑of‑sight (player), enter Search state.  
    - Behavior: Searches for a few seconds near the “last known player position” (marked with a purple question‑mark tile).  
    - Alert area: If the light in the room is off, alert area shrinks to level 0. If the light is on, alert area is level 2.  
    - Notes: Can switch to Investigate or Chase at any time during Search; when switching to other states, the purple question mark disappears. After the alert bar reaches 0 and stays at 0 for 1 second, if there are no light‑off anomalies on the map, return to Patrol; if there are light‑off anomalies, switch to Investigate.

  - Chase:  
    - Trigger condition: When alert value > 50 and the player is still within the alert area, immediately switch from any other state into Chase (highest priority).  
    - Behavior: Code behavior is “follow player,” moving to actively chase the player at a higher speed (20 pixels per step). During this time, if new anomalies occur, the map only records light‑off anomalies.  
    - Alert area: If the light in the room is off, alert area shrinks to level 0. If the light is on, alert area is level 2.  
    - Notes: If the player escapes beyond the alert area and the alert value drops below 50 and stays below for 1 second, switch to Search.[^2][^1]

- Capture detection:  
  - When in Chase state, if the NPC collides/contacts with the player, trigger failure (Lose).[^1][^2]

---

## 4. Map

- Level layout:  
  - Coordinate with UI/UX owner Yawen, and build the designed map layout in code. Implement logic for win/lose, map transitions, and UI operation screens.  
  - Provide at least one handcrafted level to complete the MVP; keep interfaces for supporting map/level generation later.[^3][^1]

- Collision system:  
  - Tile‑based collision. Player and guards cannot pass through walls or non‑walkable tiles.[^3][^1]

- Interactive objects:  
  - Doors: Three states — open, closed, locked — affecting passability and line‑of‑sight blocking.  
  - Lights and switches (affect NPC alert area size, room brightness, and can trigger Investigate).  
  - Exit (press E to trigger victory).[^2][^1][^3]

- Items and golds:  
  - Items and gold can be placed on the map as optional extensions (e.g., lures/invisibility items), or neutral NPCs can be added as shops, but these are not required for the core stealth loop.[^1][^3]

---

## 5. Stealth System

- Vision / visibility:  
  - Guards have an alert range. The vision can be a cone (sector) or a rectangular region in front of the NPC, depending on implementation difficulty, and changes with their alert state.[^2][^3][^1]

- Line‑of‑sight occlusion **(see video4 for example):**  
  - Walls/obstacles block vision. When the player is behind such cover, the guard cannot keep increasing alert value through that occluder.[^3][^1][^2]

- Detection / alert:  
  - Each guard has a local alert value (e.g., 0–100). When the player is inside vision and not occluded, alert increases over time. After losing sight, alert can decrease or transition to Search.[^1][^2][^3]  
  - Optional: a global alert level (0–5, etc.) aggregating the states of multiple guards. At high global alert, guards become more sensitive / search longer.[^2][^3][^1]

- Environmental anomaly handling:  
  - Door and light state changes within a certain range can trigger guards to enter Investigate and move toward the anomaly position.[^3][^1]  
  - Sprinting and similar actions can be simulated as numerical “noise radius,” increasing nearby guards’ alert values without needing a realistic audio system.[^1]


