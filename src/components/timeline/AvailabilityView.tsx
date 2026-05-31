import { useMemo } from 'react';
import useStore from '../../stores/useStore';
import { generateWeeks, getThisMonday } from '../../utils/date';
import dayjs from 'dayjs';

const WEEK_COUNT = 12;

export default function AvailabilityView() {
  const persons = useStore((state) => state.persons);
  const allocations = useStore((state) => state.allocations);

  const weeks = useMemo(() => {
    return generateWeeks(dayjs(getThisMonday()).subtract(2, 'week').toDate(), WEEK_COUNT);
  }, []);

  const getPersonLoad = (personId: string, weekStart: string) => {
    const weekEnd = dayjs(weekStart).endOf('isoWeek').format('YYYY-MM-DD');
    return allocations
      .filter(
        (a) =>
          a.personId === personId &&
          a.startDate <= weekEnd &&
          a.endDate >= weekStart
      )
      .reduce((sum, a) => sum + a.effortPercent, 0);
  };

  const getLoadColor = (load: number) => {
    if (load === 0) return '#ECFDF5';
    if (load <= 50) return '#DBEAFE';
    if (load <= 80) return '#FEF3C7';
    if (load <= 100) return '#FED7AA';
    return '#FEE2E2';
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-2">空闲人力视图</h2>
      <p className="text-sm text-gray-500 mb-4">绿色=空闲，红色=超载（超过100%）</p>

      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-600 px-3 py-2 border-b border-gray-200 w-24">
                人员
              </th>
              {weeks.map((w) => (
                <th
                  key={w}
                  className="text-center text-xs text-gray-500 px-2 py-2 border-b border-gray-200"
                  style={{ minWidth: '64px' }}
                >
                  {dayjs(w).format('M/D')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {persons.map((person) => (
              <tr key={person.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: person.color }} />
                    <span className="text-sm">{person.name}</span>
                  </div>
                </td>
                {weeks.map((w) => {
                  const load = getPersonLoad(person.id, w);
                  return (
                    <td
                      key={w}
                      className="text-center text-xs px-2 py-2 border-b border-gray-200 font-medium"
                      style={{ background: getLoadColor(load) }}
                    >
                      {load > 0 ? `${load}%` : '空'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#ECFDF5' }} /> 空闲
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#DBEAFE' }} /> ≤50%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#FEF3C7' }} /> ≤80%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#FED7AA' }} /> ≤100%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#FEE2E2' }} /> 超载
        </span>
      </div>
    </div>
  );
}
