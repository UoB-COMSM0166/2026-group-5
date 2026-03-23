# Game Testing Plan and Test Cases

## Testing approach

The testing documentation has two layers. First, a general test table is used to cover the core features of the game and verify that the current build behaves as expected across the core features of the game. Second, a separate equivalence partitioning section is used for one specific feature in more detail, so that the formal workshop method is demonstrated without overloading the main table.

### General test table includes:

- **Black-box testing:** validate what the player sees and experiences, such as screen flow, controls, rendering, audio, and deployment behaviour.
- **Boundary-value testing:** check edge cases such as first key presses, small and large window sizes, rapid input, and initial asset loading.
- **White-box testing:** cover a few internal logic areas such as state transitions, audio switching, and layout helper functions.
- **Compatibility checks:** test the game in Live Server and GitHub Pages, and note any limitations when opening files directly.

## Equivalence partitioning

Equivalence partitioning: group similar inputs, states, window sizes, and execution contexts into representative classes so that one or two tests can stand in for a wider set of similar cases.

This approach is part of the black-box testing strategy, but in this template it is documented in a separate subsection rather than repeated in every row of the main test table in order to better align the documentation with the lecturer’s requirements.

## The workflow

1. Decide on one functional unit of the game to test with black-box testing.
2. Identify categories of inputs or, if there are no direct inputs, categories of behaviour.
3. Identify constraints across categories, including impossible or dependent combinations.
4. Define test cases with inputs, expected outputs, and observed outputs.

**Feature selected:** to be chosen between [NPC status transitions, room visibility, portals, etc.]

## EP structure

| Category | Description | Condition / values | Notes / constraints |
|---|---|---|---|
| A | Partition 1 |  |  |
| B | Partition 2 |  |  |
| C | Partition 3 |  |  |
| D | Partition 4 |  |  |

## Combining categories to generate tests

Let A = {a0, a1, ...} represent category A:  
Let B = {b0, b1, ...} represent category B:  
Let C = {c0, c1, ...} represent category C:  
Let D = {d0, d1, ...} represent category D:  

**Test space:** T = A x B x C x D

**Valid combinations:**

**Number of combinations:** |T| = |A| x |B| x |C| x |D| =

**Representative tuple example:** (__, __, __, __)

**Expected output / behaviour for that tuple:**

**Observed output (after execution):**

## Test environment

**Main browser:** Google Chrome  
**Execution context:** Live Server & GitHub Pages  
**Date tested:**

## General test case table (To be expanded)

**Status values:** Pass, Fail, Blocked, Not Tested.

| ID | Feature | Technique | Partition / case class | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| BT01 | Initial load | Black-box | Execution context: Live Server | 1. Open the game in Live Server.<br>2. Wait for loading to finish. | Start screen appears; no black screen; no critical console errors. |  |  |  |
| BT02 | Start screen assets | Black-box | Start state / visible assets | 1. Open the game.<br>2. Observe the start screen. | Background, title, text, fonts, and menu elements are visible and aligned. |  |  |  |
| BT03 | Start screen input | Black-box | Enter key in start state | 1. Open the start screen.<br>2. Press Enter. | The correct transition to the next state happens. |  |  |  |
| BT04 | Intro progression | Boundary value | Enter key in intro state | 1. Reach the intro.<br>2. Press Enter once.<br>3. Press Enter again. | First press completes or speeds up the text; second press enters gameplay. |  |  |  |
| BT05 | Gameplay render | Black-box | Playing state render | 1. Start the game.<br>2. Observe the main canvas. | Gameplay is visible; map renders; canvas is not black. |  |  |  |
| BT06 | Movement input | Black-box | Valid movement input | 1. Enter gameplay.<br>2. Use movement keys. | Player movement responds correctly; no unexpected input lock. |  |  |  |
| BT07 | Win condition | Black-box | Win state | 1. Play until the win condition is met. | Win screen appears correctly and the game does not crash. |  |  |  |
| BT08 | Lose condition | Black-box | Lose state | 1. Play until the lose condition is met. | Lose screen appears correctly and the game does not crash. |  |  |  |
| BT09 | Restart / return flow | Black-box | End-state restart / return | 1. Reach win or lose.<br>2. Trigger restart or return action. | Game returns to the correct state without getting stuck. |  |  |  |
| BT10 | Start audio | Black-box | Audio in start state | 1. Open the game.<br>2. Interact if required by browser audio policy. | Start music plays when expected and does not duplicate. |  |  |  |
| BT11 | Audio transition | Black-box | Audio across state change | 1. Move from start screen to intro or playing. | Previous track stops and the next state audio behaves correctly. |  |  |  |
| BT12 | Screen scaling | Black-box | Window sizes: small / medium / large | 1. Resize the browser window smaller and larger. | UI scales correctly; important elements remain visible. |  |  |  |
| BT13 | GitHub Pages deployment | Black-box | Execution context: GitHub Pages | 1. Open the deployed version in GitHub Pages. | Game loads correctly; assets, fonts, and audio behave as expected or are documented. |  |  |  |
| BV01 | First Enter press | Boundary value | First Enter press | 1. Open the intro.<br>2. Press Enter once. | It does not skip more than intended on the first press. |  |  |  |
| BV02 | Very small window | Boundary value | Very small window | 1. Reduce the browser window a lot. | UI remains usable or the limitation is recorded. |  |  |  |
| BV03 | Very large window | Boundary value | Very large window | 1. Maximise the browser window. | Overlays, text, and images keep a sensible layout. |  |  |  |
| BV04 | Rapid key presses | Boundary value | Rapid repeated Enter input | 1. Press Enter repeatedly during transitions. | The flow does not break and states do not skip unexpectedly. |  |  |  |
| BV05 | Asset loading delay | Boundary value | Initial asset loading | 1. Observe the first seconds after opening the game. | Slow-loading assets do not break the screen; fallbacks work if used. |  |  |  |
| WT01 | setGameState logic | White-box | State transition logic | Call or trace setGameState with valid transitions. | State value changes to the correct target. |  |  |  |
| WT02 | Audio stop/start logic | White-box | Audio switch logic | Trigger a state change that switches music. | Previous audio stops before or when new audio starts. |  |  |  |
| WT03 | Layout helper values | White-box | Layout helper outputs | Run layout or scaling helper functions with different sizes. | Returned values are valid and proportional. |  |  |  |
| WT04 | Overlay draw conditions | White-box | Overlay render guard | Trace overlay rendering for different states. | Only the overlay for the active state is drawn. |  |  |  |

## Bug log template

One row per defect and keep the reproduction steps specific.

| Bug ID | Description | Steps to reproduce | Severity | Status | Fix / owner |
|---|---|---|---|---|---|
| B01 |  |  | High / Medium / Low |  |  |
| B02 |  |  | High / Medium / Low |  |  |
| B03 |  |  | High / Medium / Low |  |  |
| B04 |  |  | High / Medium / Low |  |  |

## Final testing summary

**Total test cases executed:**  
**Passed:**  
**Failed:**  
**Blocked / not tested:**  
**Main issues found:**  
**Main fixes applied:**  
**Remaining limitations:**

## Report

Our testing approach combined mainly black-box testing with a small amount of white-box testing. Black-box testing was used to validate visible behaviour such as screen transitions, gameplay rendering, controls, audio behaviour, and deployment compatibility. Equivalence partitioning was included as a separate formal section in order to analyse one selected feature in more detail once that feature is confirmed by the team. White-box testing was applied to selected internal logic such as state transitions and helper functions. Boundary cases were also considered, since edge cases are a common source of faults.

[…]