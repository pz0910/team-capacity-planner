import { useState, useMemo, useCallback } from 'react';
import useStore from '../../stores/useStore';
import { generateWeeks, formatDate, getThisMonday } from '../../utils/date';
import dayjs from 'dayjs';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import AllocationModal from '../timeline/AllocationModal';

const WEEK_COUNT = 26;
const CELL_W = 80;
const ROW_H = 36;

export default function ProjectTimelineView() {
  const projects = useStore((state) => state.projects);
  const requirements = useStore((state) => state.requirements);
  const allocations = useStore((state) => state.allocations);
  const persons = useStore((state) => state.persons);
  const updateAllocation = useStore((state) => state.updateAllocation);

  const [editingAllocation, setEditingAllocation] = useState<string | null>(null);
  const [creatingFor, setCreatingFor] = useState<{ requirementId: string; date: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const startDate = useMemo(() => dayjs(getThisMonday()).subtract(4, 'week').toDate(), []);
  const periods = useMemo(() => generateWeeks(startDate, WEEK_COUNT), [startDate]);
  const today = formatDate(new Date());

  const projectGroups = useMemo(() => {
    return projects.map((proj) => ({
      project: proj,
      requirements: requirements.filter((r) => r.projectId === proj.id),
    }));
  }, [projects, requirements]);

  const getReqLanes = useCallback(
    (reqId: string) => {
      const reqAllocs = allocations.filter((a) => a.requirementId === reqId);
      const sorted = [...reqAllocs].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const lanes: typeof sorted[] = [];
      for (const alloc of sorted) {
        let placed = false;
        for (const lane of lanes) {
          const lastInLane = lane[lane.length - 1];
          if (alloc.startDate > lastInLane.endDate) {
            lane.push(alloc);
            placed = true;
            break;
          }
        }
        if (!placed) lanes.push([alloc]);
      }
      return lanes;
    },
    [allocations]
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const allocId = active.id as string;
    const overId = over.id as string;
    if (overId.startsWith('cell_')) {
      const [, , newDate] = overId.split('_');
      const alloc = allocations.find((a) => a.id === allocId);
      if (!alloc) return;
      const duration = dayjs(alloc.endDate).diff(dayjs(alloc.startDate), 'day');
      const newEnd = dayjs(newDate).add(duration, 'day').format('YYYY-MM-DD');
      updateAllocation(allocId, { startDate: newDate, endDate: newEnd });
    }
  };

  const renderAllocBlock = (alloc: (typeof allocations)[0], topOffset: number, projColor: string) => {
    const person = persons.find((p) => p.id === alloc.personId);
    if (!person) return null;

    const startIdx = periods.indexOf(alloc.startDate);
    if (startIdx < 0) return null;
    const endIdx = periods.lastIndexOf(alloc.endDate);
    if (endIdx < 0) return null;

    const left = startIdx * CELL_W;
    const width = (endIdx - startIdx + 1) * CELL_W;

    return (
      <DraggableBlock key={alloc.id} id={alloc.id}>
        <div
          className="allocation-block"
          style={{ left: `${left}px`, width: `${width}px`, top: `${topOffset + 6}px`, background: projColor }}
          title={`${person.name} (${alloc.effortPercent}%)`}
          onClick={(e) => { e.stopPropagation(); setEditingAllocation(alloc.id); }}
        >
          <span className="truncate">{person.name} {alloc.effortPercent}%</span>
        </div>
      </DraggableBlock>
    );
  };

  const activeAlloc = activeId ? allocations.find((a) => a.id === activeId) : null;
  const activePerson = activeAlloc ? persons.find((p) => p.id === activeAlloc.personId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col">
        <div className="flex shrink-0 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="w-48 shrink-0 border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-600">
            项目 / 需求
          </div>
          <div className="flex overflow-x-auto">
            {periods.map((p) => (
              <div
                key={p}
                className={`timeline-cell text-center px-1 py-2 text-xs ${p === today ? 'today font-semibold text-indigo-600' : ''}`}
                style={{ minWidth: CELL_W }}
              >
                {dayjs(p).format('M/D')}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {projectGroups.map(({ project, requirements: reqs }) => {
            if (reqs.length === 0) {
              return (
                <div key={project.id} className="flex border-b border-gray-200">
                  <div className="w-48 shrink-0 border-r border-gray-200 px-3 py-2 flex items-center gap-2 bg-gray-50">
                    <span className="w-3 h-3 rounded-sm" style={{ background: project.color }} />
                    <span className="text-sm font-medium">{project.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">无需求</span>
                  </div>
                  <div className="flex" style={{ height: ROW_H, minWidth: periods.length * CELL_W }} />
                </div>
              );
            }

            return reqs.map((req) => {
              const lanes = getReqLanes(req.id);
              const totalLanes = Math.max(lanes.length, 1);
              const rowHeight = totalLanes * ROW_H;

              return (
                <div key={req.id} className="flex border-b border-gray-200">
                  <div
                    className="w-48 shrink-0 border-r border-gray-200 px-3 flex items-center gap-2"
                    style={{ height: rowHeight }}
                  >
                    <span className="w-2 h-2 rounded-sm" style={{ background: project.color }} />
                    <div className="truncate">
                      <div className="text-xs text-gray-400">{project.name}</div>
                      <div className="text-sm">{req.name}</div>
                    </div>
                  </div>

                  <div className="flex overflow-x-auto relative" style={{ height: rowHeight }}>
                    {periods.map((period) => (
                      <DroppableCell
                        key={period}
                        id={`cell_${req.id}_${period}`}
                        today={today}
                        period={period}
                        cellW={CELL_W}
                        rowH={rowHeight}
                        onClick={() => setCreatingFor({ requirementId: req.id, date: period })}
                      />
                    ))}

                    {lanes.map((lane, laneIdx) =>
                      lane.map((alloc) => renderAllocBlock(alloc, laneIdx * ROW_H, project.color))
                    )}
                  </div>
                </div>
              );
            });
          })}

          {projects.length === 0 && (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              暂无项目，请先添加项目和需求
            </div>
          )}
        </div>

        <DragOverlay>
          {activeAlloc && activePerson ? (
            <div className="allocation-block" style={{ background: '#4F46E5', width: '120px', opacity: 0.8 }}>
              {activePerson.name} {activeAlloc.effortPercent}%
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {editingAllocation && (
        <AllocationModal
          allocationId={editingAllocation}
          creatingFor={null}
          onClose={() => setEditingAllocation(null)}
        />
      )}
    </DndContext>
  );
}

function DraggableBlock({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{ position: 'absolute' }}>
      {children}
    </div>
  );
}

function DroppableCell({
  id,
  today,
  period,
  cellW,
  rowH,
  onClick,
}: {
  id: string;
  today: string;
  period: string;
  cellW: number;
  rowH: number;
  onClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`timeline-cell drop-zone ${period === today ? 'today' : ''}`}
      style={{ background: isOver ? '#DBEAFE' : '', minWidth: cellW, height: rowH }}
      onClick={onClick}
    />
  );
}
