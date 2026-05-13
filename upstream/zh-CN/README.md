# 上游同步策略

**Language:** [English](../README.md) | [한국어](../ko-KR/README.md) | **简体中文**

![Upstream Sync](https://img.shields.io/badge/Upstream_Sync-Best_effort-blue)
![Upstream](https://img.shields.io/badge/upstream-affaan--m%2Feverything--claude--code-informational)
![Baseline](https://img.shields.io/badge/baseline-393d397e-informational)

EGC (Everything Gemini Code) 是 [@affaan-m](https://github.com/affaan-m) 的 [ECC (Everything Claude Code)](https://github.com/affaan-m/everything-claude-code) 的**生态系统移植版本（ecosystem port）**。它不是 ECC 的官方发行版，也不声称与 ECC 在 API 或行为层面兼容。涉及 harness 自身的行为以 Gemini CLI 内部验证为准，不参照 ECC 在 Claude Code 中的表现。

本文件记录 EGC 如何追踪上游 ECC 仓库，以及在移植过程中改动了什么。

---

## 上游基线

- **上游仓库**: [`affaan-m/everything-claude-code`](https://github.com/affaan-m/everything-claude-code)
- **最近一次同步的提交**: [`393d397efa40a9e9b6c7296df8181860ebf5047e`](https://github.com/affaan-m/everything-claude-code/commit/393d397efa40a9e9b6c7296df8181860ebf5047e)
- **最近一次同步的日期**: 2026-05-13
- **回合记录**: 最新回合见 [`sync-rounds/2026-05-13.md`](../sync-rounds/2026-05-13.md)，首次 triage 见 [`sync-rounds/2026-05-12.md`](../sync-rounds/2026-05-12.md)。上面的 SHA 是*评估到*的最后一个提交；并非所有进入焦点范围的提交都被移植。
- **EGC 的首次提交**: [`ff331996a061c2bbd17ffaa23d4eed2dcdd6ad35`](https://github.com/Jamkris/everything-gemini-code/commit/ff331996a061c2bbd17ffaa23d4eed2dcdd6ad35) (2026-02-09)

该状态的机器可读副本位于 [`.upstream-sync.json`](../.upstream-sync.json)。CI 校验器 (`scripts/ci/validate-upstream-sync.js`) 会断言两个文件中的 SHA 一致；不一致的 PR 将被自动阻拦。

---

## 同步策略

EGC 与 ECC 的同步采用 **best-effort 方式**。我们不承诺固定的同步节奏 —— 单人维护者无法可靠地兑现日历型 cadence，而被打破的承诺本身就是本策略试图防范的那种 drift。

取而代之，drift 被**机械地暴露出来**：

- 最近一次同步的 SHA 同时记录在上面的章节与 `.upstream-sync.json` 中。
- GitHub Action (`.github/workflows/upstream-drift.yml`) 每周（韩国时间星期一 06:00）比较 `affaan-m/everything-claude-code` 的 HEAD 与记录的 SHA，并在存在 drift 时维护一个带有 `🔄 Upstream Sync` 标签的单一滚动追踪 issue。
- 当一次同步动作完成时，维护者推进 SHA，追踪器自动关闭该 issue，循环继续。

也就是说，*承诺* 不在于按计划修复 drift，而在于 **将 drift 暴露出来**。

### 从 ECC 回移植到 EGC 的范围

- 与 harness 无关的 skill、rule、workflow 思路。
- 共享逻辑中的 bug 修复（validator、评分 rubric、确定性引擎等）。
- 意图能干净地翻译到 Gemini CLI 工具模型的新 agent。
- 文档改进。

### 有意保持差异的部分

- 任何与 Claude Code 运行时模型耦合的内容（Claude 专属工具名、`model: opus/sonnet` 选择器、`~/.claude/` 路径、`CLAUDE.md` 文件名）。
- 依赖 Claude Code API 而 Gemini CLI 无对应的 ECC 功能。
- ECC 中无对应的 Gemini CLI 原生能力（Gemini extension manifest、`.gemini/` 路径布局、`gemini-extension.json`）。

### 冲突解决原则

当上游变更触及 EGC 已为 Gemini CLI 适配过的范围 —— 命令/agent 文件格式、路径布局、安装脚本、Gemini extension manifest、Antigravity 流程，或 Gemini 专用 validator —— 时，**Gemini CLI 原生行为的稳定性始终优先于与上游的对齐**。采纳 ECC 变更的*意图*，但按 [`CONTRIBUTING.md`](../../CONTRIBUTING.md) 中记载的 Gemini 约定重新塑形。两可时，宁可选择在 Gemini CLI 中可验证的行为，也不要更接近 ECC 文本的写法。

---

## 复制 / 变更 / 移除 / 新增 — 按类别归纳

这是类别级别的概览。仓库本身才是 source of truth —— 完整清单请直接看文件树。

### 复制（仅做格式/路径翻译）

| 类别 | 备注 |
|---|---|
| Skills | 内容大体保留；frontmatter 与引用按 Gemini 约定重新指向。 |
| Rules | 属于语言（language-specific）而非 harness 层面的 rule 文件原样复制。 |
| Workflow 思路 | Workflow 名称与步骤结构保留；工具调用部分重新翻译。 |

### 变更（翻译为 Gemini CLI 约定）

| 类别 | 变更 |
|---|---|
| Commands | 从 Claude Code 的命令格式迁移到 Gemini CLI 的 `commands/*.toml`。 |
| Agents | 工具名迁移到 Gemini 等价物（`Read` → `read_file`、`Bash` → `run_shell_command` 等）。完整映射见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。 |
| Agent frontmatter | 移除 `model: opus/sonnet` 字段（Gemini CLI 不支持按 agent 选择模型）。 |
| 路径 | `~/.claude/` → `~/.gemini/`；`CLAUDE.md` → `GEMINI.md`。 |
| MCP configs | 适配为 Gemini CLI 的 MCP server 注册格式。 |
| 安装脚本 | 为 Gemini CLI / Antigravity 安装流程重写。 |
| 品牌字符串 | 用户可见字符串中指向 harness 的 "Claude" → "Gemini"（指向 Anthropic 模型的部分不动）。 |

### 移除（无 Gemini 对应或有意丢弃）

| 类别 | 原因 |
|---|---|
| 遗留的 Claude Code 安装脚本（`ecc.js`、`claw.js`、`install-plan.js`） | Gemini CLI 通过其 Extension 架构原生管理安装。 |
| 硬编码 Anthropic SDK 调用的 Claude API 专属 skill | 超出 Gemini CLI 移植版本的范围。 |

### 新增（EGC 自身新引入，ECC 中没有）

| 类别 | 备注 |
|---|---|
| Gemini extension manifest | `gemini-extension.json` 和 `.gemini-plugin/plugin.json`，用于将 EGC 注册为 Gemini CLI 扩展。 |
| Antigravity 安装路径 | `scripts/install.sh` 中的 Antigravity（VS Code / Cursor）流程。 |
| 多语言文档 | `docs/ko-KR/`、`docs/zh-CN/`，以及本目录下的 `ko-KR/` 与 `zh-CN/` 子目录中的韩文/中文镜像。 |
| `/egc-grok` | 借助 Gemini 1M 上下文进行全仓审计的命令 —— ECC 中无对应。 |
| Validators | `scripts/ci/validate-{agents,commands,hooks,skills,workflow-security}.js`，强制执行因移植而引入的 Gemini 专属 frontmatter 规则。 |

---

## 向 ECC 回移植

当 EGC 的某项贡献是 harness 无关的，且也会让 ECC 用户受益：

1. 先把它合入 EGC（评审周期更快，你掌握合并）。
2. 在 `affaan-m/everything-claude-code` 上开一个对应 PR，去掉 Gemini 特化部分（文件格式、工具名、路径）。
3. 在两个 PR 的描述中互相链接，让两侧评审者都能看到上游/下游配对。
4. 如果 ECC 接受了上游版本，请在 EGC PR 描述中记录这一点以便追溯。

EGC 的维护者与 ECC 的维护者并无隶属关系；回移植是由贡献者驱动的活动。

---

## 开放问题与已知 drift

本章节如实列出当前的差距。条目解决后请删除。

- 适配层表面（commands、agents、hooks、validators）尚未由 ECC 维护者做过端到端审阅。EGC 的行为以 Gemini CLI 为基准验证；不主张与 ECC 兼容。
- 随着两个仓库各自演进，skill 与 command 的数量会随时间 drift。`/egc-grok` 审计可按需产出当前 inventory。
- 翻译 drift：当 ECC 新增 agent/skill 时，韩文与中文镜像采取后续更新而非与英文文档保持 lockstep。

---

## 同步的记录流程

当审阅上游并推进基线时：

1. 更新 [`.upstream-sync.json`](../.upstream-sync.json) 中的 `lastSyncedSha`、`lastSyncedAt`，必要时更新 `notes`。
2. 让上面的 **上游基线** 章节与 JSON 一致。
3. 如果 **开放问题与已知 drift** 中的某项已解决，请删除该项。
4. 运行 `npm run lint && npm test`。
5. 用 `docs: sync upstream baseline to <short-sha>` 这样的提交信息提交。

**这一流程对社区贡献者开放** —— 任何人都可以通过 PR 提出一次同步更新，不限于维护者。CI validator (`scripts/ci/validate-upstream-sync.js`) 加上常规代码评审会负责检查 SHA 与记录日期的一致性；本文件与 `.upstream-sync.json` 之间 SHA 不一致的 PR 将被自动阻拦。
