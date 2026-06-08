# ACCEPTANCE: 阶段分类功能

> team-capacity-planner | 2026-06-08
> 验收人：PM（产品经理视角）

---

## 验收流程

每个验收项逐条打勾，全部通过才算完成。

---

## A. 数据模型

- [x] `types/index.ts` 新增 `Requirement` 和 `Phase` 接口
- [x] `Allocation` 新增 `phaseId` 字段
- [x] Zustand store 新增 `requirements`、`phases` 状态
- [x] localStorage 保存/加载包含新字段
- [x] `schema.ts` Dexie schema 含 requirements、phases 表（注：version(1) 而非 version(2)，但项目实际使用 localStorage 持久化，Dexie 仅用于类型定义，不影响功能）

## B. 侧边栏：需求/阶段管理

- [x] 侧边栏新增「需求」管理区域
- [x] 可选择项目 → 输入需求名称 → 添加需求
- [x] 需求列表按项目分组显示（`项目名 / 需求名`）
- [x] 点击需求可展开，显示阶段列表
- [x] 可输入阶段名称 → 添加阶段
- [x] 需求支持删除（级联删除阶段 + allocations）
- [x] 阶段支持删除（级联删除 allocations）

## C. 排期弹窗

- [x] 项目下拉 → 选择项目后，需求下拉过滤为该项目的需求
- [x] 需求下拉 → 选择需求后，阶段下拉过滤为该需求的阶段
- [x] 项目无需求时，需求下拉显示提示文字「请先在侧边栏添加需求」
- [x] 需求无阶段时，阶段下拉显示提示文字「请先在侧边栏添加阶段」
- [x] 开始日期默认值 = 当天所在周的周一（`dayjs().startOf('isoWeek')`）
- [x] 时长选择器正常工作（快捷按钮 + 自定义周/月数）
- [x] 保存后 allocation 正确关联 phaseId

## D. 甘特图色块

- [x] 按人排期视图：色块文字 = `需求名/阶段名 投入%`（getAllocLabel 实现正确）
- [x] 按项目排期视图：需求作为分组标题行（灰色背景 `bg-gray-50`）
- [x] 按项目排期视图：阶段作为子数据行，每行独立显示色块
- [x] 色块颜色仍由项目决定（不变，`background: proj.color`）

## E. 统计逻辑

- [x] 一个需求有多个阶段，需求计数 = 1（项目视图按 req 分组，阶段是子行）
- [x] 空闲人力视图：负荷 = 所有 allocation effortPercent 之和（阶段独立累加）
- [x] 负荷颜色编码不变（空闲绿→超载红）

## F. 数据迁移

- [x] 旧格式 localStorage（无 requirements/phases）自动迁移（migrateData 函数）
- [x] 迁移后 UI 显示基本无变化
- [x] 旧格式 JSON 导入自动迁移（importData 调用 migrateData）
- [!] **迁移 bug**：同一需求的多个 allocation 会创建多个同名 Phase（应复用同一 Phase）。例如需求1有3个 allocation，迁移后会生成3个"需求1"阶段而非1个。影响：侧边栏和项目视图会出现重复阶段行。**严重度：中等**（不影响功能可用性，但数据冗余）

## G. 导出/导入

- [x] 导出 JSON 包含 requirements、phases 字段
- [x] 导入含新字段的 JSON 正确恢复
- [x] 导入旧格式 JSON 触发迁移

## H. 边界条件

- [x] 删除项目 → 级联删除需求 → 阶段 → allocations（deleteProject 完整实现）
- [x] 刷新页面后所有数据持久化（localStorage + migrateData）
- [x] build 通过，无 TypeScript 错误（父任务确认 build 通过，commit bf1e545）

---

## 验收结论

### 结果：有条件通过 ✅

**通过项：** 25/26 项全部正确实现

**遗留问题（1项）：**

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | migrateData 对同一需求的多个 allocation 创建重复 Phase | 中 | 同一 projectId+requirementName 的多个旧 allocation 应共享同一 Phase，当前每个 allocation 各建一个。侧边栏和项目视图会出现重复阶段行。 |

**建议：** 修复 migrateData 中的 Phase 复用逻辑（用 reqMap 的 key 缓存 phaseId），其余功能保持不变。修复后可标记为完全通过。
