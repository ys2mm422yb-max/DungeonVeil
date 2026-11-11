import test from 'node:test';
import assert from 'node:assert/strict';
import { captureStandaloneHudGeometry } from './issue491-standalone-hud-probe.mjs';

test('captures upper HUD without text and cleans up temporary safe-area element', () => {
  const rect = top => ({ x: 10, y: top, top, width: 40, height: 20 });
  const root = { tagName: 'HTML', id: '', className: '', parentElement: null, getBoundingClientRect: () => rect(0) };
  const body = { tagName: 'BODY', id: '', className: '', parentElement: root, getBoundingClientRect: () => rect(0) };
  const hud = { tagName: 'BUTTON', id: 'hud', className: 'hud', parentElement: body, getBoundingClientRect: () => rect(12), get textContent() { throw Error('private text accessed'); } };
  const below = { tagName: 'BUTTON', id: 'below', className: '', parentElement: body, getBoundingClientRect: () => rect(500) };
  let appended = 0, removed = 0;
  body.appendChild = el => { appended++; el.remove = () => removed++; };
  const document = { documentElement: root, body, createElement: () => ({ style: {}, getBoundingClientRect: () => ({ top: 47 }) }), querySelectorAll: () => [hud, below] };
  const style = { position: 'fixed', top: '47px', transform: 'none', filter: 'none', backdropFilter: 'none', willChange: 'auto', contain: 'none', isolation: 'auto', opacity: '1', fontSize: '9px', fontWeight: '400', lineHeight: 'normal', textRendering: 'auto', webkitFontSmoothing: 'auto' };
  const globals = { document, window: { visualViewport: { width: 390, height: 800, scale: 1, offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0 }, innerHeight: 800 }, navigator: { standalone: true }, screen: { width: 390, height: 844 }, devicePixelRatio: 3, innerWidth: 390, innerHeight: 800, matchMedia: () => ({ matches: true }), getComputedStyle: () => style };
  const originals = new Map();
  for (const [key, value] of Object.entries(globals)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const log = console.log;
  console.log = () => {};
  try {
    const result = captureStandaloneHudGeometry();
    assert.equal(result.standalone, true);
    assert.equal(result.displayModeStandalone, true);
    assert.equal(result.safeAreaTop, 47);
    assert.equal(result.devicePixelRatio, 3);
    assert.equal(result.upperControlCount, 1);
    assert.equal(result.nodes.some(n => n.id === 'hud'), true);
    assert.equal(result.nodes.some(n => n.id === 'below'), false);
    assert.equal(result.nodes.find(n => n.id === 'hud').fontSize, '9px');
    assert.equal(appended, 1);
    assert.equal(removed, 1);
  } finally {
    console.log = log;
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
