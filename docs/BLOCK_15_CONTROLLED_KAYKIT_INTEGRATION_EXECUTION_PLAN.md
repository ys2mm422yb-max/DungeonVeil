# Block 15 – Kontrollierte KayKit-Integration

## Verbindlicher Ausgangspunkt

- Repository: `ys2mm422yb-max/DungeonVeil`
- Zielbranch: `fix/mobile-telegraphs-room-21-50-balance`
- exakter Branch-Start: `f764e822d3a15a12ab1716db12fdf1558e1aad19`
- Arbeitsbranch: `feat/block-15-controlled-kaykit-integration-v1`
- `main` bleibt unberührt.
- PR #315 bleibt unverändert, offen und separat.
- Kein Auto-Merge und keine automatische Branchlöschung.

## Ziel

Nur tatsächlich im veröffentlichten Spiel benötigte KayKit-Modelle aus dem Bestand von PR #315 kontrolliert übernehmen. Keine pauschale Übernahme des Asset-Pakets und keine ungenutzten Runtime-Bestände.

## Auswahlvertrag

Die erste Integrationsrunde ist auf höchstens drei klar begründete Modelle begrenzt:

1. `Necromancer.glb` als visuelle Basis für den Verschleierten Archon beziehungsweise einen eindeutig passenden Raid-Boss-Gegner.
2. `Skeleton_Golem.glb` als schwerer Elite-/Bossgegner für bestehende oder spätere Räume, nur wenn die Runtime-Registry ihn tatsächlich verwendet.
3. `Lorekeeper.glb` als besonderer Kodex-/Quest-/NPC-Charakter, nur wenn eine konkrete sichtbare Runtime-Verwendung umgesetzt wird.

Zusätzliche Modelle werden erst aufgenommen, wenn eine belegte Gameplay-Verwendung, ein Größenbudget und mobile Evidence vorhanden sind.

## Technischer Vertrag

- Nur direkte `.glb`-Dateien sowie zugehörige Lizenzdateien übernehmen.
- Keine ZIP-, Blender-, FBX-, OBJ-, Unity- oder Unreal-Dateien.
- Keine doppelten Texturen oder alternative Exportformate.
- Assetpfade zentral in einer kleinen Runtime-Registry erfassen.
- Fehlendes Modell darf keinen schwarzen Raum und keinen blockierten Run erzeugen; vorhandener Fallback bleibt funktionsfähig.
- Modelle werden vor dem Einsatz auf Animationen, Maßstab, Bodenhöhe, Ausrichtung, Schatten, Waffenhaltung und Materialdarstellung geprüft.
- Mobile Objekt- und Speicherbudgets werden dokumentiert und validiert.

## Prüfungen

- Dateityp- und Größenvalidator.
- Registry-Validator: jedes übernommene Modell hat mindestens eine konkrete Runtime-Verwendung.
- Kein unreferenziertes Modell im Build.
- Typecheck und Produktionsbuild.
- Echte Hochformat-Evidence auf iPhone/WebKit, Android/Chromium, iPad/WebKit und Android-Tablet/Chromium.
- Screenshots und Videos visuell auf schwarze Frames, falschen Maßstab, schwebende Modelle, doppelte Ausrüstung und verdeckte Telegraphen prüfen.
- Querformatblocker und Renderer-Recovery prüfen.

## Merge-Bedingungen

Der PR bleibt Draft, bis alle ausgewählten Dateien, Runtime-Verwendungen, Lizenzpfade, Validatoren und die vollständige mobile Evidence auf dem exakten finalen Head grün und visuell geprüft sind. Erst danach darf in den festen Zielbranch gemergt und über den festen Testlink veröffentlicht werden.
