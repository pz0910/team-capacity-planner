# 团队人力排期管理工具 - 项目上下文

## 当前状态
- ✅ 项目骨架已搭建（Vite + React + TypeScript）
- ✅ 核心功能已实现（人员/项目管理、排期分配、三个视图）
- ✅ Bug 已修复（日期匹配逻辑）
- ✅ SDD 文档已建立（SPEC.md、TEST_CASES.md、ACCEPTANCE.md）
- ⚠️ 数据存内存，刷新丢失
- 开发服务器运行中：http://localhost:5173

## 需求总结

| 维度 | 内容 |
|------|------|
| 核心问题 | 谁有空？项目吃了多少人力？每个人在干什么？ |
| 实体关系 | 人 → 多项目 → 多需求；需求 ← 多人 |
| 投入单位 | 人天 + 百分比，精确到天/周 |
| 时间跨度 | 过去 + 未来，至少半年 |
| 团队规模 | 当前6人，未来20+ |
| 核心交互 | 拖拽调整排期 |
| 数据存储 | 本地，不需要数据库 |

## 技术选型
- 前端：React 18 + TypeScript
- 构建：Vite
- 状态管理：Zustand
- 样式：Tailwind CSS（CDN）
- 日期：dayjs
- 拖拽：@dnd-kit（已安装，待集成）

## 已完成功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 人员管理 | ✅ | 添加/删除，自动分配颜色 |
| 项目管理 | ✅ | 添加/删除，自动分配颜色 |
| 按人排期 | ✅ | 泳道多行，点击创建，色块显示 |
| 按项目排期 | ✅ | 按项目→需求分组 |
| 空闲人力 | ✅ | 热力图，颜色编码 |
| 投入比例 | ✅ | 10%-200%，允许超载 |
| 弹窗编辑 | ✅ | 新建/查看/删除 |

## Bug 修复记录

### 2026-05-31: 分配色块不显示
**问题**：创建分配后，时间轴上色块有时不显示
**原因**：`periods` 数组存的是周一日期，但用户点击的日期可能不是周一，`indexOf` 找不到精确匹配
**修复**：用 `dayjs(date).startOf('isoWeek')` 找到包含该日期的周一

## SDD 文档

| 文档 | 说明 |
|------|------|
| SPEC.md | 产品规格说明（功能、交互、技术） |
| TEST_CASES.md | 测试用例（20个用例，覆盖所有功能） |
| ACCEPTANCE.md | 产品验收清单 |

## 项目文件结构

```
team-capacity-planner/
├── src/
│   ├── App.tsx          ← 主应用（单文件，含所有组件）
│   ├── main.tsx         ← 入口
│   ├── index.css        ← 样式
│   ├── types/           ← TypeScript 类型（未使用）
│   ├── db/              ← IndexedDB schema（未使用）
│   ├── stores/          ← Zustand store（未使用）
│   └── components/      ← 组件（未使用）
├── SPEC.md              ← 产品规格
├── TEST_CASES.md        ← 测试用例
├── ACCEPTANCE.md        ← 验收清单
├── PROJECT_CONTEXT.md   ← 本文件
└── package.json
```

## TODO（优先级排序）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P1 | IndexedDB 持久化 | 数据刷新不丢失 |
| P1 | 编辑已有排期 | 目前只能新建/删除 |
| P2 | 拖拽调整 | 用 @dnd-kit 实现 |
| P2 | 导出功能 | JSON 导出/导入 |
| P3 | 需求详情管理 | 独立的需求管理界面 |

## 启动命令

```bash
cd C:\Users\panze\AI_Agents\01_进行中\team-capacity-planner
npm run dev
```

## 访问地址

http://localhost:5173
