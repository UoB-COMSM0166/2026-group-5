# Overview

This week, part of the project work focused on reviewing and improving the testing documentation after the Software Quality Testing workshop. The original testing template had been created earlier in the semester, before the workshop took place. At that stage, its main purpose was to provide a general structure for recording test cases, test results, and bugs while the game was still under development.

After attending the workshop and understanding the lecturer’s expectations more clearly, we decided to revise that original template so that it would better match both the course methodology and the current needs of the project. In particular, we realised that the testing documentation should not only record practical testing progress, but also reflect the more formal testing techniques discussed in class.

As a result, the testing documentation has now been reorganised into **two layers**:

1. **General feature testing**, used to check the main features of the game and confirm that the current build works as expected.
2. **Equivalence partitioning (EP)**, documented in a separate section for one selected feature, so that the formal workshop method can be applied in more detail without making the main testing table too crowded.

This means that equivalence partitioning is no longer mixed into the main feature table. Instead, the main table is used for practical testing progress, while EP is treated as a separate and more detailed analysis that will be developed further once the feature (between: NPC status transitions, room visibility & portals) is confirmed by the team.

# Work Completed This Week

This week, the main contribution to the project was the revision of the testing structure and the first round of general feature testing. The testing template was updated so that it now reflects the workshop methodology more clearly and separates the practical testing table from the formal equivalence partitioning section.

Using the updated general testing table, the team tested a number of basic game features in order to check whether the current build behaves as expected. These tests focused on visible game behaviour, including loading, input handling, rendering, state progression, and some deployment-related behaviour.

At the current stage, the results of the general testing table are:

- **11 Passed**
- **1 Failed**
- **10 Not Tested**

The tests completed so far cover important parts of the current build, such as initial loading, start screen assets, start screen input, intro progression, gameplay rendering, movement input, lose condition, restart or return flow, start audio, first Enter press behaviour, and rapid repeated input.

The main issue identified so far is related to **screen scaling**, which did not behave correctly across different window sizes. This has been recorded as a failed test case and will need to be reviewed in more detail.

Overall, this week’s testing progress shows that the current build is stable enough for continued development and testing, although several checks are still pending.

# Testing Approach

The main testing approach used so far has been **black-box testing**, since most of the current checks focus on the visible behaviour of the game rather than its internal implementation. The general testing table has been used to test core functionality such as loading, input handling, rendering, state progression, and deployment-related behaviour.

We also included **boundary value testing** for cases where faults are more likely to appear, such as the first key press, rapid repeated input, and extreme window sizes. In addition, a smaller set of **white-box tests** was prepared for selected internal logic, including state transitions, audio switching, layout helper values, and overlay rendering conditions.

The **equivalence partitioning section** is being kept separate for now and will be developed in more detail once the team agrees on the specific feature that will be analysed.

# General Testing Table

| ID   | Feature                 | Technique      | Status     | Notes |
|------|-------------------------|----------------|------------|-------|
| BT01 | Initial load            | Black-box      | Pass       | Tested successfully in Live Server. |
| BT02 | Start screen assets     | Black-box      | Pass       | Start screen displayed correctly. |
| BT03 | Start screen input      | Black-box      | Pass       | Enter input triggered the expected transition. |
| BT04 | Intro progression       | Black-box      | Pass       | Intro progressed correctly with the expected input behaviour. |
| BT05 | Gameplay render         | Black-box      | Pass       | Gameplay canvas rendered correctly. |
| BT06 | Movement input          | Black-box      | Pass       | Movement controls responded correctly. |
| BT07 | Win condition           | Black-box      | Not Tested | Planned for the next testing cycle. |
| BT08 | Lose condition          | Black-box      | Pass       | Lose condition behaved as expected. |
| BT09 | Restart / return flow   | Black-box      | Pass       | End-state return flow behaved correctly. |
| BT10 | Start audio             | Black-box      | Pass       | Audio played as expected after interaction. |
| BT11 | Audio transition        | Black-box      | Not Tested | Pending audio transition review. |
| BT12 | Screen scaling          | Black-box      | Fail       | Needs detailed review during Weeks 11–12. |
| BT13 | GitHub Pages deployment | Black-box      | Not Tested | Pending deployment check. |
| BV01 | First Enter press       | Boundary Value | Pass       | First input behaved as expected. |
| BV02 | Very small window       | Boundary Value | Not Tested | Planned for Week 11. |
| BV03 | Very large window       | Boundary Value | Not Tested | Planned for Week 11. |
| BV04 | Rapid key presses       | Boundary Value | Pass       | Rapid repeated input did not break the flow. |
| BV05 | Asset loading delay     | Boundary Value | Not Tested | Pending observation under slower loading conditions. |
| WT01 | setGameState logic      | White-box      | Not Tested | Planned for Week 11–12. |
| WT02 | Audio stop/start logic  | White-box      | Not Tested | Planned for Week 11–12. |
| WT03 | Layout helper values    | White-box      | Not Tested | Planned for Week 11–12. |
| WT04 | Overlay draw conditions | White-box      | Not Tested | Planned for Week 11–12. |

# Bugs Identified

| Bug ID | Description | Related Test | Severity | Status | Notes |
|--------|-------------|--------------|----------|--------|-------|
| B01 | UI scaling does not remain consistent across different window sizes. | BT12 | Medium | Open | To be reviewed during Weeks 11–12. |

# Next Steps

In the following weeks, the remaining general test cases will be completed and reviewed. This includes the pending black-box, boundary value, and white-box checks that have not yet been executed.

The team also plans to work on the equivalence partitioning section in more detail between Week 11 and Week 12. At that stage, one specific feature will be selected and analysed using the more formal workshop structure, including categories, constraints, and valid combinations.

The main priorities for the next stage are:

- complete the remaining general test cases
- review the failed screen scaling test
- confirm the feature to be used for equivalence partitioning
- develop the EP section in more detail
- continue updating the bug log and project documentation

# Conclusion


This week was important for improving the project documentation and making the testing work more structured. The updated testing template now reflects the workshop methodology more clearly and is better aligned with the lecturer’s expectations.

At this point, the project is in a **mid-stage testing phase**. The team has already completed a first round of general feature testing, and the current results suggest that the build is stable enough for continued development and testing. However, the testing process is still in progress, since some important cases remain pending and one issue has already been identified.

Overall, this means that the project has moved from planning testing to actively validating the game’s behaviour. The next step is to complete the remaining test cases, review the failed scaling issue, and develop the equivalence partitioning section in more detail over the next weeks.