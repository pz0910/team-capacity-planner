// 团队人力排期管理工具 - 类型定义

/** 人员 */
export interface Person {
  id: string;
  name: string;
  color: string;      // 显示颜色，如 '#4F46E5'
  role: string;        // 角色，如 '前端'、'后端'、'PM'
  createdAt: Date;
}

/** 项目 */
export interface Project {
  id: string;
  name: string;
  color: string;
  description: string;
  startDate: Date;
  endDate?: Date;      // 可选，未结束的项目为空
  createdAt: Date;
}

/** 需求/任务 */
export interface Requirement {
  id: string;
  projectId: string;   // 所属项目
  name: string;
  effortDays: number;  // 预估工时（人天）
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'done';
  createdAt: Date;
}

/** 排期分配 */
export interface Allocation {
  id: string;
  personId: string;
  requirementId: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  effortPercent: number; // 0-100，投入百分比
  note?: string;
  createdAt: Date;
}

/** 视图模式 */
export type ViewMode = 'person' | 'project' | 'project_overview' | 'availability';

/** 时间粒度 */
export type TimeGranularity = 'day' | 'week';
