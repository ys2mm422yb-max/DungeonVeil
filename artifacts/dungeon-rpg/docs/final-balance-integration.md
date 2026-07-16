# Final balance integration test build

This branch consolidates the complete post-PR-169 balance pass into one testable build.

## Continuous run and gifts

- A chapter contains 50 rooms and room 50 owns the chapter-boss reward and combat phase.
- The same run continues into the next chapter.
- Chapter one grants twelve gift decisions; later chapters grant five boss milestones.
- Hunter Blessing and Vital Spark stop at rank III; late choices become healing or currency.
- All three fusions have bounded capstone effects.

## Equipment

- The legacy upgrade path is removed; Gold, copies and Veil Dust remain.
- Equipment unlocks extend through chapter ten.
- Boss and hunt sources are balanced and starter items can earn copies.
- Wishlist, source marks and hard pity protect targeted progress.
- Repeated elemental/chain equipment grants set skill ranks instead of wasting identical rank-I gifts.
- Max-level duplicates convert into 35/60/100 Veil Dust by rarity.

## Relics and hunts

- Base hunts are capped at three per chapter; Ash Eye and the weekly rift can add one each, with a hard cap of five.
- Hunt spawns are separated by at least seven rooms.
- Relic drops use four-miss pity and prefer unowned relics.
- Marked Claw triggers every fifth kill.
- Guardian Crown grants 4% attack per boss and stops at five stacks per run.
- Depth Rune Shard reduces rune damage before final mitigation.
- World Core grants 6% attack and 10% max HP once per run.

## Enemies

- The legacy spawn scale is normalized before the central room/chapter curve is applied.
- Chapter HP/attack scaling slows after chapter six.
- Elite health and attack bonuses are moderate.
- Elites receive visible Bulwark, Frenzy, Mender or Volatile mechanics.
- Room 50 owns the final boss phase.

## Release rule

After all required checks are green, the exact tested commit may be published as a test build at `https://ys2mm422yb-max.github.io/DungeonVeil/`. That fixed-link test deployment does not authorize merging the branch or declaring a final release; both still require explicit approval.
