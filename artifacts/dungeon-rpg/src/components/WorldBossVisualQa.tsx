import React from 'react';
import { WorldBossBattleScreen } from './WorldBossBattleScreen';
import type { WorldBossEvent } from '../game/supabaseOnline';

const QA_EVENT: WorldBossEvent = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'ash-king-visual-qa',
  name: 'Der Aschenkönig',
  status: 'active',
  max_hp: 500000,
  current_hp: 424242,
  starts_at: new Date(0).toISOString(),
  ends_at: new Date(4102444800000).toISOString(),
  reward_config: {},
};

export function WorldBossVisualQa() {
  return <div data-testid="worldboss-visual-qa" className="fixed inset-0 bg-black">
    <WorldBossBattleScreen
      event={QA_EVENT}
      saveData={null}
      language="de"
      onClose={() => {}}
      onBossUpdated={() => {}}
    />
    <div data-testid="visual-qa-ready" className="pointer-events-none fixed bottom-1 right-1 z-[999] h-1 w-1 opacity-0" />
  </div>;
}
