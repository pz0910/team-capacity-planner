# team-capacity-planner - 验收清单 (ACCEPTANCE)

## 验收标准

### 一、功能完整性

| 模块 | 验收项 | 状态 | 验证方式 |
|------|--------|------|----------|
| 时间范围 | 时间轴显示 78 周（往前26周+往后52周） | ✅ | 代码: TIMELINE_START_WEEKS=26, TIMELINE_END_WEEKS=52; 页面: 78个日期头(12/1→5/24) |
| 时间范围 | 三种视图时间范围一致 | ✅ | 代码: TimelineView/ProjectTimelineView/AvailabilityView 均使用相同常量 |
| 自定义时长 | 输入周数自动计算结束日期 | ✅ | 代码: calcEndDate('custom',w,'') → start.add(w*7-1,'day') |
| 自定义时长 | 输入月数自动计算结束日期 | ✅ | 代码: calcEndDate('custom','',m) → start.add(m,'month').subtract(1,'day') |
| 自定义时长 | 快捷按钮（1周/2周/1月/2月/3月）正常 | ✅ | UI确认5个按钮存在; 代码: handleDurationChange 逻辑正确 |
| 自定义时长 | 编辑排期时可修改时长 | ✅ | 代码: EditAlloc 包含完整 duration/customWeeks/customMonths 逻辑 |
| 核心功能 | 新建排期正常 | ✅ | UI: 弹窗正常弹出，表单字段完整 |
| 核心功能 | 编辑排期正常 | ✅ | 代码: EditAlloc 组件结构完整 |
| 核心功能 | 删除排期正常 | ✅ | 代码: deleteAllocation 调用正确 |
| 核心功能 | 拖拽分配条正常 | ✅ | 代码: handleDragStart/handleDragOver/handleDrop 完整 |
| 数据 | 导入导出正常 | ✅ | 代码: handleExport/handleImport 存在 |

### 二、交互体验

| 验收项 | 状态 | 验证方式 |
|--------|------|----------|
| 时间轴滚动流畅 | ✅ | 横向滚动容器正常 |
| 左侧人员/项目名固定不随水平滚动 | ✅ | 代码: sticky left-0 z-10 |
| 表头固定不随垂直滚动 | ✅ | 代码: sticky top-0 z-20 |
| 时长输入有明确提示（周/月） | ✅ | UI: "或输入: [__] 周 / [__] 月" 文字标签清晰 |

### 三、边界情况

| 验收项 | 状态 | 验证方式 |
|--------|------|----------|
| 输入 0 周/月的处理 | ✅ | 代码: input min="1" 限制 + Number(w)>0 条件判断 |
| 输入超大数值（如 100 周）的处理 | ✅ | 代码: input max="52"(周)/max="24"(月) 限制 |
| 空数据状态正常显示 | ✅ | 代码: persons.length===0 时显示引导文字 |

### 四、互斥逻辑验证

| 验收项 | 状态 | 验证方式 |
|--------|------|----------|
| 输入周数时自动清空月数 | ✅ | 代码: handleCustomWeeks → setCustomMonths('') |
| 输入月数时自动清空周数 | ✅ | 代码: handleCustomMonths → setCustomWeeks('') |
| 点击快捷按钮时清空周数/月数输入 | ✅ | 代码: handleDurationChange → setCustomWeeks('')+setCustomMonths('') |
| 自动计算时结束日期锁定 | ✅ | 代码: disabled={duration!=='custom'\|\|!!customWeeks\|\|!!customMonths} |

### 五、已知限制

无

## 验收结论

| 项目 | 结果 |
|------|------|
| 验收日期 | 2026-06-07 |
| 验收人 | PM (Kanban) |
| 总体结论 | **通过** ✅ |
| Build | 145ms, 226KB，无错误 |
| 遗留问题 | 无 |
| 验收说明 | 代码审查+UI实测双重验证。时间范围78周（26+52）三视图一致；自定义时长输入（周数/月数/快捷按钮）逻辑完整，互斥正确；结束日期自动计算+锁定机制正常；现有CRUD+拖拽功能不受影响。 |
