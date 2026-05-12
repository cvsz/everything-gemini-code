# Contributing Guide

**Language:** **English** | [한국어](docs/ko-KR/contributing/README.md)

Thank you for your interest in contributing to Everything Gemini Code!

## Related Documents

- [Command-Agent Map](docs/en/contributing/COMMAND-AGENT-MAP.md) — Which agents are invoked by each command
- [Skill Placement Policy](docs/en/contributing/SKILL-PLACEMENT-POLICY.md) — Where skills belong and how they are identified
- [Token Optimization](docs/en/contributing/token-optimization.md) — Managing token consumption
- [Verification Guide](docs/en/contributing/VERIFICATION_GUIDE.md) — Verifying extension installation
- [Terminology](docs/en/contributing/TERMINOLOGY.md) — Core project terminology

---

## How to Contribute

### Adding a New Agent

1. Create a file at `agents/your-agent.md`.
2. Use the Gemini CLI frontmatter format:

```markdown
---
name: your-agent
description: Agent description. Specify when to use it.
tools: ["read_file", "run_shell_command"]
---

Agent content...
```

**Important:** Gemini CLI does not support the `model` field, and tool names use the Gemini format (e.g., `read_file`, `run_shell_command`).

### Adding a New Skill

1. Create a directory at `skills/your-skill-name/`.
2. Create a `SKILL.md` file inside:

```markdown
---
name: your-skill
description: Skill description
---

# Skill Title

Skill content...
```

### Adding a New Command

Gemini CLI commands use the `.toml` format:

1. Create a file at `commands/your-command.toml`:

```toml
description = "Command description"
prompt = '''
# Command Title

Command instructions...
'''
```

---

## Quality Standards

### Agent Checklist

- [ ] Clear `description` (including when to use it).
- [ ] Correct Gemini tool names used.
- [ ] No `model` field present.
- [ ] Includes actionable instructions.

### Skill Checklist

- [ ] Clear frontmatter in `SKILL.md`.
- [ ] Specific and actionable workflows.
- [ ] Includes examples where applicable.
- [ ] Under 800 lines.

### Command Checklist

- [ ] Uses `.toml` format.
- [ ] Clear `description`.
- [ ] Complete instructions in the `prompt` field.

---

## Submitting a PR

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Commit your changes: `git commit -m "feat: add your-feature"`.
4. Push the branch: `git push origin feat/your-feature`.
5. Submit a Pull Request.

---

## Upstream contributions (ECC backports)

EGC is an ecosystem port of [Everything Claude Code](https://github.com/affaan-m/everything-claude-code). When a contribution to EGC is harness-agnostic, it may also belong upstream in ECC. The full sync policy is in [`docs/UPSTREAM.md`](docs/UPSTREAM.md); the short version follows.

### When a change belongs upstream too

- The skill, rule, or workflow idea is not specific to Gemini CLI.
- The bug exists in both repos (e.g., a logic error in shared rubric or validator concepts).
- A new agent's intent translates cleanly to Claude Code's tool model.

### How to dual-PR

1. Land the change in EGC first (you control the merge and the review cycle is faster).
2. Open a corresponding PR against `affaan-m/everything-claude-code`, porting out the Gemini-specific parts (file format, tool names, paths — see the conversion table below).
3. Cross-link the two PRs in their descriptions so reviewers on either side can see the upstream/downstream pair.

The maintainer of EGC is not affiliated with the maintainer of ECC; backports are a contributor-driven activity. Do not block an EGC PR on an upstream merge.

### Recording an upstream sync

When pulling new content from ECC into EGC, follow the procedure documented in [`docs/UPSTREAM.md`](docs/UPSTREAM.md) — update both the prose baseline section and `docs/.upstream-sync.json`, then commit with a `docs: sync upstream baseline to <short-sha>` message.

---

## Tool Name Conversion (Claude → Gemini)

If you are migrating agents from Claude Code:

| Claude Code | Gemini CLI |
|-------------|------------|
| `Read` | `read_file` |
| `Write` | `write_file` |
| `Edit` | `replace` |
| `Bash` | `run_shell_command` |
| `Grep` | `search_file_content` |
| `Glob` | `list_directory` |
| `WebSearch` | `google_web_search` |

Also, be sure to remove any `model: opus/sonnet` fields and change references from "Claude" to "Gemini".
