# Dungeon Veil - Chapter 1 Room Bible

This branch replaces repeated coordinate tweaks with a binding design system for rooms 1-20.

The Room Bible controls:

- four visual phases
- room silhouette and hero object
- allowed and forbidden asset families
- room-specific enemy formation
- room-specific portal staging
- shell damage state and lighting palette
- mobile camera bounds
- collision-safe exit staging

Canva is the visual source of truth. `src/game/roomBible.ts` is its runtime representation.