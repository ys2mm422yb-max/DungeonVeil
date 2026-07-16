# Meaningful gift fusion capstones

The three existing fusion recipes still preserve the full rank-III effects of both component gifts. Each fusion now adds one distinct, bounded capstone so spending a milestone on the fusion changes combat instead of only compressing the HUD.

## Elemental Storm

- Keeps Fire Arrow III and Frost Arrow III.
- Every fifth fire or frost hit creates a small elemental burst around the struck enemy.
- Burst damage: 35% of current player attack.
- Radius: 92 game units.
- Maximum additional targets: 3.
- The burst does not trigger itself and does not create another elemental-status chain.

## Arrow Storm

- Keeps Multishot III and Quick Draw III.
- Multishot extra arrows deal 90% damage instead of 82%.
- The primary arrow and unrelated attacks are unchanged.

## Veil Chain

- Keeps Ricochet III and Piercing III.
- Ricochet and piercing follow-up hits deal 10% more damage.
- The primary arrow is unchanged.

## Runtime safety

The effects are installed only while an active game session exists. The original engine damage methods are restored when the session bridge is disposed, preventing duplicate wrappers after leaving and re-entering a run.
