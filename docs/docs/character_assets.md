
# Character asset naming guide

The game-v7 renderer now supports a formal character directory structure.

## Root
`assets/images/characters/{character}/{variant}/`

Examples:
- `assets/images/characters/player/default/`
- `assets/images/characters/player/stealth/`
- `assets/images/characters/npc/patrol/`
- `assets/images/characters/npc/search/`
- `assets/images/characters/npc/chase/`

## Supported animation modes
- `idle`
- `walk`
- `interact`
- `alert`

## Preferred format
4x4 sprite sheets:
- `idle_sheet.png`
- `walk_sheet.png`
- `interact_sheet.png`
- `alert_sheet.png`

Rows are ordered as:
1. down
2. left
3. right
4. up

Columns are frame indices 0-3.

## Alternate format
Directional loose files are also supported:
- `idle_down.png`
- `idle_left.png`
- `idle_right.png`
- `idle_up.png`
- `walk_down.png`
- ...

## Resolution fallback order
1. formal character sheet
2. formal directional file
3. legacy sheet in `assets/images/sprites/`
4. legacy single sprite in `assets/images/sprites/`
5. code fallback rectangle
