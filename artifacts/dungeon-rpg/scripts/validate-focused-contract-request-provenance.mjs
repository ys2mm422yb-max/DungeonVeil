import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL(
    "../../../.github/workflows/focused-contract-request-runner.yml",
    import.meta.url,
  ),
  "utf8",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requiredContracts = [
  [
    "EVENT_MERGE_SHA: ${{ github.event.pull_request.merge_commit_sha }}",
    "event merge SHA is not captured",
  ],
  ["WORKFLOW_REF: ${{ github.workflow_ref }}", "workflow ref is not captured"],
  [
    'test "$WORKFLOW_SHA" = "$EVENT_MERGE_SHA"',
    "workflow SHA is not bound to the event merge SHA",
  ],
  [
    'test "$WORKFLOW_SHA" = "$REQUEST_PR_MERGE_SHA"',
    "workflow SHA is not bound to the current request merge SHA",
  ],
  ['WORKFLOW_BLOB="$(gh api', "executed workflow blob is not resolved"],
  [
    'TRUSTED_WORKFLOW_BLOB="$(gh api',
    "trusted target workflow blob is not resolved",
  ],
  [
    'test "$WORKFLOW_BLOB" = "$TRUSTED_WORKFLOW_BLOB"',
    "executed workflow is not byte-bound to the trusted target workflow",
  ],
  [
    'test "${#CHANGED_FILES[@]}" -eq 1',
    "request PR is not constrained to exactly one changed file",
  ],
  [
    'test "${CHANGED_FILES[0]}" = ".github/focused-contract-request.json"',
    "request PR is not constrained to the data-only request file",
  ],
  [
    'REQUEST_FINAL_MERGE_SHA="$(gh api',
    "final guard does not re-read the request merge SHA",
  ],
  [
    'FINAL_WORKFLOW_BLOB="$(gh api',
    "final guard does not re-read the executed workflow blob",
  ],
  [
    'FINAL_TRUSTED_WORKFLOW_BLOB="$(gh api',
    "final guard does not re-read the trusted workflow blob",
  ],
  [
    '[ "$REQUEST_FINAL_MERGE_SHA" != "$WORKFLOW_SHA" ]',
    "final guard does not reject a changed request merge SHA",
  ],
  [
    '[ "$FINAL_WORKFLOW_BLOB" != "$WORKFLOW_BLOB" ]',
    "final guard does not reject changed executed workflow content",
  ],
  [
    '[ "$FINAL_TRUSTED_WORKFLOW_BLOB" != "$WORKFLOW_BLOB" ]',
    "final guard does not reject trusted workflow drift",
  ],
  [
    "workflow_blob: process.env.WORKFLOW_BLOB",
    "durable receipt does not record the trusted workflow blob",
  ],
  [
    "merge_sha: read('final-request-pr-merge-sha.txt')",
    "durable receipt does not record the final merge SHA",
  ],
  [
    "final_workflow_blob: read('final-workflow-blob.txt')",
    "durable receipt does not record the final executed workflow blob",
  ],
  [
    "final_trusted_workflow_blob: read('final-trusted-workflow-blob.txt')",
    "durable receipt does not record the final trusted workflow blob",
  ],
];

for (const [needle, message] of requiredContracts) {
  assert(workflow.includes(needle), message);
}

assert(
  !workflow.includes('test "$WORKFLOW_SHA" = "$EVENT_BASE_SHA"'),
  "pull_request merge-ref workflow SHA must not be equated with the base commit SHA",
);
assert(
  !workflow.includes('[ "$WORKFLOW_SHA" != "$TRUSTED_TARGET_HEAD" ]'),
  "final guard must compare workflow blobs instead of equating the merge commit with the target commit",
);

console.log(
  "Focused contract request provenance audit passed: merge-ref identity, trusted workflow blob equality, data-only scope and final revalidation are enforced.",
);
