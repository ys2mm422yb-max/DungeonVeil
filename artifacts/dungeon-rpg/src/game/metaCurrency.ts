import { loadMetaProgression, saveMetaProgression, type MetaProgression } from './metaProgression';

export function grantMetaDust(amount: number): MetaProgression {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  const meta = loadMetaProgression();
  if (value <= 0) return meta;
  meta.dust += value;
  return saveMetaProgression(meta);
}

export function migrateLegacySigilsToDust(amount: number): MetaProgression {
  return grantMetaDust(amount);
}
