# Block 18 – Kodex vervollständigen

## Ziel

Den bereits vorhandenen Kodex zu einem vollständigen, zweisprachigen und auf allen unterstützten mobilen Hochformatgeräten verifizierten Produktbereich ausbauen.

## Bestätigter Ausgangsstand

- Der Kodex ist bereits im Laufzeit-Router und Hauptmenü eingebunden.
- Vorhandene Kategorien: Bestien, Jagdziele, Wächter, Relikte und Ausrüstung.
- Entdeckungen werden über das Retention-Profil lokal und über den bestehenden Cloud-Bundle-Pfad persistiert.
- Der Wächter-Katalog endet derzeit bei Raum 50, obwohl Kapitel 1 bis Raum 100 reicht.
- Mehrere Karten- und Detailtexte sind im deutschen Wortlaut fest verdrahtet und erscheinen deshalb auch im englischen Modus falsch.
- Die bisherige Abschluss-Roadmap enthielt keinen eigenen Kodex-Block und keine vollständige Kodex-Evidence.

## Verbindlicher Umfang

1. Vollständiger Wächter-Katalog für die Kapitel-1-Bossräume 10, 20, 30, 40, 50, 60, 70, 80, 90 und 100.
2. Natürliche deutsche und englische Texte in sämtlichen Karten-, Sperr-, Detail-, Fortschritts- und Fundhinweiszuständen.
3. Keine hart verdrahteten deutschen Resttexte im englischen Modus und keine englischen Resttexte im deutschen Modus.
4. Entdeckte und gesperrte Zustände müssen nach Reload und Cloud-Wiederherstellung stabil bleiben.
5. Fortschrittszähler müssen exakt mit den registrierten Einträgen und Besitzständen übereinstimmen.
6. Alle Karten und Tabs benötigen echte mobile Touch-Ziele von mindestens 44 CSS-Pixeln.
7. Keine horizontale Überbreite, abgeschnittenen Tabs, unlesbaren Detailtexte oder überlagerten Modelle auf:
   - iPhone / WebKit
   - Android-Handy / Chromium
   - iPad Hochformat / WebKit
   - Android-Tablet Hochformat / Chromium
8. Querformat bleibt blockiert beziehungsweise nicht als spielbarer Produktmodus zugelassen.
9. Playwright-Retries bleiben 0.

## Prüfvertrag

- statischer Block-18-Kodexvalidator
- TypeScript und Produktionsbuild
- fokussierte Kodex-Tests für Deutsch und Englisch
- gesperrte und entdeckte Karten
- alle fünf Kategorien
- Wächter 50, 60, 70, 80, 90 und 100
- Reload-/Persistenzprüfung
- vier Hochformat-Screenshots je kritischem Zustand
- tatsächliche manuelle Einzelprüfung aller erzeugten Screenshots und relevanten Videos
- Exact-Head Product Autopilot, Full Game Regression und Complete Runtime Evidence vor Merge
- feste Pages-Prüfung nach Merge

## Sicherheitsregeln

- Ziel ausschließlich `fix/mobile-telegraphs-room-21-50-balance`
- `main` niemals verändern
- PR #315 nicht verändern oder mergen
- kein Auto-Merge
- keine Branch-Löschung
- Merge erst nach vollständig grünem unverändertem Exact Head und manueller Evidence-Abnahme
