import { loadMetaProgression, saveMetaProgression, type MetaProgression } from './metaProgression';

export function grantMetaDust(amount: number): MetaProgression {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  const meta = loadMetaProgression();
  if (value <= 0) return meta;
  meta.dust += value;
  return saveMetaProgression(meta);
}

/** One-time compatibility bridge. The caller persists currencyVersion 2 before invoking it. */
export function migrateLegacySigilsToDust(amount: number): MetaProgression {
  return grantMetaDust(amount);
}
