## Scope

Describe the focused product or process change and link every addressed issue.

## Adaptive exact-head test plan

<!-- adaptive-test-plan:start -->

### Risk level

`low | medium | high | critical`

### Affected domains and surfaces

- Replace with concrete domains, files, systems, menus, rooms, states, modes, devices, and browsers.

### Acceptance-criterion mapping

- `AC-1` → concrete automated check and/or evidence item.
- Add one row for every issue, review, and user acceptance criterion.

### Selected checks

- Exact command, workflow, project, or job — why it proves the changed contract.

### Selected evidence

- Exact screenshot/video/trace/runtime state, device/project, menu/room/state, and why it is required.
- Use `none — process/docs-only; no executable or visible behavior changed` only when technically true.

### Omitted broad checks

- Exact broad check — technical reason it cannot be affected.
- Use `none` when all applicable broad checks are selected.

### Escalation triggers

- Concrete failures, changed files, review findings, or device divergence that will expand this plan.

### Verifier decision

`pending | accepted | expanded`

Verifier rationale: pending independent review.

<!-- adaptive-test-plan:end -->

## Results

Record exact head, commands, workflow/run/job IDs, artifacts, hashes, actually opened media, visible findings, and any plan escalation.

## Safety

- Base: `fix/mobile-telegraphs-room-21-50-balance`
- `main` and PR #315 untouched
- no auto-merge, force-push, reset, or automatic branch deletion
- Playwright retries remain `0`
- no weakened test, assertion, coverage, threshold, timeout, or acceptance criterion
