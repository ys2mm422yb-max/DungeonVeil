# Codex and GitHub Codespaces

This repository supports development from GitHub Codespaces, including from a mobile browser. The canonical setup is `.devcontainer/devcontainer.json`.

## First start

The post-create script performs the reproducible setup:

1. activates pnpm `9.15.9` through Corepack;
2. installs the workspace with the committed lockfile;
3. installs the current Codex CLI when it is not already available.

Start Codex with:

```bash
codex
```

Use **Sign in with ChatGPT** or the device-code flow. An OpenAI API key is not required for ChatGPT-plan authentication.

Before editing, read `AGENTS.md`, Issue #376, and the complete task issue/PR. Create a focused branch from the current head of `fix/mobile-telegraphs-room-21-50-balance`; never commit product work directly to the target branch.

## Secrets

Real secret values must never be committed to this repository or pasted into Codex prompts, GitHub issues, PRs, logs, screenshots, or chat messages.

Use these separate stores:

- **GitHub Codespaces secrets** for interactive development in a Codespace.
- **GitHub Actions secrets** for workflow execution.

A secret added to one store is not automatically available in the other.

The repository currently does not define a committed list of required private values. Add a secret name only when a task and its implementation explicitly require it. Never invent a value. Example templates may contain placeholders, but real `.env` files remain local and ignored.

Special cases:

- `OPENAI_API_KEY`: do not add it for normal Codex sign-in with ChatGPT.
- `GITHUB_TOKEN`: GitHub supplies an ephemeral token to Codespaces and Actions; never copy or persist it.
- Supabase service-role keys or management tokens: add only to the appropriate secret store when an approved task requires them; never expose them to client-side `VITE_` variables.

## Validation

From the repository root:

```bash
pnpm typecheck
pnpm build
```

Run task-specific audits and the four supported mobile portrait projects exactly as required by the relevant GitHub issue and existing workflows. Do not weaken tests, retries, timeouts, thresholds, or coverage.

## Conserving Codespaces usage

Stop the Codespace after work rather than only closing the browser. Rebuild the container after changes to `.devcontainer/`.
