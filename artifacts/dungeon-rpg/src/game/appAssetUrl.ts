const RAW_BASE_URL = String(import.meta.env.BASE_URL || '/');
const NORMALIZED_BASE_URL = RAW_BASE_URL.endsWith('/') ? RAW_BASE_URL : `${RAW_BASE_URL}/`;
const BASE_SEGMENT = NORMALIZED_BASE_URL.replace(/^\/+|\/+$/g, '');

export function appAssetUrl(path: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')) return path;

  const stripped = path.replace(/^\/+/, '');
  const alreadyBased = BASE_SEGMENT.length > 0
    && (stripped === BASE_SEGMENT || stripped.startsWith(`${BASE_SEGMENT}/`));
  const pathname = alreadyBased ? `/${stripped}` : `${NORMALIZED_BASE_URL}${stripped}`;

  // Keep bundled assets root-relative. WebKit otherwise treats nested GLTF resources
  // derived from absolute localhost URLs as cross-origin during fast page transitions.
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}
