import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isoWeek);
dayjs.extend(isBetween);

/** 获取一周的起止日期 */
export function getWeekRange(date: Date): [string, string] {
  const d = dayjs(date);
  return [d.startOf('isoWeek').format('YYYY-MM-DD'), d.endOf('isoWeek').format('YYYY-MM-DD')];
}

/** 生成 N 周的日期列表 */
export function generateWeeks(startDate: Date, count: number): string[] {
  const weeks: string[] = [];
  let d = dayjs(startDate).startOf('isoWeek');
  for (let i = 0; i < count; i++) {
    weeks.push(d.format('YYYY-MM-DD'));
    d = d.add(1, 'week');
  }
  return weeks;
}

/** 生成 N 天的日期列表 */
export function generateDays(startDate: Date, count: number): string[] {
  const days: string[] = [];
  let d = dayjs(startDate).startOf('day');
  for (let i = 0; i < count; i++) {
    days.push(d.format('YYYY-MM-DD'));
    d = d.add(1, 'day');
  }
  return days;
}

/** 判断日期是否在范围内 */
export function isDateInRange(date: string, start: string, end: string): boolean {
  return dayjs(date).isBetween(dayjs(start), dayjs(end), 'day', '[]');
}

/** 格式化日期 */
export function formatDate(date: Date | string, fmt = 'YYYY-MM-DD'): string {
  return dayjs(date).format(fmt);
}

/** 获取今天所在周的周一 */
export function getThisMonday(): string {
  return dayjs().startOf('isoWeek').format('YYYY-MM-DD');
}
