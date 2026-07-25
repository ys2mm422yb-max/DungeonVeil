# Block 8 – Gesamtbalance, Progression und Räume-1–100-Evidence

## Verbindliche Basis

- Repository: `ys2mm422yb-max/DungeonVeil`
- Ziel- und Testbranch: `fix/mobile-telegraphs-room-21-50-balance`
- Exakter Start-Commit: `2e4f6cbed7d471914271f37f057879cc58351662`
- Arbeitsbranch: `audit/block-8-balance-evidence-1-100-v1`
- `main` bleibt ausgeschlossen.
- PR #315 bleibt unverändert.
- Kein Auto-Merge und keine Branchlöschung.

## Ziel

Die komplette Räume-1–100-Kurve wird als ein zusammenhängendes Produkt geprüft und korrigiert. Zahlenbalance, mechanischer Druck, Belohnungen, Persistenz, Duo-Synchronisierung, Rendering und mobile Hochformatdarstellung müssen gemeinsam funktionieren.

## Balancevertrag

- Keine unfairen Schwierigkeitsklippen an Kapitelübergängen oder Bossräumen.
- Gegner-HP, Schaden, Bewegung, Angriffsdichte, Telegraphdauer, aktive Gefahren und Erholungsfenster werden gemeinsam bewertet.
- Mechanische Schwierigkeit steigt stärker als reine HP-Skalierung.
- Räume 50/51, 60/61, 70/71, 80/81, 90/91 und Raum 100 erhalten eigene Übergangsprüfungen.
- Tod, Neustart und Fortsetzen dürfen weder Druck noch Belohnungen duplizieren.
- Solo und Duo müssen dieselbe Kapitel-/Raumlogik und eindeutige Abschlusszustände besitzen.

## Ökonomievertrag

- Gold, Schleierstaub, Ausrüstungsdrops, Schmiedemarken und Upgradepfade werden über vollständige simulierte Runs geprüft.
- Belohnungszuwachs darf spätere Kapitel erreichbar machen, aber nicht trivialisieren.
- Raum-100-Abschluss und Kapitelwechsel müssen genau einmal belohnen.
- Retry, Reload, Reconnect und Doppeltap dürfen keine zusätzlichen Grants erzeugen.

## Persistenz- und Modusvertrag

- Save/Fortsetzen wird über Räume 1–100 erweitert und an kritischen Übergängen geprüft.
- Duo-Zustand, Gegnerleben, Raumabschluss, Belohnung und Kapitelwechsel bleiben synchron.
- Weltboss, bestehende Modi und Spectator-Zustände dürfen nicht regressieren.
- Kapitel und Raum werden getrennt gespeichert, angezeigt und synchronisiert.

## Evidence-Matrix

### Vollständige Läufe

- iPhone/WebKit: Solo Räume 1–100 und Duo Räume 1–100.
- Android/Chromium: Solo Räume 1–100 und Duo Räume 1–100.

### Kritische Tablet-Evidence

- iPad/WebKit und Android-Tablet/Chromium:
  - Räume 50/51
  - Räume 60/61
  - Räume 70/71
  - Räume 80/81
  - Räume 90/91
  - Raum 100 inklusive Abschluss-/Weiterführungszustand
  - Tod/Fortsetzen
  - WebGL-Recovery
  - Querformat-Pause und sichere Rückkehr

## Technische Prüfpunkte

- Alte 1–50-Validatoren bewusst auf passende 1–100-Verträge erweitern.
- Room Bible, Titel, Kodex, Freischaltungen und Bossregistrierung vollständig bis Raum 100 prüfen.
- Hazard-Cleanup beim Raumwechsel, Tod, Neustart und Renderer-Recovery verifizieren.
- Keine Geistertreffer, unsichtbaren Gefahren, verlorenen Portale oder doppelten Gegnergruppen.
- HUD, Raumtitel, Kapitelanzeige, Bossphasen und Abschlussdarstellung auf allen vier Geräten lesbar halten.
- Playwright-Retries bleiben `0`; fehlgeschlagene Evidence wird nicht durch Lockerung der Tests kaschiert.

## Arbeitsreihenfolge

1. Bestehende Balance-, Economy-, Room-, Save-, Duo- und Evidence-Validatoren inventarisieren.
2. Harte 50-/90-Raum-Annahmen und fehlende 91–100-Verträge erfassen.
3. Deterministische Gesamtbalance- und Economy-Simulationen für 1–100 etablieren.
4. Kritische Übergangs- und Abschlussverträge ergänzen.
5. Vollständige Smartphone-Evidence sowie fokussierte Tablet-Evidence erzeugen.
6. Alle Screenshots und Videos tatsächlich visuell prüfen.
7. Sichtbare oder technische Fehler korrigieren und Evidence auf dem exakten finalen Head wiederholen.
8. Erst nach vollständig grünem Exact-Head-Stand und visueller Prüfung mergen und Pages erneut verifizieren.

## Definition of Done

- Gesamte 1–100-Balancekurve deterministisch geprüft und ohne bekannte unfaire Sprünge.
- Economy und Belohnungen über vollständige Runs simuliert.
- Save, Fortsetzen, Duo, Weltboss, Spectator, WebGL-Recovery und Orientierungsschutz regressionsfrei.
- Alle relevanten Verträge und Validatoren reichen bis Raum 100.
- Vollständige Smartphone-Evidence und kritische Tablet-Evidence liegen auf dem exakten finalen Head vor.
- Jede erzeugte Aufnahme wurde manuell angesehen; erkennbare Fehler sind behoben.
