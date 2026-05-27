# 刷题工具

面向大学生的刷题 PWA，支持导入题库、多种刷题模式、错题本、收藏。可安装到手机桌面离线使用。

## 功能

- 题库导入：Excel / CSV / Word / PDF，自动识别题型和答案
- 刷题模式：顺序刷题、随机刷题、错题重刷、收藏重刷、模拟考试
- 错题本：自动记录错误次数，手动移除
- 题目收藏：标记重点题，独立刷题
- PWA：离线缓存，手机安装到桌面
- 图片题：ZIP 打包导入，题目和选项可含图片

## 技术栈

React 19 + TypeScript + Vite + Tailwind CSS + Supabase + Zustand

## 快速开始

### 前置条件

- Node >= 18
- pnpm
- Supabase 项目
- 资讯 API 后端（提供登录认证）

### 1. 配置环境变量

```bash
cd packages/web
cp .env.example .env
```

编辑 `.env`：

```
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon_key
VITE_API_URL=http://localhost:8002
```

### 2. 创建数据库

在 Supabase SQL Editor 中执行 `schema.sql`。

### 3. 安装依赖

```bash
pnpm install
```

### 4. 启动开发服务器

```bash
pnpm dev:web
```

浏览器打开 http://localhost:5173

### 5. 构建生产版本

```bash
pnpm build:web
```

产物在 `packages/web/dist/`，部署到任意静态托管（Vercel / Netlify / Cloudflare Pages）。

## 项目结构

```
├── packages/
│   ├── parser/         # 题库解析库（Excel/Word/PDF → 结构化题目）
│   └── web/            # React PWA 前端
│       └── src/
│           ├── lib/        # supabase / auth / api
│           ├── stores/     # Zustand 状态管理
│           ├── pages/      # 页面组件
│           └── components/ # 通用组件
├── schema.sql          # 数据库建表 + RLS 策略
└── seed.sql            # 示例题库数据
```

## 题库文件格式

导入的 Excel/CSV 需包含以下列（中英文列名均可）：

| 列名               | 必填 | 说明                                    |
| ------------------ | ---- | --------------------------------------- |
| 题型 / type        | 否   | choice / multi / truefalse / fill       |
| 题干 / question    | 是   | 题目文本                                |
| 选项A / option_a   | 否   | 对应 A 选项                             |
| 选项B / option_b   | 否   | 对应 B 选项                             |
| 选项C / option_c   | 否   | 对应 C 选项                             |
| 选项D / option_d   | 否   | 对应 D 选项                             |
| 答案 / answer      | 是   | 单选填 A/B/C/D，多选填 ABC，判断填对/错 |
| 解析 / explanation | 否   | 题目解析                                |
| 标签 / tag         | 否   | 逗号分隔                                |

图片题：将 Excel + images/ 文件夹打包为 ZIP，Excel 中用 `[[img:文件名.png]]` 引用图片。

## 许可证

MIT
