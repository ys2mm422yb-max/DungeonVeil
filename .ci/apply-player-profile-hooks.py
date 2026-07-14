from pathlib import Path

# Count a newly created run exactly once.
game = Path('artifacts/dungeon-rpg/src/pages/game.tsx')
text = game.read_text()
old = "import { applyMetaLoadoutToNewRun, beginMetaRun } from '../game/metaProgression';"
new = old + "\nimport { beginPlayerProfileRun } from '../game/playerProfile';"
if old not in text or "beginPlayerProfileRun" in text:
    raise SystemExit('game profile import marker missing or already applied')
text = text.replace(old, new, 1)
old = """    beginMetaRun();
    engine.startNewGame(name, 'archer');
    applyMetaLoadoutToNewRun(engine);
"""
new = """    beginMetaRun();
    engine.startNewGame(name, 'archer');
    beginPlayerProfileRun(engine.state.chapter, engine.state.floor);
    applyMetaLoadoutToNewRun(engine);
"""
if old not in text:
    raise SystemExit('new-run profile hook marker missing')
text = text.replace(old, new, 1)
game.write_text(text)

# Count completed daily quests at the exact claim point.
retention = Path('artifacts/dungeon-rpg/src/game/runRetention.ts')
text = retention.read_text()
import_marker = "import type { GameEngine } from './runEngine';"
if import_marker not in text or 'recordPlayerProfileQuestCompleted' in text:
    raise SystemExit('retention profile import marker missing or already applied')
text = text.replace(import_marker, import_marker + "\nimport { recordPlayerProfileQuestCompleted } from './playerProfile';", 1)
old = """    profile.daily.claimed.push(task.id);
    profile.sigils += task.reward;
"""
new = """    profile.daily.claimed.push(task.id);
    profile.sigils += task.reward;
    recordPlayerProfileQuestCompleted();
"""
if old not in text:
    raise SystemExit('quest completion profile hook marker missing')
text = text.replace(old, new, 1)
retention.write_text(text)
