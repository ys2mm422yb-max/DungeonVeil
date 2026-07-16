# Bounded gift progression

This balance block keeps the run continuous across chapters while preventing permanent combat stats from growing after every room.

## Gift milestones

- Run start: one opening gift after the equipped loadout has been applied.
- Chapter 1: after rooms 3, 5, 10, 15, 20, 25, 30, 35, 40, 45 and 50.
- Chapter 2 and later: after boss rooms 10, 20, 30, 40 and 50.
- Chapter 1 therefore contains 12 decisions; every later chapter contains 5.
- Saves carry an explicit pending-gift flag. Legacy saves still derive a pending choice from the last completed milestone.

## Late-run masteries

- Hunter Blessing: +2 attack per rank, maximum rank III.
- Vital Spark: +8 max HP and +8 HP per rank, maximum rank III.
- Once both masteries are complete, late choices offer 20% recovery, 30 Veil Dust or 300 gold instead of more permanent combat stats.

## Deterministic reference

| Chapter | Total choices | Post-build choices | Attack mastery | HP mastery | Non-power choices | Raw attack reference | Max HP reference |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 12 | 0 | 0/3 | 0/3 | 0 | 23 | 182 |
| 2 | 17 | 0 | 0/3 | 0/3 | 0 | 23 | 182 |
| 5 | 32 | 0 | 0/3 | 0/3 | 0 | 23 | 182 |
| 10 | 57 | 24 | 3/3 | 3/3 | 18 | 29 | 206 |

The attack and HP columns are separate offensive and defensive reference builds. A single run still spends one choice per milestone. Equipment, relics and encounter mechanics are handled by their own balance blocks. The Guardian Crown remains an open unbounded relic risk and is deliberately not hidden by this change.
