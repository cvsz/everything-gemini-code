# Upstream Sync Policy

EGC (Everything Gemini Code) is an **ecosystem port** of [ECC (Everything Claude Code)](https://github.com/affaan-m/everything-claude-code) by [@affaan-m](https://github.com/affaan-m). It is not an official ECC release and does not claim API or behavioral compatibility with ECC. Harness-specific behavior is verified inside Gemini CLI itself, not by reference to ECC's Claude Code behavior.

This document records how EGC tracks the upstream ECC repository and what was changed during the port.

---

## Upstream baseline

- **Upstream repository**: [`affaan-m/everything-claude-code`](https://github.com/affaan-m/everything-claude-code)
- **Last-synced upstream commit**: [`9db98673d054f5ed0991ba9d67ff4c883c81a42f`](https://github.com/affaan-m/everything-claude-code/commit/9db98673d054f5ed0991ba9d67ff4c883c81a42f)
- **Last-synced date**: 2026-02-09
- **Initial EGC commit**: [`ff331996a061c2bbd17ffaa23d4eed2dcdd6ad35`](https://github.com/Jamkris/everything-gemini-code/commit/ff331996a061c2bbd17ffaa23d4eed2dcdd6ad35) (2026-02-09)

A machine-readable copy of this state lives at [`docs/.upstream-sync.json`](./.upstream-sync.json). A follow-up CI validator will assert the two files agree on the SHA; until then the maintainer keeps them in sync by hand at sync time.

---

## Sync policy

EGC syncs with ECC on a **best-effort basis**. There is no committed sync cadence — a solo maintainer cannot reliably promise one, and a missed promise is itself the kind of drift this policy is meant to prevent.

Instead, drift is made **mechanically visible**:

- The last-synced commit SHA is recorded above and in `docs/.upstream-sync.json`.
- A scheduled GitHub Action (planned) compares the recorded SHA against `affaan-m/everything-claude-code` HEAD on a weekly cadence and maintains a single rolling tracking issue labelled `upstream-sync` when there is drift.
- When a sync round happens, the maintainer advances the SHA, the tracker closes the issue, and the cycle repeats.

This way the *commitment* is to surface drift, not to fix it on a schedule.

### What is eligible for backport from ECC to EGC

- Skill content, rule content, and workflow ideas that are harness-agnostic.
- Bug fixes in shared logic (validators, scoring rubrics, deterministic engines).
- New agents whose intent translates cleanly to Gemini CLI's tool model.
- Documentation improvements.

### What is intentionally divergent

- Anything tied to Claude Code's runtime model (Claude-specific tool names, `model: opus/sonnet` selectors, `~/.claude/` paths, `CLAUDE.md` filenames).
- ECC features built on Claude Code APIs that have no equivalent in Gemini CLI.
- Native Gemini CLI features that have no ECC equivalent (Gemini extension manifest, `.gemini/` path layout, `gemini-extension.json`).

---

## What was copied vs. changed vs. removed vs. added

This is a category-level summary. The repository itself is the source of truth — see the file tree for the exhaustive list.

### Copied (with format/path translation only)

| Category | Notes |
|---|---|
| Skills | Content largely preserved; frontmatter and references retargeted to Gemini conventions. |
| Rules | Language-specific rule files copied as-is where the rule is language-, not harness-, specific. |
| Workflow ideas | Workflow names and step structures preserved; tool invocations retranslated. |

### Changed (translated to Gemini CLI conventions)

| Category | Change |
|---|---|
| Commands | Migrated from Claude Code's command format to Gemini CLI's `commands/*.toml` format. |
| Agents | Tool names migrated to Gemini equivalents (`Read` → `read_file`, `Bash` → `run_shell_command`, etc.). See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full mapping. |
| Agent frontmatter | `model: opus/sonnet` field removed (Gemini CLI does not support model selection at the agent level). |
| Paths | `~/.claude/` → `~/.gemini/`; `CLAUDE.md` → `GEMINI.md`. |
| MCP configs | Adapted to Gemini CLI's MCP server registration format. |
| Install scripts | Rewritten for Gemini CLI / Antigravity installation flow. |
| Branding | "Claude" → "Gemini" in user-facing strings where the reference is to the harness, not to Anthropic's model. |

### Removed (no Gemini equivalent or intentionally dropped)

| Category | Reason |
|---|---|
| Legacy Claude Code install scripts (`ecc.js`, `claw.js`, `install-plan.js`) | Gemini CLI manages installation natively via its Extension architecture. |
| Claude-API-specific skills that hard-code Anthropic SDK usage | Out of scope for a Gemini CLI port. |

### Added (net-new in EGC, not in ECC)

| Category | Notes |
|---|---|
| Gemini extension manifest | `gemini-extension.json` and `.gemini-plugin/plugin.json` to register EGC as a Gemini CLI extension. |
| Antigravity-specific install paths | Antigravity (VS Code / Cursor) flow in `scripts/install.sh`. |
| Multilingual docs | Korean and Simplified Chinese mirrors under `docs/ko-KR/` and `docs/zh-CN/`. |
| `/egc-grok` | Repo-wide audit command leveraging Gemini's 1M context window — no ECC analogue. |
| Validators | `scripts/ci/validate-{agents,commands,hooks,skills,workflow-security}.js` enforce the Gemini-specific frontmatter rules introduced by the port. |

---

## Backporting to ECC

When a contribution to EGC is harness-agnostic and would also benefit ECC users:

1. Land it in EGC first (faster review cycle, you control the merge).
2. Open a corresponding PR against `affaan-m/everything-claude-code`, porting out the Gemini-specific parts (file format, tool names, paths).
3. Cross-link the two PRs in their descriptions so reviewers on either side can see the upstream/downstream pair.
4. If ECC accepts the upstream version, note it in your EGC PR description for traceability.

The maintainer of EGC is not affiliated with the maintainer of ECC; backports are a contributor-driven activity.

---

## Open questions and known drift

This section is honest about gaps. Update it as items are resolved.

- The adapter surface (commands, agents, hooks, validators) has not been end-to-end reviewed by the ECC maintainer. EGC's behavior is verified against Gemini CLI; ECC compatibility is not asserted.
- Skill counts and command counts will drift over time as both repos evolve independently. The `/egc-grok` audit can produce a current inventory on demand.
- Translation drift: when ECC adds new agents/skills, the Korean and Chinese mirrors under `docs/ko-KR/` and `docs/zh-CN/` are updated on a follow-up cycle, not in lockstep with the English docs.

---

## Recording a sync

When the maintainer reviews upstream and advances the baseline:

1. Update `lastSyncedSha`, `lastSyncedAt`, and optionally `notes` in [`docs/.upstream-sync.json`](./.upstream-sync.json).
2. Update the **Upstream baseline** section above to match.
3. Update this document's **Open questions and known drift** section if any drift item is resolved.
4. Run `npm run lint && npm test`.
5. Commit with a `docs: sync upstream baseline to <short-sha>` message.

A follow-up PR will add a CI validator that asserts the SHAs in this document and in `docs/.upstream-sync.json` agree; once that lands, a mismatch will block the PR automatically.
