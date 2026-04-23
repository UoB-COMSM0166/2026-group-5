# Game Testing Final Report

This final report summarises the completed testing work for the current game build. Detailed row-by-row execution results are recorded in `general_test_table.xlsx` and `npc_ep_test_cases.xlsx`.

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

The game passed all planned general feature tests and all selected NPC equivalence partitioning tests. Two defects were found during testing, both were fixed and closed. The final general test table records the latest verified behaviour as passing, while the bug log preserves the historical defect record.

## Test Sources

| File / folder | Purpose |
|---|---|
| `general_test_table.xlsx` | Main execution table for general feature, boundary, and white-box tests |
| `npc_ep_test_cases.xlsx` | Execution table for NPC equivalence partitioning cases |
| `npc_ep_report.md` | Detailed NPC EP analysis and case results |
| `evidences/` | Screenshot evidence for EP and white-box checks |

## Test Environment

| Item | Value |
|---|---|
| Main browser | Google Chrome |
| Execution contexts | Live Server and GitHub Pages |
| Testing period | 2026-03-17 to 2026-04-19 |
| Main evidence types | Spreadsheet results, bug log entries, browser screenshots, console output screenshots |

Testing focused on the current browser build of the game. Live Server was used for local testing, while GitHub Pages was used to verify hosted deployment behaviour.

## Testing Methodology

We used two main testing approaches for this build: black-box testing and white-box testing.

**Black-box testing** was used to verify player-visible behaviour. This included launch flow, screen transitions, gameplay rendering, controls, audio, interactions, objectives, endings, deployment, and overall game-state flow. Within this approach, two specific methods were applied:

- **Boundary Value Analysis (BVA)** was used for cases around important gameplay and interface boundaries, such as first input, rapid repeated input, small and large browser windows, loading delay, hold thresholds, and repeated door interaction.
- **Equivalence Partitioning (EP)** was used for NPC status transitions by grouping behaviour into representative classes based on NPC state, player visibility, alert level, and trigger or completion conditions.

**White-box testing** was used to verify selected internal game logic directly. Through console-based execution and module inspection, the team checked internal states, functions, and decision paths that could not be fully confirmed through normal gameplay observation alone. These tests covered screen routing, audio selection, layout calculations, overlay conditions, interaction priority, door state changes, mission unlock logic, and input reset behaviour.

## Test Design Overview

The test set was designed to cover the main playable flow of the game, including progression, interaction, rendering, audio, deployment, and NPC behaviour. In addition to general functional testing, boundary cases were selected where behaviour could change at important input or interface limits, while representative equivalence classes were chosen for NPC state transitions. Selected internal logic was also checked directly where visible gameplay observation alone was not sufficient for reliable verification.

## Testing Progress

### Onsite First Session

The completed first-session tests covered initial loading, start-screen behaviour, intro progression, gameplay rendering, movement input, lose condition, restart / return flow, start audio, first Enter input, and rapid Enter input.

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

The testing set contains **71 general test cases** in `general_test_table.xlsx` and **7 NPC equivalence partitioning test cases** in `npc_ep_test_cases.xlsx`, giving **78 executed test cases in total**.

Together, these results show that the test set covered the main gameplay flow, key interaction systems, representative NPC behaviour, selected internal logic, and hosted build verification within the defined project scope.

### Coverage by Area

| Area | Cases | Result |
|---|---:|---|
| Core Game Flow | 27 | Passed |
| Player Interaction Systems | 24 | Passed |
| NPC Status Transitions (EP) | 7 | Passed |
| Rendering, UI, and Audio | 10 | Passed |
| Selected Internal Logic Areas | 6 | Passed |
| Deployment and Platform Behaviour | 4 | Passed |
| **Overall test total** | **78** | **Passed** |

### Coverage by Testing Approach and Technique

| Approach | Technique | Cases | Result |
|---|---|---:|---|
| Black-box | General functional testing | 51 | Passed |
| Black-box | Boundary Value Analysis (BVA) | 10 | Passed |
| Black-box | Equivalence Partitioning (EP) | 7 | Passed |
| White-box | Targeted internal logic and state-path verification | 10 | Passed |
| **Overall test total** |  | **78** | **Passed** |

### Requirement Verification Traceability

| Requirement / expected behaviour | Verification method | Related tests | Result |
|---|---|---|---|
| The game should launch and enter the correct initial flow | Black-box functional testing | BT01, BT02, BT03, BT16, BT17, BT20 | Passed |
| The story tutorial should progress and exit correctly | Black-box functional testing, BVA, defect retest | BT04, BT18, BT19, BT24, BT25, BT26, BT27, BT28, BV06, BV07, B02 | Passed |
| Core gameplay rendering and movement should respond correctly to player input | Black-box functional testing | BT05, BT06, BT41, BT43, BT44 | Passed |
| The portal system should place and transfer the player correctly between linked locations | Black-box functional testing | BT45, BT46, BT47, BT48, BT49, BT50, BT51, BT52, BT53 | Passed |
| Doors, chests, lights, notes, and extraction should respond correctly to interaction rules | Black-box functional testing, BVA, white-box | BT29, BT30, BT31, BT32, BT33, BT34, BT35, BT36, BT37, BT38, BV04, BV08, WT08, WT09 | Passed |
| NPCs should transition correctly between `PATROL`, `SEARCH`, and `CHASE` under representative conditions | Equivalence Partitioning, black-box support cases | EPN01–EPN07, BT39, BT40 | Passed |
| Overlays and pause-related behaviour should appear only under the correct conditions | Black-box functional testing, white-box | BT21, BT22, BT23, WT06 | Passed |
| The correct audio behaviour should be applied for the current screen or gameplay state | Black-box functional testing, white-box | BT11, BT12, WT03, WT04 | Passed |
| Mission progress and objective text should update when unlock conditions are met | Black-box functional testing, white-box | BT37, BT38, WT09 | Passed |
| Hosted deployment behaviour should match the tested build expectations | Black-box functional testing, BVA | BT01, BT14, BT15, BV05 | Passed |
| Selected internal logic should behave correctly under direct verification | White-box testing | WT01, WT02, WT05, WT06, WT07, WT10 | Passed |

This traceability mapping links each major tested requirement area to the corresponding verification method and executed test cases. It therefore shows not only which parts of the game were tested, but also how different methods were used to confirm visible behaviour, boundary conditions, representative NPC state classes, and selected internal control logic.

The coverage results show that the test set exercised the main gameplay flow, key player interactions, representative NPC state transitions, and selected internal logic. This supports confidence in the tested build for normal progression, common interactions, and the internal behaviours covered by the chosen tests. Confidence is strongest within the tested browser environment and selected scenarios, rather than across all possible execution contexts or play conditions.

## Defects Found and Fixed

Two defects were recorded during testing.

| Bug ID | Description | Severity | Status | Open date | Close date | Fix / owner |
|---|---|---|---|---|---|---|
| B01 | UI scaling failed when the browser window was resized. Important elements did not remain visible or aligned. | High | Closed | 2026-03-17 | 2026-04-09 | Jinni Li |
| B02 | Pressing `E` at the end of the story-mode tutorial returned the player to the start page. | High | Closed | 2026-04-16 | 2026-04-17 | Yan Cui |

### Retesting After Fixes

| Bug ID | Original issue | Retest focus | Final result |
|---|---|---|---|
| B01 | UI scaling failed after browser resizing, causing important elements to become misaligned or no longer fully visible | Browser-resize behaviour was tested again after the fix | Passed |
| B02 | Pressing `E` at the end of the story-mode tutorial returned the player to the start page | Tutorial completion flow was tested again after the fix | Passed |

After each fix was applied, the affected scenario was retested and the corresponding test row was updated to `Pass`.

## White-box Testing Summary

White-box coverage was organised around three main internal logic areas in the game: state and progression control, rendering and presentation control, and interaction and input handling. Within these areas, the selected tests checked representative decision points, state transitions, guard conditions, mapping logic, calculation logic, priority rules, and reset behaviour. This gives structured coverage of key subsystems without claiming full branch or path coverage across the whole codebase.

| WT ID | Internal area | Logic type | Internal logic checked |
|---|---|---|---|
| WT01–WT02 | State and progression control | State-transition logic | Screen routing and state transitions |
| WT03–WT04 | Rendering and presentation control | Mapping logic | Audio stop/start logic and track mapping |
| WT05 | Rendering and presentation control | Calculation logic | Layout helper values and calculations |
| WT06 | Rendering and presentation control | Guard logic | Overlay draw conditions |
| WT07 | Interaction and input handling | Priority logic | Interaction prompt priority |
| WT08 | State and progression control | State-transition and guard logic | Door state transitions and cooldown handling |
| WT09 | State and progression control | State-transition logic | Mission unlock logic and objective text updates |
| WT10 | Interaction and input handling | Reset and consumption logic | Input resolution, one-shot interaction handling, and reset behaviour |

Taken together, these checks cover the main logic categories that support progression, presentation, and interaction. However, the white-box phase was targeted rather than exhaustive, so it supports confidence in selected key subsystems rather than full coverage of all internal branches and paths.

## Equivalence Partitioning Summary

Our selected EP feature is **NPC status transitions**.

This feature was chosen because NPC behaviour has a clear state model. NPCs can be in `PATROL`, `SEARCH`, or `CHASE`, and transitions depend on player visibility, alert level, and trigger or completion conditions.

### EP Classes

| Category | Description | Condition / values | Notes / constraints |
|---|---|---|---|
| A | NPC state before update | `A1 = PATROL`, `A2 = SEARCH`, `A3 = CHASE` | Main state partition from `npcStateMachine.js` |
| B | Player visibility | `B1 = player visible`, `B2 = player not visible` | Visibility affects alert growth and chase transitions |
| C | Alert level band | `C1 = below 10`, `C2 = 10 to below 20`, `C3 = 20 or above` | Based on `ALERT_SEARCH_THRESHOLD` and `ALERT_CHASE_THRESHOLD` |
| D | Extra trigger / completion condition | `D1 = none`, `D2 = environmental search trigger`, `D3 = search finished`, `D4 = not applicable` | `D2` means light / footstep / open-door investigation |

The naive combination space is:

`|T| = |A| x |B| x |C| x |D| = 3 x 2 x 3 x 4 = 72`

After applying validity constraints, seven representative behaviour classes were selected for testing.

### EP Result Summary

| ID | Representative partition | Expected behaviour | Result |
|---|---|---|---|
| EPN01 | Patrol with no stimulus | NPC remains in `PATROL` | Passed |
| EPN02 | Patrol with environmental trigger | NPC enters `SEARCH` | Passed |
| EPN03 | Brief visibility below chase threshold | Alert rises, but NPC does not enter `CHASE` | Passed |
| EPN04 | Visible player with chase-level alert | NPC enters `CHASE` | Passed |
| EPN05 | Chase after sight loss while alert remains high | NPC remains in `CHASE` briefly | Passed |
| EPN06 | Chase after alert decays | NPC drops from `CHASE` to `SEARCH` | Passed |
| EPN07 | Search completes when the player is not detected again | NPC returns from `SEARCH` to `PATROL` | Passed |

These results support the conclusion that the main observable NPC behaviour classes were handled correctly in the tested build. The EP set is representative rather than exhaustive, so it supports the correctness of key state-transition patterns rather than every possible runtime combination.

## Evidence Summary

Screenshot evidence is stored in `evidences/`.

### EP Evidence

| Evidence | Supports |
|---|---|
| `evidences/ep/epn01.png` | Patrol baseline with no stimulus |
| `evidences/ep/epn02-1.png` | Light-triggered search |
| `evidences/ep/epn02-2.png` | Footstep-triggered search |
| `evidences/ep/epn03.png` | Alert below chase threshold |
| `evidences/ep/epn04.png` | Chase entry after alert reaches threshold |
| `evidences/ep/epn05_epn06.png` | Chase persistence and chase-to-search transition |
| `evidences/ep/epn07.png` | Search completion and return to patrol |

### White-box Evidence

| Evidence | Supports |
|---|---|
| `evidences/wt/wt01_wt02.png` | State-change and screen-routing checks |
| `evidences/wt/wt03_wt04.png` | Audio stop/start logic and track mapping |
| `evidences/wt/wt05.png` | Layout helper values |
| `evidences/wt/wt06.png` | Overlay draw conditions |
| `evidences/wt/wt07.png` | Interaction prompt priority |
| `evidences/wt/wt08.png` | Door state transitions and cooldown handling |
| `evidences/wt/wt09.png` | Mission unlock and objective text updates |
| `evidences/wt/wt10.png` | Input resolution, one-shot interaction, and reset handling |

## Testing Limitations

Testing was conducted on the current browser build, primarily in Google Chrome, using Live Server and GitHub Pages. The results therefore reflect the tested implementation and environment within the defined project scope, rather than all possible browsers, platforms, or play conditions. Although all planned tests passed, some residual risk remains outside the tested scope, particularly in untested browsers, broader device and display combinations, and gameplay situations not explicitly represented in the selected test set.

## Conclusion

The current build passed all planned tests recorded in the project testing documentation. The final result was 78/78 test cases passed, with both identified defects fixed and closed following retesting. Based on the completed test tables, bug records, and supporting evidence, these results provide strong confidence in the correctness of the tested gameplay flows, NPC behaviour, and selected internal logic within the defined test scope.

The combined use of black-box testing, including BVA and EP, together with structured targeted white-box checks, provided complementary evidence for both visible gameplay behaviour and key internal logic across the tested build.

Overall, the evidence suggests that the build behaved reliably within the tested scope, although untested environments and unrepresented scenarios may still contain defects.