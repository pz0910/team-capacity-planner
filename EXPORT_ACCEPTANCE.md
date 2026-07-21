# 导出图片功能验收报告

## 验收日期
2026-06-10

## 验收结论：❌ 不通过

## 测试结果

| 视图 | 导出 | 图片内容 | 文字 | 色块 | 时间轴 | 结论 |
|------|------|---------|------|------|--------|------|
| 按人排期 | ✅ | ❌ 全黑 | ❌ | ❌ | ❌ | 不通过 |
| 按项目排期 | ✅ | ❌ 全黑 | ❌ | ❌ | ❌ | 不通过 |
| 空闲人力 | ⚠️ | 弹窗未弹出 | - | - | - | 未完成 |

## 核心问题

**`html-to-image` 库的 `toPng()` 导出全黑图片**

导出代码 (App.tsx:327-332):
```typescript
const dataUrl = await toPng(container, {
  pixelRatio: resolution,
  backgroundColor: '#ffffff',
  cacheBust: true,
  style: { overflow: 'visible', width: fullW + 'px', height: fullH + 'px' },
});
```

可能原因：
1. `position: absolute` 元素在 DOM 克隆时丢失计算样式
2. `overflow: visible` 覆盖不生效
3. Canvas 渲染失败返回黑色

## 修复建议

优先尝试：添加 `html-to-image` 配置选项（skipFonts, filter, transform）
备选方案：替换为 `dom-to-image-more` 库

---
*PM 验收，2026-06-10*
