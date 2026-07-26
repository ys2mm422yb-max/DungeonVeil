# Dungeon Veil – Master-Arbeitsplan, Block 18

Dieses Dokument erweitert `docs/MASTER_WORK_PLAN.md` verbindlich um **Block 18 – Relikt- und Begleiterüberarbeitung**. Es gilt nach Abschluss der laufenden Blöcke 0–17 und unterliegt vollständig dem festen Projektvertrag, der Definition of Done und den Branch-, Test-, Evidence- und Veröffentlichungsregeln des Master-Arbeitsplans.

## Block 18 – Relikt- und Begleiterüberarbeitung

### 18.1 Relikterscheinungen deutlich reduzieren

- Zuerst alle tatsächlichen Reliktquellen im Solo-, Duo-, Weltboss-, Raid-, Jagd-, Boss-, Quest- und sonstigen Belohnungscode vollständig inventarisieren.
- Nicht nur Direktdrops, sondern auch Pity, garantierte Quellen, Migrationen, Mailboxbelohnungen, QA-Seeds und Wiederholungsansprüche prüfen.
- Relikte sollen seltene Höhepunkte sein und nicht während eines normalen Runs fortlaufend erscheinen.
- Normale Räume und gewöhnliche Truhen dürfen grundsätzlich keine regelmäßige Reliktquelle sein.
- Elite- und Bossquellen erhalten bewusst niedrige, dokumentierte Chancen; Raid- und Eventquellen dürfen bessere Chancen oder Fragmente liefern, aber keine Reliktflut erzeugen.
- Ein mögliches Pity-System darf seltenes Pech abfangen, aber die durchschnittliche Fundrate nicht wieder trivialisieren.
- Bestehende Accounts behalten rechtmäßig erworbene Relikte; keine stille Löschung oder Abwertung.
- Dropverteilung über große deterministische Simulationen prüfen und erwartete Relikte pro vollständigem Run dokumentieren.
- Retry, Reload, Reconnect, Doppeltap und parallele Belohnungsansprüche dürfen keinen doppelten Reliktfund erzeugen.

### 18.2 Begleitergrafiken vollständig überarbeiten

- Die einheitliche hellblaue Platzhalterdarstellung entfernen.
- Jeder Begleiter erhält eine klar unterscheidbare Silhouette, eigene Farbidentität und eine zum Dungeon-Veil-Stil passende dunkle violett-goldene Präsentation.
- Seltenheitsfarben dürfen Rahmen und Effekte unterstützen, aber nicht den gesamten Begleiter in dieselbe helle Farbe tauchen.
- Begleiter müssen im Ausrüstungsmenü, in Detailkarten, im aktiven Spiel, bei Freischaltung und in Belohnungsdarstellungen konsistent aussehen.
- Vorhandene echte Assets bevorzugen; neue Assets nur gezielt, lizenzgeprüft und runtime-sparsam integrieren.
- Idle-, Bewegungs- und Aktionsanimationen sowie Schatten, Bodenbezug und Effekte prüfen.
- Keine schwebenden, doppelten, übergroßen oder durch den Spieler verdeckten Begleiter.
- Lesbarkeit und Performance auf allen vier unterstützten mobilen Hochformatprojekten prüfen.

### 18.3 Eigenes Begleiter-Fortschrittssystem

- Begleiter erhalten ein eigenes Fortschrittssystem, das bewusst nicht dem Ausrüstungs-Upgrade über Gold, Schleierstaub oder Itemkopien entspricht.
- Grundmodell: Begleiter-XP durch aktive Nutzung in gültigen Runs, ergänzend klar begrenzte Trainingsbelohnungen aus passenden Inhalten.
- Kein passives unbegrenztes Offline-Farming und keine clientseitig frei setzbaren XP-Werte.
- Serverseitige oder manipulationsresistente Persistenz für Cloud-Accounts; lokale Saves bleiben rückwärtskompatibel.
- Levelkurve, Maximallevel und Zeit bis zu wichtigen Meilensteinen anhand einer Progressionssimulation bestimmen.
- Level-Meilensteine verbessern die bestehende Begleiterrolle nachvollziehbar, ohne den Begleiter zum automatischen Hauptschadensverursacher zu machen.
- Fähigkeiten und Werte wachsen kontrolliert; keine exponentielle Skalierung, die spätere Kapitel oder Raids trivialisiert.
- Optionale Entwicklungsstufen dürfen sichtbare Varianten, neue Animationen oder zusätzliche passive Effekte freischalten.
- Eine Bindungs- oder Meisterschaftskomponente kann kosmetische Inhalte freischalten, darf aber keine tägliche Zwangsinteraktion erzeugen.
- Wechsel des aktiven Begleiters, Save/Reload, Cloud-Sync, Offline-/Online-Übergang und Migration bestehender Begleiterzustände müssen verlustfrei funktionieren.
- Doppelte XP-, Level- oder Meilensteinvergabe bei Retry, Reconnect oder mehreren Tabs verhindern.

### 18.4 UI und Kommunikation

- Begleiterdetail zeigt mindestens aktuelles Level, XP-Fortschritt, nächsten Meilenstein, aktive Wirkung und verständliche Herkunft der XP.
- Keine verwirrende Vermischung mit Ausrüstungslevel, Kopien, Schmiedemarken oder Reliktfortschritt.
- Touchflächen, Texte, Fortschrittsbalken und Karten dürfen auf schmalen Smartphones nicht abgeschnitten oder horizontal scrollbar sein.
- Freischaltung, Levelaufstieg und Entwicklung erhalten eine klare, aber nicht störende Präsentation.
- Deutsche und englische Texte vollständig und konsistent umsetzen.

### 18.5 Tests und Evidence

- Unit- und Vertragstests für XP-Vergabe, Levelgrenzen, Meilensteine, Migration und exakte Einmaligkeit.
- Economy- und Progressionssimulationen für Reliktfundrate und Begleiterleveldauer.
- Vollständige mobile Hochformat-Evidence auf iPhone/WebKit, Android/Chromium, iPad/WebKit und Android-Tablet/Chromium.
- Querformatblocker mit vollständig pausiertem Zustand prüfen.
- Begleiter im Menü und im echten Kampf auf mehreren Level- und Entwicklungsstufen aufnehmen.
- Reliktfundraten nicht nur über einzelne Screenshots, sondern über deterministische Simulation und wiederholte vollständige Runs belegen.
- Alle Screenshots und Videos manuell auf Platzhalterfarben, Überlagerungen, falsche Größen, schlechte Schatten, abgeschnittene UI und Performanceprobleme prüfen.

## Reihenfolge und Abgrenzung

1. Laufende Blockarbeit zuerst nach bestehendem Mastervertrag abschließen.
2. Reliktquellen inventarisieren und Fundrate neu balancieren.
3. Begleiter-Datenmodell und Migration festlegen.
4. Begleiter-Fortschrittssystem implementieren und simulieren.
5. Begleitergrafiken und Animationen integrieren.
6. UI, Cloud-Persistenz, Missbrauchsschutz und vollständige Evidence abschließen.

Block 18 darf nicht ungeprüft in einen laufenden eingefrorenen Evidence-Branch hineingemischt werden. Die Umsetzung beginnt auf einem eigenen fokussierten Draft-PR vom dann tatsächlichen Head des festen Zielbranches. `main` bleibt ausgeschlossen; kein Auto-Merge und keine automatische Branchlöschung.
