# Adaptive risk-based testing policy

This policy is mandatory for every Dungeon Veil pull request except the protected historical asset PR #315. It complements, and never weakens, issue acceptance criteria, existing tests, review requirements, or the immutable rules in `AGENTS.md` and Issue #376.

## Goal

Choose the smallest **sufficient** exact-head test and evidence matrix that proves every acceptance criterion and covers every plausible regression surface. Tests are selected from the actual change, affected code paths, user-visible behavior, data flow, supported devices, and known failure history—not from a fixed one-size-fits-all checklist.

Adaptive selection means relevance and precision. It never means fewer checks merely to save time.

## Mandatory test-plan record

Before implementation is considered complete, the PR body must contain the structured block from `.github/PULL_REQUEST_TEMPLATE.md` and document:

- risk level;
- affected domains and changed surfaces;
- affected modes, menus, rooms, states, devices, and browsers;
- one-to-one mapping from every acceptance criterion to a concrete automated check or evidence item;
- selected checks and why they are sufficient;
- selected evidence and why it proves the visible or runtime behavior;
- any broad check not selected and a technical reason it is irrelevant;
- escalation triggers that would expand the matrix;
- independent verifier decision.

A relevant red, cancelled, stale, or missing check cannot be reclassified as irrelevant after failure. Fix the cause or expand the plan.

## Risk levels

### `low`

Documentation, process metadata, non-executable text, or a purely administrative change.

Minimum:

- focused structure, syntax, link, policy, or contract validation;
- no browser, game run, or four-device evidence unless the changed material affects executable behavior.

### `medium`

Localized nonvisual code or a bounded internal contract with no credible cross-system state, renderer, persistence, security, economy, or multiplayer impact.

Minimum:

- focused unit/contract/audit coverage;
- TypeScript and production build when the changed path participates in them;
- targeted integration coverage for the changed boundary.

### `high`

Visible UI, interaction, gameplay behavior, animation, asset presentation, mobile layout, touch handling, or a change with meaningful runtime coupling.

Minimum:

- focused journey or gameplay tests for the exact changed state;
- relevant static contracts, TypeScript, and production build;
- compact screenshots or videos that directly prove the acceptance criteria;
- the four supported portrait projects whenever browser engine, touch, layout, WebGL, renderer, or gameplay behavior can differ:
  - iPhone / WebKit;
  - Android phone / Chromium;
  - iPad portrait / WebKit;
  - Android tablet portrait / Chromium.

### `critical`

Security/auth, Supabase/RLS/RPC, persistence/cloud restore, economy/rewards, multiplayer/reconnect, world-boss rotation, shared navigation, renderer/WebGL lifecycle, global registries/spawn tables, deployment, or central workflows.

Minimum:

- all relevant focused, integration, recovery, idempotency, exact-head, and cross-device gates;
- reload/reconnect/restore/background/recovery cases that apply;
- Full Game Regression and Complete Runtime Evidence when the changed surface can affect their contracts;
- deployment verification when publication or build infrastructure is touched.

## Domain-based selection

The plan must name every affected domain. Use specific terms such as:

- `docs`, `process`, `workflow`;
- `menu`, `inventory`, `codex`, `localization`, `touch`, `layout`;
- `gameplay`, `rooms`, `enemy`, `boss`, `companion`, `equipment`, `upgrade-effects`;
- `renderer`, `webgl`, `animation`, `assets`, `performance`, `lifecycle`;
- `persistence`, `cloud`, `auth`, `supabase`, `economy`, `rewards`, `multiplayer`, `reconnect`, `deployment`.

A run test is required only when the change is visible or functional during a run, or when the implementation creates a plausible run regression. A menu-only change does not require arbitrary room coverage. A shared renderer, equipment, companion, combat-effect, or persistence change usually does.

## Selecting rooms, menus, and states

Choose scenarios that prove the changed contract:

- menu changes: the affected menu, entry/exit paths, fast taps, localization, reload, and relevant fallback states;
- enemy changes: rooms where each affected family actually spawns, plus Codex only when Codex shares the presentation contract;
- room changes: the changed rooms and boundary/transition rooms, not unrelated chapters;
- persistence changes: before save, after reload/continue, after cloud restore, and invalid/missing fallback;
- animation/effect changes: full motion cycle, transition, interruption, Reduced Motion, background/foreground, and recovery where applicable.

## Evidence selection

Evidence must prove acceptance criteria rather than generate a generic tour of the game.

- Keep artifacts small, separate, manifest-backed, and SHA-256-deduplicated under Issue #366.
- Capture only relevant states and transitions.
- Open every relevant hash-distinct screenshot, video, trace, or runtime artifact before visual acceptance.
- Static screenshots prove layout, model, text, and state.
- Videos prove motion, timing, lifecycle, transition, attack, recovery, or absence of stale effects.
- Traces and logs are required for diagnostic claims, not as a substitute for visible evidence.

## Upgrade-level example

For visual upgrade levels 3–5:

- compare levels 1–5 directly, with emphasis on 3, 4, and 5;
- test equipment menu, preview, main menu, companion collection, and run only where the product contract requires the effect to appear;
- use representative combat rooms unless global room or combat logic changed;
- include motion evidence for particle intensity and attachment behavior;
- include Reduced Motion, low-GPU/static fallback, and WebGL recovery when renderer effects are involved;
- use all four portrait projects because mobile renderer and layout behavior can differ.

## Escalation rules

Immediately raise the risk level or expand the matrix when:

- a selected check fails outside the expected narrow scope;
- changed files touch shared state, shared navigation, rendering, persistence, economy, multiplayer, deployment, or global data;
- evidence shows clipping, black frames, stale models, wrong language, wrong state, duplicated effects, or device-specific divergence;
- a review, issue, user report, or existing acceptance criterion requires broader coverage;
- implementation differs materially from the original plan.

## Verifier responsibility

The verifier independently checks the diff, issue, failure history, test-plan mapping, results, and opened evidence. It must reject or expand a plan that understates risk, omits an acceptance criterion, uses irrelevant evidence, or treats a relevant failure as optional.

Ready and merge require:

- valid structured test plan;
- all selected and all otherwise applicable required checks green on the unchanged exact head;
- accepted relevant evidence;
- no known defect, unresolved review requirement, or unmet criterion;
- Expected-Head merge protection and successful required deployment.
