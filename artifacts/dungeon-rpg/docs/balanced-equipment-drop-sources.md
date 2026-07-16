# Balanced equipment drop sources

This block reduces equipment noise, guarantees meaningful boss rewards and removes the starter-copy dead end. It does not add wishlist targeting or hard pity yet.

## Chapter reward map

- Room 10: guaranteed Forge-primary drop.
- Room 20: guaranteed Ritual-primary drop.
- Room 30: guaranteed Warden-primary drop.
- Room 40: guaranteed Depth-primary drop.
- Room 50: guaranteed wildcard across Forge, Ritual, Warden and Depth.
- Primary-source boss rewards fall back through the other non-hunt sources only when the intended source has no currently unlocked item.

## Additional drops

- Eligible non-boss rooms from room 3 onward: 3% equipment chance.
- Normal-room primary sources rotate across Forge, Ritual, Warden and Depth.
- Hunt targets: 12% Hunt equipment chance.
- The active roller prefers unowned equipment, then allows duplicates.
- Starter bow, quiver, talisman and armor are included in their normal source pools and can finally earn copies.

## Expected chapter volume

Using the current steady-state hunt frequency:

- Boss rewards: 5.00 drops.
- Normal rooms: 1.29 expected drops.
- Hunts: 1.445 expected drops.
- Total: 7.735 expected equipment drops per chapter.

The steady-state source award ratio remains below 1.15x. Early chapters may use primary-source fallback because chapter and rank unlocks intentionally remain unchanged in this block.

## Deferred to the next block

- Wishlist selection.
- Source marks.
- Target-item weighting.
- Miss tracking and hard pity.
- Max-level duplicate conversion.

The simulator keeps `targeted_copy_control_missing` visible until those systems are added.
