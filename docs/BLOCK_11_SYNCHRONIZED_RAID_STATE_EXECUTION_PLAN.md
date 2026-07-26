# Block 11 – Synchronisierter Raid-Zustand und Wiederbeitritt

## Ausgangspunkt

- Repository: `ys2mm422yb-max/DungeonVeil`
- Fester Zielbranch: `fix/mobile-telegraphs-room-21-50-balance`
- Exakter Branch-Start: `f6d64d93dcdec5b33bd7d7ea5eb63d906dc775ef`
- Arbeitsbranch: `feat/block-11-synchronized-raid-state-v1`
- `main` ist ausgeschlossen.
- Block 10 ist integriert; Lobby, vier feste Mitglieder, Ready-Status und genau-einmaliger serverseitiger Start bestehen bereits.

## Ziel

Block 11 baut den serverseitig autoritativen gemeinsamen Raid-Run-Zustand, auf dem die späteren Raid-Räume 1–10 und der Raid-Boss aufsetzen. Kein Client darf Raumabschluss, Gegnerkills, Bosszustand oder Belohnungsansprüche eigenständig als Wahrheit festlegen.

## Verbindlicher Zustandsvertrag

Jeder Raid-Run besitzt genau einen kanonischen Datensatz mit monotoner Version und folgenden Zustandsgruppen:

1. Run-Lebenszyklus: `forming`, `active`, `paused`, `completed`, `aborted`, `expired`.
2. Raumfortschritt: aktuelle Raid-Raumnummer, Raumphase, Eintrittszeit, Abschlusszeit und Übergangsstatus.
3. Teilnehmer: genau die vier beim Start festgeschriebenen Nutzer, Sitz/Slot, Verbindung, letzte Bestätigung, Wiederbeitrittsstatus und individuelle Position/Gameplay-Snapshot-Version.
4. Gegner: stabile serverseitige Gegner-IDs, Typ, Lebenspunkte, Status, Spawn-Generation und Todesversion.
5. Boss: stabile Boss-ID, Phase, HP, Mechanikzustand, Übergangsmarker und Todesversion.
6. Mechaniken: benannte Mechanikinstanzen mit servervalidiertem Fortschritt, beteiligten Spielern, Zeitfenstern und Abschlussstatus.
7. Ereignisstrom: idempotente, sequenzierte Raid-Ereignisse mit Actor, Schlüssel, Serverzeit und resultierender Run-Version.
8. Abschluss: serverseitige Abschlussursache; Belohnungen bleiben ausdrücklich Block 14 vorbehalten.

## Autorität und Konfliktauflösung

- Mutationen laufen ausschließlich über `SECURITY DEFINER`-RPCs mit Auth-, Gilden-, Run- und Teilnehmerprüfung.
- Jeder Schreibvorgang enthält erwartete Run-Version und einen idempotenten Request-Key.
- Veraltete Versionen werden abgelehnt und liefern den aktuellen Snapshot zurück.
- Der Server erhöht die Version atomar genau einmal pro akzeptierter Mutation.
- Ein Gegner- oder Boss-Tod darf nur einmal von `alive` nach `dead` wechseln.
- Ein Raum darf nur einmal abgeschlossen werden und nur wenn die definierte serverseitige Abschlussbedingung erfüllt ist.
- Clients senden Absichten bzw. bestätigbare Resultate; sie schreiben niemals direkt kanonische Tabellen.

## Disconnect und Wiederbeitritt

- Verbindungsausfall entfernt keinen Teilnehmer aus dem Run.
- Nach Timeout wird der Teilnehmer als `disconnected` markiert; der Run bleibt kanonisch erhalten.
- Wiederbeitritt ist nur für einen der vier festgeschriebenen Teilnehmer erlaubt.
- Rejoin liefert einen vollständigen Snapshot samt aktueller Version, Raum, Gegnern, Boss und Mechaniken.
- Lokaler veralteter Zustand wird verworfen; es werden keine Gegner oder Mechaniken erneut erzeugt.
- Mehrere Rejoin-Versuche mit gleichem Schlüssel sind idempotent.
- Querformat pausiert lokale Eingabe vollständig, verändert aber nicht eigenmächtig den Serverzustand; nach Rückkehr wird ein frischer Snapshot geladen.

## Abbruch und Ablauf

- Nur definierte serverseitige Regeln dürfen einen Run auf `aborted` oder `expired` setzen.
- Abbruch ist idempotent und sperrt weitere Gameplay-Mutationen.
- Ein abgebrochener Run erzeugt weder Raumabschluss noch Belohnungsanspruch.
- Verwaiste Runs werden über Serverzeit und Heartbeats deterministisch erkannt.

## Datenbank- und Realtime-Arbeit

Vorgesehen sind fokussierte Migrationen für:

- kanonischen Raid-Run-Zustand,
- festgeschriebene Raid-Teilnehmer,
- Gegner-/Boss-/Mechanikzustände,
- idempotente Raid-Ereignisse,
- Heartbeat/Rejoin/Abort/State-Mutation-RPCs,
- RLS ohne direkte Client-Schreibrechte,
- Realtime-Publikation nur der notwendigen Snapshot-/Versionssignale.

## Client-Arbeit

- eigener `guildRaidRunOnline`-Adapter getrennt vom Duo-Zustand,
- Snapshot-Hydration und monotoner Versionsschutz,
- Realtime mit kontrolliertem Snapshot-Refresh,
- Reconnect-Controller ohne Doppel-Subscriptions,
- klare Zustände für synchron, verbindet, eingeschränkt, getrennt und beendet,
- Debug-/QA-Oberfläche nur über bestehende Visual-QA-Verträge.

## Tests und Evidence

1. Vier festgeschriebene Teilnehmer, fünfter Nutzer abgewiesen.
2. Veraltete Version abgewiesen.
3. Gleicher Request-Key erzeugt genau eine Mutation.
4. Gegnerkill, Boss-Phasenwechsel und Raumabschluss genau einmal.
5. Disconnect/Rejoin liefert denselben kanonischen Run ohne Doppelspawn.
6. Gleichzeitige Mutationen werden deterministisch serialisiert.
7. Abbruch sperrt weitere Mutationen und Abschluss.
8. RLS/RPC-Angriffe durch Nichtteilnehmer und fremde Gilden scheitern.
9. Realtime-Reconnect erzeugt keine doppelten Listener.
10. Echte Touch-/Portrait-Evidence auf iPhone, Android, iPad und Android-Tablet; Querformat blockiert Eingabe und Rückkehr lädt den bestätigten Zustand.

## Nicht Bestandteil von Block 11

- konkrete Raid-Räume und Kooperationsmechaniken (Blöcke 12–13),
- finaler Raid-Boss und Belohnungen (Block 14),
- Änderungen an `main`, PR #315 oder fremden Arbeitsbranches.

## Reihenfolge

1. Bestehende Block-9/10-Schemas und Online-Adapter auditieren.
2. Migrationen und RPC-Vertrag implementieren.
3. Client-Snapshot- und Rejoin-Schicht implementieren.
4. deterministische Validatoren und Supabase-Vertragstests ergänzen.
5. Browser-/Realtime-/Orientierungs-Evidence erstellen.
6. Fehler beheben, Exact-Head vollständig grün prüfen und erst danach in den festen Zielbranch integrieren.
