<div align="center">

# Escape: Oh Dear Dragon!

[![Play](https://img.shields.io/badge/🕹️_Play_the_Game-4CAF50?style=for-the-badge)](https://uob-comsm0166.github.io/2026-group-5/index.html)
[![Video](https://img.shields.io/badge/🎥_Watch_Video-E91E63?style=for-the-badge)]()
[![Kanban](https://img.shields.io/badge/📌_Kanban_Board-7C4DFF?style=for-the-badge)]()
[![Updates](https://img.shields.io/badge/📅_Weekly_Updates-FF6F00?style=for-the-badge)]()

</div>


# Table of Contents

1. [Introduction](#1-introduction)
2. [Development Team](#2-development-team)
3. [Requirements](#3-requirements)
4. [Design](#4-design)
5. [Implementation](#5-implementation)
6. [Evaluation](#6-evaluation)
7. [Process](#7-process)
8. [Conclusion](#8-conclusion)
9. [Contribution Statement](#9-contribution-statement)


# 1. Introduction

**Escape: Oh Dear Dragon!** is a 2D top-down stealth game with a neon-cyberpunk castle aesthetic. Our brave hero sneaks through the castle's many chambers, each packed with patrolling guards, using stealth and subterfuge to reach the next level, and hopefully find the princess. Oh and portals...did we mention the portals? Yeah, we've got those too!

Our game is inspired by Invisible Inc. and the Thief and Dishonored series for their stealth-focused gameplay and emphasis on problem solving over direct confrontation. Players must study patrol routes and sneak through the castle, avoiding being seen (or heard), unless they want to become a snack for the stylish, sunglasses-wearing dragon. 

The twist mechanic was inspired by Valve's Portal series. Players can place linked portals to quickly and strategically navigate the castle's interior, bypass dangerous chokepoints, or recover from risky plays. This mechanic is built directly into our game's core stealth navigation, creating constant tactical choices between planning safe routes and improvising under pressure. 

The story begins as an all too familiar fantasy trope - rescue the princess from the big bad dragon. However, we gradually subvert that premise as the player uncovers an uncomfortable truth: the kingdom's chaos may be an unintended consequence of one unbelievably un-self-aware hero.


# 2. Development Team

<img src="devlog/images/group-pic.jpeg" alt="Group pic" width="900" height="800">

| Person        | Email                    | GitHub                    | Roles                                        |
| ------------- | ------------------------ | ------------------------- | -------------------------------------------- | 
| Tracy Cui     | sk25619@bristol.ac.uk    | @Tracy-fuyao              | Architecture and Integration                 | 
| Yawen Zhang   | vm25514@bristol.ac.uk    | @joan9yawen-source        | UI/UX                                        | 
| Hanqing Zhang | sv25099@bristol.ac.uk    | @zhq1374547005-UOB        | Game Flow, Level Design and Gameplay Vision  | 
| Haris Kovac   | yw25220@bristol.ac.uk    | @hariskovac               | Documentation and Scrum Master               |
| Frida Chen    | ba25966@bristol.ac.uk    | @fridachen1127            | Evaluation, Code Review and Github Workflow  |
| Jinni Li      | ra25313@bristol.ac.uk    | @Jinni-Li                 | UI/UX and Testing                            | 



# 3. Requirements 

- 15% ~750 words
- Early stages design. Ideation process. How did you decide as a team what to develop? Use case diagrams, user stories.

## Ideation
During the ideation process, team members took turns proposing their ideas. Our initial list contained several concepts, but three quickly became the frontrunners: a tactical stealth game, a rogue-like, and a Bomberman clone. The team spent a great deal of time debating on the merits of each idea, considering factors such as difficulty of implementation, originality, player enjoyment, and how excited we were about the concept as developers.

Due to the semester-long nature of the course, the difficulty and time it would take to implement a game became deciding factors. Because of that, we decided that the rogue-like would not be feasible to complete to a satisfactory level given our timeframe. We created paper prototypes for the remaining two ideas and presented them to classmates.

For the stealth game, we prototyped navigating around rooms, enemy field of view and alert bars, and collecting keys to advance further through the level. For the Bomberman idea, we prototyped map layout, power-ups, enemy behavior, and dropping bombs to destroy blocks and damage enemies, along with portal mechanics from the Portal game. Ultimately, we voted and decided that we would create the stealth game combined with portal mechanics as the twist, allowing the player additional mechanics for avoiding enemies and navigating levels. 

## Stakeholders

The following figure shows our Stakeholder Onion Model, with layers indicated in the image.

<img src="devlog/images/onion_model.png" alt="Onion Model">

The System ring captures direct users of the game (players/playtesters). The Containing System includes those who create, support, and evaluate the product (dev team, teaching staff). The Wider Environment captures university-level constraints and infrastructure.

## Epics and User Stories

We used an epic-driven approach to define our feature scope. Each epic represents a major gameplay system, with user stories capturing specific player needs. These stories were then tracked as GitHub issues to manage implementation and progress.

Our Epics include:
- **Epic 1**: Stealth and Movement
- **Epic 2**: Enemy Visibility and Feedback
- **Epic 3**: Rooms, Doors, and Progression
- **Epic 4**: Keys and Interactables
- **Epic 5**: Challenge and Learning Curve
- **Epic 6**: Portal Mechanics
- **Epic 7**: Inventory and Items
- **Epic 8**: Game Flow and Feedback

Below are the user stories for our first epic, Stealth and Movement. Please see the appendix for the remaining user stories.

**Epic 1: Stealth and Movement**

| Number        | User Story               | Priority                  | 
| ------------- | ------------------------ | ------------------------- | 
| U1.1          | As a player, I want responsive movement so I can position precisely to avoid enemy vision and alert zones.    | High            |
| U1.2          | As a player, I want walls, doors, and solid obstacles to block movement so navigation feels consistent.    | High            |
| U1.3          | As a player, I want obstacles and corners to provide cover so I can avoid line of sight strategically.    | High            |
| U1.4          | As a player, I want to switch between walking and sprinting so that I can trade safety for speed when escaping danger.    | High            |
| U1.5          | As a player, I want sprinting to generate visible/audible noise feedback so I understand when enemies may investigate.    | High            |
| U1.6          | As a player, I want guards to lose me when I successfully break line-of-sight so that stealth feels skill-based.    | High            |
| U1.7          | As a player, I want to fail only when a guard reaches me in a chase so that mistakes feel fair and understandable.    | High            |
| U1.8          | As a player, I want to preview nearby danger (panning camera) so I can scout safely before advancing.    | Medium            |

<!-- - Core Development Team
  - Design, implementation, testing, evaluation and documentation
- End-Users & Community
  - Classmates & peer reviewers: provide usability and feature feedback to guide iterations
  - Online players via GitHub Pages: use the deployed version and report issues or suggestions
- Course Staff
  - Instructors & Teaching Assistants: define requirements and grading criteria
-->
## Use Case Diagram

To consolidate our user stories into a player-facing view of the system and scope the behavior we planned to implement, we created the use case diagram shown below. 

<img src="devlog/images/use_case_diagram.png" alt="Use case diagram">

The Player has three entry points into the system: starting a new game, viewing the tutorial, or playing a level. Starting a new game _includes_ selecting a playthrough and a difficulty as both are required to load a level. Playing a level _includes_ navigating the map, avoiding detection, collecting items in chests, and reaching the exit. These four are part of the core loop and can't be opted out of. Sprinting, using portals, or pausing the game are modelled as _extends_ relationships because they are optional. The player can complete a level only by walking and using the base controls. Pausing the game _extends_ itself further into viewing collected story notes or exiting to the title screen. The full use case specification for the Play Level use case is given below.

| Field         | Specification            | 
| ------------- | ------------------------ | 
| Actor         | Player                   | 
| Pre-conditions               | The player has selected a playthrough variant and a difficulty level, the corresponding map has loaded, and the intro cutscene has finished    | 
| Basic Flow - Goal            | Collect every chest in the level, then reach the exit door without being caught by a guard.    | 
| Basic Flow - Step 1          | Player explores the level, avoiding guards and using movement, sprinting, interaction, and portals as needed.    | 
| Basic Flow - Step 2          | Player opens chests to collect keys and story notes. Opening every chest unlocks the exit door.    | 
| Basic Flow - Step 3          | Player reaches the unlocked exit door and presses E to exit. The win screen is shown.    | 
| Alternative Flow             | A guard detects the player and begins searching or chasing.            |
| Recovery Step                | Player breaks line of sight using walls, doors, or a portal before the guard reaches them. The guard searches the area and eventually resumes patrol.    |
| Failure                      | A guard in a CHASE catches the player and the lose screen is shown.   | 
| Post-conditions (Success)    | Narrative progress advances through a cutscene, and the player returns to the map select screen.   | 
| Playthrough Variation        | FOYER (easy) has a simple layout with few guards, large open spaces, and a direct path to the exit. LIBRARY (medium) has multiple connections between rooms, reduced room size, and more guards. SALON (hard) has the most complex layout and the greatest number of rooms, and a large number of guards patrolling confined spaces.    | 

# 4. Design

- 15% ~750 words 
- System architecture. Class diagrams, behavioural diagrams.

## System Architecture

Escape: Oh Dear Dragon! is built upon p5.js, organized as ES modules under src/ with a layered architecture. At the top, main.js creates a p5 instance and forwards its hooks (setup, draw, keyPressed, mousePressed, etc.) into a single GameCore controller. GameCore then owns the per-frame loop and holds all other top level subsystems, including GameState, InputSystem, AudioSystem, a ScreenOverlaySystem that wraps a ScreenManager, and a Camera. GameCore.render() hands state off to the renderSystem, which handles maps, lighting, entities, fog of war, and UI.

Gameplay state lives inside a Level object built by mapFactory from map specs registered in mapManager. The Level object composes five gameplay systems (DoorSystem, BoxSystem, RoomSystem, MissionSystem, and PortalSystem) plus a Player and an array of NPCs, both of which extend an abstract Entity. The per-frame update in GameCore follows a fixed structure:

<p align="center">Advance overlay -> update player movement -> resolve portals -> update camera -> tick world systems -> update NPCs and check for detection -> resolve interactions</p>

NPC behavior is split across function modules (npcSystem, npcStateMachine, pathfindingSystem) rather than being handled by a single class. The NPC class contains NPC data, and the state machine is driven by external functions that handle things like reading vision cones, room lighting, and player footstep trails.

An abstract Screen class defines render, update, reset, handleKey/handleMouse hooks, and 13 screens inherit from it. ScreenManager keeps a map of the screen name and forwards calls to whichever screen is active, and GameCore transitions between screens via a setScreen function which handles input resets, text, overlay, and audio. 

# 5. Implementation

- 15% ~750 words

- Describe implementation of your game, in particular highlighting the TWO areas of *technical challenge* in developing your game. 

# 6. Evaluation

## Qualitative

<img src="devlog/images/think-aloud.jpg" alt="think aloud mindmap" width="900" height="800">

Changes made:


## Quantitative 

We employed the System Usability Scale (SUS), a quick and reliable standardized questionnaire developed by John Brooke in 1986 for measuring the perceived usability of a system through 10 Likert-scale items, as a quantitative method. Upon completion, we exchanged reflections with the participants to ensure the effectiveness of the data analysis.

Procedure：
- Group A, 5 people, P1–P5: L1→L2
- Group B, 5 people, P6–P10: L2→L1
- Each user plays one difficulty level and then fills out the SUS form.
- Tips: Give each participant a sticky note with their ID in case they forget.

<div align="center"><strong>Table x - Data Overview  </strong></div>

<div align="center">

| **Participant** | **SUS L1** | **SUS L2** | **Difference** |
| --------------- | ---------- | ---------- | -------------- |
| P1              | 62.5       | 65         | 2.5            |
| P2              | 80         | 82.5       | 2.5            |
| P3              | 55         | 67.5       | 12.5           |
| P4              | 77.5       | 80         | 2.5            |
| P5              | 62.5       | 65         | 2.5            |
| P6              | 80         | 65         | -15            |
| P7              | 62.5       | 57.5       | -5             |
| P8              | 82.5       | 80         | -2.5           |
| P9              | 70         | 57.5       | -12.5          |
| P10             | 90         | 87.5       | -2.5           |
| Average         | 72.25      | 70.75      | -1.5           |

</div>

**Graphical Representation**


![](/devlog/images/line.jpg)


**Interpretation**

Statistical Analysis: 
The analysis yielded W = 21.5 with p = 0.9961 > 0.05, providing no evidence of significant distributional differences between game levels (p >> 0.05).
Both levels demonstrated functionally equivalent performance: Level 1 (M = 73.75, SD = 8.60) and Level 2 (M = 73.50, SD = 10.81), with negligible mean difference of 0.25 points and trivial effect size (r = 0.002).

The results indicated a slight difference in usability perception between Level 1 and Level 2. On average, the SUS score for Level 1 was 72.25, while Level 2 had a marginally lower average of 70.75. This minimal difference (Δ = 1.5) was contrary to the expectation that a more advanced level might yield higher usability ratings through accumulated familiarity. A contributing factor may be the insufficient difficulty differentiation between the two levels — if players did not perceive a meaningful contrast in gameplay challenge, the interface demands across both conditions would remain largely equivalent, naturally producing similar usability ratings. The consistent UI layout and interaction patterns maintained across levels further reinforced this effect, allowing knowledge transfer with minimal friction but also limiting opportunities to observe usability variance.

Overall, both levels scored above the general SUS benchmark of 68, confirming that users found the interface reasonably accessible regardless of level. However, neither condition reached the "Excellent" threshold (SUS ≥ 85), indicating room for improvement in interface responsiveness and feedback clarity. The lack of perceived difficulty distinction between levels also suggests that future design iterations should establish more pronounced gameplay differentiation, ensuring that usability evaluations reflect genuinely varied interaction demands rather than near-identical experiences across conditions.


# 7. Process 

- 15% ~750 words

- Teamwork. How did you work together, what tools and methods did you use? Did you define team roles? Reflection on how you worked together. Be honest, we want to hear about what didn't work as well as what did work, and importantly how your team adapted throughout the project.



# 8. Conclusion

- 10% ~500 words

- Reflect on the project as a whole. Lessons learnt. Reflect on challenges. Future work, describe both immediate next steps for your current game and also what you would potentially do if you had chance to develop a sequel.

# 9. Contribution Statement

- Provide a table of everyone's contribution, which *may* be used to weight individual grades. We expect that the contribution will be split evenly across team-members in most cases. Please let us know as soon as possible if there are any issues with teamwork as soon as they are apparent and we will do our best to help your team work harmoniously together.

### Additional Marks

You can delete this section in your own repo, it's just here for information. in addition to the marks above, we will be marking you on the following two points:

- **Quality** of report writing, presentation, use of figures and visual material (5% of report grade) 
  - Please write in a clear concise manner suitable for an interested layperson. Write as if this repo was publicly available.
- **Documentation** of code (5% of report grade)
  - Organise your code so that it could easily be picked up by another team in the future and developed further.
  - Is your repo clearly organised? Is code well commented throughout?
