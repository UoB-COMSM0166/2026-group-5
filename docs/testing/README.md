## Testing approach

- Black-box testing
  - Validate what the player sees and experiences, such as screen flow, controls, rendering, audio, and deployment behaviour.
- Boundary-value testing
  - Check edge cases such as first key presses, small and large window sizes, rapid input, and initial asset loading.
- White-box testing
  - Cover a few internal logic areas such as state transitions, audio switching, and layout helper functions.
- Compatibility checks
- Test the game in Live Server and GitHub Pages, and note any limitations when opening files directly.

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
- Simple test, https://docs.google.com/spreadsheets/d/1-XyQk9ekZnqXr-pRJOucOpcXLY9wKz76WdjDOFbkJ_E/edit?gid=0#gid=0
- 

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
