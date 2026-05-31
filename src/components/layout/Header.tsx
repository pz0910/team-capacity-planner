import useStore from '../../stores/useStore';

export default function Header() {
  const viewMode = useStore((state) => state.viewMode);
  const setViewMode = useStore((state) => state.setViewMode);
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-gray-500 hover:text-gray-700 text-lg"
      >
        ☰
      </button>
      <h1 className="text-base font-semibold text-gray-800">人力排期</h1>
      <nav className="flex gap-1 ml-4">
        <button
          onClick={() => setViewMode('person')}
          className={`px-3 py-1 text-sm rounded-md ${viewMode === 'person' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
        >
          按人排期
        </button>
        <button
          onClick={() => setViewMode('project')}
          className={`px-3 py-1 text-sm rounded-md ${viewMode === 'project' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
        >
          按项目排期
        </button>
        <button
          onClick={() => setViewMode('project_overview')}
          className={`px-3 py-1 text-sm rounded-md ${viewMode === 'project_overview' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
        >
          项目总览
        </button>
        <button
          onClick={() => setViewMode('availability')}
          className={`px-3 py-1 text-sm rounded-md ${viewMode === 'availability' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
        >
          空闲人力
        </button>
      </nav>
    </header>
  );
}
