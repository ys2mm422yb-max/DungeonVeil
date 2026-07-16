# Targeted equipment progression

This block keeps random equipment exciting while guaranteeing that one desired item cannot be blocked indefinitely.

## Wish item

- Any rank- and chapter-unlocked equipment below level 5 can be selected in the inventory.
- The item does not need to be owned yet.
- Only one wish item can be active at a time.
- Changing the wish item resets its matching pity counters.
- Reaching equipment level 5 clears the wish item automatically.

## Wish chances and pity

- A matching source reward has a 35% wish-item chance.
- The room-50 global reward has a 50% wish-item chance.
- After two matching misses, the next matching reward is guaranteed.
- Only the first successful Hunt equipment drop of a chapter uses Hunt wish pity. Further Hunt equipment drops in the same chapter remain normal random rewards.

## Source marks

- Forge, Ritual, Warden and Depth boss rewards grant one mark of their source.
- The first Hunt target defeated in each chapter grants one Hunt mark.
- Early room-20 Hunt boss rewards also grant their normal Hunt source mark.
- Three matching marks craft the selected item or one copy of it.
- Crafting an unowned but unlocked item performs the initial unlock; later crafts add copies.

## Cloud and save safety

Targeting progress is stored separately under `dungeon-veil-equipment-targeting-v1` and is included in the existing cloud bundle. The cloud conflict score counts source marks and an active wish item, while the established meta save remains version 3 and requires no destructive migration.

## Deterministic target

The targeted simulator measures elapsed eligible chapters from each item's unlock chapter. Representative Forge, Hunt, Warden, Ritual and Depth items must reach the eleven required upgrade copies within:

- median: 7–9 eligible chapters;
- P90: no more than 11 eligible chapters.

The initial acquisition of an unowned item is counted separately before its eleven upgrade copies.
