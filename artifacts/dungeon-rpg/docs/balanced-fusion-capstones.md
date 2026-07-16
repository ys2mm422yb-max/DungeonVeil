# Balanced fusion capstones

This block gives each rank-III fusion one distinct bounded effect. The inherited rank-III component gifts remain unchanged.

## Elemental Storm

- Fire Arrow III and Frost Arrow III remain active.
- Every fifth actual elemental arrow creates a small burst.
- The burst deals 22% of current attack to up to three living targets within 92 units.
- It does not grant attributes, scale with chapter number or trigger itself recursively.
- Reference uplift: 4.4% against one target and at most 13.2% in a three-target cluster.

## Arrow Storm

- Multishot III and Quick Draw III remain active.
- Only secondary arrows are improved from 82% to 90% damage.
- The primary arrow and the existing fifth-attack synergy are unchanged.
- Reference uplift for a four-arrow attack: about 6.94%.

## Veil Chain

- Ricochet III and Piercing III remain active.
- Each real ricochet or piercing hit receives 10% of its actually recorded damage as a bounded bonus.
- Other arcane, elemental and primary hits are not affected.
- Reference uplift with three ricochets and three pierces: about 8.23%.

## Architecture

All three capstones run through the existing `runSynergies` update. No private `GameEngine` method is replaced and no second runtime wrapper is installed. The audit verifies the exact limits, target scopes and deterministic output bands.
