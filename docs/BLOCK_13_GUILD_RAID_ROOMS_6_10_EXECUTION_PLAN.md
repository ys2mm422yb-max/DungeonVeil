# Block 13 – Gildenraid-Räume 6–10

## Fester Rahmen

- Zielbranch: `fix/mobile-telegraphs-room-21-50-balance`
- Arbeitsbranch: `feat/block-13-guild-raid-rooms-6-10-v1`
- Start-Commit: `f0cfae053f8bea79ae9ee6e7320e07fcc5126606`
- `main` bleibt ausgeschlossen.
- Kein Auto-Merge und keine automatische Branchlöschung.
- PR #315 bleibt unverändert.

## Raumvertrag

### Raum 6 – Spiegelpaare
Vier Spieler bilden zwei serverseitig bestätigte Paare. Aktionen zählen nur, wenn beide Partner innerhalb des Zeitfensters dieselbe Haltung bestätigen. Fehlversuche setzen nur das aktuelle Paarfenster zurück.

### Raum 7 – Runenstaffel
Eine Rune wandert in festgelegter Slot-Reihenfolge durch das Team. Jede Übergabe wird genau einmal verarbeitet; falsche Übergaben erhöhen nur den lokalen Fehlerzähler.

### Raum 8 – Schattenjagd
Zwei Spieler markieren wechselnde Schattenziele, zwei andere führen die bestätigten Unterbrechungen aus. Markierung und Treffer müssen dieselbe serverseitige Zielrevision besitzen.

### Raum 9 – Geteilter Atem
Das Team teilt einen gemeinsamen Stabilitätsvorrat. Schutzimpulse und Entlastungsaktionen müssen zeitlich verteilt werden; gleichzeitiges Spammen erzeugt keinen mehrfachen Fortschritt.

### Raum 10 – Tor des Raid-Bosses
Mehrstufige Teamkoordination aus Rollenwahl, Runenfolge und vier gleichzeitigen Abschlusskanälen. Der Raum endet mit einem eindeutigen Boss-Handoff und ohne Belohnungsanspruch.

## Technische Anforderungen

- Kanonischer Zustand bleibt im serverautoritativen Raid-Run aus Block 11.
- Jede Aktion verwendet State-Version und Idempotenzschlüssel.
- Räume 6–10 verwenden einen eigenen `block13`-Mechanikzustand.
- Keine Wiederholung der Räume 1–5 und keine vier parallelen Solokämpfe.
- Rejoin, Versionslücke, Doppeltap, Reload und Hostverlust werden geprüft.
- Raum 10 erzeugt nur den Übergabevertrag zum Raid-Boss aus Block 14.

## Mobile Pflichtprüfung

- iPhone/WebKit, Android/Chromium, iPad/WebKit und Android-Tablet/Chromium.
- Hochformat, echte Touch-Eingaben, kein horizontaler Überlauf.
- Rollen, Zielrevision, Timer, Teamstatus und Interaktionen gleichzeitig lesbar.
- Querformat sperrt Eingaben und lädt nach Rückkehr den bestätigten Snapshot.

## Geplante vollständige Gegnerintegration

Die aktuell hart codierte Acht-Gegner-Kodexliste ist kein vollständiges Gegnerinventar. Im kontrollierten Asset-Block 15 wird deshalb ein kanonisches Gegnerregister eingeführt, das Runtime-Spawns, Räume, Varianten und Kodex aus derselben Datenquelle speist. Aus PR #315 werden ausschließlich tatsächlich verwendete GLB/GLTF-Dateien, Texturen und Lizenzen gezielt übernommen. Jede neue Gegnerfamilie benötigt eigenes Verhalten, Telegraphen, Raumzuordnung, mobile Evidence und einen echten Kodex-Eintrag; bloße Anzeigenamen-Aliasse auf alten IDs sind nicht ausreichend.

## Definition of Done

Block 13 ist erst abgeschlossen, wenn Räume 6–10 technisch und visuell umgesetzt, alle Exact-Head-Checks grün, die mobile Evidence angesehen, der PR in den festen Zielbranch gemergt und die Veröffentlichung am festen Testlink bestätigt wurde.