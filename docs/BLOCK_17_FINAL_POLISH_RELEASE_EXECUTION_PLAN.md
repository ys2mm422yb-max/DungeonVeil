# Block 17 – Final polish and release execution plan

## Fixed safety contract

- Repository: `ys2mm422yb-max/DungeonVeil`
- Base and publication target: `fix/mobile-telegraphs-room-21-50-balance`
- Exact branch start: `3947939d47f48cc6e597bccfd8d770367e4bec9a`
- Working branch: `audit/block-17-final-polish-release-v1`
- `main` is excluded.
- PR #315 remains untouched.
- No auto-merge and no branch deletion.
- Playwright retries remain `0`.

## Scope

Perform the binding final product audit from `docs/MASTER_WORK_PLAN.md` across the published mobile portrait game:

- main menu, profile, shop, options, equipment, codex, quests, mail, friends and guild
- guild raid lobby, all ten raid rooms, raid boss, reconnect, abort and exactly-once rewards
- Solo and Duo rooms 1–100, chapter transitions, bosses and final completion
- world boss, companions, relics, Forge Marks, upgrades, loot and economy
- save/reload, cloud synchronization, spectator flow and renderer recovery
- portrait operation on iPhone/WebKit, Android/Chromium, iPad/WebKit and Android-tablet/Chromium
- landscape input/state pause and safe portrait resume

## Audit gates

1. Run complete static validators, typecheck, production build and all deterministic simulations.
2. Run Product Autopilot and Full Game Regression on the exact head.
3. Run Complete Runtime Evidence with all four supported portrait projects and retries at `0`.
4. Inspect generated screenshots, videos, traces and compact manifests for:
   - black or empty rooms
   - invisible enemies or equipment
   - wrong weapon poses, floating or duplicated gear
   - ghost damage or hazards surviving combat completion
   - clipped HUD, overlapping menus, horizontal overflow or undersized touch targets
   - obscured telegraphs, wrong titles/images/transitions or placeholder content
   - memory, geometry, renderer or canvas growth
5. Fix each confirmed defect on this focused branch, then rerun all invalidated exact-head checks.
6. Mark ready and merge only when every required exact-head check is green and evidence has been manually reviewed.
7. Verify target-branch Actions and the fixed public Pages deployment after merge.

## Evidence record

The PR description and comments must record:

- exact final head SHA
- required workflow run IDs and conclusions
- four-device evidence result
- manually inspected artifact names
- any defects found and their fixes
- merge SHA and final target-branch verification

## Definition of done

Block 17 is complete only after the exact final head passes all required checks, evidence is manually inspected, confirmed defects are fixed, the PR is merged into the fixed target branch, target-branch Actions are green and the fixed public test deployment is verified.
