# FIX_PLAN: 时间轴同步问题修复方案

> **分析方法：** 代码静态审查 + 浏览器实际渲染检查
> **源文件：** `src/App.tsx`（481行单文件，所有逻辑都在这里）
> **核心常量：** `ROW_H = 36`, `CELL_W = 80`

---

## 问题全景

用户反馈：「时间的滑杆和下面的每个人都不同步」

经过代码审查，定位到 **5 个 bug**，按严重程度排序：

| # | 问题 | 严重度 | 出现条件 |
|---|------|--------|---------|
| 1 | 滚动同步漂移 | **高** | 有多行分配数据 + 垂直滚动 |
| 2 | 行高计算重复 | **高** | 有重叠分配（多 lane） |
| 3 | 分配条定位硬编码 | **中** | 有多 lane 分配 |
| 4 | 表头对齐假设脆弱 | **中** | 浏览器缩放/字体差异 |
| 5 | 缺少反向滚动同步 | **低** | 理论上不可触发（overflow-hidden） |

---

## Bug 1: 滚动同步漂移（核心问题）

### 现象
左侧人员名单和右侧时间轴行在垂直滚动时逐渐错位。

### 根因
```tsx
// Line 154-157
const handlePersonTimelineScroll = useCallback(() => {
  const el = document.getElementById('person-timeline-scroll');
  if (el && personSidebarRef.current) personSidebarRef.current.scrollTop = el.scrollTop;
}, []);
```

- 左侧 sidebar：`overflow-hidden`（Line 164），JS 同步 scrollTop
- 右侧 timeline：`overflow-auto`（Line 183），原生滚动
- **问题：** 两侧的行高如果因渲染差异（sub-pixel rounding、border、padding）有哪怕 0.5px 的偏差，滚动多行后会累积漂移

### 修复方案
**方案 A（推荐）：消除双容器，用 CSS Grid 统一布局**

将左侧 sidebar 和右侧 timeline 合并为同一个滚动容器，用 CSS `position: sticky` 让左侧列固定：

```tsx
// 替换 TimelineView 的 JSX 结构
<div className="h-full overflow-auto" id="person-timeline-scroll">
  <div style={{ minWidth: 32 * 4 + periods.length * CELL_W }}>
    {/* Sticky header */}
    <div className="flex sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="w-32 shrink-0 px-3 py-2 text-sm font-medium text-gray-600 border-r border-gray-200" style={{ height: 41 }}>人员</div>
      {periods.map(p => <div key={p} ... />)}
    </div>
    {/* Body rows — 统一容器 */}
    {persons.map(person => {
      // ... 计算 lanes, rowH
      return (
        <div key={person.id} className="flex border-b border-gray-200">
          {/* Sticky left column */}
          <div className="w-32 shrink-0 sticky left-0 z-10 bg-white border-r border-gray-200 px-3 flex items-center gap-2" style={{ height: rowH }}>
            <span className="w-2 h-2 rounded-full" style={{ background: person.color }} />
            <span className="text-sm truncate">{person.name}</span>
          </div>
          {/* Timeline cells */}
          <div className="flex-1 relative" style={{ height: rowH, minWidth: periods.length * CELL_W }}>
            {/* ... 原有的 cells 和 allocations */}
          </div>
        </div>
      );
    })}
  </div>
</div>
```

**优势：** 单一滚动容器，行高天然一致，无漂移可能。

**方案 B（最小改动）：保持双容器，用 ResizeObserver 强制同步行高**

如果不想改布局结构，可以：
1. 给每行加 `data-person-id` 属性
2. 用 `ResizeObserver` 监听右侧行高变化
3. 动态设置左侧对应行的高度

```tsx
// 在 TimelineView 中添加
useEffect(() => {
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const personId = entry.target.getAttribute('data-person-id');
      const sidebarRow = personSidebarRef.current?.querySelector(`[data-person-id="${personId}"]`);
      if (sidebarRow) {
        sidebarRow.style.height = entry.contentRect.height + 'px';
      }
    }
  });
  
  const timelineRows = document.querySelectorAll('#person-timeline-scroll [data-person-id]');
  timelineRows.forEach(row => observer.observe(row));
  
  return () => observer.disconnect();
}, [persons, allocations]);
```

---

## Bug 2: 行高计算重复（根因之一）

### 现象
左侧 sidebar 和右侧 timeline 各自独立计算 lanes 和 rowH，可能导致不一致。

### 根因
```tsx
// 左侧 sidebar（Line 166-171）
const pa = allocations.filter((a: any) => a.personId === person.id);
const sorted = [...pa].sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));
const lanes: any[][] = [];
for (const alloc of sorted) { ... }
const rowH = Math.max(lanes.length, 1) * ROW_H;

// 右侧 timeline（Line 191-195）— 完全相同的代码！
const pa = allocations.filter((a: any) => a.personId === person.id);
const sorted = [...pa].sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));
const lanes: any[][] = [];
for (const alloc of sorted) { ... }
const rowH = Math.max(lanes.length, 1) * ROW_H;
```

虽然算法相同，但：
1. 两次独立计算可能因数据变化时机不同而不一致
2. 代码重复违反 DRY 原则

### 修复方案
提取为 `useMemo`：

```tsx
// 在 TimelineView 组件顶部
const personLanes = useMemo(() => {
  const map = new Map<string, { lanes: any[][]; rowH: number }>();
  for (const person of persons) {
    const pa = allocations.filter((a: any) => a.personId === person.id);
    const sorted = [...pa].sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));
    const lanes: any[][] = [];
    for (const alloc of sorted) {
      let placed = false;
      for (const lane of lanes) {
        if (alloc.startDate > lane[lane.length - 1].endDate) {
          lane.push(alloc);
          placed = true;
          break;
        }
      }
      if (!placed) lanes.push([alloc]);
    }
    map.set(person.id, { lanes, rowH: Math.max(lanes.length, 1) * ROW_H });
  }
  return map;
}, [persons, allocations]);

// 使用：sidebar 和 timeline 都从 personLanes 取值
const { lanes, rowH } = personLanes.get(person.id) || { lanes: [], rowH: ROW_H };
```

**同样的问题存在于 ProjectTimelineView（Line 388-401 vs 428-430），也需要同样修复。**

---

## Bug 3: 分配条定位硬编码 +6px

### 现象
分配条（allocation bar）的 `top` 用 `li * ROW_H + 6`，其中 `+6` 是硬编码偏移。

### 根因
```tsx
// Line 206
style={{ left: si * CELL_W, width: (ei - si + 1) * CELL_W, top: li * ROW_H + 6, background: proj.color }}
```

- `ROW_H = 36`，分配条 `h-6`（24px）
- `+6` 意图是 `(36 - 24) / 2 = 6`，居中对齐
- **问题：** 当行高 > 36px（多 lane 时），`+6` 不再是居中值

### 修复方案
```tsx
// 用 CSS 居中替代硬编码
style={{
  left: si * CELL_W,
  width: (ei - si + 1) * CELL_W,
  top: li * ROW_H + (ROW_H - 24) / 2,  // 动态计算
  background: proj.color
}}
```

或者更好的方案：用 flex 布局让分配条自动居中（见 Bug 1 方案 A 的统一布局）。

---

## Bug 4: 表头对齐假设脆弱

### 现象
左侧 sidebar header `style={{height:41}}`（Line 163），右侧 sticky header 用 `py-2`（Line 187）。

### 根因
```tsx
// 左侧 header（Line 163）
<div className="px-3 py-2 text-sm font-medium text-gray-600 border-b border-gray-200" style={{height:41}}>人员</div>

// 右侧 header（Line 186-188）
<div className="flex bg-white sticky top-0 z-10 border-b border-gray-200">
  {periods.map(p => <div key={p} className="text-center px-1 py-2 text-xs" style={{minWidth:CELL_W}}>{...}</div>)}
</div>
```

- 左侧：`py-2`（8px*2）+ `text-sm`（20px line-height）+ `border-b`（1px）= 37px，但 `height:41` 强制为 41px
- 右侧：`py-2`（8px*2）+ `text-xs`（16px line-height）+ `border-b`（1px）= 33px
- **差异：8px！** 这是最大的可见错位来源

### 修复方案
统一用 `height` 常量：

```tsx
const HEADER_H = 40; // 统一表头高度

// 左侧 header
<div className="px-3 flex items-center text-sm font-medium text-gray-600 border-b border-gray-200" style={{height: HEADER_H}}>人员</div>

// 右侧 header — 每个日期格也用 flex items-center
<div className="flex bg-white sticky top-0 z-10 border-b border-gray-200" style={{height: HEADER_H}}>
  {periods.map(p => <div key={p} className="flex items-center justify-center px-1 text-xs" style={{minWidth:CELL_W, height: HEADER_H}}>{...}</div>)}
</div>
```

**同理修复 ProjectTimelineView 的 header（Line 385, 420-421）。**

---

## Bug 5: 缺少反向滚动同步

### 现象
如果用户直接滚动左侧 sidebar（虽然 `overflow-hidden` 理论上阻止了），不会同步到右侧。

### 根因
只有 `handlePersonTimelineScroll`（Line 154-157），没有反向监听。

### 修复方案
在方案 A（统一容器）下自动解决。如果保持双容器，需要加反向监听：

```tsx
const handleSidebarScroll = useCallback(() => {
  const el = document.getElementById('person-timeline-scroll');
  if (el && personSidebarRef.current) el.scrollTop = personSidebarRef.current.scrollTop;
}, []);

// 左侧 div 加 onScroll
<div className="flex-1 overflow-hidden" ref={personSidebarRef} onScroll={handleSidebarScroll}>
```

---

## 同类问题：ProjectTimelineView

`ProjectTimelineView`（Line 366-451）有**完全相同的 5 个 bug**：
- Line 376-379：同样的 scrollTop 同步
- Line 386：同样的 `overflow-hidden`
- Line 388-401 vs 428-430：同样的 lanes 计算重复
- Line 385 vs 420-421：同样的 header 高度不一致
- Line 441：同样的 `top: li * ROW_H + 6` 硬编码

**修复时需同步处理。**

---

## 实施优先级

### P0（必须修复 — 直接导致「不同步」）
1. **统一 header 高度**（Bug 4）— 8px 的 header 差异是最直接的错位原因
2. **提取 lanes/rowH 为 useMemo**（Bug 2）— 消除重复计算的不一致风险

### P1（应该修复 — 滚动时漂移）
3. **统一滚动容器**（Bug 1 方案 A）— 根治滚动同步问题

### P2（建议修复 — 完善度）
4. **分配条居中**（Bug 3）— 影响视觉但不影响功能
5. **反向滚动同步**（Bug 5）— overflow-hidden 下不会触发

---

## 预估工作量

| 方案 | 改动范围 | 预估时间 |
|------|---------|---------|
| 最小修复（P0 only） | ~20行改动 | 30分钟 |
| 推荐方案（P0+P1） | ~80行重构 | 1.5小时 |
| 完整修复（P0+P1+P2） | ~120行重构 | 2小时 |

**推荐采用「推荐方案」：** P0+P1 能根治核心问题，P2 可以后续迭代。

---

## Electron 打包注意事项

- `position: sticky` 在 Electron（Chromium 内核）中完全支持，无兼容问题
- `ResizeObserver` 在 Electron 中完全支持
- CSS Grid 在 Electron 中完全支持
- 建议修复后用 `npm run electron:dev` 验证一次
