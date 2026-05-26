# 업스트림 동기화 정책

**언어:** [English](../README.md) | **한국어** | [简体中文](../zh-CN/README.md)

![Upstream Sync](https://img.shields.io/badge/Upstream_Sync-Best_effort-blue)
![Upstream](https://img.shields.io/badge/upstream-affaan--m%2Feverything--claude--code-informational)
![Baseline](https://img.shields.io/badge/baseline-1e8c7e7-informational)

EGC (Everything Gemini Code) 는 [@affaan-m](https://github.com/affaan-m) 의 [ECC (Everything Claude Code)](https://github.com/affaan-m/everything-claude-code) 를 기반으로 한 **생태계 포트(ecosystem port)** 입니다. ECC의 공식 릴리스가 아니며, ECC와의 API/동작 호환성을 주장하지 않습니다. 하네스 고유 동작은 ECC의 Claude Code 거동을 기준 삼지 않고 Gemini CLI 내부에서 직접 검증합니다.

이 문서는 EGC가 업스트림 ECC 레포지토리를 어떻게 추적하며, 포팅 과정에서 무엇이 변경되었는지를 기록합니다.

---

## 업스트림 베이스라인

- **업스트림 레포지토리**: [`affaan-m/everything-claude-code`](https://github.com/affaan-m/everything-claude-code)
- **마지막 동기화 커밋**: [`1e8c7e7994223e0ff337d1626cd08e04a1ae67ed`](https://github.com/affaan-m/everything-claude-code/commit/1e8c7e7994223e0ff337d1626cd08e04a1ae67ed)
- **마지막 동기화 일자**: 2026-05-26
- **라운드 노트**: 최신 라운드는 [`sync-rounds/2026-05-26.md`](../sync-rounds/2026-05-26.md), 이전 라운드는 [`sync-rounds/2026-05-18.md`](../sync-rounds/2026-05-18.md), [`sync-rounds/2026-05-15.md`](../sync-rounds/2026-05-15.md), [`sync-rounds/2026-05-13.md`](../sync-rounds/2026-05-13.md), 첫 triage는 [`sync-rounds/2026-05-12.md`](../sync-rounds/2026-05-12.md) 참고. 위 SHA는 *평가한* 마지막 커밋이며, 포커스 범위의 모든 커밋이 포팅되지는 않았습니다.
- **EGC 최초 커밋**: [`ff331996a061c2bbd17ffaa23d4eed2dcdd6ad35`](https://github.com/Jamkris/everything-gemini-code/commit/ff331996a061c2bbd17ffaa23d4eed2dcdd6ad35) (2026-02-09)

이 상태의 기계 판독용 사본은 [`.upstream-sync.json`](../.upstream-sync.json) 에 있습니다. CI validator (`scripts/ci/validate-upstream-sync.js`) 가 두 파일의 SHA 일치를 강제하며, 불일치가 발생한 PR은 자동으로 차단됩니다.

---

## 동기화 정책

EGC는 ECC를 **best-effort 방식**으로 동기화합니다. 정해진 주기는 약속하지 않습니다 — 솔로 메인테이너는 캘린더 cadence를 신뢰 가능하게 지킬 수 없으며, 깨진 약속 자체가 이 정책이 막고자 하는 drift의 형태입니다.

대신 **drift를 기계적으로 가시화**합니다:

- 마지막 동기화 SHA는 위 섹션과 `.upstream-sync.json` 두 곳에 기록됩니다.
- GitHub Action (`.github/workflows/upstream-drift.yml`) 이 매주 (월요일 06:00 KST) `affaan-m/everything-claude-code` HEAD를 기록된 SHA와 비교하며, drift가 있을 때 `🔄 Upstream Sync` 라벨이 붙은 단일 추적 이슈를 갱신합니다.
- 동기화 라운드가 진행되면 메인테이너가 SHA를 갱신하고, 추적기는 이슈를 자동으로 닫으며, 사이클이 반복됩니다.

따라서 *약속*은 drift를 일정대로 고치는 것이 아니라, **drift를 노출하는 것**입니다.

### ECC → EGC 백포트 대상

- 하네스 비종속적인 스킬, 룰, 워크플로우 아이디어.
- 공유 로직의 버그 수정 (validator, 평가 루브릭, 결정적 엔진 등).
- Gemini CLI 툴 모델로 깔끔하게 번역되는 새 에이전트.
- 문서 개선.

### 의도적으로 갈라지는 부분

- Claude Code 런타임 모델과 묶인 모든 요소 (Claude 전용 툴 이름, `model: opus/sonnet` 셀렉터, `~/.claude/` 경로, `CLAUDE.md` 파일명).
- Gemini CLI에 대응이 없는 Claude Code API 기반 ECC 기능.
- ECC에 대응이 없는 Gemini CLI 네이티브 기능 (Gemini extension manifest, `.gemini/` 경로 레이아웃, `gemini-extension.json`).

### 충돌 해결 원칙

업스트림 변경이 EGC가 이미 Gemini CLI에 맞춰 적응시킨 영역 — 커맨드/에이전트 파일 포맷, 경로 레이아웃, 설치 스크립트, Gemini extension manifest, Antigravity 플로우, Gemini 전용 validator — 을 건드릴 때는 **Gemini CLI 네이티브 동작의 안정성을 업스트림 정합성보다 항상 우선합니다.** ECC 변경의 *취지*는 받아들이되, [`CONTRIBUTING.md`](../../CONTRIBUTING.md) 에 문서화된 Gemini 컨벤션에 맞춰 형태를 다시 잡습니다. 애매한 경우 ECC와 텍스트가 가까운 형태보다 Gemini CLI에서 검증 가능한 동작을 택합니다.

---

## 복사 / 변경 / 제거 / 추가 카테고리별 정리

카테고리 수준의 요약입니다. 정확한 목록은 레포지토리 트리 자체가 source of truth입니다.

### 복사 (포맷/경로 번역만)

| 카테고리 | 비고 |
|---|---|
| Skills | 본문은 대부분 보존, frontmatter와 참조만 Gemini 컨벤션으로 재타겟팅. |
| Rules | 언어 종속(language-specific)이고 하네스 종속이 아닌 룰은 그대로 복사. |
| Workflow 아이디어 | 이름과 단계 구조는 유지, 툴 호출만 재번역. |

### 변경 (Gemini CLI 컨벤션으로 번역)

| 카테고리 | 변경 내용 |
|---|---|
| Commands | Claude Code 커맨드 포맷 → Gemini CLI의 `commands/*.toml` 포맷으로 마이그레이션. |
| Agents | 툴 이름을 Gemini 대응으로 마이그레이션 (`Read` → `read_file`, `Bash` → `run_shell_command` 등). 전체 매핑은 [CONTRIBUTING.md](../../CONTRIBUTING.md) 참조. |
| Agent frontmatter | `model: opus/sonnet` 필드 제거 (Gemini CLI는 에이전트 단위 모델 선택을 지원하지 않음). |
| 경로 | `~/.claude/` → `~/.gemini/`, `CLAUDE.md` → `GEMINI.md`. |
| MCP configs | Gemini CLI의 MCP 서버 등록 포맷으로 변환. |
| 설치 스크립트 | Gemini CLI / Antigravity 설치 플로우용으로 재작성. |
| 브랜딩 | 사용자 노출 문자열에서 하네스를 가리키는 "Claude" → "Gemini" (Anthropic 모델을 가리키는 부분은 제외). |

### 제거 (Gemini 대응이 없거나 의도적 드롭)

| 카테고리 | 사유 |
|---|---|
| 레거시 Claude Code 설치 스크립트 (`ecc.js`, `claw.js`, `install-plan.js`) | Gemini CLI는 Extension 아키텍처를 통해 설치를 네이티브로 관리함. |
| Anthropic SDK 사용을 하드코딩한 Claude-API 전용 스킬 | Gemini CLI 포트의 범위 밖. |

### 추가 (EGC 자체에서 새로 추가, ECC에 없음)

| 카테고리 | 비고 |
|---|---|
| Gemini extension manifest | EGC를 Gemini CLI 확장으로 등록하는 `gemini-extension.json`, `.gemini-plugin/plugin.json`. |
| Antigravity 설치 경로 | `scripts/install.sh` 의 Antigravity (VS Code / Cursor) 플로우. |
| 다국어 문서 | `docs/ko-KR/`, `docs/zh-CN/`, 그리고 이 폴더의 `ko-KR/`, `zh-CN/` 서브디렉토리의 한국어/중국어 미러. |
| `/egc-grok` | Gemini의 1M 컨텍스트를 활용한 레포 전체 audit 커맨드 — ECC에는 대응이 없음. |
| Validator | `scripts/ci/validate-{agents,commands,hooks,skills,workflow-security}.js` 가 포트로 도입된 Gemini 전용 frontmatter 룰을 강제함. |

---

## ECC로의 백포트

EGC에 들어가는 기여가 하네스 비종속적이라 ECC 사용자에게도 가치가 있다면:

1. EGC에 먼저 머지합니다 (리뷰 사이클이 빠르고, 머지를 본인이 통제할 수 있음).
2. `affaan-m/everything-claude-code` 에 대응 PR을 열어, Gemini 특화 부분(파일 포맷, 툴 이름, 경로)을 뺀 버전을 올립니다.
3. 두 PR 설명에서 서로를 링크해, 양쪽 리뷰어가 업스트림/다운스트림 페어를 볼 수 있게 합니다.
4. ECC가 업스트림 버전을 받아들였다면, EGC PR 설명에 이를 기록해 추적 가능성을 유지합니다.

EGC 메인테이너는 ECC 메인테이너와 무관합니다 — 백포트는 기여자 주도(activity-driven) 활동입니다.

---

## 열린 질문 및 알려진 drift

이 섹션은 갭에 대해 솔직하게 적습니다. 해결되는 항목은 정리해 제거합니다.

- 어댑터 표면(commands, agents, hooks, validators)이 ECC 메인테이너에 의해 end-to-end 검토된 적 없음. EGC 동작은 Gemini CLI 기준으로 검증되며 ECC 호환성은 주장하지 않음.
- Skill/command 개수는 두 레포가 독립적으로 진화함에 따라 시간이 지나며 차이가 벌어집니다. `/egc-grok` audit으로 현재 인벤토리를 추출할 수 있습니다.
- 번역 drift: ECC에 새 에이전트/스킬이 추가될 때, 한국어/중국어 미러는 영어 문서와 lockstep이 아니라 후속 사이클로 따라옵니다.

---

## 동기화 기록 절차

업스트림을 검토하고 베이스라인을 갱신할 때:

1. [`.upstream-sync.json`](../.upstream-sync.json) 의 `lastSyncedSha`, `lastSyncedAt`, 필요시 `notes` 를 갱신합니다.
2. 위 **업스트림 베이스라인** 섹션을 JSON과 일치하도록 맞춥니다.
3. **열린 질문 및 알려진 drift** 의 어떤 항목이 해결되었다면 그 항목을 제거합니다.
4. `npm run lint && npm test` 를 실행합니다.
5. `docs: sync upstream baseline to <short-sha>` 메시지로 커밋합니다.

**이 절차는 커뮤니티 기여자에게 열려 있습니다** — 메인테이너만이 아니라 누구든 PR로 동기화 업데이트를 제안할 수 있습니다. CI validator (`scripts/ci/validate-upstream-sync.js`) 와 일반 코드 리뷰가 SHA와 기록된 날짜의 일관성을 확인하며, 이 문서와 `.upstream-sync.json` 의 SHA가 어긋난 PR은 자동으로 차단됩니다.
