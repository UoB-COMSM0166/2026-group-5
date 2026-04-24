Runtime assets for the shipped game live here.

Use this folder only for files that the live game or public site loads from `docs/`.
If a file is source material, no longer used, or kept only for history, move it to
`resources/` instead.

Current runtime structure:
- `audio/music/maps` for gameplay and per-map background tracks.
- `audio/music/screens` for menu, intro, lose, and ending music.
- `audio/sfx` for one-shot and looping sound effects.
- `images/characters` for live player and NPC sprite sets, plus fallback character art.
- `images/interactives` for buttons, chests, doors, pickups, portals, and similar object art.
- `images/screens` for start, lose, and tutorial screen assets.
- `images/cutscenes` for intro and ending cutscene assets.
- `images/ui` for HUD and control reference graphics.
- `tilesets/decor` for decorative map tiles such as neon and symbol pieces.
- `tilesets/environment` for floor, wall, and window map tiles.
- `tilesets/furniture` for shelves, tables, sofas, cabinets, and other furniture tiles.
- `tilesets/interactives` for the small number of interactive pieces still painted through the tilemap.

Organization rules:
- Group assets by runtime purpose, not by where they originally came from.
- Keep only the assets that are actually shipped and referenced by runtime code.
- When in doubt, ask: "Does the game load this from `docs/` today?" If not, it should not live here.
