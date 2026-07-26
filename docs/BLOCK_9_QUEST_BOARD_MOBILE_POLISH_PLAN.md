# Block 9 – Auftragsbrett: Mobile Struktur, Touch und Verständlichkeit

## Verbindliche Basis

- Repository: `ys2mm422yb-max/DungeonVeil`
- Ziel- und Testbranch: `fix/mobile-telegraphs-room-21-50-balance`
- Exakter Start-Commit: `efd7bbfb88acff2e24908eddbb93eac0fee22c7b`
- Arbeitsbranch: `audit/block-9-quest-board-mobile-polish-v1`
- `main` bleibt ausgeschlossen.
- Kein Auto-Merge und keine automatische Branch-Löschung.

## Tatsächlicher Ausgangsstand

Der historische Block-9-Branch `work/block-9-structure-quest-menu` ist bereits Vorfahr des aktuellen Zielbranches. Die vorhandene Laufzeit enthält daher bereits:

- getrennte Bereiche für normale Tagesaufträge, Gold-Auftrag, wöchentliche Elite-Aufträge und erledigte Aufträge,
- Fortschrittsbalken und Belohnungsdarstellung,
- deutsche und englische Texte,
- tägliche Rotation mit Reset-Anzeige,
- persistente Elite-Belohnungen und Marken.

Block 9 wird deshalb nicht blind erneut implementiert. Der aktuelle Durchgang ist ein gezielter mobiler Qualitäts- und Regressionsaudit der bestehenden Struktur.

## Verbindliche Prüfpunkte

1. Auftragsbrett auf iPhone-, Android-Smartphone-, iPad- und Android-Tablet-Hochformat vollständig bedienen.
2. Hauptschalter, Bereichsschalter und Belohnungsbuttons erhalten ausreichend große Touch-Flächen.
3. Öffnen und Schließen darf keinen Doppeltap, kein unbeabsichtigtes Schließen anderer Overlays und keine Navigation auslösen.
4. Offene, erledigte, Gold- und Elite-Aufträge müssen visuell eindeutig unterscheidbar bleiben.
5. Fortschritt, Zielwert, Belohnung und Reset-Zeit müssen ohne horizontales Überlaufen lesbar sein.
6. Erledigte Standardaufträge bleiben getrennt und aufklappbar; Gold- und Elite-Belohnungen dürfen nicht doppelt beansprucht werden.
7. Deutsch und Englisch müssen dieselbe Informationshierarchie behalten.
8. Querformat bleibt blockiert; hinter dem Orientierungshinweis darf das Auftragsbrett nicht weiter bedienbar sein.
9. Persistenz wird für Reload, App-Fokus, Tageswechsel und Cloud-Abgleich geprüft.
10. Playwright-Retries bleiben `0`.

## Erste technische Arbeit

- Bestehende `DailyQuestPanel`-Interaktionen auf Pointer-/Touch-Konsistenz und semantische Zustände prüfen.
- Mobile Mindesthöhen, Scrollgrenzen und Safe-Area-Verhalten prüfen.
- Den bestehenden Menü-/Profil-Audit um Block-9-Touch- und Zustandsverträge erweitern.
- Eine fokussierte mobile Browser-Evidence für geöffnetes Brett, erledigten Bereich und beanspruchbare Elite-Belohnung erstellen.

## Freigabekriterien

Der Block ist erst fertig, wenn der exakte Head folgende Nachweise besitzt:

- TypeScript und Produktionsbuild grün,
- Menü-/Profil-/Cloud-Audit grün,
- mobile Hochformat-Smokes auf Smartphone und Tablet grün,
- Screenshots der relevanten Zustände tatsächlich visuell geprüft,
- keine offenen kritischen Touch-, Layout-, Persistenz- oder Doppelclaim-Fehler,
- PR basiert auf dem dann aktuellen Zielbranch.