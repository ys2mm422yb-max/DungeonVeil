# Dungeon Veil test and evidence budgets

This contract applies to all current and future mobile portrait Playwright workflows.

## Required architecture

1. Static, TypeScript, simulator and persistence contracts run without success video recording.
2. Functional browser checks use `trace: retain-on-failure`, `video: retain-on-failure` and `retries: 0`.
3. Focused visual evidence records only the scenarios whose motion must be reviewed.
4. Production output is built once per exact head and reused by the four device jobs whenever the workflow supports it.
5. Successful runs upload compact manifests and review media only. Raw traces, raw failure video and browser reports are failure/manual-diagnostic artifacts.

## Hard budgets

- Target successful review artifact: at most 250 MiB.
- Absolute single-artifact ceiling: 400 MiB.
- Focused successful screenshot suites: at most 100 MiB per device.
- Focused failure diagnostics: at most 350 MiB per device, leaving safety margin below the download ceiling.
- Complete Runtime review videos: at most 250 MiB per device after SHA-256 deduplication.
- Playwright retries remain `0`.
- A normal four-device PR matrix targets at most 60 minutes wall clock; individual focused jobs target 35–45 minutes where the scenario depth permits it.

The reusable `scripts/assert-artifact-budget.mjs` command must run before uploads that can grow with test count. The dedicated `Evidence Budget Contracts` workflow rejects clear raw-success uploads and retry regressions.

## Measured improvement

### Before

The earlier Complete Runtime layout uploaded the whole Playwright output per device:

- Android phone: approximately 1.50 GB.
- Android tablet: approximately 1.71 GB.
- Raw video, traces, screenshots and browser reports were duplicated in one package.
- Packages exceeded the available 512 MB download path and could not be reviewed reliably.

### After

Exact head: `b3a86daeb91ab74aff850f1cb000259c1bc82478`  
Complete Runtime Evidence QA run: `30619275735`  
Result: all four portrait projects green, `retries: 0`.

| Device | Screenshot artifact | Distinct video artifact | Manifest |
| --- | ---: | ---: | ---: |
| iPhone / WebKit | 24,297,012 bytes (23.17 MiB) | 26,893,993 bytes (25.65 MiB) | 658,749 bytes (0.63 MiB) |
| Android phone / Chromium | 36,450,871 bytes (34.76 MiB) | 83,839,582 bytes (79.96 MiB) | 332,113 bytes (0.32 MiB) |
| iPad portrait / WebKit | 35,577,377 bytes (33.93 MiB) | 24,313,700 bytes (23.19 MiB) | 797,617 bytes (0.76 MiB) |
| Android tablet / Chromium | 51,650,721 bytes (49.26 MiB) | 81,094,665 bytes (77.34 MiB) | 414,098 bytes (0.39 MiB) |

Every successful review artifact is below 100 MiB and therefore far below both the 250 MiB target and the 400 MiB ceiling. The formerly oversized Android outputs are now split into independently downloadable screenshot, distinct-video and manifest artifacts.

### Repository-wide workflow validation

Exact head: `39af4ccedecdc1d4e105c743a6a2d3d73cb22da8`  
Draft PR: `#372`  
Result: all four Product Autopilot and all four Main Menu portrait jobs green with the new byte-accurate pre-upload budgets before this documentation-only follow-up commit.

| Workflow | Device | Successful evidence artifact |
| --- | --- | ---: |
| Product Autopilot QA | iPhone / WebKit | 34,738,523 bytes (33.13 MiB) |
| Product Autopilot QA | Android phone / Chromium | 55,389,279 bytes (52.82 MiB) |
| Product Autopilot QA | iPad portrait / WebKit | 43,445,069 bytes (41.43 MiB) |
| Product Autopilot QA | Android tablet / Chromium | 67,453,151 bytes (64.33 MiB) |
| Main Menu Visual Regression | iPhone / WebKit | 8,514,159 bytes (8.12 MiB) |
| Main Menu Visual Regression | Android phone / Chromium | 18,495,018 bytes (17.64 MiB) |
| Main Menu Visual Regression | iPad portrait / WebKit | 8,940,323 bytes (8.53 MiB) |
| Main Menu Visual Regression | Android tablet / Chromium | 24,759,172 bytes (23.61 MiB) |

No raw trace, failure video or HTML report was uploaded for these successful device jobs.

## Workflow rules

- `Complete Runtime Evidence QA` keeps screenshots and hash-distinct videos separate. Its raw diagnostics marker remains available only after failure or manual dispatch.
- `Full Game Regression` uploads a small result manifest on every device and traces/video only after failure.
- `Product Autopilot QA` checks a 100 MiB success budget and a 350 MiB focused failure budget. It must not upload `test-results/**` or the complete HTML report.
- `Main Menu Visual Regression` checks the same focused budgets, uses the shared browser cache and uploads raw diagnostics only after failure.
- New workflows must be accepted by `validate-evidence-budget-contracts.mjs` before merge.

## Review requirement

Artifact reduction never replaces visual review. Before a product PR is merged, every required screenshot and each hash-distinct review video on the exact unchanged head still has to be inspected for black frames, frozen motion, clipping, stale UI, desynchronisation and device-specific regressions.
