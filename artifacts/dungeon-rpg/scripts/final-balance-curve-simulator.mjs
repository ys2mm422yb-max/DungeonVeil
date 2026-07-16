#!/usr/bin/env node

const CHAPTERS = 12;
const ROOMS = [1, 10, 20, 30, 40, 50];
const BASE_HP = 92;
const BASE_ATTACK = 12;
const PLAYER_HP = 206;
const PLAYER_ATTACK = 29;

function chapterProfile(chapter) {
  const fixed = [
    [1, 1, 1],
    [1.12, 1.08, 1.14],
    [1.24, 1.16, 1.3],
    [1.36, 1.24, 1.46],
    [1.48, 1.32, 1.62],
    [1.6, 1.4, 1.78],
  ];
  if (chapter <= fixed.length) {
    const [hpScale, attackScale, bossHpScale] = fixed[chapter - 1];
    return { hpScale, attackScale, bossHpScale };
  }
  const overflow = chapter - fixed.length;
  return { hpScale: 1.6 + overflow * 0.08, attackScale: 1.4 + overflow * 0.06, bossHpScale: 1.78 + overflow * 0.1 };
}

function roomHpScale(room) { return 1 + Math.max(0, room - 1) * 0.022; }
function roomAttackScale(room) { return 1 + Math.max(0, room - 1) * 0.0105; }

export function simulateFinalBalanceCurve() {
  const rows = [];
  for (let chapter = 1; chapter <= CHAPTERS; chapter++) {
    const profile = chapterProfile(chapter);
    for (const room of ROOMS) {
      const normalHp = Math.round(BASE_HP * roomHpScale(room) * profile.hpScale);
      const normalAttack = Math.round(BASE_ATTACK * roomAttackScale(room) * profile.attackScale);
      rows.push({
        chapter,
        room,
        normalHp,
        normalAttack,
        normalHitsToKill: Math.ceil(normalHp / PLAYER_ATTACK),
        playerHitsSurvived: Math.ceil(PLAYER_HP / Math.max(1, normalAttack)),
      });
    }
  }
  return {
    scenario: 'final-central-enemy-curve',
    chapters: CHAPTERS,
    playerReference: { hp: PLAYER_HP, attack: PLAYER_ATTACK },
    rows,
  };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log(JSON.stringify(simulateFinalBalanceCurve(), null, 2));
}
