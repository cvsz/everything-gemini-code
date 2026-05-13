**Language:** **English** | [한국어](docs/ko-KR/README.md) | [简体中文](docs/zh-CN/README.md)

> **Attribution:** This project was built by migrating [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) by [@affaan-m](https://github.com/affaan-m) to the Gemini CLI ecosystem. Huge thanks for the original work.
>
> EGC is an **ecosystem port** of ECC, not an official ECC release, and does not claim API or behavioral compatibility with ECC. Harness-specific behavior is verified inside Gemini CLI itself. See [`upstream/README.md`](upstream/README.md) for the sync policy, the recorded upstream baseline, and a category-level summary of what was changed versus copied during the port.

# Everything Gemini Code

[![Stars](https://img.shields.io/github/stars/Jamkris/everything-gemini-code?style=flat)](https://github.com/Jamkris/everything-gemini-code/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Skills](https://img.shields.io/badge/skills-183-green)
![Agents](https://img.shields.io/badge/agents-48-purple)
![Commands](https://img.shields.io/badge/commands-80-blue)

**Battle-tested agents, skills, and workflows for Gemini CLI / Antigravity.**

Ports 183 skills and 48 agents from [Everything Claude Code](https://github.com/affaan-m/everything-claude-code), retuned for Gemini's tool model. Adds Gemini-native features like `/egc-grok` — a whole-repo audit that uses Gemini's 1M context window in a single pass (Claude Code's 200K can't).

---

## What you can do

- **Audit your whole repo in one pass** — `/egc-grok` uses Gemini's 1M context to map architecture, find dead files, detect circular deps. No file-by-file scrolling.
- **Plan-before-code workflow** — `@planner` returns a phased breakdown with risks and dependencies. WAITs for your confirm before writing anything.
- **Test-driven feature flow** — `/egc-tdd` + `@tdd-guide` enforce write-tests-first with 80%+ coverage.
- **Security review on demand** — `@security-reviewer` flags OWASP top 10, hardcoded secrets, injection risks before commit.
- **183 skills, on-demand** — Clean Architecture, MCP, Remotion, Django, x402 payments, and more. Loaded only when referenced.

---

## Quick Start

```bash
gemini extensions install https://github.com/Jamkris/everything-gemini-code
```

That's it. No clone, no symlinks. Requires `GEMINI_API_KEY` in your environment ([get one from Google AI Studio](https://aistudio.google.com/)):

```bash
export GEMINI_API_KEY="your_api_key_here"
```

<details>
<summary><strong>Other install methods (Antigravity, manual, dev mode, uninstall)</strong></summary>

### Install via Script (Antigravity / advanced)

Recommended if you use **Antigravity** (VS Code / Cursor) or need to customize the installation. Existing configurations will be updated.

```bash
# Antigravity only
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Jamkris/everything-gemini-code/main/scripts/install.sh)" -- --antigravity

# CLI + Antigravity
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Jamkris/everything-gemini-code/main/scripts/install.sh)" -- --all
```

### Manual installation

```bash
git clone https://github.com/Jamkris/everything-gemini-code.git

# Copy agents, commands, skills
cp everything-gemini-code/agents/*.md ~/.gemini/agents/
cp everything-gemini-code/commands/*.toml ~/.gemini/commands/
cp -r everything-gemini-code/skills/* ~/.gemini/skills/

# Antigravity workflows (optional)
cp everything-gemini-code/workflows/*.md ~/.gemini/antigravity/global_workflows/
```

> **For Antigravity users:** copying to `~/.gemini/antigravity/` subdirectories (`global_agents`, `global_skills`) is recommended for full compatibility. `install.sh` handles this automatically.
>
> **Rules:** Bundled into `~/.gemini/GEMINI.md` by `install.sh`. For manual installs, copy a template: `cp everything-gemini-code/templates/GEMINI_GLOBAL.md ~/.gemini/GEMINI.md`

### Developer mode (link instead of copy)

For developing or contributing to this extension:

```bash
git clone https://github.com/Jamkris/everything-gemini-code.git
cd everything-gemini-code
gemini extensions link .
```

### Uninstall

```bash
# Extension install
gemini extensions uninstall https://github.com/Jamkris/everything-gemini-code

# Script-based install (selective — only files installed by this extension)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Jamkris/everything-gemini-code/main/scripts/uninstall.sh)" -- --antigravity

# Script-based install (full — deletes everything in the target dirs)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Jamkris/everything-gemini-code/main/scripts/uninstall.sh)" -- --antigravity --purge
```

</details>

---

## 💻 Usage

Once installed, you can access the new capabilities directly in Gemini CLI.

### Slash Commands

Use custom commands to automate workflows (see [Full Command List](docs/en/commands/README.md)):

```bash
# Plan a feature implementation
/egc-plan "Add user authentication with JWT"

# Start Test-Driven Development workflow
/egc-tdd "Create a user service"

# Run a code review
/egc-code-review
```

> **Antigravity users:** workflows are installed under bare names
> (e.g. `/tdd`, `/code-review`, `/build-fix`) — the `egc-` prefix is only
> applied to `/egc-plan`, which would otherwise conflict with Antigravity's
> built-in `/plan`. In Gemini CLI every command uses the `egc-` prefix to
> avoid collisions with its built-in command set.

### Agents

Delegate complex tasks to specialized agents:

```bash
# Use the architect agent for system design
@architect "Design a microservices architecture for..."

# Use the security reviewer for vulnerability checks
@security-reviewer "Audit this file for injection flaws"
```

### Skills

Gemini will automatically utilize installed skills when relevant to your request, such as "TDD Workflow" or "Backend Patterns".

### MCP Servers

Configure and manage Model Context Protocol (MCP) servers to extend Gemini's capabilities. (see [MCP Configuration Guide](docs/en/mcp-configs/README.md))

---

## 📦 What's Inside

This extension packs a complete development environment config:

```
everything-gemini-code/
├── gemini-extension.json  # Extension manifest
├── agents/                # Specialized subagents (@planner, @architect, etc.)
├── skills/                # Workflow definitions (TDD, Patterns, etc.)
├── commands/              # Gemini CLI commands (.toml)
├── workflows/             # Antigravity workflows (.md)
├── templates/             # GEMINI.md rule templates (Global, TS, Python, Go)
├── hooks/                 # Automation triggers (hooks.json)
├── scripts/               # Install, uninstall, CI, and utility scripts
├── mcp-configs/           # MCP server configurations
└── docs/                  # Documentation (en, ko-KR, zh-CN)
```

---

## ⚠️ Troubleshooting

If you see "Skill conflict detected" warnings, it means you have previously installed skills manually. You can safely remove the local versions to use the extension's managed skills:

```bash
# Remove manually installed skills and commands to avoid conflicts
rm -rf ~/.gemini/skills/* ~/.gemini/commands/*
```

## 🤝 Contributing

**Contributions are welcome!** See the [Contributing Guide](CONTRIBUTING.md).

If you have useful agents, skills, or configurations, please submit a Pull Request.

---

## 📄 License

MIT - Use freely, modify as needed.
