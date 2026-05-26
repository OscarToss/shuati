# ARCH: 刷题工具

## 技术栈选型

| 选择                          | 理由                                      |
| ----------------------------- | ----------------------------------------- |
| React 19 + TypeScript         | 与资讯项目一致，工具集统一技术栈          |
| Vite 6                        | 快，PWA 插件成熟                          |
| Tailwind CSS                  | 移动端优先，开发快                        |
| vite-plugin-pwa               | 离线缓存 + 安装到桌面                     |
| Zustand                       | 轻量状态管理，业务状态与 Context 认证分离 |
| @tanstack/virtual             | 虚拟滚动，万题题库不卡                    |
| Supabase SDK 前端直连         | 无后端 API 层，RLS 做权限隔离             |
| SheetJS + mammoth.js + pdf.js | 纯前端解析 Excel/Word/PDF                 |
| pnpm workspace                | 与资讯项目风格一致                        |

## 为什么不写后端 API？

刷题工具的逻辑全部在前端：

- 认证：调资讯 API `/api/auth/login` 拿 JWT
- 数据：前端直连 Supabase，RLS 保证安全
- 题库解析：纯前端 JS 库处理文件

资讯 API 作为认证中心，不承载刷题业务逻辑。

## 系统架构

```
┌────────────────────────────────────────────────────┐
│                    刷题工具                           │
│                                                     │
│  packages/                                          │
│  ├── web/              ┌──────────────────────┐     │
│  │   └── src/          │  Vite + React + PWA  │     │
│  │       ├── pages/    │  ┌────────────────┐  │     │
│  │       ├── components/│  │ Zustand stores │  │     │
│  │       ├── stores/   │  │ ├─ authStore   │  │     │
│  │       ├── lib/      │  │ ├─ deckStore   │  │     │
│  │       └── hooks/    │  │ ├─ quizStore   │  │     │
│  │                     │  │ └─ importStore │  │     │
│  │                     │  └────────────────┘  │     │
│  │                     └──────────────────────┘     │
│  │                                                  │
│  └── parser/           ┌──────────────────────┐     │
│      └── src/          │  题库解析服务           │     │
│          ├── excel.ts  │  ├─ SheetJS 解析      │     │
│          ├── word.ts   │  ├─ mammoth 解析      │     │
│          ├── pdf.ts    │  ├─ pdf.js 解析       │     │
│          └── validate.ts│ └─ 格式校验 + 清洗    │     │
│                         └──────────────────────┘     │
│                                                     │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│            认证依赖（跨项目）                          │
│  ┌──────────────────────────────────────────────┐   │
│  │  资讯 API (FastAPI)                           │   │
│  │  POST /api/auth/login     → JWT token        │   │
│  │  POST /api/auth/register  → JWT token        │   │
│  └──────────────────────────────────────────────┘   │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │  Supabase (共用实例)                           │   │
│  │  ├─ users (共用，资讯项目管理)                   │   │
│  │  ├─ quiz_decks                               │   │
│  │  ├─ quiz_questions                           │   │
│  │  ├─ quiz_wrong                               │   │
│  │  ├─ quiz_bookmarks                           │   │
│  │  ├─ quiz_progress                            │   │
│  │  └─ quiz_sessions                            │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

## 数据流

### 登录流程

```
User → 输入手机号+密码
  → POST /api/auth/login (资讯 API)
    → 返回 JWT { access_token, user: { id } }
      → 存入 localStorage
        → Supabase SDK 后续请求自动带 token
```

### 刷题流程

```
User 打开 Deck
  → GET quiz_questions WHERE deck_id = X (RLS: 默认题库所有人可读)
    → 前端缓存到 Zustand + IndexedDB
      → 展示题目卡片
        → 用户选答案
          → 本地判断对错（答案在前端已知）
            → 错 → INSERT quiz_wrong
            → 对 → 不记录
        → 完成一轮
          → INSERT quiz_session (汇总)
          → UPSERT quiz_progress
```

### 题库导入流程

```
User 上传文件 (Excel/Word/PDF/ZIP)
  → parser 解析 → 标准化为 Question[]
    → 预览界面
      ├─ 正常行 (✓) → 用户确认 → INSERT quiz_questions
      ├─ 残缺行 (⚠) → 显示错误原因 → 用户手动修或跳过
      └─ 重复行 (⚠) → 检测到重复 → 跳过
    → 全量入库 → 刷新 Deck 列表
```

### 图片存储流程

```
User 上传 ZIP (题库.xlsx + images/)
  → 解析 ZIP
    → 图片文件 → 上传到 Supabase Storage (quiz-images bucket)
      → 题目中 [[img:pic.png]] → 替换为 Supabase Storage URL
        → 入库
```

## 数据模型 (Supabase Schema)

```sql
-- 题库
CREATE TABLE quiz_decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  title       TEXT NOT NULL,
  description TEXT,
  is_default  BOOLEAN DEFAULT false,
  tags        TEXT[],
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 题目
CREATE TABLE quiz_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id      UUID REFERENCES quiz_decks(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('choice','multi','truefalse','fill')),
  question     TEXT NOT NULL,
  images       JSONB DEFAULT '[]',
  options      JSONB DEFAULT '{}',
  answer       TEXT NOT NULL,
  explanation  TEXT,
  exp_images   JSONB DEFAULT '[]',
  tags         TEXT[],
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 错题
CREATE TABLE quiz_wrong (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  wrong_count INTEGER DEFAULT 1,
  last_wrong  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- 收藏
CREATE TABLE quiz_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- 刷题进度（每Deck每人一条）
CREATE TABLE quiz_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  deck_id     UUID REFERENCES quiz_decks(id) ON DELETE CASCADE,
  correct     INTEGER DEFAULT 0,
  wrong       INTEGER DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, deck_id)
);

-- 刷题会话
CREATE TABLE quiz_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  deck_id     UUID REFERENCES quiz_decks(id) ON DELETE CASCADE,
  mode        TEXT NOT NULL CHECK (mode IN ('sequential','random','wrong','bookmark','exam')),
  total       INTEGER NOT NULL,
  correct     INTEGER NOT NULL,
  time_spent  INTEGER DEFAULT 0,
  finished_at TIMESTAMPTZ DEFAULT now()
);
```

## RLS 策略

```sql
-- quiz_decks: 默认题库所有人可读，自建题库仅本人
ALTER TABLE quiz_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY decks_select_default ON quiz_decks
  FOR SELECT USING (is_default = true);

CREATE POLICY decks_select_own ON quiz_decks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY decks_insert_own ON quiz_decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY decks_update_own ON quiz_decks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY decks_delete_own ON quiz_decks
  FOR DELETE USING (auth.uid() = user_id);

-- quiz_questions: 所属 Deck 可见即可读
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY questions_select_via_deck ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_decks
      WHERE quiz_decks.id = quiz_questions.deck_id
      AND (quiz_decks.is_default = true OR quiz_decks.user_id = auth.uid())
    )
  );

CREATE POLICY questions_insert_own_deck ON quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_decks
      WHERE quiz_decks.id = quiz_questions.deck_id
      AND quiz_decks.user_id = auth.uid()
    )
  );

-- quiz_wrong / quiz_bookmarks / quiz_progress / quiz_sessions: 仅本人
-- (RLS 策略类似，省略)
```

## 前端路由

| 路径                         | 页面     | 说明                 |
| ---------------------------- | -------- | -------------------- |
| `/`                          | 首页     | 题库列表 + 搜索      |
| `/login`                     | 登录     | 手机号+密码          |
| `/deck/:id`                  | 题目总览 | 虚拟滚动列表，跳题号 |
| `/quiz/:id`                  | 刷题     | 核心刷题页面         |
| `/quiz/:id?mode=random&n=20` | 随机刷题 |                      |
| `/wrong/:deckId`             | 错题本   |                      |
| `/bookmarks/:deckId`         | 收藏     |                      |
| `/import`                    | 导入题库 | 上传 + 预览          |
| `/stats`                     | 统计     | Session 历史         |

## 组件树

```
App
├── AuthProvider (Context)
│   ├── LoginPage
│   └── AppLayout (需登录)
│       ├── BottomNav (题库/统计/我的)
│       ├── DeckListPage
│       │   ├── SearchBar
│       │   └── DeckCard[]
│       ├── QuestionOverviewPage
│       │   └── VirtualQuestionList
│       │       └── QuestionRow[]
│       ├── QuizPage
│       │   ├── QuizProgress
│       │   ├── QuestionCard
│       │   │   ├── ChoiceOptions
│       │   │   ├── TrueFalseButtons
│       │   │   └── FillInput
│       │   └── QuizResult
│       ├── WrongBookPage
│       ├── BookmarkPage
│       ├── ImportPage
│       │   ├── FileUploader
│       │   ├── PreviewTable
│       │   └── ImportConfirm
│       └── StatsPage
```

## CORS 策略

前端 Vite dev server (localhost:5173) + 生产部署同一域名。资讯 API 已配置 CORS 范围（localhost:5170-5190），直接复用。Supabase SDK 无跨域问题。

## 风险与缓解

| 风险                                | 等级 | 缓解                                           |
| ----------------------------------- | ---- | ---------------------------------------------- |
| 资讯 API 宕机，刷题无法登录         | Low  | JWT 30天过期，本地缓存 token，短暂不可用影响小 |
| 前端直连 Supabase 泄露 anon key     | Low  | anon key 本就可公开，RLS 限制数据访问          |
| 大题库解析卡 UI                     | Low  | Web Worker 后台解析，不阻塞主线程              |
| PWA 离线 IndexedDB 与服务器数据冲突 | Low  | 联网后覆盖本地，服务器为准                     |
| 图片题加载慢                        | Low  | Supabase Storage CDN + 懒加载                  |
