# SPEC: 阶段分类功能

> team-capacity-planner 新增「阶段」子分类
> 版本: 1.0 | 日期: 2026-06-08

---

## 1. 背景

当前 Allocation 直接用 `requirementName` 字符串标识需求，没有独立的「需求」实体，也没有「阶段」概念。一个需求的实际工作通常分为多个阶段（设计→开发→测试→联调），需要在排期中体现。

## 2. 数据模型变更

### 2.1 新增实体

```typescript
/** 需求（独立实体） */
interface Requirement {
  id: string;           // UUID
  projectId: string;    // 所属项目
  name: string;         // 需求名称
  createdAt: Date;
}

/** 阶段 */
interface Phase {
  id: string;           // UUID
  requirementId: string; // 所属需求
  name: string;         // 阶段名称，如 '设计'、'开发'、'测试'、'联调'
  createdAt: Date;
}
```

### 2.2 Allocation 变更

```typescript
interface Allocation {
  id: string;
  personId: string;
  phaseId: string;          // 新增：引用阶段（替代 requirementName）
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
  effortPercent: number;    // 0-200
  note?: string;
  createdAt: Date;
}
```

### 2.3 Zustand Store 变更

```typescript
// 新增状态
requirements: Requirement[];
phases: Phase[];

// 新增 actions
addRequirement(projectId, name) → Requirement
deleteRequirement(id)           // 级联删除 phases + allocations
updateRequirement(id, data)

addPhase(requirementId, name) → Phase
deletePhase(id)                 // 级联删除 allocations
updatePhase(id, data)
```

### 2.4 localStorage 结构

```json
{
  "persons": [...],
  "projects": [...],
  "requirements": [...],
  "phases": [...],
  "allocations": [...]
}
```

### 2.5 数据迁移

旧数据（只有 `requirementName` 没有 `phaseId`）自动迁移：
- 为每个唯一的 `projectId + requirementName` 创建 Requirement
- 为每个 Requirement 创建一个默认 Phase（名称 = requirementName）
- 将 Allocation 的 `requirementName` 替换为对应的 `phaseId`

## 3. UI 交互设计

### 3.1 侧边栏：需求/阶段管理

在「项目」区域下方新增「需求」管理区：

```
┌─────────────────────────┐
│ 需求                     │
│ [项目▼] [需求名称    ] [+] │
│                         │
│ ▸ 项目A / 需求1          │
│   ├─ 设计               │
│   ├─ 开发               │
│   └─ 测试               │
│ ▸ 项目A / 需求2          │
│   └─ 开发               │
│ ▸ 项目B / 需求3          │
│   ├─ 设计               │
│   └─ 联调               │
└─────────────────────────┘
```

交互：
- 选择项目 → 输入需求名称 → 回车添加需求
- 点击需求展开 → 输入阶段名称 → 回车添加阶段
- 需求/阶段支持删除（级联删除下级 + 关联 allocations）
- 需求/阶段支持重命名

### 3.2 排期弹窗：选择阶段

新建排期弹窗改为：

```
┌──────────────────────────┐
│ 新建排期                  │
│                          │
│ 项目:    [选择项目    ▼]  │
│ 需求:    [选择需求    ▼]  │  ← 依赖项目选择
│ 阶段:    [选择阶段    ▼]  │  ← 依赖需求选择
│ 时长:    [1周] [2周] ...  │
│ 开始:    [YYYY-MM-DD]    │  ← 默认 = 当天所在周
│ 结束:    [YYYY-MM-DD]    │
│ 投入:    [====●====] 100% │
│                          │
│         [取消] [保存]     │
└──────────────────────────┘
```

**级联选择逻辑：**
1. 选择项目 → 需求下拉过滤为该项目的需求
2. 选择需求 → 阶段下拉过滤为该需求的阶段
3. 如果项目下无需求，提示「请先在侧边栏添加需求」

### 3.3 色块显示：需求+阶段

甘特图色块文字改为：

```
当前: [项目名 需求名 100%]
改为: [需求名/阶段名 100%]
```

即色块显示 `需求名/阶段名 投入%`，项目名通过颜色区分。

### 3.4 按项目排期视图

行标题从 `项目/需求` 改为 `项目/需求/阶段`：

```
当前:
  项目A / 需求1     ████░░░░
                    ████████

改为:
  项目A / 需求1     （需求作为分组标题行）
    设计            ████░░░░
    开发            ░░░░████
    测试            ░░░░░░██
```

即：需求作为分组标题（灰色背景），阶段作为实际数据行。

### 3.5 按人排期视图

基本不变，色块文字改为 `需求名/阶段名 投入%`。

### 3.6 空闲人力视图

不变，统计逻辑不变（见下节）。

## 4. 统计逻辑

### 4.1 核心规则

> 一个需求的多个阶段，在按需求统计时算作一个需求。

具体含义：
- **按人负荷统计**：同一需求的多个阶段的 effortPercent 独立累加（因为同一个人可能同时做同一需求的不同阶段）
- **按项目统计**：一个需求下所有阶段的总工时 = 该需求的工时
- **需求计数**：一个需求有 N 个阶段，仍算 1 个需求

### 4.2 空闲人力计算

不变：`某人某周负荷 = 该人该周所有 allocation 的 effortPercent 之和`

## 5. 默认位置

新建排期时，开始日期默认为**当天所在周的周一**（而非点击的日期列）。

实现：`dayjs().startOf('isoWeek').format('YYYY-MM-DD')`

> 注意：这个改动仅影响「新建排期」弹窗的默认值，不影响拖拽和编辑。

## 6. 边界条件

| 场景 | 处理 |
|------|------|
| 项目下无需求 | 排期弹窗提示「请先添加需求」 |
| 需求下无阶段 | 排期弹窗提示「请先添加阶段」 |
| 删除需求 | 级联删除所有阶段 + 关联 allocations |
| 删除阶段 | 级联删除关联 allocations |
| 删除项目 | 级联删除所有需求 → 阶段 → allocations |
| 旧数据迁移 | 自动创建需求+阶段，用户无感 |
| 导入旧格式 JSON | 迁移逻辑自动处理 |

## 7. 时间范围

沿用现有 78 周（26+52），不变。
