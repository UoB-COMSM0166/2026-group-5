# Game Testing Final Report

This final report summarises the completed testing work for the current game build. The detailed row-by-row results are kept in `general_test_table.xlsx` and `npc_ep_test_cases.xlsx`.

## Executive Summary

Testing is complete for the current build.

| Area | Result |
|---|---:|
| Total test cases executed | 78 |
| Total test cases passed | 78 |
| Total failed / blocked / not tested | 0 |
| General test cases executed | 71 |
| General test cases passed | 71 |
| Bugs logged | 2 |
| Bugs closed | 2 |
| Open bugs | 0 |
| NPC EP test cases executed | 7 |
| NPC EP test cases passed | 7 |
| Screenshot evidence files reviewed | 15 |

The game passed all planned general feature tests and all selected NPC equivalence partitioning tests. Two defects were found during testing, both were fixed and closed. The final general test table records the latest verified behaviour as passing, while the bug log keeps the historical defect record.

## Test Sources

| File / folder | Purpose |
|---|---|
| `general_test_table.xlsx` | Main execution table for general feature, boundary, and white-box tests. |
| `npc_ep_test_cases.xlsx` | Execution table for the NPC equivalence partitioning cases. |
| `npc_ep_report.md` | Detailed NPC EP analysis and case results. |
| `evidences/` | Screenshot evidence for EP and white-box checks. |

## Test Environment

| Item | Value |
|---|---|
| Main browser | Google Chrome |
| Execution contexts | Live Server and GitHub Pages |
| Testing period | 2026-03-17 to 2026-04-19 |
| Main evidence types | Spreadsheet results, bug log entries, browser screenshots, console output screenshots |

Testing focused on the current browser build of the game. Live Server was used for local testing, while GitHub Pages was used to verify hosted deployment behaviour.

## Testing Methodology

We used four testing methods for this build.

**Black-box testing** was used for player-visible behaviour. This covered launch flow, screen transitions, gameplay rendering, controls, audio, interactions, objectives, endings, deployment, and game-state flow.

**Boundary-value testing** was used for edge cases. These included first input, rapid input, small and large browser windows, loading delay, hold thresholds, and repeated door interaction.

**White-box testing** was used for selected internal logic. These tests checked state routing, audio sync, layout helpers, overlay rendering guards, interaction prompt priority, door state transitions, mission unlock logic, and input reset behaviour.

**Equivalence partitioning** was used for NPC status transitions. NPC state behaviour was divided into representative classes based on current NPC state, player visibility, alert level, and trigger/completion condition.

## Testing Progress

### Onsite First Session

The completed first-session tests covered basic features such as initial loading, start-screen behaviour, intro progression, gameplay rendering, movement input, lose condition, restart / return flow, start audio, first Enter input, and rapid Enter input.

- Total tracked test cases: 22
- Executed test cases: 11
- Passed: 10
- Failed: 1
- Not tested yet: 11
- Open bugs: 1

The main first-session issue was `B01`, a high-severity screen-scaling defect where important UI elements did not remain visible or aligned after browser resizing.

### Offsite Progress

By the end of the final testing session:

- The general test table expanded from 22 to 71 cases.
- Executed general cases increased from 11 to 71.
- Passed general cases increased from 10 to 71.
- Not-tested general cases reduced from 11 to 0.
- Open bugs reduced from 1 to 0.
- The formal NPC equivalence partitioning section was completed with 7/7 cases passed.

The previously failed rows were retested after fixes and now pass in the general table. The bug table preserves the historical defect record, while the general table reflects the latest verified behaviour.

## Coverage Summary

The testing set contains **71 general test cases** in `general_test_table.xlsx` and **7 NPC equivalence partitioning test cases** in `npc_ep_test_cases.xlsx`. This gives **78 executed test cases in total**.

### Coverage By Area

| Area | Cases | Result |
|---|---:|---|
| Core Game Flow | 27 | Passed |
| Player Interaction Systems | 24 | Passed |
| NPC Status Transitions (EP) | 7 | Passed |
| Rendering, UI, and Audio | 10 | Passed |
| Internal Logic | 6 | Passed |
| Deployment and Platform Behaviour | 4 | Passed |
| **Overall test total** | **78** | **Passed** |

### Coverage By Technique

| Technique | Cases | Result |
|---|---:|---|
| Black-box | 51 | Passed |
| Boundary Value | 10 | Passed |
| White-box | 10 | Passed |
| Equivalence Partitioning | 7 | Passed |
| **Overall test total** | **78** | **Passed** |

## Defects Found And Fixed

Two defects were recorded during testing.

| Bug ID | Description | Severity | Status | Open date | Close date | Fix / owner |
|---|---|---|---|---|---|---|
| B01 | UI scaling failed when the browser window was resized. Important elements did not remain visible or aligned. | High | Closed | 2026-03-17 | 2026-04-09 | Jinni Li |
| B02 | Pressing `E` at the end of the story-mode tutorial returned the player to the start page. | High | Closed | 2026-04-16 | 2026-04-17 | Yan Cui |

Both affected test rows now show `Pass`, with the bug table preserving the historical failure details.

## Equivalence Partitioning Report

Our selected EP feature is **NPC status transitions**.

This feature was chosen because NPC behaviour has a clear state model. NPCs can be in `PATROL`, `SEARCH`, or `CHASE`, and transitions depend on player visibility, alert level, and trigger/completion conditions.

### EP Classes

| Category | Description | Condition / values | Notes / constraints |
|---|---|---|---|
| A | NPC state before update | `A1 = PATROL`, `A2 = SEARCH`, `A3 = CHASE` | Main state partition from `npcStateMachine.js`. |
| B | Player visibility | `B1 = player visible`, `B2 = player not visible` | Visibility affects alert growth and chase transitions. |
| C | Alert level band | `C1 = below 10`, `C2 = 10 to below 20`, `C3 = 20 or above` | Based on `ALERT_SEARCH_THRESHOLD` and `ALERT_CHASE_THRESHOLD`. |
| D | Extra trigger / completion condition | `D1 = none`, `D2 = environmental search trigger`, `D3 = search finished`, `D4 = not applicable` | `D2` means light / footstep / open-door investigation. |

The naive combination space is:

`|T| = |A| x |B| x |C| x |D| = 3 x 2 x 3 x 4 = 72`

After applying validity constraints, seven representative behaviour classes were selected for testing.

### EP Result Summary

| ID | Representative partition | Expected behaviour | Result |
|---|---|---|---|
| EPN01 | Patrol with no stimulus | NPC remains in `PATROL`. | Passed |
| EPN02 | Patrol with environmental trigger | NPC enters `SEARCH`. | Passed |
| EPN03 | Brief visibility below chase threshold | Alert rises, but NPC does not enter `CHASE`. | Passed |
| EPN04 | Visible player with chase-level alert | NPC enters `CHASE`. | Passed |
| EPN05 | Chase after sight loss while alert remains high | NPC remains in `CHASE` briefly. | Passed |
| EPN06 | Chase after alert decays | NPC drops from `CHASE` to `SEARCH`. | Passed |
| EPN07 | Search completes when the player is not detected again | NPC returns from `SEARCH` to `PATROL`. | Passed |

## Evidence Summary

Screenshot evidence is stored in `evidences/`.

### EP Evidence

| Evidence | Supports |
|---|---|
| `evidences/ep/epn01.png` | Patrol baseline with no stimulus. |
| `evidences/ep/epn02-1.png` | Light-triggered search. |
| `evidences/ep/epn02-2.png` | Footstep-triggered search. |
| `evidences/ep/epn03.png` | Alert below chase threshold. |
| `evidences/ep/epn04.png` | Chase entry after alert reaches threshold. |
| `evidences/ep/epn05_epn06.png` | Chase persistence and chase-to-search transition. |
| `evidences/ep/epn07.png` | Search completion and return to patrol. |

### White-Box Evidence

| Evidence | Supports |
|---|---|
| `evidences/wt/wt01_wt02.png` | State-change and screen-routing checks. |
| `evidences/wt/wt03_wt04.png` | Audio stop/start logic and track mapping. |
| `evidences/wt/wt05.png` | Layout helper values. |
| `evidences/wt/wt06.png` | Overlay draw conditions. |
| `evidences/wt/wt07.png` | Interaction prompt priority. |
| `evidences/wt/wt08.png` | Door state transitions and cooldown handling. |
| `evidences/wt/wt09.png` | Mission unlock and objective text update. |
| `evidences/wt/wt10.png` | Input resolution, one-shot interaction, and reset handling. |


## Conclusion

The current build passed all planned testing recorded in the project testing documentation. The final result is 78/78 total test cases passed, 0 failed or blocked cases, and 0 open bugs.

Based on the completed test tables, the build passed the planned general tests and NPC EP tests. The two defects found during testing were fixed and closed, so there are no open testing issues left for this build.
