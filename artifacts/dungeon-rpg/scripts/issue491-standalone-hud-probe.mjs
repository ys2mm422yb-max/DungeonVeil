/**
 * Issue #491: non-mutating installed-iOS-PWA vs Safari HUD geometry probe.
 * Run manually from Safari remote Web Inspector on the SAME menu state in each mode.
 * No network requests, screenshots, text content, cookies, storage or credentials.
 * This probe is evidence collection only, NOT an installed-PWA compositor simulation.
 */
export function captureStandaloneHudGeometry() {
  const viewport = window.visualViewport;
  const root = document.documentElement;
  const body = document.body;
  const safeArea = document.createElement('div');
  safeArea.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;top:env(safe-area-inset-top);left:env(safe-area-inset-left);right:env(safe-area-inset-right);bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(safeArea);
  const safeRect = safeArea.getBoundingClientRect();
  safeArea.remove();

  const styleOf = (el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classNames: typeof el.className === 'string' ? el.className.slice(0, 180) : null,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      position: style.position,
      top: style.top,
      transform: style.transform,
      filter: style.filter,
      backdropFilter: style.backdropFilter,
      willChange: style.willChange,
      contain: style.contain,
      isolation: style.isolation,
      opacity: style.opacity,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      textRendering: style.textRendering,
      webkitFontSmoothing: style.webkitFontSmoothing
    };
  };

  // Include named HUD roots even when non-interactive; never read user text.
  // Reserve explicit HUD slots so generic controls cannot crowd them out.
  const hudSelector = '[data-testid="main-menu-profile-badge"], [data-testid*="currency"], [data-testid*="wallet"], [data-testid="main-menu-gold-button"], [data-testid="main-menu-dust-button"], [data-testid*="gold"], [data-testid*="gem"]';
  const visibleUpper = el => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 &&
      rect.top < Math.min(200, window.innerHeight * 0.35);
  };
  const explicitHud = [...document.querySelectorAll(hudSelector)].filter(visibleUpper).slice(0, 16);
  const upperControls = [...new Set([
    ...explicitHud,
    ...[...document.querySelectorAll('button, a, [role="button"]')].filter(visibleUpper)
  ])].slice(0, 32);
  const nodes = new Set([root, body]);
  for (const control of upperControls) {
    for (let node = control; node && node !== document; node = node.parentElement) {
      nodes.add(node);
    }
  }

  const result = {
    probeVersion: 1,
    capturedAt: new Date().toISOString(),
    standalone: navigator.standalone === true,
    displayModeStandalone: matchMedia('(display-mode: standalone)').matches,
    displayModeFullscreen: matchMedia('(display-mode: fullscreen)').matches,
    screen: { width: screen.width, height: screen.height },
    devicePixelRatio: devicePixelRatio,
    inner: { width: innerWidth, height: innerHeight },
    visualViewport: viewport ? {
      width: viewport.width, height: viewport.height,
      offsetTop: viewport.offsetTop, offsetLeft: viewport.offsetLeft,
      pageTop: viewport.pageTop, pageLeft: viewport.pageLeft, scale: viewport.scale
    } : null,
    safeAreaTop: safeRect.top,
    upperControlCount: upperControls.length,
    explicitHudCount: explicitHud.length,
    nodes: [...nodes].map(styleOf)
  };
  console.log('ISSUE491_HUD_GEOMETRY', JSON.stringify(result, null, 2));
  return result;
}
