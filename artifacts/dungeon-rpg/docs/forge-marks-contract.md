# Forge Marks contract

## Product contract

Forge Marks replace the retired wish-item and source-mark system.

- Forge Marks are one global rare equipment currency.
- Ten Forge Marks buy exactly one random permanent equipment item.
- Valid categories are bow, quiver and armor only.
- Relics, companions, consumables and currencies never enter the pool.
- Duplicates are valid because equipment copies are required for upgrades.
- Nine marks cannot exchange.
- Ten marks exchange exactly once and deduct exactly ten.
- A repeated request with the same exchange id returns the original receipt and never grants a second item.
- Old source-mark balances migrate one-for-one into the global Forge Mark balance.
- Old wish selection, wish chances, pity counters and wish ledgers are ignored after migration.

## Drop economy

Normal rooms have no Forge Mark roll. Marks are reserved for special combat outcomes:

| Source | Chance per eligible event |
|---|---:|
| Hunt target | 1.0% |
| Intermediate boss rooms 10, 20, 30 and 40 | 2.5% |
| Chapter boss room 50 | 7.5% |

The existing authored hunt cadence averages about twelve hunt targets per 50-room chapter. Together with four intermediate bosses and one chapter boss, the expected mark income is approximately 0.295 marks per completed chapter. A deterministic large-sample simulation must keep the ten-mark exchange near these target bands:

- P10: roughly 22 completed chapters
- Median: roughly 33 completed chapters
- P90: roughly 48 completed chapters
- P99: roughly 63 completed chapters

This intentionally makes Forge Marks one of the rarest regular progression rewards. They are a long-term bonus path and not a reliable room-farming currency.

## Random equipment pool

The active equipment catalogue currently contains four bows, three quivers and three armor items. Category selection therefore follows the active catalogue distribution:

- bow: 40%
- quiver: 30%
- armor: 30%

Within the selected category, only active items unlocked for the player's current rank and highest reached chapter are eligible. Existing rarity tiers provide the item weights:

- common: 55
- rare: 32
- epic: 13

If the selected category has no eligible item, selection falls back to the complete eligible active pool. Starter equipment guarantees that a valid pool always exists for a normalized save.

## Atomic and idempotent exchange

The local save uses a small transaction journal because the Forge Mark profile and equipment inventory are stored in separate local-storage records.

1. The caller supplies a stable exchange id for one user intent.
2. The Forge Mark profile records a pending transaction with the selected item and pre-exchange balance.
3. The equipment inventory writes an idempotency key to the existing meta reward ledger while granting the item or max-level dust conversion.
4. The Forge Mark profile finalizes the ten-mark deduction and stores the immutable exchange receipt.
5. On reload, a pending transaction is recovered:
   - if the meta reward key exists, finalize the deduction and receipt;
   - otherwise discard the uncommitted pending transaction without deducting marks.

A module-level execution lock and a stable UI request id protect rapid double taps. The receipt ledger protects retries, reloads and repeated calls with the same request id.

## Compatibility

The new profile key is `dungeon-veil-forge-marks-v1`.

Legacy keys remain readable as migration input:

- `dungeon-veil-equipment-targeting-v2`
- `dungeon-veil-equipment-targeting-v1`

The first new-profile load sums all finite non-negative legacy `sourceMarks` values and stores that sum as Forge Marks. No legacy wish field is copied. Existing legacy keys can remain in cloud bundles for backward compatibility but are no longer written by gameplay code.
