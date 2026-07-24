# Dungeon Veil – Room Bible 51–60

Status: verbindlicher Block-3-Implementierungsvertrag

Basis: `fix/mobile-telegraphs-room-21-50-balance` @ `8677ba0957d9851893282bee4c49849182f2de73`

## Kapitelidentität – Der Goldene Bruch

Räume 51–60 bilden das erste Kapitel hinter dem bisherigen Raum-50-Abschluss. Die Umgebung zeigt einen aufgebrochenen, tieferen Schleierbezirk: schmale goldene Leitbahnen schneiden durch violett-schwarzen Stein, versetzte Plattformen und gebrochene Bögen ersetzen die bisherigen überwiegend geschlossenen Arenen.

Die Kapitelmechanik heißt **Schleierbruch**. Goldene Bruchlinien kündigen kurzzeitig aktive Gefahrenbahnen an. Sie dürfen nie ohne Vorwarnung Schaden verursachen, nie direkt unter einem frisch gespawnten Spieler aktiv werden und müssen nach Raumende vollständig bereinigt werden.

### Mobile Verträge

- Primäre Kampfzone bleibt im mittleren 70-%-Bereich des sichtbaren Hochformat-Viewports.
- Wichtige Telegraphen dürfen nicht hinter HUD, Daumenbereichen oder hoher Dekoration verschwinden.
- Gefahren verwenden Form plus Bewegung plus Kontrast; Farbe allein genügt nicht.
- Kein Spawnangriff innerhalb der ersten 1,25 Sekunden nach Betreten oder Wiederbeitritt.
- Mindestens 0,75 Sekunden klare Vorwarnung für Linien-/Flächengefahren, bei großem Schaden mindestens 1,0 Sekunde.
- Maximal zwei gleichzeitige vollflächige Gefahrenmuster; Gegnertelegraphen müssen weiterhin unterscheidbar bleiben.
- Querformat pausiert Spielzustand, Gegner, Projektile, Gefahren und Eingabe vollständig.

## Raum 51 – Die Nachschwelle

**Funktion:** Sicherer mechanischer Übergang aus Raum 50 und Einführung des Schleierbruchs.

**Geometrie:** Längliche Halle mit zwei seitlich versetzten Deckungsinseln und breiter freier Kampfmitte.

**Encounter:** Zwei gestaffelte Nahkampfgruppen, danach ein Fernkämpfer auf wechselnder Seite.

**Gefahr:** Eine einzelne goldene Bruchlinie durchquert die Halle nach sichtbarer Aufladung. Sie bleibt langsam und lehrbar.

**Erfolgskriterium:** Spieler erkennen Vorwarnung, aktive Phase und Abklingen ohne Textzwang.

## Raum 52 – Geteilte Galerie

**Funktion:** Positionswechsel und Zielpriorität.

**Geometrie:** Zwei verbundene Halbkreise mit zentralem Durchlass; keine geschlossene Rechteckarena.

**Encounter:** Schildträger bindet die Mitte, zwei mobile Fernkämpfer wechseln die Galeriehälften.

**Gefahr:** Abwechselnd leuchtet eine Hälfte auf; der Übergang bleibt immer offen.

**Fairness:** Niemals beide Hälften gleichzeitig sperren.

## Raum 53 – Die Drei Siegel

**Funktion:** Bewegungsroute statt reiner Gegnerwelle.

**Geometrie:** Dreieckige Arena mit drei gut sichtbaren Siegelpunkten.

**Encounter:** Gegner erscheinen an inaktiven Siegeln. Der Spieler deaktiviert nacheinander drei Bruchanker durch kurzes Positionshalten.

**Gefahr:** Aktive Siegel senden klar begrenzte Pulsringe aus.

**Fairness:** Positionshalten wird bei Treffer nicht vollständig zurückgesetzt; Fortschritt fällt nur langsam ab.

## Raum 54 – Gebrochene Säulen

**Funktion:** Sichtlinien und Deckung.

**Geometrie:** Asymmetrische Säulengruppe mit zwei breiten Flankenwegen und freier Mitte.

**Encounter:** Fernkämpfer nutzen Sichtlinien, Nahkämpfer treiben den Spieler aus statischer Deckung.

**Gefahr:** Bruchlinien wandern zwischen markierten Säulenpaaren, nie zufällig durch nicht markierte Bereiche.

**Performance:** Dekoration ohne physikalische Kleinteile und ohne unnötige dynamische Schatten.

## Raum 55 – Goldstrom-Kreuzung

**Funktion:** Kreuzende, aber vorhersehbare Bewegungsbahnen.

**Geometrie:** Kreuzförmige Arena mit verbreitertem Zentrum.

**Encounter:** Vier kleine Gruppen aus den Armen; maximal zwei Arme gleichzeitig aktiv.

**Gefahr:** Zwei zeitversetzte Ströme laufen durch die Kreuzachse. Kreuzungspunkt bleibt zwischen den Pulsen sicher.

**Fairness:** Keine Kombination aus Strom und Gegnerangriff darf den kompletten sicheren Bereich gleichzeitig schließen.

## Raum 56 – Der Schleiergarten

**Funktion:** Ruhigerer Kontrast-Raum mit kontrollierter Raumverengung.

**Geometrie:** Organisch gerundete Inseln, niedrige violette Kristallgruppen und zwei Schleifenrouten.

**Encounter:** Kleine schnelle Gegner mit einem langsam steuernden Elitegegner.

**Gefahr:** Kristallfelder wachsen sichtbar und zerfallen wieder; sie verursachen Verlangsamung, keinen unmittelbaren Burst-Schaden.

**Lesbarkeit:** Kristalle bleiben niedrig genug, um Füße, Projektile und Bodenmarker zu sehen.

## Raum 57 – Spiegelsteg

**Funktion:** Richtungswechsel und symmetrische Täuschung ohne unsichtbare Angriffe.

**Geometrie:** Breiter Steg mit zwei seitlichen Ausweichbuchten.

**Encounter:** Zwei Gegnergruppen spiegeln ihre Startpositionen, Angriffe bleiben jedoch eindeutig an den echten Gegner gebunden.

**Gefahr:** Eine sichtbare Bruchwelle läuft längs über den Steg; Ausweichbuchten wechseln links/rechts.

**Fairness:** Keine falschen Schadensquellen oder rein dekorativen Telegraphen.

## Raum 58 – Die Senke

**Funktion:** Höhenwirkung durch Architektur, ohne Kamera- oder Zielprobleme.

**Geometrie:** Flache zentrale Senke mit umlaufendem Ring und zwei Rampen.

**Encounter:** Nahkämpfer unten, Fernkämpfer auf dem Ring; Spawns bleiben im Blickfeldrand angekündigt.

**Gefahr:** Der Ring wird abschnittsweise aktiv, die Senke bleibt zeitweise sicher; später wechselt das Muster.

**Mobile Kamera:** Keine echte starke Höhenverschiebung, die Gegner hinter HUD oder Geometrie versteckt.

## Raum 59 – Vorhof des Bruchwächters

**Funktion:** Mechanische Prüfung und Bossvorbereitung.

**Geometrie:** Breite achteckige Vorhalle mit vier Bruchankern und deutlich sichtbarem Bossportal.

**Encounter:** Drei kurze Wellen kombinieren die Rollen aus 51–58, aber ohne neue Regeln.

**Gefahr:** Bekannte Linien-, Puls- und Zonenmuster erscheinen nacheinander, nicht gleichzeitig voll überlagert.

**Abschluss:** Portal öffnet erst nach Gegner- und Hazard-Cleanup. Kein doppelter Raumabschluss.

## Raum 60 – Aurel, Wächter des Goldenen Bruchs

**Rolle:** Eigenständiger Kapitelboss, kein vergrößerter Standardgegner.

**Arena:** Rundes Zentrum mit vier breiten seitlichen Schutzbuchten und goldenen Bruchsegmenten im Boden. Freie Sicht auf Boss, Spieler und Telegraphen hat Vorrang vor Dekoration.

### Phase 1 – Vermessung

- Klarer frontaler Fächerangriff.
- Einzelne Bruchlinie verfolgt die letzte Spielerposition, friert vor Aktivierung sichtbar ein.
- Nach jeder Angriffskette echte Erholungspause.

### Phase 2 – Gespaltener Ring

- Bei 65 % Leben aktiviert Aurel zwei gegenüberliegende Ringsegmente.
- Sichere Bereiche bleiben groß genug für Solo und Duo.
- Zusätzliche Gegner maximal paarweise und nicht gleichzeitig mit dem stärksten Flächenangriff.

### Phase 3 – Goldener Kollaps

- Bei 30 % Leben kombiniert Aurel bekannte Muster in fester, lernbarer Reihenfolge.
- Keine Geschwindigkeitssteigerung, die mobile Reaktionszeiten unterschreitet.
- Finale Attacke besitzt mindestens 1,2 Sekunden Vorwarnung und einen klaren sicheren Sektor.

### Bossverträge

- Phasenwechsel räumt alte Projektile und nicht mehr gültige Gefahren auf.
- Tod, Neustart, Fortsetzen und Duo-Wiederbeitritt erzeugen keinen zweiten Boss und keine Geistergefahren.
- Bossbelohnung wird genau einmal vergeben.
- Abschluss von Raum 60 persistiert eindeutig und führt später nur in den definierten Übergang zu Raum 61.

## Schwierigkeit und Balance

Die Steigerung gegenüber Raum 50 entsteht primär durch:

1. klarere Zielprioritäten,
2. wechselnde sichere Zonen,
3. kombinierte Gegnerrollen,
4. längere, aber fair telegraphierte Bewegungsentscheidungen,
5. Bossphasen mit mechanischer Wiederholung und Steigerung.

HP und Schaden dürfen nur moderat steigen. Kein Raum darf allein durch lange Lebensbalken schwieriger werden.

## Erforderliche Implementierungs- und Evidence-Artefakte

- Raumtitel 51–60 und Kapitelname im Runtime-Vertrag.
- Encounter-Definitionen und Spawn-Audits für jeden Raum.
- Hazard-Lifecycle-Test: Start, Warnung, aktiv, Ende, Raumwechsel, Tod, Reload.
- Übergangstest 50 → 51.
- Bossphase-, Belohnungs- und Doppelauszahlungs-Test für Raum 60.
- Solo- und Duo-Smoke für 51–60.
- Screenshots jedes Raums auf iPhone/WebKit, Android/Chromium, iPad/WebKit und Android-Tablet/Chromium.
- Video mindestens für 50 → 51, Raum 53, Raum 57, Raum 59 → 60 und vollständigen Bosskampf.
- Alle Bilder und Videos müssen manuell auf Überlagerungen, abgeschnittene UI, unlesbare Telegraphen, verdeckte Gegner, falsche Spawnpositionen und sichtbare Performancefehler geprüft werden.
