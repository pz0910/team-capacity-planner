# 人力排期管理工具 (Team Capacity Planner)

本地 Web 应用，用于团队管理者可视化管理组内人员的项目分配和工作负载。

## 核心功能

- **人员/项目管理** — 增删改查，自动分配颜色
- **排期分配** — 创建、查看、编辑、删除排期
- **时长选择器** — 按周/月自动计算结束时间（1周/2周/1个月/2个月/3个月）
- **拖拽调整** — 拖拽色块移动到其他周
- **三个视图** — 按人排期、按项目排期、空闲人力热力图
- **数据持久化** — localStorage 自动保存，刷新不丢失
- **导出/导入 JSON** — 数据备份恢复

## 技术栈

- React 19 + TypeScript
- Vite 构建工具
- Zustand 状态管理
- Tailwind CSS（CDN）
- dayjs 日期处理
- 原生 HTML 拖拽 API

## 快速开始

**Windows（双击运行）：**
```
start.bat
```

**命令行：**
```bash
# 安装依赖
npm install

# 一键启动（自动清缓存）
./start.sh    # Linux/Mac
start.bat     # Windows

# 或手动启动
npx vite --host

# 访问 http://localhost:5173
```

## 使用说明

1. 在左侧侧边栏添加人员和项目
2. 点击时间轴上的单元格创建排期
3. 选择时长（如"2周"）自动计算结束日期
4. 拖拽色块调整排期时间
5. 点击色块查看详情、编辑或删除
6. 切换三个视图查看不同维度的数据
7. 使用"导出 JSON"备份数据

## 项目结构

```
team-capacity-planner/
├── src/
│   ├── App.tsx          # 主组件（单文件架构）
│   ├── main.tsx         # 入口文件
│   └── index.css        # 样式
├── index.html           # HTML 模板
├── vite.config.ts       # Vite 配置
├── package.json         # 依赖配置
├── SPEC.md              # 产品规格说明
├── TEST_CASES.md        # 测试用例
├── ACCEPTANCE.md        # 验收清单
└── TEST_REPORT.md       # 测试报告
```

## 文档

- [产品规格说明 (SPEC.md)](./SPEC.md)
- [测试用例 (TEST_CASES.md)](./TEST_CASES.md)
- [验收清单 (ACCEPTANCE.md)](./ACCEPTANCE.md)
- [测试报告 (TEST_REPORT.md)](./TEST_REPORT.md)

## 已知限制

- Tailwind CSS 使用 CDN（生产环境建议改为本地构建）
- 导入 JSON 功能未充分测试（低优先级）
- 单文件架构（适合 20 人以内的团队）

## 许可证

MIT
