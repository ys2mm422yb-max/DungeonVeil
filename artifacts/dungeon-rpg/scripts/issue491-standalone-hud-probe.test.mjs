import test from 'node:test';
import assert from 'node:assert/strict';
import { captureStandaloneHudGeometry } from './issue491-standalone-hud-probe.mjs';

function runProbe(missing = []) {
  const rect = top => ({ x: 10, y: top, top, bottom: top + 20, width: 40, height: 20 });
  const element = (tagName, id, top, parentElement, testId = null) => ({
    tagName, id, className: '', parentElement,
    getBoundingClientRect: () => rect(top),
    getAttribute: key => key === 'data-testid' ? testId : null,
    querySelectorAll: () => [],
    get textContent() { throw Error('private text accessed'); },
    get innerText() { throw Error('private innerText accessed'); }
  });
  const root = element('HTML', '', 0, null);
  const body = element('BODY', '', 0, root);
  const ids = ['main-menu-profile-badge', 'main-menu-dust-button',
    'main-menu-gold-button', 'main-menu-settings-button'];
  const controls = new Map(ids.filter(id => !missing.includes(id)).map((id, index) =>
    [id, element('BUTTON', 'hud-' + index, 10 + index * 4, body, id)]));
  const icon = element('SVG', 'profile-icon', 12, controls.get(ids[0]) || body);
  if (controls.has(ids[0])) controls.get(ids[0]).querySelectorAll = () => [icon];
  const below = element('BUTTON', 'below', 500, body);
  let appended = 0, removed = 0;
  body.appendChild = el => { appended++; el.remove = () => removed++; };
  const document = {
    documentElement: root, body,
    createElement: () => ({ style: {}, getBoundingClientRect: () => ({ top: 47 }) }),
    querySelector: selector => {
      const match = /^\[data-testid="([^"]+)"\]$/.exec(selector);
      assert.ok(match, 'required HUD queried individually');
      return controls.get(match[1]) || null;
    },
    querySelectorAll: selector => {
      assert.equal(selector, 'button, a, [role="button"]');
      return [...controls.values(), below];
    }
  };
  const style = { position: 'fixed', top: '47px', transform: 'none', filter: 'none',
    backdropFilter: 'none', willChange: 'auto', contain: 'none', isolation: 'auto',
    opacity: '1', fontSize: '9px', fontWeight: '400', lineHeight: 'normal',
    textRendering: 'auto', webkitFontSmoothing: 'auto' };
  const globals = { document, window: { visualViewport: { width: 390, height: 800,
    scale: 1, offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0 }, innerHeight: 800 },
    navigator: { standalone: true }, screen: { width: 390, height: 844 },
    devicePixelRatio: 3, innerWidth: 390, innerHeight: 800,
    matchMedia: () => ({ matches: true }), getComputedStyle: () => style };
  const originals = new Map();
  for (const [key, value] of Object.entries(globals)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const log = console.log;
  console.log = () => {};
  try {
    return { result: captureStandaloneHudGeometry(), appended, removed };
  } finally {
    console.log = log;
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('captures individually named profile, dust, gold and settings HUD with icon geometry, no private text', () => {
  const { result, appended, removed } = runProbe();
  assert.equal(result.standalone, true);
  assert.equal(result.safeAreaTop, 47);
  assert.equal(result.devicePixelRatio, 3);
  assert.equal(result.explicitHudCount, 4);
  assert.equal(result.upperControlCount, 4);
  assert.deepEqual(result.missingHudTestIds, []);
  for (const target of result.requiredHud) {
    assert.equal(target.found, true, target.testId);
    assert.equal(target.visible, true, target.testId);
    assert.ok(result.nodes.some(n => n.testId === target.testId), target.testId);
  }
  assert.ok(result.nodes.some(n => n.id === 'profile-icon' && n.tag === 'svg'));
  assert.ok(!result.nodes.some(n => n.id === 'below'));
  assert.equal(appended, 1);
  assert.equal(removed, 1);
});

test('reports a missing mandatory HUD target instead of accepting a selector-string mock', () => {
  const { result } = runProbe(['main-menu-dust-button']);
  assert.deepEqual(result.missingHudTestIds, ['main-menu-dust-button']);
  assert.equal(result.explicitHudCount, 3);
  assert.equal(result.requiredHud.find(x => x.testId === 'main-menu-dust-button').found, false);
});
