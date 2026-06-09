# SPEC: 导出图片功能

> team-capacity-planner | 版本: 2.0 | 日期: 2026-06-09
> 基于现有实现的修订版，修复已知问题并明确规格

---

## 1. 功能概述

将当前视图的甘特图/表格内容导出为 PNG 图片，支持三种视图：
- **按人排期** (`person`)
- **按项目排期** (`project`)
- **空闲人力** (`availability`)

## 2. 技术方案

### 2.1 核心依赖

```json
{
  "html-to-image": "^1.11.0"
}
```

**必须在 `package.json` 的 `dependencies` 中声明**，不能仅靠 import。

### 2.2 导出流程

```
用户点击「导出图片」
    │
    ▼
弹出 ExportModal
    │
    ├── 空闲人力视图：仅显示分辨率选择
    └── 时间轴视图：显示时间范围 + 分辨率选择
    │
    ▼
用户确认导出
    │
    ▼
定位目标容器 DOM
    │
    ├── person  → #person-timeline-scroll
    ├── project → #proj-timeline-scroll
    └── avail   → #avail-scroll
    │
    ▼
toPng() 捕获完整内容（overflow: visible）
    │
    ▼
[仅时间轴视图 + 非全部范围] Canvas 裁剪
    │
    ▼
触发下载 → 文件名格式: 排期_{视图标签}_{日期}.png
```

### 2.3 时间范围

| 范围 | 说明 | 时间轴视图 | 空闲人力视图 |
|------|------|-----------|-------------|
| 4周 | 最近4周 | ✅ 裁剪 | ❌ 隐藏选项 |
| 8周 | 最近8周 | ✅ 裁剪 | ❌ 隐藏选项 |
| 12周 | 最近12周 | ✅ 裁剪 | ❌ 隐藏选项 |
| 全部 | 所有可见周 | ✅ 不裁剪 | ✅ 默认 |
| 自定义 | 用户指定日期范围 | ✅ 裁剪 | ❌ 隐藏选项 |

> **空闲人力视图**不支持时间范围选择，始终导出完整表格。

### 2.4 分辨率

| 选项 | pixelRatio | 用途 |
|------|-----------|------|
| 2x 高清 | 2 | 屏幕分享、文档 |
| 3x 超高清 | 3 | 打印、大屏展示 |

默认选中 2x。

### 2.5 裁剪逻辑（时间轴视图）

```typescript
// 左侧列宽
const leftColW = viewMode === 'person' ? 128 : 192;

// 计算裁剪区域
const startIdx = ...; // 起始周索引
const endIdx = ...;   // 结束周索引
const cropW = (leftColW + (endIdx - startIdx + 1) * CELL_W) * resolution;
const cropH = fullHeight * resolution;
const offsetX = (leftColW + startIdx * CELL_W) * resolution;

// Canvas 裁剪：保留左侧列 + 指定周范围
ctx.drawImage(img, -offsetX, 0);
```

**关键常量：**
- `CELL_W = 80`（每列宽度）
- `TIMELINE_START_WEEKS = 26`（历史周数）
- `TIMELINE_END_WEEKS = 52`（未来周数）

## 3. 三个视图的 DOM 结构

### 3.1 按人排期视图

```
#person-timeline-scroll (overflow: auto)
  └── div (minWidth: 128 + periods.length * 80)
       ├── Header row (sticky top-0, height: 40px)
       │    ├── w-32 (128px) "人员"
       │    └── periods[] × CELL_W
       └── Body rows[]
            ├── Row: flex
            │    ├── w-32 (128px) person name + color dot
            │    └── div (relative, height: rowH)
            │         ├── Week cells (absolute positioned)
            │         └── Allocation bars (absolute positioned)
            └── ...
```

**导出要点：**
- 容器有 `overflow: auto`，导出时需临时改为 `overflow: visible`
- 左侧列宽 128px，sticky 固定
- `rowH` 由 lane 数量决定，每 lane 36px

### 3.2 按项目排期视图

```
#proj-timeline-scroll (overflow: auto)
  └── div (minWidth: 192 + periods.length * 80)
       ├── Header row (sticky top-0, height: 40px)
       │    ├── w-48 (192px) "项目 / 需求"
       │    └── periods[] × CELL_W
       └── Body rows[]
            ├── Row: flex
            │    ├── w-48 (192px) project/requirement name
            │    └── div (relative, height: rowH)
            │         ├── Week cells
            │         └── Allocation bars (person name + effort%)
            └── ...
```

**导出要点：**
- 左侧列宽 192px
- 需求作为分组标题行（灰色背景）
- 阶段作为子数据行

### 3.3 空闲人力视图

```
#avail-scroll (overflow: auto, p-6 padding)
  ├── h2 "空闲人力视图"
  ├── p "绿色=空闲，红色=超载"
  └── table (overflow-x: auto wrapper)
       ├── thead
       │    └── tr
       │         ├── th "人员" (sticky left-0, w-24)
       │         └── th[] × weeks
       └── tbody
            └── tr[] × persons
                 ├── td person name (sticky left-0)
                 └── td[] × weeks (带背景色)
```

**导出要点：**
- 使用 `<table>` 结构，非 flex 布局
- 容器有 `p-6` padding
- 无时间范围裁剪（始终完整导出）
- 底部有图例说明

## 4. 已知问题与修复

### 4.1 html-to-image 未声明为依赖

**现状：** 代码 `import { toPng } from 'html-to-image'` 但 package.json 无此依赖。
**修复：** `npm install html-to-image` 并确认写入 package.json。

### 4.2 空闲人力视图 padding 影响

**现状：** `#avail-scroll` 有 `p-6`（24px padding），导出图片包含空白边距。
**方案：** 保持现状（padding 作为图片留白，视觉效果可接受）。

### 4.3 自定义日期范围校验

**校验规则：**
- 开始/结束日期必须为 YYYY-MM-DD 格式
- 结束 ≥ 开始
- 范围 ≤ 52 周
- 不允许空值

### 4.4 空视图处理

**规则：** 容器 scrollHeight < 80px 时，显示「当前视图为空，无法导出」。

## 5. 文件名规范

```
排期_按人排期_20260609.png
排期_按项目排期_20260609.png
排期_空闲人力_20260609.png
```

## 6. 交互细节

### 6.1 导出按钮位置

- Header 组件右侧：「📷 导出图片」
- 所有视图通用

### 6.2 Modal 行为

- ESC 关闭
- 点击遮罩关闭
- 导出中显示「导出中...」并禁用按钮
- 导出成功触发 toast: 「📷 图片已保存」
- 导出失败显示红色错误信息

### 6.3 依赖注入方式

```typescript
// App.tsx 顶部
import { toPng } from 'html-to-image';

// ExportModal 组件内使用
const dataUrl = await toPng(container, {
  pixelRatio: resolution,
  backgroundColor: '#ffffff',
  cacheBust: true,
  style: { overflow: 'visible', width: fullW + 'px', height: fullH + 'px' },
});
```
