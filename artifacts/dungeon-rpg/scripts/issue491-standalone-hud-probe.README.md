# Issue #491: installed-iPhone PWA / Safari diagnostic execution contract

This is a **diagnostic-only** procedure for PR #502. It does not prove or fix blur. Keep #491 open and preserve #500 release gates.

## Availability precondition

`issue491-standalone-hud-probe.mjs` is an **unimported source file**. Merely opening the current public Pages game will **not** make this file available: PR #502 has not been merged or published. Never infer that the public URL serves the PR file. Before executing, verify the **exact PR-head build** and that the module URL returns JavaScript with HTTP 200 on an explicitly authorized test origin. Do not publish from `main`, bypass release gates, or merge PR #502 solely to make the probe accessible.

## Remote Web Inspector invocation

On a test origin that serves the exact PR-head module alongside the game, connect a physical iPhone to Safari Web Inspector. In the console for the **same game document** and matched upper-main-menu state, run:

```js
const { captureStandaloneHudGeometry } = await import(
  new URL('./scripts/issue491-standalone-hud-probe.mjs', document.baseURI).href
);
const issue491Evidence = captureStandaloneHudGeometry();
console.log(JSON.stringify(issue491Evidence, null, 2));
```

The relative URL above is valid **only if** `document.baseURI` is the game artifact root and the test server exposes `scripts/` there. Otherwise resolve a verified same-origin module URL; do not guess. The module exports a function and does not attach it to `window`; pasting just the function name into the console without importing it will fail.

## No-deployment Web Inspector fallback (same published game document)

If an authorized exact-head module origin is unavailable, the **diagnostic function can instead be run directly in the physical iPhone's Safari Web Inspector console** on the existing game document, without importing or publishing the PR module. Read the complete source of `issue491-standalone-hud-probe.mjs` from the exact PR commit, copy the full `export function captureStandaloneHudGeometry() { ... }` declaration, remove **only** the leading `export ` keyword (console scripts are not ES modules), paste the resulting function declaration into the Web Inspector console, then execute `captureStandaloneHudGeometry()`. Keep the original output and record the exact source commit SHA used. Do **not** paste the entire file unchanged: `export` is a syntax error in a classic console script. This fallback uses the exact reviewed function body but **does not establish that the running game itself is the PR head**. Record the actual deployed game version separately; the same public game build and the same copied probe function must be used in installed-PWA and Safari modes. Never claim this as an exact-head PR deployment or a causal fix.

Remote Web Inspector must actually attach to the installed standalone PWA for this to qualify. If it cannot, record the limitation. The probe is read-only except for a transient hidden safe-area measurement element, which it removes immediately. It does not transmit data or change the game HUD. Capture both original unscaled screenshots separately; geometry output alone cannot measure blur.

## Required matched evidence

Capture original unscaled iPhone screenshots in both **installed Home-screen standalone** and **normal Safari** at the same menu state, device orientation, text-size/zoom setting and game version. Record device model, iOS version, capture time, exact URL/commit, DPR, viewport scale/offset, safe-area top, element rectangles and computed ancestor styles from both probe outputs. Note whether a reload or foreground transition changes the symptom. Redact account information; the script itself intentionally does not collect text or credentials.

Compare corresponding original pixel crops for the profile and currency HUD; geometry alone cannot prove compositor sharpness. If Safari remote inspection cannot attach to the installed PWA, record the limitation explicitly rather than substituting desktop or simulated WebKit evidence.

## Acceptance boundary

This procedure is **not** a fix, a real-device run, a verified deployed probe, or verifier acceptance. Any proposed UI change requires a new causal hypothesis, focused tests with Playwright retries 0, all four portrait-device visual/runtime checks, physical installed-iPhone A/B and independent exact-head verifier acceptance. Preserve all existing red/missing release gates.
