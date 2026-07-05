---
name: Dungeon RPG canvas render loop
description: Why the GameCanvas effect uses a ref + empty dependency array instead of depending on gameState.
---

For the `requestAnimationFrame`-driven canvas loop in `GameCanvas`, store the latest `gameState` in a ref and keep the `useEffect` dependency array empty.

**Why:** The original effect depended on `gameState`, which changes every engine tick. This caused React to tear down and recreate the effect (and the RAF loop) every frame, leading to stutters and freezes.

**How to apply:**
- Create `const gameStateRef = useRef(gameState)` and assign `gameStateRef.current = gameState` on every render.
- Read `gameStateRef.current` inside the RAF callback.
- Use `useEffect(..., [])` so the effect is created once and only cleaned up on unmount.
- This pattern is appropriate for any canvas component that redraws itself via RAF and does not need React to re-run its setup logic on every data update.
