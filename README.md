# AI_WorkingPipeline

一套给 **Claude Code** 用的项目工作框架。它从需求收集（intake）开始，经过任务分配、开发、审查、测试、安全检查，一直到进度记录，整条流程都是自动化的。

```
第一次：  /Start  ──►  Start.md（锁定）──►  Project.md · TechnicalSpec.md · DatabaseSchema.md · Codebase.md
之后：    /Commander <任务>  ──►  每个单元跑一次 /AutomateWorkflow：
          plan ─► 🛑 你批准（在对话里，或在 GitHub 上）─► code ─► review ─► test ─► security ─► 记录进度 ─► commit ─► 🛑 问你要不要 push
```

---

## 目录

1. [需要准备什么](#1-需要准备什么)
2. [快速开始](#2-快速开始)
3. [第一次：`/Start`（强制）](#3-第一次start强制)
4. [日常：`/Commander`](#4-日常commander)
5. [一个任务的完整流程：`/AutomateWorkflow`](#5-一个任务的完整流程automateworkflow)
6. [进度记录是怎么保证的](#6-进度记录是怎么保证的)
7. [文件说明](#7-文件说明)
8. [Agents · Skills · Hooks](#8-agents--skills--hooks)
9. [配置](#9-配置-claudepipelineconfigjson)
10. [常见问题](#10-常见问题)

---

## 1. 需要准备什么

| 工具 | 用途 | 检查 |
|------|------|------|
| [Claude Code](https://claude.com/claude-code) | 执行整套流程 | `claude --version` |
| Git | 分支、worktree、commit | `git --version` |
| Node.js 18 以上 | 跑 hooks 和 `commander.mjs` | `node -v` |
| GitHub CLI（已登入） | 开 issue、贴 plan、读取你的批准 | `gh auth status` |
| 项目本身的工具链 | 例如 `mvn`、`npm` 或 `ruff`，quality-gate 会自动侦测 | — |

> Token 永远不要写进任何文件。`gh` 登入后，凭证存在系统的 keyring 里。

## 2. 快速开始

### 新项目（推荐做法）
```bash
gh repo create my-app --template Carlo0919/AI_WorkingPipeline --private --clone
cd my-app
claude
```
开启后，随便输入一句话，`/Start` 就会自动开始。

> ⚠️ 如果你是用 `git clone` 直接复制这个 repo，`origin` 仍然指向模板 repo，这时 start-gate 会以为自己在模板里而保持沉默。请先把 `origin` 改成你自己的 repo：`git remote set-url origin <你的 repo>`。

### 已有项目
```bash
node /path/to/AI_WorkingPipeline/install.mjs /path/to/your-project --dry   # 先看会复制哪些文件
node /path/to/AI_WorkingPipeline/install.mjs /path/to/your-project         # 只复制不存在的文件，绝不覆盖
```
已经存在的文件（例如你原本的 `CLAUDE.md`）会被跳过，并列出来让你手动合并。

---

## 3. 第一次：`/Start`（强制）

**只要 `Start.md` 里的 `Intake status` 还不是 `✅ LOCKED`，你发出的每一句话都会先被 `start-gate` hook 拦下，要求先跑 `/Start`。** 锁定以后就再也不会强制了。

`/Start` 的步骤：

1. **请你描述项目。** 你的原话会**一字不改**地记进 `Start.md` §1。锁定之后这段永远不会被修改。
2. **对照检查表 A–P**，先从你的描述里找答案，标注来源为 `original`。
3. **只追问缺少的部分**，每轮最多 4 题。选择题用选项让你点，开放题让你自由回答：

   | # | 问什么 | # | 问什么 |
   |---|--------|---|--------|
   | A | 这个项目是什么、属于哪种类型 | I | 存什么数据、敏感程度、法规 |
   | B | 目标和成功指标（要有数字） | J | 平台（web、mobile、desktop、只有 API、需不需要离线） |
   | C | 目标用户 | K | **Tech stack** |
   | D | 角色：能做什么、能看什么、绝对不能看什么 | L | 部署在哪里、预算 |
   | E | Domains：网站和子网域，以及业务领域（module） | M | 时间线 |
   | F | **流量等级**：高、中、低，以及具体数字 | N | 团队 |
   | G | 核心功能 | O | 不做的范围 |
   | H | 外部服务：支付、邮件、SMS、AI、地图等 | P | 最大的风险 |

   - **流量等级**会问你"平常和最忙的时候，同时有多少人在用"，然后套用 `Start.md` §3 的定义：
     - **Low**：< 50 人同时在线，或每天 < 1 万个请求。
     - **Medium**：50–1000 人，或每天 1 万–100 万个请求。
     - **High**：> 1000 人，或每天 > 100 万个请求，或流量会突然暴增。

     这个等级直接决定 `TechnicalSpec.md` 里的 server 规模，以及要不要上 cache 或 queue。
   - **Tech stack 一定会问。** 如果你答不出来、说"随便"或"你决定"，Claude 会用 `skills/stack-selection` 根据你前面的答案**自动推荐整套 stack**，依据包括团队经验、平台、流量、功能、外部服务、预算，每一项都附上理由。如果你只指定了一部分（例如"我要用 React"），那部分会保留，其余由 Claude 补齐。
4. **给你一份完整摘要**，回复 `yes` 就锁定。如果 stack 是自动推荐的，你回 `yes` 就等于采用，不会再多一轮审批。
5. **自动写好所有文档：**
   - `Start.md`：标为 LOCKED；
   - `Project.md`：定义、用户、domains、角色矩阵、mechanisms、时间线、待解决问题、第一行进度记录；
   - `TechnicalSpec.md`：stack 和依流量等级算出的 server 规模；
   - `DatabaseSchema.md`：草稿版的 entities；
   - 另外还会填好 `CLAUDE.md` 的占位符、`pipeline.config.json`，并准备好 stack skill。
6. 在 GitHub 开一个 kickoff issue，commit，然后**问你**要不要 push。

之后如果项目方向有重大改变（新的用户类型、新的产品方向），可以再跑一次 `/Start`。它会进入 **addendum 模式**：只问有变化的部分，把新内容追加到 `Start.md` §6，原始描述不动。

---

## 4. 日常：`/Commander`

**有任务就打 `/Commander <你的任务>`。** Commander 在主对话里运行，因为 subagent 不能再叫出其他 agent。它的原则是**用最少的 agent 和 worktree 把事情做完**，以节省 token 和资源。

1. **看现况。** `commander.mjs status` 会列出所有任务、各自的阶段、负责的 agent、所在的 worktree、跟 base branch 差几个 commit、改了几个文件，以及有没有冲突。
2. **分析任务**，用最便宜但足够的方式：
   - 很小的改动：Commander 自己读一两个文件就处理。
   - 功能类或不清楚的 bug：交给 planner 的 TRIAGE 模式，整个请求只调用一次。
   - "帮我检查这段 code"：交给 reviewer 的检查模式。
3. **决定分配：**

   | 情况 | 分配 |
   |------|------|
   | 只有 1 个单元 | 直接在主目录做，0 个 worktree |
   | 几个小（S）单元 | 在主目录依序做 |
   | 2–3 个**独立的** M/L 单元，在不同 module、改的路径不重叠 | 每个单元一个 worktree，最多 `maxWorktrees` 个 |
   | 同一个 module 的多个单元 | 同一个 worktree，依序做 |

   | 单元大小 | 派哪些 agent |
   |----------|--------------|
   | S | coder → reviewer。行为有变就加 tester；碰到 endpoint、输入、config、依赖或日志就加 security |
   | M / L | planner → coder → reviewer → tester → security-reviewer |
4. **为每个单元开一个 GitHub issue 并贴上 plan**，然后给你一张分配表，让你选择批准哪些单元。
5. **派工和追踪。** 每个 worktree 有自己的分支、DB、port。每到一个新阶段就跑一次 `commander.mjs check`，它会比对每个单元**实际改了**哪些文件：
   - `CLAIM`：两个单元登记的路径重叠；
   - `SHARED`：两个单元抢同一个共用文件；
   - `UNCLAIMED`：改了共用文件却没登记；
   - `OUTSIDE`：改到登记范围以外；
   - `ORPHAN`：有 worktree 但不在登记表上。
6. **merge 和记录。** 在你同意 push 之后，Commander 一次 merge 一个单元回 base branch，跑完整测试，再统一写进度记录。这样多个 worktree 不会在 `Project.md` 上冲突。

`/Commander status` 可以随时查看登记表。

---

## 5. 一个任务的完整流程：`/AutomateWorkflow`

| 步骤 | 做什么 | 由谁做 |
|------|--------|--------|
| 0 | 开分支 `{type}/{title}`，或进入 Commander 分配的 worktree | — |
| 1 | `gh issue create`，标题格式为 `[CATEGORY] -> 标题 -> 简述` | — |
| 2 | 写 plan，贴到 issue | planner |
| 3 | 🛑 **你批准**：在对话里回 `yes`，或在 issue 留言 `/approve`、加上 `approved` label。只认 `approvers` 里的账号。 | **你** |
| 4 | 写 code。Orchestrator 会**亲自读 diff**；资料结构有变就同时更新 DatabaseSchema.md | coder |
| 5 | Review，有问题就退回第 4 步 | reviewer |
| 6 | 写 unit test，发现 bug 就退回第 4 步 | tester |
| 7 | 安全检查（最后一关），对照 S1–S15 | security-reviewer |
| 8 | 跑性能对比（有影响时才跑） | — |
| 9 | **记录进度和文档**，然后 commit | hooks 会检查 |
| 10 | 🛑 问你要不要 push 和 merge | **你** |

小改动可以跳过完整 plan、测试和性能对比，但**碰到 endpoint、输入、config、依赖或权限的改动，一定要过 security 检查**。

---

## 6. 进度记录是怎么保证的

| 机制 | 什么时候触发 | 做什么 |
|------|-------------|--------|
| `/AutomateWorkflow` Step 9 | 每个单元结束前 | 先写 `Project.md` §8 的进度记录和相关文档，再 commit |
| `record-progress` hook | 每次 `git commit` 或 `git merge` 之后 | 如果这个 commit 没改到 `Project.md`，就提醒 Claude 补上。可以用 `Progress: skip — <原因>` 明确跳过。在 worktree 里的 commit 不检查，由 Commander 在 merge 时统一记录。 |
| `uncommitted-check` hook | 每次 Claude 准备结束一轮工作时 | 如果还有没 commit 的改动、也没写进度记录，就要求 Claude 说清楚：是要记录、还在进行中，还是不需要记录。同一批改动只提醒一次。 |

---

## 7. 文件说明

| 文件 | 内容 | 谁写 |
|------|------|------|
| `Start.md` | 用户最初的描述（原文）、检查表、问答记录、确认过的摘要。**锁定后不改**，只能追加 addendum。 | `/Start` |
| `Project.md` | 定义、目标、用户、范围、流量等级、domains 和 modules 的数量、角色（功能、用途、资产、权限）、mechanisms、时间线、决策、待解决问题、**进度记录** | `/Start` 写初版，之后每个流程更新 |
| `TechnicalSpec.md` | 从高位到低位的设计：架构、所有组件和版本、npm 等套件、workers 和 pools、server 规模、caching、环境 | `/Start` 写初版，之后每个 mechanism 补充 |
| `DatabaseSchema.md` | ERD（mermaid）、每个 table 的 metadata、关系、作用、PII 分类、保留期限 | coder 和资料改动同一个 commit |
| `Codebase.md` | **实测**的状态：安全措施（rate limit、输入验证、IP 限制……）、代码质量、retry、latency、audit log、CPU 和内存、caching | §1 由 security 写；§2–§7 由 review 写 |
| `CLAUDE.md` | 每个 session 自动读的工作规则 | `/Start` 填占位符 |

---

## 8. Agents · Skills · Hooks

**Agents**（`.claude/agents/`）

| 文件 | Agent | Model | 能做什么 |
|------|-------|-------|----------|
| `plan.md` | planner | opus | 只读。TRIAGE 模式负责切分单元、登记路径、找冲突；PLAN 模式负责完整设计 |
| `code.md` | coder | sonnet | 只写 code，不碰 git，不写测试 |
| `review.md` | reviewer | opus | 只读，可跑 git diff 和测试。也有检查模式 |
| `test.md` | tester | sonnet | 只写测试，发现 bug 回报但不修 |
| `security.md` | security-reviewer | opus | 只读。最后一关，对照 S1–S15 |

**Commands**（`.claude/commands/`）：`/Start` · `/Commander` · `/AutomateWorkflow`

**Skills**（`.claude/skills/`）：
- `stack-selection`：推荐 tech stack；
- `system-design`：架构、并发、扩展顺序、cache、queue；
- `data-modelling`：schema 规则和 ERD 流程；
- `api-security`：API 安全控制。

`examples/stack-skills/` 放的是特定技术的 skill 范例，目前有 Spring Boot。`/Start` 选定 stack 后，会把对应的范例复制进 `.claude/skills/`；没有现成范例就新建一个。

**Hooks**（`.claude/hooks/`，在 `.claude/settings.json` 里设定）

| Hook | 事件 | 作用 |
|------|------|------|
| `start-gate.mjs` | UserPromptSubmit | 还没完成 intake 时，强制先跑 `/Start` |
| `quality-gate.mjs` | 编辑文件之后 | Java 跑 `mvn`/`gradle compile`；TS/JS 跑 `tsc` 和 `eslint`；Python 跑 `ruff`。没装对应工具就跳过 |
| `record-progress.mjs` | commit 或 merge 之后 | 检查有没有写进度记录 |
| `uncommitted-check.mjs` | Stop | 检查没 commit 的工作要不要记录 |

`settings.json` 也**禁止**了 `git push --force`、`git reset --hard`、`git clean`，以及读取 `.env`。

---

## 9. 配置：`.claude/pipeline.config.json`

| 字段 | 意思 | 默认值 |
|------|------|--------|
| `projectName` | 项目名 | `/Start` 填入 |
| `baseBranch` | 主分支 | `main` |
| `approvers` | 哪些 GitHub 账号在 issue 上的 `/approve` 或 `approved` label 算数 | `/Start` 填入你的 `gh` 登入名 |
| `maxWorktrees` | 最多同时开几个 worktree | `3` |
| `sharedFiles` | 共用文件（同一时间只能有一个单元在改） | 常见的 manifest 和 lockfile |
| `docs` | 由框架管理的文档 | 6 份 md |
| `templateRepo` | 模板 repo 本身。在这个 repo 里，start-gate 不会触发 | `Carlo0919/AI_WorkingPipeline` |

---

## 10. 常见问题

**为什么 Commander 是 command，而不是 agent？**
Claude Code 的 subagent 不能再叫出其他 subagent。Commander 必须派工，所以只能在主对话里运行。

**我想跳过某一步？**
小改动的规则写在 `/AutomateWorkflow` 的"When to skip steps"里。批准（Step 3）和 push（Step 10）这两关永远不会跳过。

**可以重新跑 `/Start` 吗？**
可以，但锁定之后只会进入 addendum 模式，原始描述不会改。如果真的要从头来，手动把 `Start.md` 的状态改回 `⬜ NOT STARTED`。

**worktree 和测试用的 DB 会自动删吗？**
不会。删除是破坏性操作，Commander 会先问你。分支永远不删。

**怎么省 token？**
- 小单元不派 planner；
- 一个请求只做一次 triage；
- agent 只拿到路径，不把文件内容贴给它；
- 修完 bug 只重跑失败的那一关；
- 能在主目录依序完成的，就不开 worktree。

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
