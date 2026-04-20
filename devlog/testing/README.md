# Testing

This folder contains the main testing documentation for the project.

## Files

### `general_test_table.xlsx`
Main table used to record practical testing progress.

It includes:
- black-box test cases for core game features
- boundary value test cases for edge cases
- selected white-box test cases
- test status and notes
- bug tracking references

### `npc_ep_test_cases.xlsx`
Execution table for the formal NPC equivalence partitioning cases.

### `npc_ep_report.md`
Detailed written report for the NPC equivalence partitioning section.

### `evidences/`
Screenshot evidence folder.

It includes:
- `ep/`: evidence for NPC equivalence partitioning cases
- `wt/`: evidence for selected white-box checks

### `final_report.md`
Main final testing report.


## Structure

The testing documentation is organised in two layers:

- **General feature testing**: used to check that the main features of the current build work as expected.
- **Equivalence partitioning (EP)**: documented separately for one selected feature, using the more formal method discussed in class.

This keeps the practical test table separate from the more detailed EP analysis required for the module.

## Current Status

Current final testing status:
- 78 total executed test cases
- 78 total passed test cases
- 0 failed / blocked / not tested
- 71 general test cases passed
- 7 NPC EP test cases passed
- 2 bugs logged and closed
- 0 open bugs

The main testing work is complete for the current build. The final testing report is recorded in `final_report.md`.

## Notes

- `general_test_table.xlsx` is used for practical general test execution and progress tracking.
- `npc_ep_test_cases.xlsx` is used for the formal EP test execution record.
- `final_report.md` summarises the testing approach, results, defects, EP analysis, progress, and evidence.
- The Excel files keep the detailed row-level execution data, while the Markdown files provide the written report and analysis.
- Weekly project reports document testing progress separately.
