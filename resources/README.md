Non-runtime assets live here.

Nothing in `resources/` should be required for the shipped game to boot or run. This folder is for materials we keep for editing, reference, or project history after the
runtime copy has been separated into `docs/assets/`.

Current non-runtime structure:
- `source-art` for editable originals, raw source files, and reference material that may
  still be useful when updating live assets.
- `unused-assets` for assets that are not currently loaded by the game, but are being kept
  in case we want to revisit or repurpose them later.
- `archive` for historical, replaced, or superseded files we want to retain as record.

Practical rules:
- If the game loads it from `docs/`, it belongs in `docs/assets`, not here.
- If we still edit from it, keep it in `source-art`.
- If it is not in use but still potentially useful, keep it in `unused-assets`.
- If it is an old version we are keeping mainly for history, keep it in `archive`.

Examples in this repo:
- `source-art` includes original drawings, editable art files, and source audio.
- `unused-assets` includes retired NPC/player variants, older sprite experiments, and
  unused tileset images.
- `archive` includes `historical_versions`, old cutscene exports, and earlier storyboard rounds.
