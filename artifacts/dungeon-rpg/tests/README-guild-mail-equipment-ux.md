# Guild, mailbox and equipment UX verification

This focused block verifies the user-facing contracts added after the live hybrid menu release:

- mailbox cleanup only through the owner-scoped authenticated RPC
- unanswered invitations and unclaimed rewards cannot be deleted accidentally
- bow and armor remain required
- quiver, relic and companion can be intentionally unequipped and restored
- optional quiver stats and visible models match its equipped state
- profile equipment uses the same shared artwork as the equipment library
- the gold/options panel is anchored below the top-right resource bar
- equipment drops use the actual item model and the local pinned Three.js runtime

The full repository workflows remain authoritative. This file only records the focused scope and does not replace any regression suite.
