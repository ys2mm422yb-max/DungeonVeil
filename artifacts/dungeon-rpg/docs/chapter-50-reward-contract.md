# Chapter 50 reward contract

This stacked balance block corrects the active room-clear reward path without changing the uninterrupted run structure.

- A chapter contains 50 rooms.
- Rooms 10, 20, 30 and 40 use the normal boss reward tier.
- Room 50 uses the chapter-boss reward tier.
- Completing room 50 advances the existing run to room 1 of the next chapter.
- The current player, equipment loadout and run gifts are not reset at the chapter boundary.
- Room rewards remain protected by the per-run reward ledger.

The deterministic progression baseline from the parent PR remains the measured pre-fix baseline. A later economy/drop rebalance will regenerate the full baseline after the remaining progression rules change.
