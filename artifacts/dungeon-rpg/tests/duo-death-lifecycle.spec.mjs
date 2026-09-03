import { writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const RUNTIME_EVIDENCE_MARKER = 'dungeon-veil-runtime-evidence-v1';

test.use({ video: 'on' });

async function openLifecycleQa(page, projectName, language) {
  await page.addInitScript(({ ipad, runtimeEvidenceMarker, language }) => {
    localStorage.clear();
    sessionStorage.setItem(runtimeEvidenceMarker, '1');
    localStorage.setItem('dungeon-veil-language', language);
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, {
    ipad: projectName.includes('ipad'),
    runtimeEvidenceMarker: RUNTIME_EVIDENCE_MARKER,
    language,
  });
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'runtime-duo');
  url.searchParams.set('duoLifecycle', '1');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('runtime-duo-evidence-qa')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('runtime-duo-lifecycle-start').click();
}

for (const language of ['de', 'en']) {
  test(`duo lifecycle emits Downed -> Revived -> Fallen -> Team Defeat temporal evidence (${language})`, async ({ page }, testInfo) => {
    await openLifecycleQa(page, testInfo.project.name, language);

    const observation = await page.evaluate(async () => {
      const host = document.querySelector('[data-testid="runtime-duo-evidence-qa"]');
      if (!(host instanceof HTMLElement)) throw new Error('runtime duo evidence host missing');
      const phases = [];
      const remoteLifeStates = [];
      const startedAt = performance.now();
      const record = () => {
        const phase = host.dataset.lifecyclePhase;
        if (phase && phases.at(-1) !== phase) phases.push(phase);
        const teamPanel = document.querySelector('[data-testid="coop-team-health-panel"]');
        if (teamPanel instanceof HTMLElement) {
          const life = teamPanel.dataset.lifeState;
          if (life && remoteLifeStates.at(-1) !== life) remoteLifeStates.push(life);
        }
      };
      while (performance.now() - startedAt < 7_000) {
        record();
        if (host.dataset.lifecyclePhase === 'team-defeat') break;
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      record();
      return { phases, remoteLifeStates, elapsedMs: performance.now() - startedAt };
    });

    expect(observation.phases).toEqual(['alive', 'downed', 'revived', 'fallen', 'team-defeat']);
    expect(observation.remoteLifeStates).toEqual(['alive', 'downed', 'alive', 'fallen']);
    await expect(page.getByTestId('runtime-duo-team-game-over')).toBeVisible();
    await expect(page.getByTestId('coop-team-health-panel')).toHaveAttribute('data-life-state', 'fallen');

    await writeFile(
      testInfo.outputPath(`player-death-duo-${language}-${testInfo.project.name}.trace.json`),
      JSON.stringify({
        project: testInfo.project.name,
        language,
        phases: observation.phases,
        remoteLifeStates: observation.remoteLifeStates,
        elapsedMs: observation.elapsedMs,
        finalTeamDefeatVisible: true,
      }, null, 2),
    );
    await page.screenshot({
      path: testInfo.outputPath(`player-death-duo-${language}-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });
}
