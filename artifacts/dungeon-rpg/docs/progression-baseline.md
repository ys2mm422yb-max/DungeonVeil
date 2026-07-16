# Dungeon Veil progression baseline

Generated deterministically from simulator version 1.

- Baseline commit: `68508484353162e987e20ade64bb259845250e1b`
- Seed: `99537257`
- Samples: 2048
- Simulated chapters per sample: 160

## Current warnings

- **ERROR · starter_copies_impossible:** All four starter items are excluded from drop pools, so their required copies can never be earned.
- **ERROR · equipment_source_skew:** The busiest equipment source receives 11.7x as many attempts as the rarest source.
- **ERROR · early_guaranteed_drops_have_empty_pools:** Most chapter-one boss/depth equipment attempts cannot award an item because those source pools are still chapter-locked.
- **ERROR · unbounded_gift_overflow:** Repeatable attack/health overflow starts in chapter one and then adds 50 more uncapped choices per later chapter.
- **WARNING · room20_is_special_reward_boss:** The reward formula still treats room 20 as the chapter boss while room 50 receives only the standard boss reward.
- **ERROR · guardian_crown_unbounded:** The Guardian Crown reaches about 10.835x attack after five uninterrupted chapters.
- **WARNING · relic_source_skew:** Completing the boss relic set takes about 5.3x as many chapters as the hunt relic set.
- **ERROR · player_growth_outpaces_enemy_attack:** Raw attack from repeatable gifts grows substantially faster than the final-boss attack curve across chapters.

## Equipment sources

| Source | Chapter 1 attempts | Chapter 1 awarded items | Chapter 1 empty-attempt rate | Steady-state attempts |
|---|---:|---:|---:|---:|
| forge | 0.523 | 0.343 | 0.344 | 0.537 |
| hunt | 3.813 | 0 | 1 | 3.869 |
| warden | 5.36 | 0 | 1 | 5.361 |
| ritual | 0.52 | 0 | 1 | 0.536 |
| depth | 6.357 | 0 | 1 | 6.286 |

An “attempt” is a successful equipment roll before checking whether the source currently has an eligible item. An empty attempt therefore produces no equipment object.

## Room-clear economy

| Chapter | XP | Veil Dust | Gold |
|---|---:|---:|---:|
| 1 | 6020 | 1480 | 24770 |
| 2 | 6490 | 1535 | 26090 |
| 3 | 6960 | 1590 | 27410 |
| 4 | 7430 | 1645 | 28730 |
| 5 | 7900 | 1700 | 30050 |

Hunt and relic dust are simulated separately and included in the JSON report.

## Slowest non-starter copy paths

| Item | Source | Median first owned chapter | Median chapter with 11 copies | P90 chapter with 11 copies |
|---|---|---:|---:|---:|
| veil-bow | ritual | 8 | 112 | 156 |
| rune-quiver | ritual | 8 | 112 | 157 |
| veil-mantle | ritual | 8 | 112 | 157 |
| ritual-shard | ritual | 8 | 111 | 155 |
| veil-eye | ritual | 8 | 111 | 157 |
| splinter-bow | forge | 6 | 110 | 154 |
| ash-armor | forge | 5 | 110 | 153 |
| ember-bow | forge | 4 | 109 | 153 |
| splinter-quiver | forge | 6 | 108 | 152 |
| ash-amulet | forge | 5 | 108 | 150 |

The four starter items remain impossible to raise through copies in the current baseline because they are excluded from every drop pool.

## Gifts across uninterrupted chapters

| Chapter | Total choices | Repeatable overflow choices | Offensive raw attack | Defensive max HP | Guardian Crown multiplier |
|---:|---:|---:|---:|---:|---:|
| 1 | 50 | 17 | 57 | 318 | 1.611x |
| 2 | 100 | 67 | 157 | 718 | 2.594x |
| 5 | 250 | 217 | 457 | 1918 | 10.835x |
| 10 | 500 | 467 | 957 | 3918 | 117.391x |

The attack and health columns intentionally isolate the current repeatable overflow policy. They are reference curves, not a full combat-DPS prediction.

## Final boss reference

| Chapter | HP | Attack |
|---:|---:|---:|
| 1 | 8467 | 88 |
| 2 | 11514 | 104 |
| 3 | 14566 | 120 |
| 4 | 17613 | 137 |
| 5 | 20661 | 157 |
| 10 | 35902 | 201 |
