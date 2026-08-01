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
- arbeitet mit einer `worker: primary`-Lease und eindeutiger `launcher_run_id`;
- hat während einer aktiven Lease Vorrang für seinen PR-, Branch-, Datei- und Aufgabenbereich.

### Stündliche Hintergrund-Koordination

Die separate Hintergrund-Automation läuft ohne geöffneten Codespace. Sie:

- überwacht GitHub, PRs, Reviews, Exact-Head-Actions, Evidence und Deployments;
- hält Queue, Roadmap #323 und Issue #376 aktuell;
- bereitet konkrete Fortsetzungsanweisungen für den nächsten Codespaces-Lauf vor;
- setzt vollständig geprüfte PRs Ready, wartet Ready-only-Gates ab, mergt ohne Auto-Merge und veröffentlicht;
- darf während einer überlappenden aktiven Codespaces-Lease keinen konkurrierenden Produktcode ändern, keine überlappenden Tests neu starten und den betroffenen PR nicht mergen.

Der frühere Secondary-/Zweit-Autopilot ist pausiert. Es wird keine neue `worker: secondary`-Lease erwartet und keine Arbeit an einen Secondary delegiert, solange der Nutzer diese Rolle nicht ausdrücklich wieder aktiviert.

## Verhalten

Der Launcher:

- startet `codex exec` nicht-interaktiv;
- liest den universellen Prompt aus `.github/prompts/dungeon-veil-autopilot.md`;
- beschränkt Dateizugriffe auf den Workspace;
- erlaubt die für Live-GitHub-Arbeit erforderliche Netzwerkverbindung;
- verwendet die Approval-Policy `never`, damit normale Arbeit nicht ständig auf Bestätigungen wartet;
- verwendet ausdrücklich weder `danger-full-access` noch eine Approval-/Sandbox-Umgehung;
- verhindert parallele doppelte Starts;
- verweigert den Start bei nicht committeten lokalen Änderungen;
- speichert Logs, Pass-Zusammenfassungen und temporäre Prompts ausschließlich unter `.git/`;
- führt standardmäßig bis zu vier aufeinanderfolgende Arbeitspässe aus;
- startet automatisch einen weiteren Pass, wenn die Aufgabe nach reiner Bestandsaufnahme, Branchwechsel, Teiländerung oder behebbaren Testfehlern noch weiter bearbeitbar ist;
- beendet sich sofort bei einem echten terminalen Status wie `completed`, `waiting_external`, `blocked_external` oder `released`;
- führt nach Erreichen des Pass-Limits oder einem Codex-Fehler einen gesonderten Abschluss-Handoff aus;
- versucht beim Prozessende zusätzlich, eine zu diesem Launcher-Lauf gehörende versehentlich aktive Lease in Issue #376 sicher auf `released` zu setzen.

Jeder Launcher-Lauf besitzt eine eindeutige `launcher_run_id`. Dadurch kann ein Folgepass dieselbe Lease übernehmen, ohne mit der Hintergrund-Koordination oder anderen Arbeiten zu kollidieren.

## Woran ein echter Abschluss erkennbar ist

Am Ende zeigt das Terminal einen dieser Statuswerte:

- `completed`: Die gewählte GitHub-Aufgabe ist vollständig abgeschlossen.
- `waiting_external`: Eine tatsächlich notwendige externe Prüfung oder Abhängigkeit läuft noch.
- `blocked_external`: Ein belegtes Authentifizierungs-, Berechtigungs- oder externes Infrastrukturproblem verhindert die Fortsetzung.
- `released`: Der Arbeitsstand wurde sicher dokumentiert und mit exakter Fortsetzung freigegeben.

`continue` erscheint nur zwischen internen Arbeitspässen. Dafür muss der Nutzer nichts erneut starten oder bestätigen.

## Falls der Lauf stoppt

Das Terminal nennt den Exit-Status und den Pfad zum Log. Behebe nur einen konkret genannten Authentifizierungs-, Netzwerk-, Berechtigungs- oder Worktree-Fehler und starte dieselbe Buildaufgabe danach erneut.

Ein Codespace muss während des Laufs aktiv bleiben. Stoppe ihn nach Abschluss ausdrücklich, damit keine unnötige Codespaces-Zeit verbraucht wird.
