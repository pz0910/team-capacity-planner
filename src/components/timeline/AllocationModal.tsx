import { useState } from 'react';
import useStore from '../../stores/useStore';
import { formatDate } from '../../utils/date';

interface Props {
  allocationId: string | null;
  creatingFor: { personId: string; date: string } | null;
  onClose: () => void;
}

export default function AllocationModal({ allocationId, creatingFor, onClose }: Props) {
  const persons = useStore((state) => state.persons);
  const projects = useStore((state) => state.projects);
  const requirements = useStore((state) => state.requirements);
  const allocations = useStore((state) => state.allocations);
  const addAllocation = useStore((state) => state.addAllocation);
  const updateAllocation = useStore((state) => state.updateAllocation);
  const deleteAllocation = useStore((state) => state.deleteAllocation);
  const addRequirement = useStore((state) => state.addRequirement);

  const existing = allocationId ? allocations.find((a) => a.id === allocationId) : null;

  const [personId, setPersonId] = useState(existing?.personId || creatingFor?.personId || '');
  const [requirementId, setRequirementId] = useState(existing?.requirementId || '');
  const [startDate, setStartDate] = useState(existing?.startDate || creatingFor?.date || '');
  const [endDate, setEndDate] = useState(existing?.endDate || creatingFor?.date || '');
  const [effortPercent, setEffortPercent] = useState(existing?.effortPercent || 100);
  const [note, setNote] = useState(existing?.note || '');

  const [newReqName, setNewReqName] = useState('');
  const [newReqProjectId, setNewReqProjectId] = useState('');

  const selectedReq = requirements.find((r) => r.id === requirementId);
  const filteredReqs = newReqProjectId
    ? requirements.filter((r) => r.projectId === newReqProjectId)
    : requirements;

  const handleSave = async () => {
    if (!personId || !startDate || !endDate) return;

    let reqId = requirementId;

    if (newReqName.trim() && newReqProjectId) {
      await addRequirement({
        projectId: newReqProjectId,
        name: newReqName.trim(),
        effortDays: 0,
        priority: 'medium',
        status: 'in_progress',
      });
      const latest = useStore.getState().requirements;
      reqId = latest[latest.length - 1]?.id || '';
    }

    if (!reqId) return;

    if (existing) {
      await updateAllocation(existing.id, { personId, requirementId: reqId, startDate, endDate, effortPercent, note });
    } else {
      await addAllocation({ personId, requirementId: reqId, startDate, endDate, effortPercent, note });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (existing) {
      await deleteAllocation(existing.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-5 w-96 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-4">
          {existing ? '编辑排期' : '新建排期'}
        </h2>

        <label className="block text-sm text-gray-600 mb-1">人员</label>
        <select
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3"
        >
          <option value="">选择人员</option>
          {persons.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label className="block text-sm text-gray-600 mb-1">项目</label>
        <select
          value={newReqProjectId || selectedReq?.projectId || ''}
          onChange={(e) => setNewReqProjectId(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3"
        >
          <option value="">选择项目</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label className="block text-sm text-gray-600 mb-1">需求</label>
        {filteredReqs.length > 0 ? (
          <select
            value={requirementId}
            onChange={(e) => setRequirementId(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-1"
          >
            <option value="">选择已有需求</option>
            {filteredReqs.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        ) : null}

        <div className="text-xs text-gray-400 my-1">或直接新建需求</div>
        <input
          value={newReqName}
          onChange={(e) => setNewReqName(e.target.value)}
          placeholder="新需求名称"
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3"
        />

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">开始</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">结束</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <label className="block text-sm text-gray-600 mb-1">
          投入比例: <span className="font-semibold text-indigo-600">{effortPercent}%</span>
        </label>
        <input
          type="range"
          min={10}
          max={200}
          step={10}
          value={effortPercent}
          onChange={(e) => setEffortPercent(Number(e.target.value))}
          className="w-full mb-3"
        />

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注（可选）"
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-4 resize-none"
          rows={2}
        />

        <div className="flex gap-2">
          {existing && (
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              删除
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-500"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
