# AI Agent Acceptance Prompt Suite

This document lists acceptance prompts used to validate command coverage for creation, manipulation, layout, and complex templates. Run these against a board (e.g. with the AI panel) and verify the expected behavior.

## Command coverage mapping

| Category       | Example prompts                                                                 | Primary tool(s)                    |
|----------------|----------------------------------------------------------------------------------|------------------------------------|
| Creation       | "Add a yellow sticky note that says User Research"                              | `createStickyNote`                 |
| Creation       | "Create a blue rectangle at position 100, 200"                                  | `createShape`                      |
| Manipulation   | "Move the sticky note to 200, 300" / "Change the text to X" / "Make it red"      | `moveObject`, `updateText`, `changeColor` |
| Layout         | "Arrange these sticky notes in a grid"                                           | `arrangeInGrid`                    |
| Layout         | "Space these items evenly horizontally"                                         | `distributeEvenly`                |
| Templates      | "Create a SWOT analysis template with four quadrants"                            | `createSWOTTemplate`               |
| Templates      | "Add a user journey with 5 stages"                                              | `createUserJourneyTemplate`        |
| Templates      | "Create a retrospective board" / "Start stop continue"                          | `createRetroTemplate`              |

## Acceptance prompts (from AI-Agent-Execution-Plan)

1. **"Add a yellow sticky note that says User Research"**  
   - Expect: One sticky created with `text: "User Research"`, `color` yellow (e.g. `#FEF3C7` or user-specified hex), position chosen by model.

2. **"Create a blue rectangle at position 100, 200"**  
   - Expect: One rectangle shape at (100, 200) with blue color.

3. **"Arrange these sticky notes in a grid"**  
   - Expect: Selection (or recent stickies) arranged via `arrangeInGrid`; object IDs must be inferred from board state.

4. **"Create a SWOT analysis template with four quadrants"**  
   - Expect: Four quadrants (e.g. frames + labels) for Strengths, Weaknesses, Opportunities, Threats via `createSWOTTemplate`.

## How to run

- Use the right-side AI panel on a board; submit each prompt and confirm:
  - Status becomes `completed` (or `success` in API).
  - Summary describes what was done.
  - Board shows the expected objects/layout.
- For "Arrange these sticky notes in a grid", ensure the board has at least one sticky (or the prompt includes creating stickies first); the model may call `getBoardState` then `arrangeInGrid` with the returned IDs.

## Exit criteria (Phase 5)

- Required prompt suite passes without manual intervention (aside from submitting the prompt and checking the board).
