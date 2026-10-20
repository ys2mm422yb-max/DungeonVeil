#!/usr/bin/env node

import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const PRODUCT_AUTOPILOT_SPECS = Object.freeze([
  "tests/autopilot-product-journeys.spec.mjs",
  "tests/run-gift-authority.spec.mjs",
  "tests/autopilot-outside-guild.spec.mjs",
  "tests/guild-mail-equipment-visual.spec.mjs",
  "tests/mobile-resource-upgrade.spec.mjs",
  "tests/companion-runtime.spec.mjs",
  "tests/companion-free-movement-evidence.spec.mjs",
  "tests/spectator-performance.spec.mjs",
  "tests/upgrade-prestige-visual.spec.mjs",
  "tests/upgrade-prestige-mobile-hotfix.spec.mjs",
  "tests/visible-upgrade-prestige.spec.mjs",
  "tests/kaykit-chapter-evidence.spec.mjs",
  "tests/guild-raid-lobby-mobile.spec.mjs",
  "tests/armor-cloud-restore-render.spec.mjs",
  "tests/spectator-death-state.spec.mjs",
  "tests/player-death-state.spec.mjs",
  "tests/duo-encounter-authority-kernel.spec.mjs",
  "tests/duo-encounter-authority-recovery.spec.mjs",
]);

const SPEC_SET = new Set(PRODUCT_AUTOPILOT_SPECS);
const START = "<!-- product-autopilot-selection:start -->";
const END = "<!-- product-autopilot-selection:end -->";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseExplicitSelection(body) {
  const start = body.indexOf(START);
  const end = body.indexOf(END);
  if (start < 0 || end < 0 || end <= start) return null;
  const block = body.slice(start + START.length, end);
  if (/\bFULL_PRODUCT_AUTOPILOT\b/.test(block))
    return [...PRODUCT_AUTOPILOT_SPECS];

  const listed = [
    ...block.matchAll(/`(tests\/[A-Za-z0-9._/-]+\.spec\.mjs)`/g),
  ].map((match) => match[1]);
  if (listed.length === 0) {
    throw new Error(
      "Product Autopilot selection block exists but lists no allowed spec.",
    );
  }
  for (const spec of listed) {
    if (!SPEC_SET.has(spec))
      throw new Error(`Unknown Product Autopilot spec in PR body: ${spec}`);
  }
  return listed;
}

function addSafetySpecs(selected, changedFiles) {
  const joined = changedFiles.join("\n");
  const add = (...specs) => specs.forEach((spec) => selected.add(spec));

  // A directly changed Product Autopilot spec can never be omitted by the PR body.
  for (const spec of PRODUCT_AUTOPILOT_SPECS) {
    if (changedFiles.includes(`artifacts/dungeon-rpg/${spec}`)) add(spec);
  }

  if (
    /spectator|socialSpectatorOnline|SpectatorPlaybackStage|SpectatorPerformanceQa/i.test(
      joined,
    )
  ) {
    add("tests/spectator-performance.spec.mjs");
  }
  if (
    /CompanionRuntimeBridge|companion-runtime|companionFree|companion-free/i.test(
      joined,
    )
  ) {
    add(
      "tests/companion-runtime.spec.mjs",
      "tests/companion-free-movement-evidence.spec.mjs",
    );
  }
  if (
    /rendererRecovery|runtimeEvidenceBridge|GameCanvas|webgl|canvas-lifecycle/i.test(
      joined,
    )
  ) {
    add(
      "tests/autopilot-product-journeys.spec.mjs",
      "tests/armor-cloud-restore-render.spec.mjs",
    );
  }
  if (/guild[-_/ ]?raid|GuildRaid/i.test(joined)) {
    add(
      "tests/guild-raid-lobby-mobile.spec.mjs",
      "tests/autopilot-outside-guild.spec.mjs",
    );
  }
  if (
    /upgrade-prestige|visible-upgrade|companionUpgradePrestige3D|prestige/i.test(
      joined,
    )
  ) {
    add(
      "tests/upgrade-prestige-visual.spec.mjs",
      "tests/upgrade-prestige-mobile-hotfix.spec.mjs",
      "tests/visible-upgrade-prestige.spec.mjs",
    );
  }
  if (
    /runGift|run-gift|fireArrow|fire-arrow|quickDraw|quick-draw/i.test(joined)
  ) {
    add("tests/run-gift-authority.spec.mjs");
  }
  if (/armor.*cloud|cloud.*restore|restore.*armor/i.test(joined)) {
    add("tests/armor-cloud-restore-render.spec.mjs");
  }
  if (
    /duo[-_/ ]?authority|duo-encounter-authority|coop_authority|trustedCoopCompletion|coop_(session|encounter)_authority/i.test(
      joined,
    )
  ) {
    add(
      "tests/duo-encounter-authority-kernel.spec.mjs",
      "tests/duo-encounter-authority-recovery.spec.mjs",
    );
  }
  if (
    /install-playwright-deps-bounded|product-autopilot-qa|full-game-regression/i.test(
      joined,
    )
  ) {
    // Central browser workflow changes must still prove a genuine browser journey.
    add("tests/autopilot-product-journeys.spec.mjs");
  }

  return selected;
}

function resolveSelection({ eventName, body, changedFiles }) {
  if (eventName !== "pull_request") return [...PRODUCT_AUTOPILOT_SPECS];

  const explicit = parseExplicitSelection(body);
  // Fail closed for existing PRs that have not adopted the new declaration yet.
  if (explicit === null) return [...PRODUCT_AUTOPILOT_SPECS];

  const selected = addSafetySpecs(new Set(explicit), changedFiles);
  if (selected.size === 0)
    throw new Error("Adaptive Product Autopilot resolved to zero specs.");
  return PRODUCT_AUTOPILOT_SPECS.filter((spec) => selected.has(spec));
}

function selfTest() {
  const block = (specs) =>
    `${START}\n### Selected Product Autopilot specs\n${specs.map((s) => `- \`${s}\``).join("\n")}\n${END}`;

  const legacy = resolveSelection({
    eventName: "pull_request",
    body: "",
    changedFiles: [],
  });
  if (legacy.length !== PRODUCT_AUTOPILOT_SPECS.length)
    throw new Error("Missing declaration must fail closed to full suite.");

  const spectator = resolveSelection({
    eventName: "pull_request",
    body: block(["tests/spectator-performance.spec.mjs"]),
    changedFiles: [
      "artifacts/dungeon-rpg/src/components/SpectatorPlaybackStage.tsx",
    ],
  });
  if (spectator.join(",") !== "tests/spectator-performance.spec.mjs")
    throw new Error("Spectator focus selection is not stable.");

  const companion = resolveSelection({
    eventName: "pull_request",
    body: block(["tests/spectator-performance.spec.mjs"]),
    changedFiles: [
      "artifacts/dungeon-rpg/src/components/CompanionRuntimeBridge.tsx",
    ],
  });
  for (const required of [
    "tests/spectator-performance.spec.mjs",
    "tests/companion-runtime.spec.mjs",
    "tests/companion-free-movement-evidence.spec.mjs",
  ]) {
    if (!companion.includes(required))
      throw new Error(`Companion safety selection omitted ${required}`);
  }

  const renderer = resolveSelection({
    eventName: "pull_request",
    body: block(["tests/spectator-performance.spec.mjs"]),
    changedFiles: [
      "artifacts/dungeon-rpg/src/game/rendererRecoveryStableBaseline.ts",
    ],
  });
  for (const required of [
    "tests/autopilot-product-journeys.spec.mjs",
    "tests/spectator-performance.spec.mjs",
    "tests/armor-cloud-restore-render.spec.mjs",
  ]) {
    if (!renderer.includes(required))
      throw new Error(`Renderer safety selection omitted ${required}`);
  }

  const duo = resolveSelection({
    eventName: "pull_request",
    body: block(["tests/autopilot-product-journeys.spec.mjs"]),
    changedFiles: [
      "supabase/migrations/20260911150000_create_coop_encounter_authority.sql",
    ],
  });
  for (const required of [
    "tests/autopilot-product-journeys.spec.mjs",
    "tests/duo-encounter-authority-kernel.spec.mjs",
    "tests/duo-encounter-authority-recovery.spec.mjs",
  ]) {
    if (!duo.includes(required))
      throw new Error(`Duo authority safety selection omitted ${required}`);
  }

  const directDuoSpec = resolveSelection({
    eventName: "pull_request",
    body: block(["tests/autopilot-product-journeys.spec.mjs"]),
    changedFiles: [
      "artifacts/dungeon-rpg/tests/duo-encounter-authority-kernel.spec.mjs",
    ],
  });
  if (
    !directDuoSpec.includes("tests/duo-encounter-authority-kernel.spec.mjs")
  ) {
    throw new Error("Directly changed Duo authority spec was omitted.");
  }

  const push = resolveSelection({
    eventName: "push",
    body: block(["tests/spectator-performance.spec.mjs"]),
    changedFiles: [],
  });
  if (push.length !== PRODUCT_AUTOPILOT_SPECS.length)
    throw new Error(
      "Target-branch push must retain full Product Autopilot coverage.",
    );

  let rejectedUnknown = false;
  try {
    resolveSelection({
      eventName: "pull_request",
      body: block(["tests/not-real.spec.mjs"]),
      changedFiles: [],
    });
  } catch {
    rejectedUnknown = true;
  }
  if (!rejectedUnknown)
    throw new Error("Unknown declared spec must fail validation.");

  console.log("Adaptive Product Autopilot selector self-test passed.");
}

const invokedAsScript =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedAsScript) {
  if (process.argv.includes("--self-test")) {
    selfTest();
    process.exit(0);
  }

  const eventName = arg("--event") ?? process.env.GITHUB_EVENT_NAME ?? "";
  const changedFilesPath = arg("--changed-files");
  const outputPath = arg("--output");
  const body = process.env.PR_BODY ?? "";
  const changedFiles =
    changedFilesPath && fs.existsSync(changedFilesPath)
      ? fs
          .readFileSync(changedFilesPath, "utf8")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      : [];
  const resolved = resolveSelection({ eventName, body, changedFiles });
  const text = `${resolved.join("\n")}\n`;
  if (outputPath) fs.writeFileSync(outputPath, text);
  else process.stdout.write(text);
  console.error(
    `Product Autopilot selected ${resolved.length}/${PRODUCT_AUTOPILOT_SPECS.length} specs for ${eventName || "unknown event"}.`,
  );
}
