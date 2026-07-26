# Block 8 – Gesamtbalance, Progression und Räume-1–100-Evidence

## Verbindliche Basis

- Repository: `ys2mm422yb-max/DungeonVeil`
- Ziel- und Testbranch: `fix/mobile-telegraphs-room-21-50-balance`
- Exakter Start-Commit: `2e4f6cbed7d471914271f37f057879cc58351662`
- Arbeitsbranch: `audit/block-8-balance-evidence-1-100-v1`
- Maßgeblicher Langzeitvertrag: PR #331.
- `main` bleibt ausgeschlossen.
- PR #315 bleibt unverändert.
- Kein Auto-Merge und keine Branchlöschung.

## Ziel

Block 8 prüft nicht nur Kapitel 1 bis Raum 100. Das Produkt besitzt verbindlich **100 Kapitel mit jeweils 100 Räumen**. Kapitel 1 wird vollständig Raum für Raum geprüft; der Kapitelaufstieg, repräsentative mittlere Kapitel und die Extrem-Skalierung bis Kapitel 100 werden deterministisch simuliert und technisch abgesichert.

## Kapitel- und Raumvertrag

- Jedes Kapitel enthält exakt Räume 1–100.
- Raum 100 führt nach einem gültigen Sieg genau einmal zu Raum 1 des nächsten Kapitels.
- Kapitel und Raum werden getrennt gespeichert, angezeigt und synchronisiert.
- Kapitel 100 endet nach Raum 100 in einem eigenen endgültigen Abschlusszustand.
- Retry, Reload, Reconnect, Doppeltap und Duo-Synchronisierung dürfen weder Kapitel überspringen noch Abschlussbelohnungen duplizieren.
- Bosszustand und bereits beanspruchte Kapitelbelohnungen müssen persistiert werden.

## Balancevertrag Kapitel 1

- Die vollständige Schwierigkeitskurve Räume 1–100 wird geprüft und korrigiert.
- Keine unfairen Klippen an 10er-Bossen oder Übergängen 50/51, 60/61, 70/71, 80/81 und 90/91.
- Gegner-HP, Schaden, Bewegung, Angriffsdichte, Telegraphdauer, aktive Gefahren und Erholungsfenster werden gemeinsam bewertet.
- Mechanische Schwierigkeit steigt stärker als reine HP-Skalierung.
- Tod, Neustart und Fortsetzen dürfen weder Druck noch Belohnungen duplizieren.
- Solo und Duo besitzen dieselbe Kapitel-/Raumlogik und eindeutige Abschlusszustände.

## Balancevertrag Kapitel 2–100

- Kapitel 2 muss bereits deutlich schwerer als Kapitel 1 sein.
- Die Kapitelsteigerung darf nicht nur HP und Schaden erhöhen.
- Kontrolliert wachsen dürfen Gegnerkombinationen, Elitedichte, Affixüberlagerung, Bewegung, Angriffsdruck, Gefahrenmuster, Bossphasen und mechanische Überlagerungen.
- Telegraphen dürfen auch in hohen Kapiteln nicht unsichtbar oder technisch unreagierbar werden.
- Keine Soforttode ohne Gegenfenster, keine endlosen HP-Schwämme und keine technisch unmöglichen Begegnungen.
- Repräsentative Pflichtkapitel für Simulationen: 1, 2, 5, 10, 25, 50, 75 und 100.
- Kapitel 100 ist ein extremes Langzeitziel, aber weiterhin mathematisch und technisch spielbar.
- Eine einzelne Ausrüstungskombination oder triviales lineares Farmen darf die Kapitelkurve nicht neutralisieren.

## Ökonomievertrag

- Gold, Schleierstaub, Ausrüstungsdrops, Schmiedemarken und Upgradepfade werden über vollständige Kapitel und repräsentative Langzeitläufe simuliert.
- Belohnungen wachsen mit der Kapitelsteigerung, aber langsamer als die Gesamtschwierigkeit.
- Kein exponentieller Währungs- oder Upgrade-Inflationspfad.
- Fortschritt muss Kapitel 2 und mittlere Kapitel erreichbar machen, Kapitel 100 aber außergewöhnlich anspruchsvoll halten.
- Raum-100-Abschluss, Kapitelaufstieg und Kapitelbelohnung erfolgen exakt einmal.
- Retry, Reload, Reconnect und Doppeltap dürfen keine zusätzlichen Grants erzeugen.

## Persistenz- und Modusvertrag

- Save/Fortsetzen wird über Räume 1–100 und Kapitel 1–100 geprüft.
- Gespeichert werden mindestens Kapitel, Raum, Bosszustand und beanspruchte Kapitelbelohnungen.
- Duo-Zustand, Gegnerleben, Raumabschluss, Belohnung und Kapitelwechsel bleiben synchron.
- Spectator-Daten dürfen Kapitel und Raum nicht vermischen.
- Weltboss und bestehende Modi dürfen nicht regressieren.

## Evidence-Matrix

### Vollständige Kapitel-1-Läufe

- iPhone/WebKit: Solo Räume 1–100 und Duo Räume 1–100.
- Android/Chromium: Solo Räume 1–100 und Duo Räume 1–100.

### Kritische Tablet-Evidence

- iPad/WebKit und Android-Tablet/Chromium:
  - Räume 50/51
  - Räume 60/61
  - Räume 70/71
  - Räume 80/81
  - Räume 90/91
  - Kapitel 1 Raum 100 → Kapitel 2 Raum 1
  - Raum 100 inklusive Abschluss-/Weiterführungszustand
  - Tod/Fortsetzen
  - WebGL-Recovery
  - Querformat-Pause und sichere Rückkehr

### Langzeit-Evidence

- Kapitelanzeige und Raumreset für Kapitel 2.
- Repräsentative Runtime-Snapshots für Kapitel 5, 10, 25, 50, 75 und 100.
- Kapitel-100-Raum-100-Endzustand als eigener Vertrag.
- Für hohe Kapitel genügt fokussierte Runtime-Evidence; vollständige reale 10.000-Raum-Läufe werden durch deterministische Simulation und gezielte Runtime-Proben ersetzt.

## Technische Prüfpunkte

- Alte 1–50- und 1–100-Validatoren bewusst auf den kombinierten 100-Raum-/100-Kapitel-Vertrag erweitern.
- Room Bible, Titel, Kodex, Freischaltungen und Bossregistrierung vollständig bis Raum 100 prüfen.
- Kapitel-Skalierung muss dokumentiert, monoton und begrenzt sein.
- Hazard-Cleanup beim Raumwechsel, Kapitelwechsel, Tod, Neustart und Renderer-Recovery verifizieren.
- Keine Geistertreffer, unsichtbaren Gefahren, verlorenen Portale oder doppelten Gegnergruppen.
- HUD, Raumtitel, Kapitelanzeige, Bossphasen und Abschlussdarstellung auf allen vier Geräten lesbar halten.
- Playwright-Retries bleiben `0`; fehlgeschlagene Evidence wird nicht durch Lockerung der Tests kaschiert.

## Arbeitsreihenfolge

1. Bestehende Balance-, Economy-, Room-, Save-, Duo- und Evidence-Validatoren inventarisieren.
2. Harte 50-/90-/100-Raum-Annahmen und fehlende Kapitel-2–100-Verträge erfassen.
3. Kapitel-1-Gesamtbalance und Economy für Räume 1–100 simulieren.
4. Kapitelaufstieg und repräsentative Kapitel 2, 5, 10, 25, 50, 75 und 100 simulieren.
5. Kapitel-/Raum-Persistenz, genau einmalige Belohnung und Duo-Synchronisierung absichern.
6. Vollständige Smartphone-Evidence für Kapitel 1 sowie fokussierte Tablet- und Langzeit-Evidence erzeugen.
7. Alle Screenshots und Videos tatsächlich visuell prüfen.
8. Sichtbare oder technische Fehler korrigieren und Evidence auf dem exakten finalen Head wiederholen.
9. Erst nach vollständig grünem Exact-Head-Stand und visueller Prüfung mergen und Pages erneut verifizieren.

## Definition of Done

- Gesamte Kapitel-1-Kurve Räume 1–100 deterministisch geprüft und ohne bekannte unfaire Sprünge.
- Kapitelsteigerung 1–100 für Pflichtkapitel simuliert und gegen unfaire oder triviale Skalierung abgesichert.
- Economy und Belohnungen über vollständige Kapitel und repräsentative Langzeitläufe simuliert.
- Raum 100 → nächstes Kapitel Raum 1 sowie finaler Abschluss nach Kapitel 100 funktionieren genau einmal.
- Save, Fortsetzen, Duo, Weltboss, Spectator, WebGL-Recovery und Orientierungsschutz regressionsfrei.
- Alle relevanten Verträge und Validatoren reichen bis Raum 100 und Kapitel 100.
- Vollständige Kapitel-1-Smartphone-Evidence und kritische Tablet-/Langzeit-Evidence liegen auf dem exakten finalen Head vor.
- Jede erzeugte Aufnahme wurde manuell angesehen; erkennbare Fehler sind behoben.
