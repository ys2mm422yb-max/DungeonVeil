# Balanced equipment source rewards

This block replaces the previous combination of five guaranteed Warden boss attempts plus an 18% normal-room chance with five clear boss milestones and a reduced hunt chance.

## Guaranteed chapter rewards

| Room | Chapter 1–2 | Chapter 3 | Chapter 4+ |
|---:|---|---|---|
| 10 | Forge | Forge | Forge |
| 20 | Hunt | Hunt | Ritual |
| 30 | Depth | Warden | Warden |
| 40 | Depth | Depth | Depth |
| 50 | Global unlocked pool | Global unlocked pool | Global unlocked pool |

The early substitutions avoid guaranteed attempts against source pools that have not unlocked any equipment yet. Room 50 can draw from every currently unlocked source and still prefers unowned equipment before duplicates.

## Other rules

- Normal rooms do not roll equipment.
- Hunt targets roll Hunt equipment at 18% instead of 32%.
- Starter equipment participates in the active source pool and can finally earn copies.
- Fully upgraded level-5 equipment is skipped while another eligible item exists.
- Every guaranteed boss room still spawns at most one equipment item.

## Deterministic target

The source simulator uses 2,048 seeded samples across 160 chapters and targets:

- roughly 7.1 equipment items per completed chapter;
- zero empty guaranteed boss attempts;
- less than 3x difference between the busiest and least-used source;
- finite copy progression for all four starter items.

Pure random duplicates remain intentionally visible as the next problem. Wish items, source marks and explicit pity protection follow in a separate block.
