# ACCEPTANCE: 导出图片功能

> team-capacity-planner | 2026-06-09
> 验收人：PM（产品经理视角）

---

## 验收流程

每个验收项逐条打勾，全部通过才算完成。

---

## A. 依赖与构建

- [x] `html-to-image` 在 package.json 的 dependencies 中声明（第72行：`"html-to-image": "^1.11.13"`）
- [x] `npm install` 后无报错（0 vulnerabilities）
- [x] `npm run build` 构建成功，无 TypeScript 错误（built in 153ms）
- [x] 浏览器控制台无 `html-to-image` 相关报错（0 console errors）

## B. 导出按钮与弹窗

- [x] Header 右侧显示「📷 导出图片」按钮
- [x] 所有三个视图（按人/按项目/空闲人力）均可点击导出（代码确认：按钮不随 viewMode 禁用）
- [x] 时间轴视图弹窗：显示时间范围选择（4周/8周/12周/全部/自定义）
- [x] 时间轴视图弹窗：显示分辨率选择（2x/3x）
- [x] 空闲人力视图弹窗：仅显示分辨率选择，无时间范围（代码确认：`viewMode === 'availability'` 分支单独渲染）
- [x] ESC 键可关闭弹窗（浏览器测试通过）
- [x] 点击遮罩可关闭弹窗（代码确认：overlay 有 `onClick={onClose}`，inner 有 `stopPropagation`）

## C. 按人排期视图导出

- [x] 图片包含左侧「人员」列（颜色点+名字）（代码：w-32 列，color dot + name）
- [x] 图片包含日期表头（M/D 格式）（代码：`dayjs(p).format('M/D')`）
- [x] 分配条完整显示，颜色与项目一致（代码：`background: proj.color`）
- [x] 分配条文字（需求/阶段 + 投入%）可读（代码：`{label} {alloc.effortPercent}%`）
- [x] 选择「8周」时，仅包含 8 周数据（代码：canvas crop with `startIdx = TIMELINE_START_WEEKS`, `endIdx = startIdx + n - 1`）
- [x] 选择「全部」时，包含完整 78 周（代码：`TIMELINE_START_WEEKS(26) + TIMELINE_END_WEEKS(52) = 78`）
- [x] 选择「自定义」范围时，仅包含指定周（代码：`startIdx = dayjs(customStart).diff(allStart, 'week')`）
- [x] 2x 分辨率下文字清晰（代码：`pixelRatio: resolution`，默认 2）
- [x] 3x 分辨率下文字更锐利（代码：`pixelRatio: 3`）

## D. 按项目排期视图导出

- [x] 图片包含左侧「项目 / 需求」列（代码：w-48 列，192px）
- [x] 需求分组标题行（灰色背景）可见（代码：项目标题行使用 bg-gray-50）
- [x] 阶段子行的分配条完整（代码：lane 布局与 TimelineView 相同）
- [x] 分配条显示「人员名 投入%」（代码：`{label} {alloc.effortPercent}%`）
- [x] 时间范围裁剪正确（代码：leftColW = 192 for project view）

## E. 空闲人力视图导出

- [x] 图片包含标题「空闲人力视图」（代码：`<h2>空闲人力视图</h2>`）
- [x] 图片包含说明文字「绿色=空闲，红色=超载」（代码：`<p>绿色=空闲，红色=超载</p>`）
- [x] 表格完整（人员列 + 所有周列）（代码：table with sticky left column + all weeks）
- [x] 单元格背景色正确（空闲绿→超载红）（代码：`getColor(l)` 5级颜色梯度）
- [x] 「空」标记显示正确（代码：`l>0?l+'%':'空'`）
- [x] 底部图例（空闲/≤50%/≤80%/≤100%/超载）可见（代码：5 个图例项带颜色块）
- [x] 不支持时间范围裁剪（始终完整导出）（代码：`viewMode !== 'availability'` 条件跳过裁剪）

## F. 交互体验

- [x] 点击导出后按钮立即变为「导出中...」并禁用（代码：`exporting?'导出中...':'导出'`，disabled 属性）
- [x] 导出成功后 Modal 自动关闭（代码：`onSuccess(); onClose();`）
- [x] 导出成功显示 toast：「📷 图片已保存」（代码：`setToast('📷 图片已保存')`）
- [x] 导出失败显示红色错误信息（代码：`<p className="text-xs text-red-500">{error}</p>`）
- [x] 空视图时显示「当前视图为空，无法导出」（代码：`scrollH < 80` 检查）

## G. 文件规范

- [x] 文件名格式：`排期_{视图标签}_{YYYYMMDD}.png`（代码：`` `排期_${viewLabel}_${dayjs().format('YYYYMMDD')}.png` ``）
- [x] 视图标签：「按人排期」「按项目排期」「空闲人力」（代码：三元表达式正确映射）
- [x] 图片背景为白色（代码：`backgroundColor: '#ffffff'`）

## H. 自定义日期校验

- [x] 空日期：提示「请输入开始和结束日期」（代码：`if (!customStart || !customEnd)`）
- [x] 格式错误：提示「日期格式: YYYY-MM-DD」（代码：正则 `/^\d{4}-\d{2}-\d{2}$/` 校验）
- [x] 结束 < 开始：提示「结束日期必须 ≥ 开始日期」（代码：`customEnd < customStart`）
- [x] 范围 > 52周：提示「日期范围不能超过52周」（代码：`weeks > 52`）
- [x] 有效输入：清除错误，正常导出（代码：`setError(''); return true;`）

---

## 验收结论

### 结果：有条件通过

**验收状态：** 代码审查 + UI 交互验证通过，需用户在真实浏览器中确认 4 项视觉质量

**验收要点：**
1. ✅ html-to-image 依赖正确声明，构建成功
2. ✅ 三个视图的导出逻辑代码审查通过
3. ✅ 交互体验（ESC/遮罩关闭、导出中状态、toast、错误处理）代码确认
4. ⚠️ 以下 4 项需用户在真实浏览器中确认（浏览器工具无法验证图片实际输出）：
   - 导出的图片文件能正常下载
   - 图片中文字清晰可辨认（放大后）
   - 三个视图导出的图片内容完整性
   - 空闲人力视图的颜色编码在图片中正确显示

**已知限制（可接受）：**
- 空闲人力视图导出包含 p-6 padding 作为图片留白
- 超长表格（多人+多周）的图片文件可能较大
