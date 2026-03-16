# Game Testing Plan and Test Cases

Same file in docx version: `game_testing_template.docx`

## Testing approach

### Black-box testing
Validate what the player sees and experiences, such as screen flow, controls, rendering, audio, and deployment behaviour.

### Boundary-value testing
Check edge cases such as first key presses, small and large window sizes, rapid input, and initial asset loading.

### White-box testing
Cover a few internal logic areas such as state transitions, audio switching, and layout helper functions.

### Compatibility checks
Test the game in Live Server and GitHub Pages, and note any limitations when opening files directly.

## Equivalence partitioning

Equivalence partitioning: group similar inputs, states, window sizes, and execution contexts into representative classes so that one or two tests can stand in for a wider set of similar cases.

Typical partitions for this game include:
- Game states: start, intro, playing, win, lose
- Input categories: valid movement key, Enter, invalid key, rapid repeated input
- Window sizes: small, medium, large
- Execution contexts: Live Server, GitHub Pages

This follows the course material on black-box testing and equivalence partitioning: identify the interface, define value categories or partitions, and then select representative test cases from each partition, with extra attention to boundary cases.

## Test environment

- **Main browser:** Google Chrome
- **Other browsers:** Microsoft Edge, Firefox
- **Execution context:** Live Server & GitHub Pages
- **Date tested:**

## Test case table

Status values: Pass, Fail, Blocked, Not tested.

| ID | Feature | Technique | Partition / case class | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| BT01 | Initial load | Black-box + EP | Execution context: Live Server | 1. Open the game in Live Server.<br>2. Wait for loading to finish. | Start screen appears; no black screen; no critical console errors. |  |  |  |
| BT02 | Start screen assets | Black-box + EP | Start state / visible assets | 1. Open the game.<br>2. Observe the start screen. | Background, title, text, fonts, and menu elements are visible and aligned. |  |  |  |
| BT03 | Start screen input | Black-box + EP | Enter key in start state | 1. Open the start screen.<br>2. Press Enter. | The correct transition to the next state happens. |  |  |  |
| BT04 | Intro progression | Black-box + EP + boundary | Enter key in intro state | 1. Reach the intro.<br>2. Press Enter once.<br>3. Press Enter again. | First press completes or speeds up the text; second press enters gameplay. |  |  |  |
| BT05 | Gameplay render | Black-box + EP | Playing state render | 1. Start the game.<br>2. Observe the main canvas. | Gameplay is visible; map renders; canvas is not black. |  |  |  |
| BT06 | Movement input | Black-box + EP | Valid movement input | 1. Enter gameplay.<br>2. Use movement keys. | Player movement responds correctly; no unexpected input lock. |  |  |  |
| BT07 | Win condition | Black-box + EP | Win state | 1. Play until the win condition is met. | Win screen appears correctly and the game does not crash. |  |  |  |
| BT08 | Lose condition | Black-box + EP | Lose state | 1. Play until the lose condition is met. | Lose screen appears correctly and the game does not crash. |  |  |  |
| BT09 | Restart / return flow | Black-box + EP | End-state restart / return | 1. Reach win or lose.<br>2. Trigger restart or return action. | Game returns to the correct state without getting stuck. |  |  |  |
| BT10 | Start audio | Black-box + EP | Audio in start state | 1. Open the game.<br>2. Interact if required by browser audio policy. | Start music plays when expected and does not duplicate. |  |  |  |
| BT11 | Audio transition | Black-box + EP + boundary | Audio across state change | 1. Move from start screen to intro or playing. | Previous track stops and the next state audio behaves correctly. |  |  |  |
| BT12 | Screen scaling | Black-box + EP + boundary | Window sizes: small / medium / large | 1. Resize the browser window smaller and larger. | UI scales correctly; important elements remain visible. |  |  |  |
| BT13 | GitHub Pages deployment | Black-box + EP | Execution context: GitHub Pages | 1. Open the deployed version in GitHub Pages. | Game loads correctly; assets, fonts, and audio behave as expected or are documented. |  |  |  |
| BV01 | First Enter press | Boundary value | First Enter press | 1. Open the intro.<br>2. Press Enter once. | It does not skip more than intended on the first press. |  |  |  |
| BV02 | Very small window | Boundary value | Very small window | 1. Reduce the browser window a lot. | UI remains usable or the limitation is recorded. |  |  |  |
| BV03 | Very large window | Boundary value | Very large window | 1. Maximize the browser window. | Overlays, text, and images keep a sensible layout. |  |  |  |
| BV04 | Rapid key presses | Boundary value + EP | Rapid repeated Enter input | 1. Press Enter repeatedly during transitions. | The flow does not break and states do not skip unexpectedly. |  |  |  |
| BV05 | Asset loading delay | Boundary value | Initial asset loading | 1. Observe the first seconds after opening the game. | Slow-loading assets do not break the screen; fallbacks work if used. |  |  |  |
| WT01 | setGameState logic | White-box | State transition logic | Call or trace `setGameState` with valid transitions. | State value changes to the correct target. |  |  |  |
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

- **Total test cases executed:**
- **Passed:**
- **Failed:**
- **Blocked / not tested:**
- **Main issues found:**
- **Main fixes applied:**
- **Remaining limitations:**

## Report

Our testing approach combined mainly black-box testing with a small amount of white-box testing. Black-box testing was used to validate visible behavior such as screen transitions, gameplay rendering, controls, audio behavior, and deployment compatibility. Equivalence partitioning was used to group similar inputs and execution conditions into representative classes, reducing redundant tests while keeping broad coverage. White-box testing was applied to selected internal logic such as state transitions and helper functions. We also considered boundary cases, since edge cases are a common source of faults.

[…]
