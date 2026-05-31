import useStore from '../../stores/useStore';

export default function ProjectView() {
  const projects = useStore((state) => state.projects);
  const requirements = useStore((state) => state.requirements);
  const allocations = useStore((state) => state.allocations);
  const persons = useStore((state) => state.persons);

  const getProjectStats = (projectId: string) => {
    const reqs = requirements.filter((r) => r.projectId === projectId);
    const reqIds = reqs.map((r) => r.id);
    const allocs = allocations.filter((a) => reqIds.includes(a.requirementId));

    const totalEffortDays = reqs.reduce((sum, r) => sum + r.effortDays, 0);
    const allocatedPersonIds = new Set(allocs.map((a) => a.personId));
    const allocatedPercent = allocs.reduce((sum, a) => sum + a.effortPercent, 0);

    return {
      requirementCount: reqs.length,
      totalEffortDays,
      allocatedPersons: allocatedPersonIds.size,
      allocatedPercent,
    };
  };

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        暂无项目，请在左侧添加
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">项目资源总览</h2>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((proj) => {
          const stats = getProjectStats(proj.id);
          return (
            <div
              key={proj.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-sm" style={{ background: proj.color }} />
                <h3 className="font-medium">{proj.name}</h3>
              </div>

              {proj.description && (
                <p className="text-sm text-gray-500 mb-3">{proj.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">需求数</div>
                  <div className="text-lg font-semibold">{stats.requirementCount}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">预估人天</div>
                  <div className="text-lg font-semibold">{stats.totalEffortDays}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">投入人数</div>
                  <div className="text-lg font-semibold">{stats.allocatedPersons}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">分配比例</div>
                  <div className="text-lg font-semibold">{stats.allocatedPercent}%</div>
                </div>
              </div>

              {requirements.filter((r) => r.projectId === proj.id).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">需求列表</div>
                  <ul className="space-y-1">
                    {requirements
                      .filter((r) => r.projectId === proj.id)
                      .map((r) => {
                        const allocs = allocations.filter((a) => a.requirementId === r.id);
                        const personNames = allocs
                          .map((a) => persons.find((p) => p.id === a.personId)?.name)
                          .filter(Boolean);
                        return (
                          <li key={r.id} className="text-sm flex justify-between">
                            <span className="truncate">{r.name}</span>
                            <span className="text-gray-400 text-xs shrink-0 ml-2">
                              {personNames.join(', ') || '未分配'}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
