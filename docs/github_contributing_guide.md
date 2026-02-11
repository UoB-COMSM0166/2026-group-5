# Github Contributing Guide

This document describes how we work on this project.
The goal is to keep collaboration **simple, async-friendly, and low-overhead** while protecting the stability of `main`.

## Development Setup

### Prerequisites

- Git
- A modern web browser (Chrome / Firefox)
- VS Code
- Live Server Extension for VS Code

### Getting Started

1. Copy the repository URL (Code → HTTPS or SSH)
2. Open VS Code and press Ctrl + Shift + P
3. Type in 'Git: Clone'
4. Paste the URL and save the repo to a local folder
5. Install the Live Server extension

To run the project:

- Ensure the Live Server extension is installed
- Right click index.html → click 'Open with Live Server'

## Workflow

### Branching

#### Main Branch

- `main` — always stable, playable, and demo-ready

#### Dev Branches

Each feature, bug fix, or documentation has its own dedicated branch:

- `Feature`: feature/<short-feature-name> 
- `Bug Fix`: fix/<issue-name>
- `Documentation`: docs/<topic-name>

#### Creating a New Branch in VS Code

- Click the branch name in bottom left corner of VS Code
- Choose 'Create new branch'
- Ensure VS Code has switched to the new branch

#### Working in Dev Branch

- Sync with main before a work session or before opening a PR (see guide below)
- Make atomic commits as you develop
- Push to dev branch regularly

#### Syncing with Main

- Switch to dev branch
- Ctrl + Shift + P → Git: Fetch → Git: Merge
- Choose 'main'
- Resolve any conflicts if they exist
- Stage + commit merge resolution
- Push to feature branch

#### Rules

- Do **not** push directly to `main`
- Work only on your feature, fix, or docs branch
- All changes go to `main` via Pull Requests
- Do not open PRs between personal branches

Pull Requests must be focused and clean.


### Commits

Recommended format:

```
type: short description
```

Common types:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `chore:` cleanup or formatting
- `refactor:` code restructuring
- `assig:` weekly assignments

Examples:

- `feat: add NPC search state`
- `fix: prevent NPC stuck at door`
- `docs: update contributing guide`

Commit messages are present tense, not past tense.

### Pull Requests

#### How to open a PR

1. Sync your branch with `main`
2. Push your changes
3. Open a PR targeting `main`
4. Request review from at least one teammate (Frida / Haris)
5. Address feedback
6. Squash & merge once approved

#### PR description (required)

- **What** changed (1–3 bullets)
- **Why** it changed: Reason for the change (1 sentence)
- **How** to test: Steps to verify the change
- Other optional notes: Risks, blockers, follow-ups etc.

Visual or gameplay changes should include a screenshot or short GIF/video.

Example 'How to Test':
1. Launch game from index.html with Live Server
2. Start gameplay
3. Press shift to dash
4. Confirm player speed increase


## Definition of Done

A change is considered **done** when:

- Works locally
- Core gameplay still works
- Tests passed and no bugs
- PR reviewed and approved
- Merged into `main`


## Issues

### Bug Reports

Include:

- What happened
- Expected behavior
- Steps to reproduce
- Screenshot or video if possible

### Tasks / Features

Include:

- Goal (1 sentence)
- Acceptance criteria (2–5 bullets)


## Project Structure

```
.
├── game/ # Main game (p5.js)
├── assets/
│   ├── audio/
│   ├── images/
│   ├── index.html
│   ├── sketch.js
│   ├── style.css
|   └── ...
├── painting app/ # Separate prototype / experiment
├── docs/ # Documentation and images
│   ├── images/
|   └── ...
├── weekly updates/ # Weekly progress snapshots
├── README.md
└── LICENSE

```


## Getting Help

Follow the following steps to get help: 
- Check existing issues or docs first
- Ask in the team WhatsApp group
- Reach out to the owner of the module if there is one
- Bring it up at the team meeting


## Team Conduct

Be respectful, assume good intent, and communicate early.
We are learning while building.
