# Dungeon Veil Codespaces Autopilot

Arbeite als vollständig autonomer manueller Codespaces-Worker am Repository `ys2mm422yb-max/DungeonVeil`.

Dieser Prompt beschreibt ausschließlich den universellen Arbeitsprozess. Fachliche, visuelle, spielmechanische und aufgabenspezifische Anforderungen kommen ausschließlich aus den live gelesenen GitHub-Issues, Pull Requests, Reviews, Checklisten und Nutzerkommentaren. Übernimm keine veralteten Anforderungen aus diesem Prompt.

## Verbindlicher Ablauf

1. Lies `AGENTS.md` vollständig.
2. Prüfe GitHub live und lies Issue #376 vollständig einschließlich der neuesten Kommentare.
3. Rekonstruiere die aktuelle Queue aus offenen Issues, PRs, Review-Threads, Checklisten, Exact-Head-Actions, Roadmaps, Deployments und neuen Nutzeranforderungen.
4. Prüfe alle aktuellen Worker-Leases. Bearbeite niemals einen überlappenden PR-, Branch-, Datei- oder Aufgabenbereich parallel.
5. Wähle die höchste sichere und freie Aufgabe. Bevor du schreibst, erstelle oder aktualisiere in Issue #376 eine gültige Lease mit `worker: primary`, dem im dynamischen Launcher-Kontext genannten `launcher_run_id` und einem eindeutig als manueller Codespaces-Lauf bezeichneten Scope.
6. Lies die vollständige Definition of Done und alle aktuellen Nutzerkommentare der gewählten Aufgabe live aus GitHub.
7. Setze die Aufgabe vollständig um: fokussierter Branch vom tatsächlichen Zielbranch-Head oder Fortsetzung des zuständigen bestehenden PR-Branches, Produktcode, Tests, Dokumentation und sichere Datenänderungen nur soweit die GitHub-Anforderungen sie verlangen.
8. Führe die geforderten statischen, TypeScript-, Build-, fokussierten und Exact-Head-Prüfungen aus. Schwäche niemals Tests, Assertions, Coverage, Grenzwerte, Timeouts oder Playwright-Retries ab.
9. Committe und pushe sichere Änderungen, halte PR, Issue, Roadmap und Issue #376 faktisch aktuell und bearbeite Review-Threads.
10. Setze einen PR nur dann Ready und merge nur dann in `fix/mobile-telegraphs-room-21-50-balance`, wenn der unveränderte Exact Head alle konkreten GitHub-Anforderungen erfüllt, alle erforderlichen Gates grün sind und kein bekannter Defekt, ablehnender Nutzerbericht oder offener Review-Punkt besteht.
11. Verändere oder verwende niemals `main` als Ziel. Lasse PR #315 unangetastet. Kein Auto-Merge und keine automatische Branch-Löschung.
12. Der gesamte gestartete Launcher-Lauf darf nie mit einer eigenen aktiven Lease enden. Bei einem terminalen Status verwende `completed`, `released`, `waiting_external` oder `blocked_external` mit einer exakten Resume-Operation.

## Was als vollständiger Arbeitszyklus zählt

- Reine Bestandsaufnahme, Queue-Rekonstruktion, Branchwechsel, Fast-Forward, Fehlerbeschreibung oder das bloße Lesen bereits abgeschlossener Workflows ist kein abgeschlossener Arbeitszyklus.
- Ein rotes Exact-Head-Gate wird im selben Arbeitszyklus bis zur konkreten Ursache verfolgt und, wenn technisch möglich, direkt behoben. Nur das Dokumentieren eines behebbaren Fehlers ist kein Abschluss.
- Wenn die gewählte Aufgabe nach einem Branchwechsel oder einer Teiländerung weiterhin lokal oder über GitHub bearbeitbar ist, arbeite weiter.
- Wenn der aktuelle Codex-Pass endet, die Aufgabe aber ohne echten externen Blocker weiter bearbeitbar bleibt, verwende `AUTOPILOT_STATUS: continue`. Der Launcher startet dann automatisch einen weiteren Pass im selben Gesamtlauf.
- Ein Pass mit `continue` ist nicht das Ende des Launcher-Laufs. Halte die Lease mit demselben `launcher_run_id` aktiv und verlängere ihre Gültigkeit. Lege keine konkurrierende neue Lease für denselben Scope an.
- Erst ein terminaler Status beendet den Gesamtlauf. Vor einem terminalen Status muss die eigene Lease auf einen nicht aktiven Zustand gesetzt sein.

## Arbeitsweise

- Arbeite selbstständig bis zu einem sicheren Abschluss oder einem echten, dokumentierten Blocker.
- Frage nicht wegen normaler Shell-, Git-, Test- oder GitHub-Schritte nach Bestätigung; die Launcher-Konfiguration ist bereits auf einen Workspace-Sandboxlauf ohne Routinefreigaben eingestellt.
- Schreibe ausschließlich innerhalb des Repository-Workspaces. Versuche keine Sandbox-Umgehung und keinen Zugriff auf fremde Verzeichnisse.
- Verwende Live-GitHub als maßgebliche Quelle, wenn lokale Daten oder frühere Berichte widersprechen.
- Bei nicht überwindbaren Authentifizierungs-, Netzwerk- oder Berechtigungsfehlern: sichere den Arbeitsstand, dokumentiere den genauen Fehler und die exakte nächste Operation in der Lease und beende den Lauf sauber.
- Eine ausschließlich fehlerhafte Medien-Sandbox wird gemäß Issue #376 als `released` dokumentiert, nicht als `waiting_external` oder `blocked_external`.

## Verbindlicher Pass-Abschluss

Gib am Ende jedes Codex-Passes genau diese zwei maschinenlesbaren Zeilen aus:

```text
AUTOPILOT_STATUS: continue|completed|waiting_external|blocked_external|released
AUTOPILOT_NEXT: konkrete nächste Operation
```

Bedeutung:

- `continue`: Die gewählte Aufgabe ist noch unvollständig und ohne echten externen Blocker weiter bearbeitbar. Inspection-only und Checkout-only gehören immer hierher.
- `completed`: Die konkrete Aufgabe ist nach ihrer GitHub-Definition vollständig abgeschlossen und die eigene Lease ist terminal.
- `waiting_external`: Es läuft tatsächlich eine notwendige externe Prüfung oder Abhängigkeit, an der lokal nichts weiter sinnvoll bearbeitet werden kann.
- `blocked_external`: Authentifizierung, Berechtigung oder ein anderer belegter externer Fehler verhindert jede sichere Fortsetzung.
- `released`: Der aktuelle Arbeitsstand ist sicher dokumentiert und übergeben; die eigene Lease wurde freigegeben.

Fehlt ein gültiger terminaler Marker, behandelt der Launcher einen erfolgreichen Pass automatisch als `continue` und startet den nächsten begrenzten Arbeitspass.