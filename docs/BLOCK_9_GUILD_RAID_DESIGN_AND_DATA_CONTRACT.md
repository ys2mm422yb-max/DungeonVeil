# Block 9 – Gildenraid: Design und technischer Datenvertrag

## Verbindliche Grundlage

- Repository: `ys2mm422yb-max/DungeonVeil`
- Zielbranch: `fix/mobile-telegraphs-room-21-50-balance`
- Arbeitsbranch: `design/block-9-guild-raid-contract-v1`
- Start-Commit: `efd7bbfb88acff2e24908eddbb93eac0fee22c7b`
- Grundlage: `docs/MASTER_WORK_PLAN.md`, Block 9, und Issue #321
- `main` bleibt ausgeschlossen.
- PR #315 und PR #331 bleiben unverändert.
- Kein Auto-Merge und keine automatische Branch-Löschung.

## 1. Produktziel und Abgrenzung

Der Gildenraid ist ein eigenständiger kooperativer Vier-Spieler-Modus für exakt vier aktive Mitglieder derselben Gilde. Er wird ausschließlich aus dem Gildenbereich betreten und verwendet weder die normale Solo-/Duo-Lobby noch deren Run-Zustand.

Der Raid umfasst:

- eine gildeninterne Vier-Spieler-Lobby,
- zehn eigene Raid-Räume,
- echte Kooperationsmechaniken,
- einen eigenen mehrphasigen Raid-Boss,
- serverseitig autoritative Run-, Fortschritts- und Belohnungsentscheidungen,
- Wiederbeitritt ohne doppelten Spawn, Raumabschluss oder Loot,
- ausschließlich mobiles Hochformat mit Touch-Bedienung.

Block 9 implementiert noch keinen spielbaren Raid. Er fixiert den verbindlichen Design-, Zustands-, Datenbank-, Realtime-, RLS-, RPC-, Sicherheits- und Folgeblockvertrag für Block 10 bis 14.

## 2. Unveränderliche Spielregeln

1. Ein Raid startet nur mit genau vier unterschiedlichen authentifizierten Accounts.
2. Alle vier Accounts müssen beim Start aktive Mitglieder derselben Gilde sein.
3. Ein Account darf gleichzeitig höchstens einem aktiven Raid-Run angehören.
4. Eine Lobby gehört genau einer Gilde und genau einem Gruppenführer.
5. Der Gruppenführer darf nur starten, wenn alle vier Plätze belegt und alle vier Spieler bereit sind.
6. Der Start ist idempotent: Mehrfachtap, Retry oder parallele Requests erzeugen nur einen Run.
7. Der Server bestimmt Lobby-, Run-, Raum-, Gegner-, Boss-, Abschluss- und Belohnungszustand.
8. Clients senden Absichten und Eingaben, aber keine vertrauenswürdigen Resultate wie Bosskill, Raumabschluss oder Belohnungshöhe.
9. Ein Raid besitzt zehn Räume; Raum 10 enthält den finalen Raid-Boss.
10. Ein gültiger Abschluss kann pro Account und Run höchstens einmal belohnt werden.
11. Querformat blockiert Eingabe und Simulation lokal; Rückkehr ins Hochformat setzt denselben bestätigten Zustand fort.
12. Desktop und Maussteuerung sind kein Abnahmekriterium.

## 3. Rollen und Berechtigungen

### Gruppenführer

- erstellt die Lobby,
- lädt Gildenmitglieder ein,
- kann offene Einladungen zurückziehen,
- kann nicht bereite Mitglieder vor Run-Start entfernen,
- startet den Raid bei exakt vier bereiten Mitgliedern,
- kann eine noch nicht gestartete Lobby auflösen.

### Mitglied

- kann eine Einladung annehmen oder ablehnen,
- setzt den eigenen Ready-Status,
- kann die Lobby vor dem Start verlassen,
- kann nach Disconnect in den eigenen aktiven Slot zurückkehren.

### Serverautorität

- prüft Gildenmitgliedschaft bei Einladung, Annahme und Start erneut,
- friert die vier Teilnehmer beim Start für diesen Run ein,
- vergibt eindeutige Slot-Nummern 1 bis 4,
- verwaltet Statuswechsel über RPCs und Transaktionen,
- entscheidet über Timeout, Abbruch, Abschluss und Belohnungsanspruch.

## 4. Zustandsautomaten

### Lobby

`forming -> ready -> starting -> started`

Abbruchpfade:

- `forming|ready -> dissolved`
- `starting -> forming`, wenn die atomare Starttransaktion fehlschlägt

Regeln:

- `ready` bedeutet exakt vier Teilnehmer und alle vier ready.
- Nach `starting` werden keine Teilnehmeränderungen mehr akzeptiert.
- `started` referenziert genau eine `raid_run_id`.

### Raid-Run

`created -> active -> completed`

Abbruchpfade:

- `created|active -> abandoned`
- `active -> failed`, falls ein später definierter harter Scheiterzustand eintritt

`completed`, `abandoned` und `failed` sind terminal.

### Teilnehmer

`invited -> joined -> ready -> active -> disconnected -> active`

Terminale Teilnehmerzustände:

- `declined`
- `left_before_start`
- `removed_before_start`
- `completed`
- `abandoned`

Nach Run-Start bleibt der Slot dem ursprünglichen Account zugeordnet. Es gibt keinen Ersatzspieler während eines laufenden Runs.

## 5. Datenmodell

Die folgenden Namen sind verbindliche Zielnamen; konkrete Migrationen erfolgen erst in den Implementierungsblöcken nach erneuter Prüfung des dann aktuellen Schemas.

### `guild_raid_lobbies`

- `id uuid primary key`
- `guild_id uuid not null`
- `leader_user_id uuid not null`
- `status text not null`
- `raid_run_id uuid null unique`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `version bigint not null default 0`
- `expires_at timestamptz not null`

Constraints:

- höchstens eine nichtterminale Lobby pro Gruppenführer,
- `raid_run_id` nur bei `started`,
- Status nur aus dem definierten Automaten.

### `guild_raid_lobby_members`

- `lobby_id uuid not null`
- `user_id uuid not null`
- `slot smallint null`
- `status text not null`
- `ready boolean not null default false`
- `invited_by uuid not null`
- `joined_at timestamptz null`
- `updated_at timestamptz not null`

Constraints:

- `primary key (lobby_id, user_id)`,
- eindeutiger Slot 1 bis 4 innerhalb einer Lobby,
- maximal vier nichtterminale Mitglieder,
- Ready nur für `joined|ready`,
- Leader ist selbst Mitglied der Lobby.

### `guild_raid_runs`

- `id uuid primary key`
- `guild_id uuid not null`
- `lobby_id uuid not null unique`
- `status text not null`
- `current_room smallint not null default 1`
- `room_epoch bigint not null default 1`
- `state_version bigint not null default 0`
- `started_at timestamptz not null`
- `completed_at timestamptz null`
- `abandoned_at timestamptz null`
- `last_server_tick_at timestamptz not null`
- `reward_seed bigint not null`

Constraints:

- `current_room between 1 and 10`,
- terminale Zeitfelder passen zum Status,
- eine Lobby erzeugt höchstens einen Run.

### `guild_raid_participants`

- `raid_run_id uuid not null`
- `user_id uuid not null`
- `slot smallint not null`
- `status text not null`
- `joined_run_at timestamptz not null`
- `last_seen_at timestamptz not null`
- `disconnect_deadline_at timestamptz null`
- `last_ack_state_version bigint not null default 0`
- `contribution jsonb not null default '{}'`

Constraints:

- `primary key (raid_run_id, user_id)`,
- `unique (raid_run_id, slot)`,
- exakt vier Teilnehmer werden atomar beim Start angelegt.

### `guild_raid_room_states`

- `raid_run_id uuid not null`
- `room_number smallint not null`
- `room_epoch bigint not null`
- `status text not null`
- `mechanic_state jsonb not null`
- `enemy_state jsonb not null`
- `boss_state jsonb null`
- `started_at timestamptz null`
- `cleared_at timestamptz null`
- `version bigint not null default 0`

Constraints:

- `primary key (raid_run_id, room_number, room_epoch)`,
- Raumabschluss erfolgt genau einmal per serverseitigem Übergang,
- Raum 10 besitzt Bosszustand; Räume 1 bis 9 nicht zwingend.

### `guild_raid_events`

Append-only Ereignisjournal für Audit, Wiederaufbau und Idempotenz:

- `id bigint generated always as identity primary key`
- `raid_run_id uuid not null`
- `room_epoch bigint not null`
- `actor_user_id uuid null`
- `event_type text not null`
- `idempotency_key uuid not null`
- `payload jsonb not null`
- `created_at timestamptz not null`

Constraint:

- `unique (raid_run_id, idempotency_key)`.

### `guild_raid_reward_claims`

- `raid_run_id uuid not null`
- `user_id uuid not null`
- `reward_version integer not null`
- `reward_payload jsonb not null`
- `granted_at timestamptz not null`
- `grant_transaction_id uuid not null unique`

Constraint:

- `primary key (raid_run_id, user_id)` verhindert Doppelbelohnung.

## 6. RPC-Vertrag

Alle mutierenden RPCs erhalten eine clientseitig erzeugte `idempotency_key` und prüfen `auth.uid()` serverseitig.

### Lobby-RPCs

- `guild_raid_create_lobby()`
- `guild_raid_invite_member(lobby_id, target_user_id, idempotency_key)`
- `guild_raid_respond_invite(lobby_id, accept, idempotency_key)`
- `guild_raid_set_ready(lobby_id, ready, idempotency_key)`
- `guild_raid_remove_member(lobby_id, target_user_id, idempotency_key)`
- `guild_raid_leave_lobby(lobby_id, idempotency_key)`
- `guild_raid_dissolve_lobby(lobby_id, idempotency_key)`
- `guild_raid_start(lobby_id, idempotency_key)`

`guild_raid_start` muss in einer Transaktion:

1. Lobbyzeile sperren,
2. Status und Ablaufzeit prüfen,
3. Gruppenführer prüfen,
4. vier eindeutige aktive Gildenmitglieder prüfen,
5. vier Ready-Zustände prüfen,
6. parallele aktive Runs der Teilnehmer ausschließen,
7. Run, Teilnehmer und Raum-1-Zustand anlegen,
8. Lobby genau einmal auf `started` setzen,
9. die bestehende `raid_run_id` bei Retry zurückgeben.

### Run-RPCs

- `guild_raid_join_run(raid_run_id, idempotency_key)`
- `guild_raid_heartbeat(raid_run_id, acknowledged_state_version)`
- `guild_raid_submit_input(raid_run_id, room_epoch, sequence, input_payload, idempotency_key)`
- `guild_raid_rejoin(raid_run_id, last_known_version, idempotency_key)`
- `guild_raid_abandon(raid_run_id, idempotency_key)`
- `guild_raid_claim_reward(raid_run_id, idempotency_key)`

Clients dürfen keine RPCs erhalten, die frei HP, Kills, Raumstatus, Abschlussstatus oder Belohnungen setzen.

## 7. Realtime-Vertrag

Realtime dient der Verteilung bestätigter Serverzustände, nicht der Autorität.

Kanäle:

- Lobby: `guild-raid-lobby:{lobby_id}`
- Run: `guild-raid-run:{raid_run_id}`

Nachrichten enthalten mindestens:

- `state_version`,
- `room_epoch`,
- `server_time`,
- `event_type`,
- bestätigte Zustandsänderung oder Snapshot-Referenz.

Regeln:

- Clients ignorieren ältere oder gleiche `state_version`.
- Lücken erzwingen Snapshot-Nachladen statt lokaler Spekulation.
- Raumwechsel erhöhen `room_epoch`; Eingaben aus alten Epochen werden verworfen.
- Reconnect lädt zuerst einen autoritativen Snapshot und abonniert danach neue Ereignisse.
- Presence darf UI-Anwesenheit anzeigen, entscheidet aber nicht über Teilnehmer- oder Runstatus.

## 8. RLS- und Sicherheitsvertrag

- Lobby und Run sind nur für die vier zugeordneten Nutzer und notwendige serverseitige Rollen lesbar.
- Nur RPCs mit `security definer` und festem `search_path` dürfen mutieren.
- Direkte Client-Inserts, -Updates und -Deletes auf Raidtabellen sind gesperrt.
- Jede RPC prüft Authentifizierung, Gildenmitgliedschaft, Lobby-/Run-Zuordnung, Rolle, aktuellen Status, Version und Idempotenz.
- Service- oder Serverfunktionen dürfen Belohnungen nur über eine atomare Grant-Transaktion vergeben.
- JSON-Payloads besitzen Größenlimits und serverseitige Schemaprüfung.
- Eingabesequenzen sind pro Teilnehmer monoton; Wiederholung wird idempotent quittiert, Sprünge werden begrenzt.
- Rate Limits gelten getrennt für Lobbyaktionen, Heartbeats und Gameplay-Eingaben.
- Keine vertraulichen Gegner-, Seed- oder Reward-Daten werden vor dem erlaubten Zeitpunkt an Clients gesendet.

## 9. Disconnect, Wiederbeitritt und Abbruch

- Kurzzeitiger Verbindungsverlust markiert einen Teilnehmer `disconnected`, entfernt ihn aber nicht aus dem Run.
- Der serverseitig bestätigte Charakterzustand bleibt bestehen; die genaue In-Game-Behandlung wird in Block 11 implementiert.
- Rejoin ist nur für denselben Account, denselben Run und denselben Slot möglich.
- Rejoin liefert vollständigen Snapshot plus nächste erwartete Eingabesequenz.
- Ein Disconnect erzeugt niemals einen zweiten Spieler, Gegner, Raumabschluss oder Reward Claim.
- Verlassen alle vier Spieler den Run oder überschreitet der Run den definierten Abbruchvertrag, setzt nur der Server `abandoned`.
- Ein terminaler Run kann nicht wieder aktiv werden.
- Abgebrochene Runs gewähren keine Abschlussbelohnung; spätere Teilbelohnungen müssen vor ihrer Einführung ausdrücklich definiert werden.

## 10. Belohnungen, Limits und Missbrauchsschutz

Block 9 legt noch keine finalen Zahlen fest. Verbindlich ist:

- Belohnungsberechtigung entsteht nur durch serverseitig bestätigten `completed`-Status.
- Reward-Payload wird deterministisch aus serverseitigem `reward_seed`, Reward-Version und gültiger Teilnahme erzeugt.
- Claim und Grant erfolgen atomar.
- Pro `(raid_run_id, user_id)` exakt ein Claim.
- Retry gibt denselben Grant zurück.
- Teilnahme- oder Abschlusslimits werden serverseitig geführt, nicht über lokale Uhrzeit.
- Ein Nutzer ohne gültigen Teilnehmerdatensatz erhält nichts.
- Entfernte, ersetzte oder nur eingeladene Nutzer erhalten nichts.
- AFK-, Mindestteilnahme- und Anti-Carry-Regeln werden vor Block 14 anhand der tatsächlichen Mechaniken konkretisiert.
- Gildenwertung darf nur aus abgeschlossenen, validierten Runs aggregiert werden.

## 11. Zehn-Raum-Designrahmen

Jeder Raum benötigt eine eigene kooperative Kernmechanik. Der verbindliche Rahmen für Block 12 bis 14:

1. zwei gleichzeitig gehaltene Siegel bei geteiltem Gegnerdruck,
2. Staffelübergabe eines instabilen Veil-Kerns,
3. gegenseitige Reinigung stapelnder Verderbnis,
4. getrennte Plattformen mit gekoppelten Schaltern,
5. Schutz eines Kanalisierenden durch rotierende Rollen,
6. koordinierte Unterbrechung mehrerer Elite-Casts,
7. geteilte Sicht-/Informationsmechanik mit Weitergabe sicherer Wege,
8. synchronisierte Schadensfenster gegen gekoppelte Ziele,
9. mehrstufige Teamprüfung als Bossvorbereitung,
10. mehrphasiger Raid-Boss mit Positions-, Unterbrechungs-, Übergabe- und Rettungsaufgaben.

Keine Mechanik darf durch einen einzelnen starken Spieler vollständig lösbar sein. Fehlschläge müssen klar angekündigt, mobil lesbar und grundsätzlich erholbar sein, sofern der Raumvertrag keinen eindeutigen Wipe vorsieht.

## 12. Mobile und Orientierung

- UI und Gameplay nur im Hochformat.
- Vier Teilnehmerkarten, Ready-Zustände, Reconnectstatus und Mechanikhilfen dürfen nicht horizontal überlaufen.
- Alle primären Touchziele mindestens 44 CSS-Pixel hoch oder breit.
- Keine Drag-only-Aktion ohne Tap-Alternative.
- Querformat zeigt einen vollständigen Blocker über Lobby und Gameplay.
- Während des Blockers werden lokale Eingaben, Simulation, Timer und Audiozustände entsprechend dem globalen Orientierungsschutz pausiert.
- Nach Rückkehr wird vor Fortsetzung ein Server-Snapshot abgeglichen.

## 13. Observability und Diagnose

Jeder Run muss serverseitig nachvollziehbar sein über:

- Lobby- und Run-ID,
- Teilnehmer und Slots,
- Status- und Versionswechsel,
- Raum-Epochen,
- Disconnect-/Rejoin-Ereignisse,
- idempotente Mutationen,
- terminalen Grund,
- Reward-Grant-Transaktion.

Logs dürfen keine Access Tokens oder unnötigen personenbezogenen Inhalte enthalten.

## 14. Testvertrag für die Folgeblöcke

Block 9 selbst ist Dokumentation und benötigt nur Dokument-/Repository-Konsistenzprüfungen. Spätere Implementierungen müssen mindestens abdecken:

- fremde Gilde, Nichtmitglied und gildenloser Account werden abgewiesen,
- 1, 2, 3 oder 5 Teilnehmer können nicht starten,
- vier bereite Mitglieder starten exakt einen Run,
- parallele Startrequests liefern dieselbe Run-ID,
- Slot- und Teilnehmerzuordnung bleibt nach Reload/Reconnect stabil,
- alte Raum-Eingaben werden nach Raumwechsel verworfen,
- Realtime-Lücke lädt Snapshot nach,
- Disconnect/Rejoin erzeugt keine Duplikate,
- terminaler Run bleibt terminal,
- Reward-Doppeltap, Retry und Reconnect gewähren exakt einmal,
- RLS verhindert direkte Fremd- und Schreibzugriffe,
- echte Touch-Bedienung auf iPhone, Android-Smartphone, iPad und Android-Tablet im Hochformat,
- Querformat blockiert vollständig und setzt nach Hochformat korrekt fort,
- Playwright-Retries bleiben `0`.

## 15. Übergabe an Block 10 bis 14

- Block 10 implementiert Gildenbereich, Lobby, Einladungen, Ready und atomaren Start.
- Block 11 implementiert autoritativen synchronisierten Run-Zustand, Realtime, Disconnect und Rejoin.
- Block 12 implementiert Raid-Räume 1 bis 5.
- Block 13 implementiert Raid-Räume 6 bis 10 bis zur Bossvorbereitung.
- Block 14 implementiert finalen Raid-Boss, Rewards, Limits, Gildenfortschritt und vollständige Vier-Spieler-Evidence.

Jede Abweichung von diesem Vertrag muss vor Implementierung ausdrücklich im Repository dokumentiert und gegen Issue #321 sowie den Master-Arbeitsplan geprüft werden.
