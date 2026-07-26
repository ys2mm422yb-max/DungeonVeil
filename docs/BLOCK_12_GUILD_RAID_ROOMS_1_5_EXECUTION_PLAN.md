# Block 12 – Gildenraid-Räume 1–5: verbindlicher Ausführungsplan

## Fester Rahmen

- Zielbranch: `fix/mobile-telegraphs-room-21-50-balance`
- Arbeitsbranch: `feat/block-12-guild-raid-rooms-1-5-v1`
- Start-Commit: `58535d0f76146f536003f465f2309c79cd251fb4`
- `main` bleibt ausgeschlossen.
- Kein Auto-Merge und keine automatische Branchlöschung.
- PR #315 bleibt unberührt.

## Ziel

Fünf eigenständige Gildenraid-Räume entwickeln, die echte Zusammenarbeit von genau vier Mitgliedern derselben Gilde verlangen. Die Mechaniken bauen auf dem serverautoritativen synchronisierten Raid-Zustand aus Block 11 auf und dürfen nicht in vier voneinander unabhängige Solokämpfe zerfallen.

## Raumvertrag

### Raum 1 – Schleieranker

- Vier Ankerpunkte müssen innerhalb eines engen Zeitfensters gleichzeitig gehalten werden.
- Verlässt ein Spieler seinen Anker, fällt der gemeinsame Fortschritt kontrolliert zurück.
- Gegnerdruck zwingt das Team zu gegenseitigem Schutz.
- Rejoin stellt belegte Anker, Fortschritt und Restzeit serverseitig wieder her.

### Raum 2 – Geteilte Schutzlinien

- Zwei Spieler halten je eine Schutzlinie, zwei Spieler unterbrechen Elitekanäle.
- Rollen können während des Kampfes gewechselt werden, aber nie clientseitig ohne gültige Mutation.
- Versäumte Unterbrechungen erzeugen klar telegraphierte, überlebbare Teamfolgen.

### Raum 3 – Schleierlast

- Eine übertragbare Last wandert zwischen Spielern und muss vor dem Grenzwert weitergegeben werden.
- Übergaben sind serverseitig exakt einmal und mit Idempotenzschlüssel zu verarbeiten.
- Disconnect des Trägers löst eine faire, autoritative Übergabe- oder Sicherungsregel aus.

### Raum 4 – Reinigungskreis

- Verunreinigungen entstehen in mehreren Bereichen und müssen durch koordinierte Positionierung gereinigt werden.
- Ein Spieler kanalisiert, während andere den Bereich verteidigen und Verstärkungen abfangen.
- Nach Raumabschluss dürfen keine Hazards, Trefferzonen oder Kanäle weiterwirken.

### Raum 5 – Vier Siegel

- Mehrstufige Kombination der vorherigen Kooperationsprinzipien.
- Vier Siegel werden in einer vorgegebenen, synchronisierten Reihenfolge aktiviert.
- Falsche Reihenfolge setzt nur den aktuellen Schritt fair zurück und erzeugt keine vollständige unlesbare Bestrafung.
- Der Abschluss bereitet visuell und mechanisch auf die anspruchsvolleren Raid-Räume 6–10 vor.

## Gemeinsame technische Anforderungen

- Kanonischer Raumzustand liegt im Block-11-Raidmodell und wird monoton versioniert.
- Jede Mechanikmutation benötigt einen eindeutigen Idempotenzschlüssel.
- Veraltete Versionen werden abgewiesen und anschließend über einen frischen Snapshot versöhnt.
- Kein doppelter Spawn, Raumabschluss, Fortschrittsschritt oder späterer Belohnungsanspruch.
- Reconnect und Rejoin laden Mechanik-, Gegner-, Spieler- und Zeitstatus autoritativ.
- Abgebrochene oder abgelaufene Runs sperren weitere Raumänderungen.
- Normale Duo-Lobby und Duo-Runtime werden nicht wiederverwendet.

## Mobile und visuelle Anforderungen

- Ausschließlich mobiles Hochformat auf iPhone/WebKit, Android/Chromium, iPad/WebKit und Android-Tablet/Chromium.
- Echte Touch-Bedienung, sichere Touchflächen und kein horizontaler Überlauf.
- Telegraphen, Rollenhinweise, Teamstatus, Timer und Interaktionsflächen müssen gleichzeitig lesbar bleiben.
- Querformat pausiert Eingabe und Raid-Zustand sicher.
- Keine schwarzen Räume, unsichtbaren Gegner, Geisterschäden oder weiterlaufenden Hazards nach Abschluss.

## Pflichtprüfungen

- Raum 1–5 jeweils mit vier synchronisierten Teilnehmern.
- Erfolgsweg, Fehlerweg, Disconnect, Rejoin, Retry, Reload und Abbruch.
- Doppeltap- und Idempotenzschutz.
- Versionskonflikt und Snapshot-Versöhnung.
- Hostverlust darf keinen autoritativen Zustand verlieren.
- Raumübergänge 1→2, 2→3, 3→4, 4→5 und 5→6-Vertrag.
- Vollständige Smartphone- und Tablet-Evidence auf dem exakten finalen Commit.
- Screenshots und Videos werden tatsächlich angesehen und sichtbare Fehler vor Merge behoben.

## Definition of Done

Block 12 ist erst abgeschlossen, wenn alle fünf Räume technisch, visuell und spielerisch umgesetzt sind, alle Pflichtchecks auf dem exakten Head grün sind, die mobile Evidence geprüft wurde und der PR ausschließlich in `fix/mobile-telegraphs-room-21-50-balance` gemergt wurde.