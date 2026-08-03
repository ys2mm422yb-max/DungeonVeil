import { readFile } from 'node:fs/promises';
import process from 'node:process';

const rootUrl = new URL('../', import.meta.url);
const read = relative => readFile(new URL(relative, rootUrl), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function section(block, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`### ${escaped}\\s*\\n([\\s\\S]*?)(?=\\n### |$)`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function substantive(value, forbidden = []) {
  if (!value || value.length < 3) return false;
  const lowered = value.toLowerCase();
  return !forbidden.some(token => lowered.includes(token.toLowerCase()));
}

const [agents, policy, template] = await Promise.all([
  read('AGENTS.md'),
  read('docs/ADAPTIVE_TEST_POLICY.md'),
  read('.github/PULL_REQUEST_TEMPLATE.md'),
]);

const sharedPolicyTerms = [
  'adaptive',
  'risk',
  'acceptance criterion',
  'selected checks',
  'selected evidence',
  'escalation',
  'verifier',
  'Playwright retries remain `0`',
];

for (const term of sharedPolicyTerms) {
  assert(policy.toLowerCase().includes(term.toLowerCase()), `adaptive policy is missing required term: ${term}`);
}

assert(agents.includes('docs/ADAPTIVE_TEST_POLICY.md'), 'AGENTS.md must reference the adaptive testing policy');
assert(agents.includes('Adaptive test-plan contract'), 'AGENTS.md must contain the adaptive test-plan contract section');
assert(template.includes('<!-- adaptive-test-plan:start -->') && template.includes('<!-- adaptive-test-plan:end -->'), 'PR template must contain adaptive test-plan markers');
assert(template.includes('Declared domains:'), 'PR template must require machine-readable declared domains');
assert(template.includes('### Acceptance-criterion mapping'), 'PR template must require acceptance-criterion mapping');
assert(template.includes('### Omitted broad checks'), 'PR template must require explicit broad-check omissions');
assert(template.includes('### Verifier decision'), 'PR template must require an independent verifier decision');

if (process.argv.includes('--policy-only')) {
  console.log('Adaptive test policy contract passed: repository instructions, policy and PR template are aligned.');
  process.exit(0);
}

const prNumber = Number(process.env.PR_NUMBER || 0);
if (prNumber === 315) {
  console.log('Adaptive test-plan body validation skipped for protected historical PR #315.');
  process.exit(0);
}

const body = process.env.PR_BODY ?? '';
assert(body.trim(), 'pull request body is empty; complete the adaptive test plan');

const start = body.indexOf('<!-- adaptive-test-plan:start -->');
const end = body.indexOf('<!-- adaptive-test-plan:end -->');
assert(start >= 0 && end > start, 'pull request body is missing the complete adaptive test-plan block');
const block = body.slice(start, end);

const riskSection = section(block, 'Risk level');
const riskMatch = riskSection.match(/\b(low|medium|high|critical)\b/i);
assert(riskMatch, 'adaptive test plan must declare one risk level: low, medium, high or critical');
const risk = riskMatch[1].toLowerCase();

const domains = section(block, 'Affected domains and surfaces');
const declaredMatch = domains.match(/Declared domains:\s*`?([^`\n]+)`?/i);
assert(declaredMatch, 'affected domains section must contain `Declared domains: ...`');
const declaredDomains = declaredMatch[1].trim().toLowerCase();
assert(substantive(declaredDomains, ['replace-with', 'comma-separated']), 'declared domains are still placeholder text');

const mapping = section(block, 'Acceptance-criterion mapping');
const checks = section(block, 'Selected checks');
const evidence = section(block, 'Selected evidence');
const omitted = section(block, 'Omitted broad checks');
const escalation = section(block, 'Escalation triggers');
const verifier = section(block, 'Verifier decision');

assert(substantive(domains, ['replace with concrete']), 'affected surfaces are still placeholder text');
assert(substantive(mapping, ['`ac-1`', 'add one row']), 'acceptance-criterion mapping is missing or still placeholder text');
assert(substantive(checks, ['exact command']), 'selected checks are missing or still placeholder text');
assert(substantive(evidence, ['exact screenshot']), 'selected evidence is missing or still placeholder text');
assert(substantive(omitted, ['exact broad check']), 'omitted broad checks need either `none` or concrete technical reasons');
assert(substantive(escalation, ['concrete failures']), 'escalation triggers are missing or still placeholder text');
assert(/\b(pending|accepted|expanded)\b/i.test(verifier), 'verifier decision must be pending, accepted or expanded');

const evidenceIsNone = /\bnone\b/i.test(evidence) || /process\/docs-only/i.test(evidence);
assert(!(risk === 'high' || risk === 'critical') || !evidenceIsNone, `${risk} risk requires concrete evidence`);

const visibleDomain = /\b(ui|gameplay|renderer|webgl|touch|layout|animation|assets?|enemy|boss|companion|equipment|upgrade-effects?|rooms?)\b/i.test(declaredDomains);
if ((risk === 'high' || risk === 'critical') && visibleDomain) {
  const requiredDevices = ['iPhone', 'Android phone', 'iPad', 'Android tablet'];
  for (const device of requiredDevices) {
    assert(evidence.toLowerCase().includes(device.toLowerCase()), `visible ${risk}-risk plan must name ${device} evidence`);
  }
}

const criticalDomain = /\b(auth|security|supabase|rls|rpc|persistence|cloud|economy|rewards?|multiplayer|reconnect|world.?boss|deployment|shared navigation|global registr|spawn tables?|workflow)\b/i.test(declaredDomains);
assert(!criticalDomain || risk === 'critical', 'critical system domain requires risk level `critical`');

assert(!/red.*irrelevant|failure.*not relevant/i.test(omitted), 'a failed relevant gate cannot be dismissed as irrelevant');

console.log(`Adaptive PR test plan passed for risk=${risk}, domains=${declaredDomains}: acceptance mapping, checks, evidence, omissions, escalation and verifier state are complete.`);
