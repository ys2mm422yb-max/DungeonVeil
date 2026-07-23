import {
  loadCompanionCollectionV5,
  saveCompanionCollectionV5,
  type CompanionCollectionStateV5,
} from './companionCollectionV5';

export function unequipActiveCompanionV5(): CompanionCollectionStateV5 {
  const state = loadCompanionCollectionV5();
  if (!state.activeId) return state;
  return saveCompanionCollectionV5({ ...state, activeId: null, updatedAt: Date.now() });
}
