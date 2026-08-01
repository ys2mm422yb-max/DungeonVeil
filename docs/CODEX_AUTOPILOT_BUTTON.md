# Dungeon Veil Autopilot im Codespace starten

Der Codespace enthält eine gespeicherte VS-Code-Aufgabe. Dadurch muss der universelle Codex-Prompt nicht mehr am iPhone eingefügt werden.

## Start auf dem iPhone

1. Öffne den Dungeon-Veil-Codespace auf dem Zielbranch `fix/mobile-telegraphs-room-21-50-balance`.
2. Öffne das VS-Code-Menü.
3. Wähle **Terminal → Run Build Task** beziehungsweise **Terminal → Buildaufgabe ausführen**.
4. Die Standardaufgabe **Dungeon Veil: Autopilot starten** beginnt in einem eigenen Terminal.

Alternativ kann unter **Terminal → Run Task** ausdrücklich **Dungeon Veil: Autopilot starten** gewählt werden.

## Verbindliche Aufgabenteilung

Dungeon Veil verwendet zwei aktive Rollen:

### Codespaces-Autopilot

Der Startknopf ist der bevorzugte Weg für echte Entwicklungsarbeit. Der Codespaces-Autopilot:

- bearbeitet Produktcode und große Dateien;
- führt TypeScript, Build, fokussierte Tests und Playwright aus;
- erstellt Commits und pusht Arbeitsbranches;
- eröffnet oder aktualisiert Draft-PRs;
- behebt rote Exact-Head-Gates;
- setzt vollständig abgenommene PRs Ready, mergt ohne Auto-Merge und prüft die Veröffentlichung;
- arbeitet mit einer `worker: primary`-Lease und eindeutiger `launcher_run_id`;
- hat während einer aktiven Lease Vorrang für seinen PR-, Branch-, Datei- und Aufgabenbereich.

### Stündliche Hintergrund-Koordination

Die separate Hintergrund-Automation läuft ohne geöffneten Codespace. Sie:

- überwacht GitHub, PRs, Reviews, Exact-Head-Actions, Evidence und Deployments;
- hält Queue, Roadmap #323 und Issue #376 aktuell;
- bereitet konkrete Fortsetzungsanweisungen für den Codespaces-Autopiloten vor;
- setzt vollständig geprüfte PRs Ready, wartet Ready-only-Gates ab, mergt ohne Auto-Merge und veröffentlicht;
- darf während einer überlappenden aktiven Codespaces-Lease keinen konkurrierenden Produktcode ändern, keine überlappenden Tests neu starten und den betroffenen PR nicht mergen.

Der frühere Secondary-/Zweit-Autopilot ist pausiert.

## Vollständige Queue-Abarbeitung

Ein Start des Codespaces-Autopiloten ist nicht auf eine einzelne Aufgabe beschränkt.

Der Launcher:

1. setzt die höchste priorisierte freie Produktaufgabe fort oder wählt sie neu aus;
2. bearbeitet, testet, committet und pusht die Aufgabe;
3. schließt sie ab oder parkt sie mit exakter Fortsetzung;
4. baut die GitHub-Queue neu auf;
5. übernimmt automatisch die nächste freie Produktaufgabe.

Das gilt auch dann, wenn eine einzelne Aufgabe auf GitHub-Actions, Evidence oder Deployment wartet. Solange eine unabhängige Produktaufgabe frei ist, wechselt der nächste Pass automatisch dorthin.

Die Queue umfasst dynamisch alle offenen Produkt-Issues, PRs, Reviews, Actions, Roadmap-Punkte und neuen Nutzerkommentare. Issue #376 und Roadmap #323 dienen als Koordination und Planung; PR #315 bleibt ausgeschlossen und unangetastet.

Bestehende rote oder vom Nutzer abgelehnte Produkt-PRs werden vor neuen Backlog-PRs priorisiert. Um unkontrollierte PR-Mengen und Konflikte zu vermeiden, eröffnet der Autopilot keine endlose Zahl gleichzeitig wartender Produkt-PRs.

## Begrenzter, aber langer Lauf

Der Launcher arbeitet vollständig autonom, bleibt aber technisch begrenzt:

- standardmäßig bis zu **16 Codex-Arbeitspässe**;
- standardmäßig bis zu **180 Minuten Gesamtlaufzeit**;
- danach ein eigener sicherer Abschluss- und Handoff-Pass;
- keine eigene Lease bleibt aktiv.

Die Grenzwerte sind im Codespace konfigurierbar:

```bash
DUNGEON_VEIL_AUTOPILOT_MAX_PASSES=24 \
DUNGEON_VEIL_AUTOPILOT_MAX_RUNTIME_MINUTES=300 \
bash scripts/start-dungeon-veil-autopilot.sh
```

Zulässig sind 1–32 Pässe und 15–720 Minuten. Die Standard-Buildaufgabe verwendet die sicheren Standardwerte.

## Verhalten und Sicherheit

Der Launcher:

- startet `codex exec` nicht-interaktiv;
- beschränkt Dateizugriffe auf den Repository-Workspace;
- erlaubt die für Live-GitHub-Arbeit erforderliche Netzwerkverbindung;
- verwendet die Approval-Policy `never`, damit normale Arbeit nicht auf Bestätigungen wartet;
- verwendet weder `danger-full-access` noch eine Sandbox-Umgehung;
- verhindert parallele doppelte Starts;
- verweigert den Start bei nicht committeten lokalen Änderungen;
- speichert Logs, Pass-Zusammenfassungen und temporäre Prompts ausschließlich unter `.git/`;
- stoppt nicht nur deshalb, weil eine einzelne Aufgabe `waiting_external` ist;
- führt am Budgetende oder bei einem Codex-Fehler einen Abschluss-Handoff aus;
- versucht beim Prozessende zusätzlich, versehentlich aktive eigene Leases sicher freizugeben.

Unverändert verboten bleiben Änderungen an `main`, Auto-Merge, automatische Branch-Löschung, Arbeit an PR #315 sowie jede Abschwächung von Tests, Evidence, Coverage, Grenzwerten, Timeouts oder Playwright-Retries.

## Statusmodell

Jeder Pass liefert:

```text
AUTOPILOT_TASK_STATUS: continue|completed|waiting_external|blocked_external|released
AUTOPILOT_QUEUE_STATUS: same_task|next_task|empty|globally_blocked
AUTOPILOT_NEXT: konkrete nächste Operation
```

- `same_task`: nächster Pass arbeitet an derselben Aufgabe weiter.
- `next_task`: aktuelle Aufgaben-Lease ist terminal; nächster Pass wählt eine neue freie Produktaufgabe.
- `empty`: die Live-Queue enthält momentan keine weitere freie Produktarbeit.
- `globally_blocked`: die gesamte Queue ist tatsächlich blockiert.

## Woran ein echter Gesamtabschluss erkennbar ist

Am Ende zeigt das Terminal einen Launcher-Status:

- `queue_empty`
- `globally_blocked`
- `budget_exhausted`
- `codex_error`
- `invalid_status`

`waiting_external` einer einzelnen Aufgabe ist kein Gesamtabschluss mehr, sofern andere unabhängige Arbeit frei ist.

## Falls der Lauf stoppt

Das Terminal nennt den Status und den Pfad zum Log. Nach einem Budgetende kann derselbe Startknopf erneut verwendet werden; der nächste Lauf liest die live dokumentierten Leases und Fortsetzungsoperationen.

Ein Codespace muss während des Laufs aktiv bleiben. Stoppe ihn nach Abschluss ausdrücklich, damit keine unnötige Codespaces-Zeit verbraucht wird.

## Parser-Selbsttest

Die maschinenlesbare Statusauswertung kann ohne Codex-Lauf geprüft werden:

```bash
bash scripts/start-dungeon-veil-autopilot.sh --self-test-status-parser
```
