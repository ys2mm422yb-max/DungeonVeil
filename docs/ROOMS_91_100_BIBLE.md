# Rooms 91–100 — The Veil Nexus

## Chapter identity

Rooms 91–100 form the final chapter of the extended 100-room run. The chapter must read as the place where the mine, ruins, forests, fortress, fracture, observatory, reliquary and Cinder Crown converge, without becoming an unreadable collage of earlier rooms.

The Veil Nexus is a fractured vertical citadel suspended around the source of the Veil. Its visual language is deep violet void, pale-gold path lines, floating masonry, broken portals, restrained echoes of earlier chapter materials and a bright central nexus that remains readable on portrait mobile screens.

This chapter is not a recolor of rooms 81–90 and must not reuse one repeated rectangular arena. Every room has its own route, combat problem and silhouette while preserving clear player, enemy and telegraph separation.

## Mechanical language

- phased Veil gates that open one safe route at a time
- delayed echo attacks that repeat a clearly marked previous impact
- rotating bridge segments with safe stationary recovery windows
- linked anchor zones that must be broken in a readable order
- converging pressure lanes that always leave a reachable escape path
- short gravity pulses that displace but never spawn-hit the player
- controlled combinations of prior chapter mechanics with strict overlap budgets
- room 100 combines selected mechanics in separated boss phases rather than firing everything simultaneously

No hazard may begin during spawn protection, continue after combat completion, persist through death, become invisible after renderer recovery, duplicate after reconnect or run during the landscape orientation blocker.

## Room contracts

| Room | German title | English title | Purpose | Signature mechanic |
|---|---|---|---|---|
| 91 | Schwelle des Schleiers | Threshold of the Veil | final-chapter introduction and safe-route reading | phased Veil gates |
| 92 | Halle der Echos | Hall of Echoes | teaches delayed repeat attacks | marked echo impacts |
| 93 | Zerbrochene Brücken | Broken Bridges | movement timing across separated lanes | rotating bridge segments |
| 94 | Kammer der Anker | Anchor Chamber | ordered target priority and positioning | linked anchor zones |
| 95 | Der fallende Hof | The Falling Court | controlled displacement without spawn pressure | gravity pulses |
| 96 | Pfad der Konvergenz | Path of Convergence | two readable pressure lanes with recovery | converging lanes |
| 97 | Archiv der letzten Wege | Archive of Final Paths | combines route memory and enemy interruption | sequenced portal routes |
| 98 | Herz der Spaltung | Heart of the Fracture | elite control room with bounded mechanic overlap | fracture-and-echo pattern |
| 99 | Vorhof des Nexus | Nexus Antechamber | full final-chapter examination before the boss | layered nexus sequence |
| 100 | Der Schleierkern | The Veil Core | true final multi-phase conclusion boss | Veil Core phases |

## Final boss contract — room 100

The Veil Core is a dedicated final encounter and may not be represented by a scaled normal enemy.

Phase 1 establishes the boss body, anchor targets and large directional attacks. Phase 2 introduces echo attacks and rotating safe routes, but never overlaps more than two high-pressure mechanics. Phase 3 fractures the arena into clearly connected safe sectors and tests controlled combinations of earlier chapter mechanics. The final phase ends with an explicit defeat presentation, one authoritative completion reward and one unambiguous continuation state.

The boss must provide:

- unique model or unmistakable composed presentation
- dedicated nameplate, phase messaging and health-state transitions
- large portrait-readable telegraphs with sufficient reaction and recovery time
- deterministic cleanup on death, restart, reconnect, renderer recovery and orientation pause
- exactly-once completion and reward handling
- no automatic endless restart at room 100
- a clearly defined transition into the post-room-100 chapter progression contract

## Completion and continuation contract

- room 100 completion is recorded exactly once for the current run and chapter
- retry, reload, reconnect, duo synchronization and repeated callbacks cannot duplicate rewards
- the completed run cannot remain trapped in room 100 or loop the boss indefinitely
- continuation advances according to the authoritative chapter progression contract while preserving chapter and room as separate values
- death before completion restarts or resumes according to the existing run contract without granting completion rewards

## Portrait-mobile requirements

- iPhone/WebKit, Android/Chromium, iPad/WebKit and Android-tablet/Chromium are the required evidence devices
- gameplay is tested only in portrait; landscape must block and pause gameplay, then resume without lost state
- room 90 → 91, rooms 91/99/100, final completion, death/restart, continue, duo and renderer recovery receive explicit evidence
- no floating architecture or portal effect may cover enemies, the player, touch controls, boss health or active telegraphs
- object, light, particle and collider budgets remain within the established mobile limits
- Playwright retries remain 0 and every generated screenshot or video must be manually inspected before merge
