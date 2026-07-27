# Dungeon Veil – verbindlicher Master-Arbeitsplan

Diese Datei ist die dauerhafte, repository-interne Quelle für den verbindlichen Arbeitsplan von **Block 0 bis Block 17**. Neue Chats und Arbeitsläufe müssen diese Datei vor Beginn lesen und den tatsächlichen GitHub-Stand zusätzlich prüfen.

## Fester Projektvertrag

- Repository: `ys2mm422yb-max/DungeonVeil`
- Fester Ziel-, Integrations- und Testbranch: `fix/mobile-telegraphs-room-21-50-balance`
- `main` niemals verändern oder als Ziel verwenden.
- Keine fremden Arbeitsbranches verändern.
- Neue Arbeit immer auf einem eigenen fokussierten Branch vom tatsächlichen aktuellen Zielbranch-Head beginnen.
- Pull Requests zunächst als Draft anlegen.
- Kein Auto-Merge und keine Branches automatisch löschen.
- Vollständig geprüfte Änderungen ausschließlich in den festen Zielbranch mergen.
- PR #315 bleibt ein separater Asset-PR und darf nicht pauschal verändert oder gemergt werden.
- Vor jedem Block Zielbranch, offene PRs, laufende Actions, konkurrierende Arbeit und bereits integrierte Änderungen prüfen.
- Ein Branch mit laufender finaler Evidence gilt als eingefroren.
- Unterstützt wird ausschließlich mobiles Hochformat: iPhone/WebKit, Android/Chromium, iPad/WebKit und Android-Tablet/Chromium mit echter Touch-Bedienung.
- Querformat muss Eingabe und Spielzustand vollständig pausieren und nach Rückkehr sicher fortsetzen.
- Playwright-Retries bleiben `0`; Tests dürfen nicht abgeschwächt werden.

## Block 0 – Bestandsaufnahme und dauerhafte Nachverfolgung

- Stündliche Fortsetzungs-Automation sicherstellen.
- Aktuellen GitHub-Stand, offene Issues und PRs vollständig erfassen.
- Zentralen Roadmap-/Tracking-Eintrag mit allen Blöcken und Checklisten pflegen.
- Bereits erledigte Arbeiten nicht erneut implementieren.
- PR #315 und laufende Arbeit anderer Chats nicht stören.

## Block 1 – Gold, Schleierstaub, Shop und Einstellungsmenü

- Gold öffnet den Shop, möglichst den Gold-/Währungsbereich.
- Schleierstaub öffnet den Shop, möglichst den Materialbereich.
- Das bisher über Gold erreichbare Menü mit Online & Cloud, Tutorial, Einstellungen und Credits vollständig vom Gold-Button entfernen.
- Dieses Menü ausschließlich über das Zahnrad oben rechts öffnen.
- Profil öffnet nur das Profil, Zahnrad nur das Optionsmenü.
- Keine durchfallenden Taps, kein sofortiges Wieder-Schließen durch denselben Tap.
- Shop und Optionsmenü zuverlässig schließen.
- Echte mobile Taps auf allen vier unterstützten Hochformatgeräten testen.
- Block vollständig mergen und veröffentlichen, bevor Block 2 beginnt.

## Block 2 – Schmiedemarken und Entfernung der Wunschfunktion

- Wunsch-Buttons, Auswahl, Texte, Hinweise, Zustände, unnötige Speicherwerte, veraltete Tests sowie tote Backend-/UI-Verbindungen entfernen.
- Alte Wunschdaten rückwärtskompatibel ignorieren oder migrieren, ohne Saves zu beschädigen.
- Schmiedemarken als sehr seltene reguläre Belohnung einführen.
- Dropquellen und Raten anhand echter Economy-Simulation bestimmen und dokumentieren.
- Normale Räume dürfen Marken nicht zuverlässig liefern; Elite-, Boss- oder besondere Inhalte nur mit weiterhin seltener Chance.
- Zehn Marken tauschen atomar gegen genau einen zufälligen Ausrüstungsgegenstand aus den Kategorien Bogen/Waffe, Rüstung oder Köcher.
- Keine Relikte, Begleiter, Währungen oder Verbrauchsgegenstände; keine Wunsch- oder Zielauswahl; Duplikate erlaubt.
- Bei neun Marken kein Tausch, bei zehn Marken exakt ein Tausch und exakt zehn Marken Abzug.
- Doppeltap, Retry und Reload dürfen keine doppelte Belohnung erzeugen.
- Belohnung groß mit Name, Kategorie und Seltenheit darstellen und sicher persistieren.
- Verteilungssimulation, Poolvalidierung, Save/Reload und vier mobile Hochformatgeräte prüfen.

## Block 3 – Räume 51–60

- Vollständiges neues Kapitel mit Raum 51 als logischem Übergang aus Raum 50.
- Räume 51–59 mit jeweils eigener Funktion, Route und klarer Raumidentität.
- Raum 60 als eigener Kapitelboss.
- Eigene Architektur, Bodenführung, Licht-/Farbstimmung, Dekoration, Gegnerzusammenstellung, Gefahrenmechanik und passende Atmosphäre.
- Violett-goldene Dungeon-Veil-Grundsprache erhalten, aber keine bloße Umfärbung früherer Räume.
- Keine zehn nahezu identischen Rechteckarenen.
- Kampfmitte, Spawns und Telegraphen mobil lesbar halten.
- Echte vorhandene Assets verwenden.
- Room Bible, Titel, Encounter-Pläne, Audits und Evidence erweitern.
- Schwierigkeit gegenüber Raum 50 spürbar, aber fair und nicht nur über HP steigern.
- Alle Räume 51–60 auf vier mobilen Hochformatgeräten aufnehmen und visuell prüfen.

## Block 4 – Räume 61–70

- Zweites neues Kapitel mit klar unterscheidbarer Identität.
- Räume 61–69 mit unterschiedlichen Raumaufgaben und Kampfgeometrien.
- Raum 70 als eigener Kapitelboss.
- Neue Gegnerkombinationen und mindestens eine neue kapiteltypische Gefahrenmechanik.
- Keine monotone Wiederholung derselben Architektur oder Dekoration.
- Room Bible, Titel, Encounter, Loot, Audits und Tests erweitern.
- Übergang 60 → 61 besonders prüfen.
- Vollständige mobile Kapitel-Evidence erstellen und ansehen.

## Block 5 – Räume 71–80

- Drittes neues Kapitel.
- Räume 71–79 individuell gestalten, Raum 80 als eigener Bossraum.
- Mechanische Schwierigkeit weiterentwickeln, nicht nur Zahlen erhöhen.
- Gegnerrollen und Telegraphen trotz Kulisse klar lesbar halten.
- Mobile Performance- und Objektbudgets einhalten.
- Kapitelübergänge, Solo, Duo und Fortsetzen testen.

## Block 6 – Räume 81–90

- Viertes neues Kapitel mit eigener Identität.
- Räume 81–89 individuell, Raum 90 als eigener Bossraum.
- Anspruchsvollere Gegner-/Gefahrenkombinationen ohne unfaire Spawnangriffe, unsichtbare Gefahren oder Geisterschaden.
- Visuelle Dichte gegen mobile Lesbarkeit abwägen.
- Raumtitel, Kodex-Funde, Belohnungen und Fortschrittswerte aktualisieren.

## Block 7 – Räume 91–100 und finaler Raum-100-Boss

- Räume 91–99 bilden das finale Kapitel des ersten 100-Raum-Durchlaufs.
- Raum 100 ist ein echter großer Abschlussboss und kein vergrößerter Standardgegner.
- Eigene Bossphasen, Angriffe, Telegraphen, Arena, Übergänge, visuelle Identität, Belohnung und Abschlussdarstellung.
- Frühere Mechaniken sinnvoll zusammenführen, ohne unfair oder unlesbar zu werden.
- Tod, Neustart, Fortsetzen, Duo, Renderer-Recovery und Orientierung müssen funktionieren.
- Nach Raum 100 endet der Gesamtfortschritt nicht: Der Run wechselt verbindlich von **Kapitel 1** zu **Kapitel 2** und beginnt wieder bei **Raum 1**.
- Jedes Kapitel besteht aus denselben 100 Raumpositionen, muss aber als klar stärkerer Durchlauf behandelt werden; Kapitelnummer und aktuelle Raumposition müssen getrennt gespeichert, angezeigt und synchronisiert werden.
- Der Schwierigkeitsanstieg pro Kapitel darf nicht nur aus mehr Gegner-HP bestehen. Angriffsdruck, Gegnerkombinationen, Eliterollen, Bewegung, Gefahrenmuster, Reaktionsfenster, Bossphasen und mechanische Überlagerungen müssen kontrolliert zunehmen.
- Kapitel 2 muss bereits deutlich schwerer als Kapitel 1 sein. Der Anstieg bis Kapitel 100 soll so steil und anspruchsvoll sein, dass Kapitel 100 nur von außergewöhnlich starken, sehr gut ausgerüsteten und mechanisch sicheren Spielern erreicht werden kann.
- Kapitel 100 ist das langfristige Extremziel. Es darf nicht durch triviales lineares Farmen, einfache Zeitinvestition oder eine einzelne übermächtige Ausrüstungskombination zuverlässig erreichbar sein.
- Die Skalierung muss mathematisch dokumentiert, simuliert und gegen unfaire Soforttode, unsichtbare Gefahren, nicht mehr reagierbare Telegraphen, HP-Schwämme und technisch unmögliche Begegnungen abgesichert werden.
- Belohnungen, Ausrüstungsfortschritt und Upgradeökonomie müssen mit der Kapitelsteigerung wachsen, ohne den Schwierigkeitssprung vollständig zu neutralisieren oder exponentielle Inflation zu erzeugen.
- Nach jedem Raum-100-Sieg darf Kapitelaufstieg und Belohnung exakt einmal erfolgen; Doppeltap, Retry, Reload, Reconnect und Duo-Synchronisierung dürfen weder Kapitel überspringen noch Belohnungen duplizieren.
- Tod, Fortsetzen und Cloud-Save müssen jederzeit exakt **Kapitel**, **Raum**, Bosszustand und bereits beanspruchte Kapitelbelohnungen wiederherstellen.
- Es gibt keine Endlosschleife innerhalb eines Kapitels: Raum 100 führt genau einmal in Raum 1 des nächsten Kapitels. Nach Abschluss von Kapitel 100 muss ein eigener endgültiger Endzustand mit besonderer Abschlussdarstellung entstehen.

## Block 8 – Gesamtbalance, Progression und vollständige Räume-1–100-Evidence

- Gesamte Schwierigkeitskurve 1–100 in Kapitel 1 prüfen und unfaire Sprünge beseitigen.
- Den Kapitelaufstieg 1 → 2, mehrere repräsentative mittlere Kapitel sowie die Extrem-Skalierung bis Kapitel 100 mit deterministischen Simulationen und dokumentierten Grenzwerten prüfen.
- Gegner-HP, Angriffsdruck, Bewegung, Pausen, Gefahren und Belohnungen gemeinsam bewerten.
- Gold, Schleierstaub, Ausrüstungsdrops, Schmiedemarken und Upgradeökonomie simulieren.
- Save/Fortsetzen, Duo-Synchronisierung und gegebenenfalls Spectator-Zustände auf Räume 51–100 sowie auf Kapitel- und Raumposition erweitern.
- Weltboss und bestehende Modi dürfen nicht regressieren.
- Room Bible, Kodex, Titel und Freischaltungen bis Raum 100 aktualisieren; Kapitelnummer, Kapitelbestwerte und Kapitelabschluss müssen getrennt abgebildet werden.
- Validatoren bewusst vom alten 1–50-Vertrag auf den passenden 1–100- und 100-Kapitel-Vertrag erweitern.
- Vollständige Solo- und Duo-Läufe auf iPhone und Android-Smartphone; kritische Übergänge, Bosse und Runtime-Verträge auf iPad und Android-Tablet.
- Räume 50/51, 60/61, 70/71, 80/81, 90/91, Raum 100 sowie der Übergang Kapitel 1 Raum 100 → Kapitel 2 Raum 1 besonders prüfen.
- WebGL-Recovery, Orientierungsschutz, Hazard-Cleanup, Tod/Fortsetzen und HUD-/Renderingfehler prüfen.
- Alle Screenshots und Videos tatsächlich ansehen und sichtbare Fehler selbst korrigieren.

## Block 9 – Gildenraid: Design und technischer Datenvertrag

- Issue #321 vollständig lesen und als Grundlage verwenden.
- Fester Kern: vier Mitglieder derselben Gilde, Start aus dem Gildenbereich, zehn eigene Raid-Räume, deutlich schwieriger als normale Räume, eigener finaler Raid-Boss und echte Kooperation.
- Lobbyablauf, Einladungen, Ready-Status, Gruppenführer, Auflösung, Rollen, Raid-Run-ID, gemeinsamer Zustand, Gegner-/Bosszustand, Disconnect/Wiederbeitritt, Abbruch, Belohnungsanspruch, Limits und Missbrauchsschutz dokumentieren.
- Datenbank-, Realtime-, RLS- und RPC-Vertrag festlegen.
- Keine clientseitig vertrauenswürdige Belohnungslogik.

## Block 10 – Vier-Spieler-Gildenlobby

- Raid-Zugang im Gildenmenü.
- Nur Mitglieder derselben Gilde dürfen gemeinsam starten.
- Genau vier eindeutig synchronisierte Teilnehmer.
- Einladung, Annahme, Ready-Status und sichtbarer Gruppenstatus.
- Nur gültige Gruppe darf starten; Mehrfachstart verhindern.
- Gruppe und Raid-Run serverseitig eindeutig zuordnen.
- Mobile Hochformatbedienung ohne abgeschnittene Karten oder Buttons.
- Verständlicher Hinweis für gildenlose Spieler.
- Keine Vermischung mit normalem Duo-Lobbyzustand.

## Block 11 – Synchronisierter Raid-Zustand und Wiederbeitritt

- Serverseitig verlässlicher gemeinsamer Raid-Zustand.
- Spieler, Räume, Gegner, Boss-HP, Mechaniken, Kills und Fortschritt synchronisieren.
- Autorität klar definieren; Client darf Bosskills oder Belohnungen nicht fälschen.
- Disconnect und Wiederbeitritt nach eindeutigem Vertrag behandeln.
- Kein doppelter Spawn, Raumabschluss oder Loot.
- Abgebrochene Runs konsistent abschließen oder verwerfen.
- Realtime-, RLS- und RPC-Sicherheit testen.

## Block 12 – Gildenraid-Räume 1–5

- Fünf eigene Raid-Räume mit echter Zusammenarbeit entwickeln.
- Beispiele: gleichzeitige Aktivierungen, getrennte Aufgabenbereiche, gegenseitiger Schutz, Unterbrechungen, Effektweitergabe/-reinigung oder gemeinsames Positionshalten.
- Keine bloßen vier parallel kämpfenden Solospieler.
- Jeder Raum erhält eigene visuelle Identität, Mechanik, klare Hinweise, faire Fehlerreaktion, mobile Lesbarkeit, synchronisierten Zustand und Wiederbeitrittsverhalten.

## Block 13 – Gildenraid-Räume 6–10

- Weitere fünf eigenständige Raid-Räume.
- Anspruchsvollere, aber neue Mechaniken; mindestens ein Raum mit mehrstufiger Teamkoordination.
- Raum 10 bereitet sichtbar auf den Raid-Boss vor.
- Keine Wiederholung der ersten fünf Mechaniken.
- Performance für vier Spieler, Gegner, Effekte und Telegraphen prüfen.
- Keine neuen Canvas-/Renderer-Leaks.

## Block 14 – Raid-Boss, Belohnungen und Gildenfortschritt

- Eigener mehrphasiger Raid-Boss mit vier-Spieler-Angriffen, Kooperationsphasen und klaren mobilen Telegraphen.
- Bosszustand nicht nur beim Host; Disconnect/Reconnect korrekt behandeln.
- Belohnungen serverseitig autoritativ und genau einmal pro gültigem Abschluss.
- Kein Duplikat bei Retry oder Reconnect; Teilnahme-/Abschlussbedingungen und Anti-Farming-Limits definieren.
- Gildenwertung oder langfristigen Fortschritt nur sauber integrieren, wenn passend.
- Finale echte Vier-Spieler-Evidence für Lobby, Ready, Start, alle zehn Räume, Boss, Disconnect, Wiederbeitritt, Abbruch, Belohnung und Doppeltap-/Retry-Schutz auf Smartphone und Tablet.

## Block 15 – Kontrollierte Integration weiterer Assets aus PR #315

- PR #315 unverändert lassen und nicht pauschal mergen.
- Nur tatsächlich benötigte Assets für Räume 51–100 oder Raid gezielt in neue fokussierte Branches übernehmen.
- Direkte GLTF-/GLB-Abhängigkeiten, Texturen und Lizenzdateien mitnehmen.
- Keine ZIP-, Blender-, FBX-, OBJ-, Unity- oder Unreal-Komplettpakete.
- Keine doppelten Assets und keine ungenutzten großen Runtime-Bestände.
- Dateigrößen, Runtime-Verwendung und Asset-Manifeste prüfen.
- Jedes verwendete Modell im echten Spiel darstellen und visuell prüfen.
- Dieser Block darf teilweise während Raum-/Raid-Arbeiten erfolgen, muss aber pro PR sauber dokumentiert sein.

## Block 16 – Lizenzierung und Third-Party-Hinweise

- Issue #318 auf eigenem fokussierten Branch umsetzen.
- Proprietäre `LICENSE`/All-Rights-Reserved-Datei für eigenen Code, Namen und eigene Inhalte.
- `COPYRIGHT.md` und `THIRD_PARTY_LICENSES.md`.
- KayKit und alle tatsächlich genutzten Fremdassets korrekt aufführen.
- Lizenzhinweis in README.
- Asset-Lizenzen an relevanten Runtime-Pfaden erhalten.
- Keine falsche Behauptung, öffentliche Sichtbarkeit oder Forks technisch verhindern zu können.
- Keine Vermischung mit Gameplay-/Balanceänderungen.

## Block 17 – Abschließender Gesamtpolish und Veröffentlichung

- Gesamtes veröffentlichte Spiel prüfen: Hauptmenü, Shop, Optionen, Profil, Ausrüstung, Kodex, Aufträge, Post, Freunde, Gilde, Gildenraid, Solo, Duo, Räume 1–100, Kapitelaufstieg 1–100, alle Bosse, Weltboss, Begleiter, Relikte, Schmiedemarken, Upgrades, Loot, Save/Reload, Cloud, Spectator, Renderer-Recovery und Querformatblocker.
- Visuell nach schwarzen Räumen, unsichtbaren Gegnern, falschen Waffenhaltungen, schwebenden/doppelten Ausrüstungsteilen, Geisterschaden, Gefahren nach Kampfende, abgeschnittenem HUD, zu kleinen Touchflächen, überlappenden Menüs, horizontalem Überlauf, leeren Räumen, schlechter Beleuchtung, verdeckten Telegraphen, falschen Titeln/Bildern, falschen Übergangsscreens, Speicher-/Geometriewachstum und Platzhaltern suchen.
- Kapitelanzeige, Raumreset nach Raum 100, einmalige Kapitelbelohnung, Kapitel-/Raum-Saves, Duo-Synchronisierung und finalen Abschluss nach Kapitel 100 gezielt prüfen.
- Fehler nicht nur melden, sondern auf getrennten kleinen Branches selbst beheben.
- Abschließend vollständige mobile Hochformatmatrix, Retries 0, alle Pflichtchecks grün, finale Screenshots/Videos manuell geprüft, exakten Head-SHA geprüft, in den festen Zielbranch gemergt, Zielbranch-Actions und Pages geprüft.
- Stündliche Automation erst deaktivieren, wenn alle Blöcke wirklich abgeschlossen sind.

## Definition of Done pro Block

Ein Block ist erst abgeschlossen, wenn:

1. Code vollständig umgesetzt ist.
2. Gefundene Fehler behoben sind.
3. Tests auf dem exakten finalen Commit grün sind.
4. Smartphone- und Tablet-Evidence erstellt wurde.
5. Screenshots und Videos tatsächlich visuell geprüft wurden.
6. Querformatblocker geprüft wurde.
7. Der PR in den festen Zielbranch gemergt wurde.
8. Zielbranch-Actions grün sind.
9. Deployment am festen Testlink bestätigt wurde.

## Aktueller Fortschrittsgrundsatz

Vor jeder Fortsetzung muss der tatsächliche GitHub-Stand geprüft werden. Der zuletzt bekannte Chat- oder Dokumentstand ist nur ein Hinweis und darf niemals ungeprüft als Wahrheit übernommen werden.
