# Block 14 – Raid-Boss, Belohnungen und Gildenfortschritt

## Grundlage

- Basis-Commit: `7b7992db195c5d45841cf558de108d362e6ea38f`
- Zielbranch: `fix/mobile-telegraphs-room-21-50-balance`
- Arbeitsbranch: `feat/block-14-guild-raid-boss-rewards-v1`
- `main` ausgeschlossen
- PR #315 bleibt unverändert

## Verbindlicher Umfang

1. Raum 10 übergibt nur bei bestätigten vier Rollen, vollständiger Runenfolge und vier aktiven Kanälen an den Boss.
2. Der Boss besitzt drei Phasen: Schleierpanzer, geteilte Echos und finaler Zusammenbruch.
3. Schadensfenster werden erst nach echter Vier-Spieler-Koordination geöffnet.
4. Bosszustand wird versioniert über den gemeinsamen Raid-Run-Zustand gespeichert und bei Reconnect aus dem Server-Snapshot rekonstruiert.
5. Abschlussbelohnungen werden ausschließlich über einen eigenen serverseitigen Claim mit Raid-Run-ID und Idempotency-Key beansprucht.
6. Ein Spieler kann pro gültigem Abschluss genau einmal claimen; Retry, Doppeltap und Reconnect liefern denselben Claim statt einer zweiten Belohnung.
7. Teilnahmebedingungen: vier berechtigte Gildenmitglieder, abgeschlossener Boss, Mindestbeitrag und nicht abgebrochener Run.
8. Anti-Farming: serverseitige Claim-Eindeutigkeit und konfigurierbares Wochenlimit; keine clientseitig vertrauenswürdige Belohnungsberechnung.

## Evidence-Vertrag

- Android-Smartphone/Chromium Hochformat
- iPhone/WebKit Hochformat
- Android-Tablet/Chromium Hochformat
- iPad/WebKit Hochformat
- echte Touch-Flächen
- Querformat blockiert und pausiert vollständig
- Lobby, Ready, Start, Räume 1–10, Bossphasen, Disconnect, Rejoin, Abbruch und Reward-Claim
- Playwright-Retries `0`
- Screenshot- und Videoartefakte werden tatsächlich gesichtet

## Merge-Gate

Kein Merge ohne exakten grünen Head, geprüfte mobile Evidence, serverseitig nachgewiesenen Exactly-once-Claim und erneute Zielbranchprüfung.