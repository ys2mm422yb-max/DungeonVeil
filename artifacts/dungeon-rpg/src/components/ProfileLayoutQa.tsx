import { useMemo, useState } from 'react';
import { loadMetaProgression, type MetaProgression } from '../game/metaProgression';
import { loadPlayerProfile, type PlayerProfileProgress } from '../game/playerProfile';
import { loadRetentionProfile, type RetentionProfile } from '../game/runRetention';
import { normalizePublicEquipmentItems, type SocialProfileCardData } from '../game/socialProgressOnline';
import { PlayerProfileCard } from './PlayerProfileCard';
import { PlayerProfilePanel } from './PlayerProfilePanel';

type View = 'own' | 'public';

function qaMeta(): MetaProgression {
  const meta = loadMetaProgression();
  meta.rank = 12;
  meta.owned = {
    'ash-bow': { level: 2, copies: 1 },
    'ember-bow': { level: 3, copies: 2 },
    'ranger-quiver': { level: 2, copies: 1 },
    'black-quiver': { level: 2, copies: 0 },
    'ranger-cloak': { level: 3, copies: 2 },
    'ash-armor': { level: 4, copies: 1 },
  };
  meta.equipped.bow = 'ember-bow';
  meta.equipped.quiver = 'black-quiver';
  meta.equipped.armor = 'ash-armor';
  return meta;
}

function qaProfile(): PlayerProfileProgress {
  const profile = loadPlayerProfile();
  profile.selectedTitle = 'boss-hunter';
  profile.selectedCard = 'warden';
  profile.selectedAvatar = 'warden';
  profile.stats = {
    runsStarted: 18,
    roomsCleared: 146,
    enemiesDefeated: 904,
    bossesDefeated: 21,
    totalDamage: 187450,
    itemsFound: 14,
    questsCompleted: 27,
    playTimeMs: 8_640_000,
    highestChapter: 7,
    highestRoom: 38,
  };
  return profile;
}

function qaRetention(): RetentionProfile {
  const retention = loadRetentionProfile();
  retention.codex = {
    enemies: ['goblin', 'skeleton', 'orc'],
    bosses: ['warden', 'ash-king'],
    hunts: ['night-claw'],
    relics: ['guardian-crown', 'world-core'],
  };
  return retention;
}

function qaPublicProfile(): SocialProfileCardData {
  const equippedItems = normalizePublicEquipmentItems([
    { slot: 'bow', id: 'ember-bow', level: 3, rarity: 'rare' },
    { slot: 'quiver', id: 'black-quiver', level: 2, rarity: 'rare' },
    { slot: 'talisman', id: 'veil-key', level: 5, rarity: 'epic' },
    { slot: 'armor', id: 'ash-armor', level: 4, rarity: 'rare' },
  ]);
  return {
    id: 'profile-layout-qa',
    display_name: 'Schleierjäger',
    avatar_key: null,
    friend_code: 'QA-VEIL-27',
    current_chapter: 7,
    current_rank: 12,
    character_key: 'archer',
    last_active_at: new Date().toISOString(),
    guild_name: 'Wächter des Schleiers',
    guild_tag: 'VEIL',
    joined_at: '2026-01-15T12:00:00.000Z',
    account_level: 12,
    lifetime_world_boss_damage: 248650,
    world_boss_events: 9,
    friend_count: 18,
    achievement_keys: ['first_steps', 'veil_walker', 'boss_hunter', 'guild_bound'],
    activity_state: 'menu',
    activity_chapter: 7,
    activity_room: 38,
    highest_chapter: 7,
    highest_room: 38,
    rooms_cleared: 146,
    enemies_defeated: 904,
    bosses_defeated: 21,
    quests_completed: 27,
    play_time_ms: 8_640_000,
    total_damage: 187450,
    items_found: 14,
    equipped_items: equippedItems,
  };
}

export function ProfileLayoutQa() {
  const [view, setView] = useState<View>('own');
  const profile = useMemo(qaProfile, []);
  const meta = useMemo(qaMeta, []);
  const retention = useMemo(qaRetention, []);
  const publicProfile = useMemo(qaPublicProfile, []);

  return <div data-testid="profile-layout-qa" className="fixed inset-0 bg-[#07080b]">
    {view === 'own'
      ? <PlayerProfilePanel profile={profile} saveData={null} meta={meta} retention={retention} language="de" onProfileChange={() => {}} onClose={() => {}} />
      : <PlayerProfileCard userId="profile-layout-qa" language="de" onClose={() => {}} profileOverride={publicProfile} />}
    <div className="fixed left-1/2 top-[max(8px,env(safe-area-inset-top))] z-[999] flex -translate-x-1/2 gap-1 rounded-xl border border-white/12 bg-black/85 p-1 shadow-xl">
      <button data-testid="profile-qa-own" type="button" onClick={() => setView('own')} className={`rounded-lg px-3 py-2 text-[7px] font-black uppercase tracking-[.12em] ${view === 'own' ? 'bg-amber-400/18 text-amber-100' : 'text-white/45'}`}>Eigenes Profil</button>
      <button data-testid="profile-qa-public" type="button" onClick={() => setView('public')} className={`rounded-lg px-3 py-2 text-[7px] font-black uppercase tracking-[.12em] ${view === 'public' ? 'bg-cyan-400/18 text-cyan-100' : 'text-white/45'}`}>Freundesprofil</button>
    </div>
    <span data-testid="profile-layout-diagnostics" data-active-slots={publicProfile.equipped_items.length} data-legacy-talisman-filtered={publicProfile.equipped_items.some(item => String(item.slot) === 'talisman') ? 'false' : 'true'} className="sr-only" />
  </div>;
}
