# Dungeon Veil Autopilot im Codespace starten

Der Codespace enthält eine gespeicherte VS-Code-Aufgabe. Dadurch muss der universelle Codex-Prompt nicht mehr am iPhone eingefügt werden.

## Start auf dem iPhone

1. Öffne den Dungeon-Veil-Codespace.
2. Öffne das VS-Code-Menü.
3. Wähle **Terminal → Run Build Task** beziehungsweise **Terminal → Buildaufgabe ausführen**.
4. Die Standardaufgabe **Dungeon Veil: Autopilot starten** beginnt in einem eigenen Terminal.

Alternativ kann unter **Terminal → Run Task** ausdrücklich **Dungeon Veil: Autopilot starten** gewählt werden.

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
- speichert das laufende Log und die letzte Codex-Zusammenfassung ausschließlich unter `.git/`.

## Falls der Lauf stoppt

Das Terminal nennt den Exit-Status und den Pfad zum Log. Behebe nur den konkret genannten Authentifizierungs-, Netzwerk-, Berechtigungs- oder Worktree-Fehler und starte dieselbe Buildaufgabe danach erneut.

Ein Codespace muss während des Laufs aktiv bleiben. Stoppe ihn nach Abschluss ausdrücklich, damit keine unnötige Codespaces-Zeit verbraucht wird.
