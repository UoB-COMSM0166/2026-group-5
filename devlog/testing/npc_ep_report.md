# Equivalence Partitioning: NPC Status Transitions

## Selected Feature

Our selected feature is **NPC status transitions**.

This feature is suitable for equivalence partitioning because NPC behaviour is controlled by a small set of clearly defined state classes. In the current implementation, an NPC can be in `PATROL`, `SEARCH`, or `CHASE`, and transitions between these states depend on player visibility, alert level, and investigation triggers. Because each class leads to a distinct and observable behaviour, the feature provides a strong basis for EP testing.

## Equivalence Classes

| Category | Description | Condition / values | Notes / constraints |
|---|---|---|---|
| A | NPC state before update | `A1 = PATROL`, `A2 = SEARCH`, `A3 = CHASE` | Main state partition from `npcStateMachine.js`. |
| B | Player visibility | `B1 = player visible`, `B2 = player not visible` | Visibility affects alert growth and chase transitions. |
| C | Alert level band | `C1 = below 10`, `C2 = 10 to below 20`, `C3 = 20 or above` | Based on `ALERT_SEARCH_THRESHOLD` and `ALERT_CHASE_THRESHOLD`. |
| D | Extra trigger / completion condition | `D1 = none`, `D2 = environmental search trigger`, `D3 = search finished`, `D4 = not applicable` | `D2` means light / footstep / open-door investigation. |


## Valid Combination Space

Let `A = {A1, A2, A3}`  
Let `B = {B1, B2}`  
Let `C = {C1, C2, C3}`  
Let `D = {D1, D2, D3, D4}`

Naive test space: `|T| = 3 x 2 x 3 x 4 = 72`


## Constraints

- If `A1 = PATROL` and `B2 = player not visible`, then `D` may be `D1` or `D2`.
- If `A2 = SEARCH`, then `D` may be `D1` or `D3`.
- If `A3 = CHASE`, then `D = D4`.
- If `B1 = player visible`, then `D = D4`.
- `CHASE` entry is only valid when `B1 = player visible` and `C3 = 20 or above`.
- `CHASE -> SEARCH` is only valid when `A3 = CHASE`, `B2 = player not visible`, and `C1 = below 10`.
- `SEARCH -> PATROL` by completion is only valid when `A2 = SEARCH`, `B2 = player not visible`, and `D3 = search finished`.

## Representative Valid Partitions

The following representative partitions cover the meaningful behaviour classes:

- `(A1, B2, C1, D1)` patrol with no stimulus
- `(A1, B2, C1, D2)` patrol with an environmental trigger
- `(A1, B1, C2, D4)` player briefly visible but alert still below chase threshold
- `(A1 or A2, B1, C3, D4)` player visible and alert high enough to trigger chase
- `(A3, B2, C2, D4)` chase continues after sight is lost while alert remains high
- `(A3, B2, C1, D4)` chase drops to search after alert decays
- `(A2, B2, C1 or C2, D3)` search completes when the player is not detected again and NPC returns to patrol

## EP Test Cases

| ID | Feature | Technique | Partition / case class | Steps | Expected result | Status | Evidence |
|---|---|---|---|---|---|---|---|
| EPN01 | NPC status transitions | Equivalence partitioning | `(A1, B2, C1, D1)` patrol with no stimulus | 1. Enter an area with a patrolling NPC.<br>2. Stay outside its vision and avoid sprinting, light switches, and doors.<br>3. Observe the NPC for several seconds. | The NPC remains in `PATROL` and does not begin searching or chasing. | Passed | `evidences/ep/epn01.png` |
| EPN02 | NPC status transitions | Equivalence partitioning | `(A1, B2, C1, D2)` patrol with environmental trigger | 1. Stay out of direct sight of an NPC.<br>2. Trigger a nearby light change or create a trackable sprint footstep.<br>3. Observe the NPC reaction. | The NPC leaves `PATROL` and enters `SEARCH` to investigate the trigger location. | Passed | `evidences/ep/epn02-1.png`, `evidences/ep/epn02-2.png` |
| EPN03 | NPC status transitions | Equivalence partitioning | `(A1, B1, C2, D4)` visible player but alert below chase threshold | 1. Briefly expose the player to an NPC.<br>2. Break line of sight before detection fully builds. | Alert rises, but the NPC does not enter `CHASE` because the chase threshold has not been reached. | Passed | `evidences/ep/epn03.png` |
| EPN04 | NPC status transitions | Equivalence partitioning | `(A1 or A2, B1, C3, D4)` visible player with chase-level alert | 1. Remain in an NPC vision cone long enough for alert to build.<br>2. Continue observing the NPC. | The NPC enters `CHASE` and begins pursuing the player. | Passed | `evidences/ep/epn04.png` |
| EPN05 | NPC status transitions | Equivalence partitioning | `(A3, B2, C2, D4)` chase continues after sight loss while alert is still high | 1. Trigger a chase.<br>2. Break line of sight briefly.<br>3. Observe the NPC immediately after hiding. | The NPC remains in `CHASE` and does not drop to `SEARCH` too early. | Passed | `evidences/ep/epn05_epn06.png` |
| EPN06 | NPC status transitions | Equivalence partitioning | `(A3, B2, C1, D4)` chase drops to search after alert decays | 1. Trigger a chase.<br>2. Break line of sight and stay hidden long enough for alert to drop.<br>3. Observe the NPC state change. | The NPC leaves `CHASE` and enters `SEARCH` at the player's last seen position. | Passed | `evidences/ep/epn05_epn06.png` |
| EPN07 | NPC status transitions | Equivalence partitioning | `(A2, B2, C1 or C2, D3)` search completes when the player is not detected again | 1. Trigger an NPC search state.<br>2. Stay hidden until the search timer ends.<br>3. Observe the end of the behaviour. | The NPC returns from `SEARCH` to `PATROL` when the search completes. | Passed | `evidences/ep/epn07.png` |

## Conclusion

The NPC status transition feature passed all seven representative equivalence partitioning test cases. 

The results show that the NPC state machine behaves consistently across the selected partitions. NPCs do not leave `PATROL` when no valid stimulus is present, but they do enter `SEARCH` when an environmental trigger such as a light change or footstep is detected. The alert system also behaved as expected: a partial sighting increased alert without immediately forcing `CHASE`, while sustained visibility and a high alert value caused the NPC to enter `CHASE`. After the player escaped sight, the NPC remained in `CHASE` while alert was still high, then moved into `SEARCH` when the chase condition was no longer satisfied. Finally, the NPC returned to `PATROL` after search completion when the player was not detected again.
