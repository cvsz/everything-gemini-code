**Language:** [English](../../README.md) | [한국어](../ko-KR/README.md) | **简体中文**

> **致谢：** 本项目通过将 [@affaan-m](https://github.com/affaan-m) 的 [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) 迁移到 Gemini CLI 生态系统而构建。衷心感谢原作者的工作。
>
> EGC 是 ECC 的**生态系统移植版本（ecosystem port）**，不是 ECC 的官方发行版，也不声称与 ECC 在 API 或行为层面兼容。涉及 harness 自身的行为以 Gemini CLI 内部验证为准。同步策略、上游基线，以及在移植过程中改动了什么的类别级概览，请见 [`upstream/zh-CN/README.md`](../../upstream/zh-CN/README.md)。

# Everything Gemini Code

[![Stars](https://img.shields.io/github/stars/Jamkris/everything-gemini-code?style=flat)](https://github.com/Jamkris/everything-gemini-code/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Skills](https://img.shields.io/badge/skills-183-green)
![Agents](https://img.shields.io/badge/agents-48-purple)
![Commands](https://img.shields.io/badge/commands-80-blue)

**适用于 Gemini CLI / Antigravity 的经过实战检验的 Agents、Skills 和 Workflows。**

从 [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) 移植了 183 个 Skills 和 48 个 Agents，并针对 Gemini 的工具模型重新调整。新增了 `/egc-grok` 等 Gemini 原生功能 —— 使用 Gemini 的 1M 上下文窗口一次性审计整个仓库（Claude Code 的 200K 上下文做不到）。

---

## 你能做什么

- **一次性审计整个仓库** — `/egc-grok` 利用 Gemini 的 1M 上下文绘制架构图、查找死文件、检测循环依赖。无需逐文件翻阅。
- **先规划后编码** — `@planner` 返回带风险和依赖的分阶段方案，在写代码前等待你的确认。
- **测试驱动流程** — `/egc-tdd` + `@tdd-guide` 强制先写测试 + 80% 以上覆盖率。
- **按需安全审查** — `@security-reviewer` 在提交前标记 OWASP Top 10、硬编码 secrets、注入风险。
- **183 个 Skills，按需加载** — Clean Architecture、MCP、Remotion、Django、x402 支付等。仅在被引用时加载。

---

## 快速开始

```bash
gemini extensions install https://github.com/Jamkris/everything-gemini-code
```

就这些。无需 clone、无需软链。只需环境变量中有 `GEMINI_API_KEY`（[从 Google AI Studio 获取](https://aistudio.google.com/)）：

```bash
export GEMINI_API_KEY="your_api_key_here"
```

<details>
<summary><strong>其他安装方式（Antigravity / 手动 / 开发模式 / 卸载）</strong></summary>

### 脚本安装（Antigravity / 高级）

如果您使用 **Antigravity**（VS Code / Cursor）或需要自定义安装，推荐此方式。会更新现有配置。

```bash
# 仅 Antigravity
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Jamkris/everything-gemini-code/refs/tags/v1.3.12/scripts/install.sh)" -- --antigravity

# CLI + Antigravity
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Jamkris/everything-gemini-code/refs/tags/v1.3.12/scripts/install.sh)" -- --all
```

### 手动安装

```bash
git clone https://github.com/Jamkris/everything-gemini-code.git

# 复制 Agents
cp everything-gemini-code/agents/*.md ~/.gemini/agents/

# 复制 Commands
cp everything-gemini-code/commands/*.toml ~/.gemini/commands/

# 复制 Skills
cp -r everything-gemini-code/skills/* ~/.gemini/skills/
```

> ⚠️ **注意：** 规则通过 `install.sh` 生成到 `~/.gemini/GEMINI.md`。手动安装时执行：`cp everything-gemini-code/templates/GEMINI_GLOBAL.md ~/.gemini/GEMINI.md`

### 卸载

```bash
# 扩展安装
gemini extensions uninstall https://github.com/Jamkris/everything-gemini-code

# 脚本安装（仅 Antigravity，选择性）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Jamkris/everything-gemini-code/refs/tags/v1.3.12/scripts/uninstall.sh)" -- --antigravity

# 脚本安装（CLI + Antigravity，选择性）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Jamkris/everything-gemini-code/refs/tags/v1.3.12/scripts/uninstall.sh)" -- --all

# 脚本安装（Antigravity，完全 — 删除目标目录中的所有文件）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Jamkris/everything-gemini-code/refs/tags/v1.3.12/scripts/uninstall.sh)" -- --antigravity --purge
```

> **为什么钉版本标签？** 直接对移动的分支执行 `curl | bash` 在可复现性和供应链安全方面都不可靠。上面的 URL 指向 `v1.3.12` 发布标签。执行前请通过 <https://github.com/Jamkris/everything-gemini-code/blob/v1.3.12/scripts/install.sh> 审查实际运行的脚本。

</details>

---

## 💻 使用方法

安装完成后，您可以直接在 Gemini CLI 中使用这些新功能。

### 斜杠命令 (Slash Commands)

使用自定义命令自动化工作流（请参阅 [完整命令列表](commands/README.md)）：

```bash
# 规划功能实现
/egc-plan "添加 JWT 用户认证"

# 开始 TDD 工作流
/egc-tdd "创建用户服务"

# 运行代码审查
/egc-code-review
```

> **Antigravity 用户注意：** 工作流使用裸名称安装
> （例如 `/tdd`、`/code-review`、`/build-fix`）。只有与 Antigravity 内置
> `/plan` 冲突的 `/egc-plan` 会加上 `egc-` 前缀。在 Gemini CLI 中，所有命令
> 都使用 `egc-` 前缀以避免与内置命令集冲突。

### 智能体 (Agents)

将复杂任务委托给专用智能体：

```bash
# 使用架构师智能体进行系统设计
@architect "为...设计微服务架构"

# 使用安全审查员进行漏洞检查
@security-reviewer "审计此文件的注入漏洞"
```

### 技能 (Skills)

Gemini 会在与您的请求相关时自动利用已安装的技能，例如“TDD 工作流”或“后端模式”。

### MCP 服务器 (MCP Servers)

配置和管理模型上下文协议 (MCP) 服务器以扩展 Gemini 的功能。（请参阅 [MCP 配置指南](mcp-configs/README.md)）

---

## 📦 包含内容

此扩展包含完整的开发环境配置：

```
everything-gemini-code/
├── gemini-extension.json  # 扩展清单
├── agents/                # 专用子智能体 (@planner, @architect 等)
├── skills/                # 工作流定义 (TDD, Patterns 等)
├── commands/              # 斜杠命令 (/egc-plan, /egc-tdd 等)
├── templates/             # GEMINI.md 规则模板 (Global, TS, Python, Go)
├── hooks/                 # 自动化触发器 (hooks.json)
└── mcp-configs/           # MCP 服务器配置
```

---

## 🤝 贡献

**欢迎贡献！**

如果您有有用的智能体、技能或配置，请提交 Pull Request。

---

## 📄 许可证

MIT - 自由使用和修改。
