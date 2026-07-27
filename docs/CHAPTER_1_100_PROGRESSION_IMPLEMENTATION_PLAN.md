# Chapter 1–100 progression implementation plan

## Fixed safety contract

- Repository: `ys2mm422yb-max/DungeonVeil`
- Target and publication branch: `fix/mobile-telegraphs-room-21-50-balance`
- Exact branch start: `f03aa080ecacf120b1f68b491e08a8fc1f9852f9`
- Working branch: `feat/chapter-1-100-progression-runtime-v1`
- `main` is excluded.
- PR #315 remains untouched.
- No auto-merge and no branch deletion.
- Playwright retries remain `0`.

## Binding product contract

1. Chapter 1 room 100 advances exactly once to chapter 2 room 1.
2. Every chapter contains rooms 1–100 and stores chapter and room independently.
3. Chapter progression survives reload, reconnect, cloud synchronization, Solo, Duo and spectator flows.
4. Chapter rewards and chapter transitions are exactly-once operations.
5. Difficulty scales through mechanics, pressure, elites, hazards, timing and bosses, not only HP.
6. Representative chapters 1, 2, 5, 10, 25, 50, 75 and 100 receive deterministic balance coverage.
7. Chapter 100 room 100 ends in a distinct final completion state instead of advancing to chapter 101.
8. HUD, menus, codex, profile and completion screens display chapter and room without mobile clipping.

## Implementation order

### A. State and persistence

- Introduce or verify a canonical bounded chapter value from 1 through 100.
- Store chapter separately from room in local save, cloud save and active-run state.
- Add migration defaults for older saves that only contain a room.
- Prevent chapter regressions, skips and duplicate transitions during retries and reconnects.

### B. Runtime transition

- Convert room-100 completion into an atomic chapter transition.
- Reset room to 1 only after the chapter reward and completion state are committed.
- Preserve exactly-once semantics under repeated input, reload and Duo synchronization.
- Route chapter 100 room 100 to the unique final completion state.

### C. Difficulty and rewards

- Define bounded chapter scaling for HP, attack, movement, elite pressure and hazard overlap.
- Keep reaction windows and telegraphs readable at every chapter.
- Scale rewards and upgrade economy without exponential inflation or trivializing later chapters.
- Add deterministic simulations for representative chapters and boundary cases.

### D. UI and content

- Display chapter and room together in active-run HUD, continuation surfaces and profile progress.
- Update chapter-completion, chapter-transition and final-completion presentation.
- Ensure portrait layout on iPhone, Android phone, iPad and Android tablet.

### E. Validation and runtime evidence

- Add static validators for chapter bounds, save migration and exactly-once transitions.
- Add deterministic tests for 1→2, representative middle chapters and 99→100/final completion.
- Add Solo and Duo persistence/reconnect coverage.
- Run Product Autopilot, Full Game Regression and Complete Runtime Evidence on the exact final head.
- Manually inspect screenshots, videos, traces and manifests before merge.

## Definition of done

This pass is complete only when the runtime, persistence, UI, balance simulations and four-device portrait evidence satisfy the merged 100-chapter contract on one exact head, all required checks are green, confirmed defects are fixed, the PR is merged into the fixed target branch and the fixed Pages deployment is verified.