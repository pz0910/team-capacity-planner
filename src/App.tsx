import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { create } from 'zustand';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { toPng } from 'html-to-image';
import './index.css';

dayjs.extend(isoWeek);

const STORAGE_KEY = 'team-capacity-planner';
const SIDEBAR_KEY = 'team-capacity-planner-sidebar';

function loadFromStorage() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch {}
  return null;
}

function saveToStorage(s: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      persons: s.persons,
      projects: s.projects,
      requirements: s.requirements,
      phases: s.phases,
      allocations: s.allocations,
    }));
  } catch {}
}

/** 数据迁移：旧格式（allocation 含 requirementName）→ 新格式（phaseId） */
function migrateData(data: any): any {
  if (!data) return data;
  // 如果已有 requirements/phases，无需迁移
  if (data.requirements && data.phases) return data;

  const requirements: any[] = data.requirements || [];
  const phases: any[] = data.phases || [];
  const allocations: any[] = data.allocations || [];

  // 从旧 allocations 中提取唯一 projectId+requirementName 组合
  const reqMap = new Map<string, { reqId: string; phaseId: string }>(); // key: projectId__reqName → { reqId, phaseId }
  for (const alloc of allocations) {
    if (alloc.requirementName && !alloc.phaseId) {
      const key = alloc.projectId + '__' + alloc.requirementName;
      if (!reqMap.has(key)) {
        const reqId = crypto.randomUUID();
        const phaseId = crypto.randomUUID();
        reqMap.set(key, { reqId, phaseId });
        requirements.push({ id: reqId, projectId: alloc.projectId, name: alloc.requirementName, createdAt: new Date().toISOString() });
        phases.push({ id: phaseId, requirementId: reqId, name: alloc.requirementName, createdAt: new Date().toISOString() });
        alloc.phaseId = phaseId;
        delete alloc.requirementName;
      } else {
        // 同一需求下，复用已有 Phase，不重复创建
        const entry = reqMap.get(key)!;
        alloc.phaseId = entry.phaseId;
        delete alloc.requirementName;
      }
    }
  }

  return { ...data, requirements, phases, allocations };
}

const saved = migrateData(loadFromStorage());

const useStore = create((set, get) => ({
  persons: (saved?.persons || []) as any[],
  projects: (saved?.projects || []) as any[],
  requirements: (saved?.requirements || []) as any[],
  phases: (saved?.phases || []) as any[],
  allocations: (saved?.allocations || []) as any[],
  viewMode: 'person',
  sidebarOpen: true,
  _save: () => saveToStorage(get()),

  // === 人员 CRUD ===
  addPerson: (name: string) => {
    set((s: any) => ({
      persons: [...s.persons, { id: crypto.randomUUID(), name, color: ['#4F46E5','#0891B2','#059669','#D97706','#DC2626','#7C3AED'][s.persons.length % 6] }]
    }));
    (get() as any)._save();
  },
  deletePerson: (id: string) => {
    set((s: any) => ({
      persons: s.persons.filter((p: any) => p.id !== id),
      allocations: s.allocations.filter((a: any) => a.personId !== id)
    }));
    (get() as any)._save();
  },

  // === 项目 CRUD ===
  addProject: (name: string) => {
    set((s: any) => ({
      projects: [...s.projects, { id: crypto.randomUUID(), name, color: ['#4F46E5','#0891B2','#059669','#D97706','#DC2626','#7C3AED'][s.projects.length % 6] }]
    }));
    (get() as any)._save();
  },
  deleteProject: (id: string) => {
    set((s: any) => {
      // 级联删除：项目→需求→阶段→allocations
      const reqIds = s.requirements.filter((r: any) => r.projectId === id).map((r: any) => r.id);
      const phaseIds = s.phases.filter((p: any) => reqIds.includes(p.requirementId)).map((p: any) => p.id);
      return {
        projects: s.projects.filter((p: any) => p.id !== id),
        requirements: s.requirements.filter((r: any) => r.projectId !== id),
        phases: s.phases.filter((p: any) => !reqIds.includes(p.requirementId)),
        allocations: s.allocations.filter((a: any) => !phaseIds.includes(a.phaseId)),
      };
    });
    (get() as any)._save();
  },

  // === 需求 CRUD ===
  addRequirement: (projectId: string, name: string) => {
    const req = { id: crypto.randomUUID(), projectId, name, createdAt: new Date().toISOString() };
    set((s: any) => ({ requirements: [...s.requirements, req] }));
    (get() as any)._save();
    return req;
  },
  deleteRequirement: (id: string) => {
    set((s: any) => {
      // 级联删除：需求→阶段→allocations
      const phaseIds = s.phases.filter((p: any) => p.requirementId === id).map((p: any) => p.id);
      return {
        requirements: s.requirements.filter((r: any) => r.id !== id),
        phases: s.phases.filter((p: any) => p.requirementId !== id),
        allocations: s.allocations.filter((a: any) => !phaseIds.includes(a.phaseId)),
      };
    });
    (get() as any)._save();
  },
  updateRequirement: (id: string, data: any) => {
    set((s: any) => ({
      requirements: s.requirements.map((r: any) => r.id === id ? { ...r, ...data } : r)
    }));
    (get() as any)._save();
  },

  // === 阶段 CRUD ===
  addPhase: (requirementId: string, name: string) => {
    const phase = { id: crypto.randomUUID(), requirementId, name, createdAt: new Date().toISOString() };
    set((s: any) => ({ phases: [...s.phases, phase] }));
    (get() as any)._save();
    return phase;
  },
  deletePhase: (id: string) => {
    set((s: any) => ({
      phases: s.phases.filter((p: any) => p.id !== id),
      allocations: s.allocations.filter((a: any) => a.phaseId !== id),
    }));
    (get() as any)._save();
  },
  updatePhase: (id: string, data: any) => {
    set((s: any) => ({
      phases: s.phases.map((p: any) => p.id === id ? { ...p, ...data } : p)
    }));
    (get() as any)._save();
  },

  // === 排期 CRUD ===
  addAllocation: (a: any) => {
    set((s: any) => ({ allocations: [...s.allocations, { ...a, id: crypto.randomUUID() }] }));
    (get() as any)._save();
  },
  updateAllocation: (id: string, data: any) => {
    set((s: any) => ({ allocations: s.allocations.map((a: any) => a.id === id ? { ...a, ...data } : a) }));
    (get() as any)._save();
  },
  moveAllocation: (id: string, days: number) => {
    set((s: any) => ({
      allocations: s.allocations.map((a: any) => {
        if (a.id !== id) return a;
        const start = dayjs(a.startDate).add(days, 'day');
        const end = dayjs(a.endDate).add(days, 'day');
        return { ...a, startDate: start.format('YYYY-MM-DD'), endDate: end.format('YYYY-MM-DD') };
      })
    }));
    (get() as any)._save();
  },
  deleteAllocation: (id: string) => {
    set((s: any) => ({ allocations: s.allocations.filter((a: any) => a.id !== id) }));
    (get() as any)._save();
  },

  // === 视图 ===
  setViewMode: (m: string) => set({ viewMode: m }),
  setSidebarOpen: (o: boolean) => set({ sidebarOpen: o }),

  // === 导入导出 ===
  exportData: () => {
    const s = get() as any;
    return JSON.stringify({
      persons: s.persons,
      projects: s.projects,
      requirements: s.requirements,
      phases: s.phases,
      allocations: s.allocations,
    }, null, 2);
  },
  importData: (json: string) => {
    try {
      let d = JSON.parse(json);
      // 迁移旧格式
      d = migrateData(d);
      if (d.persons && d.projects && d.allocations) {
        set({
          persons: d.persons,
          projects: d.projects,
          requirements: d.requirements || [],
          phases: d.phases || [],
          allocations: d.allocations,
        });
        saveToStorage(get());
        return true;
      }
    } catch {}
    return false;
  },
  clearAll: () => {
    set({ persons: [], projects: [], requirements: [], phases: [], allocations: [] });
    localStorage.removeItem(STORAGE_KEY);
  },
}));

const CELL_W = 80;
const ROW_H = 36;
const HEADER_H = 40;
const TIMELINE_START_WEEKS = 26;
const TIMELINE_END_WEEKS = 52;

function generateWeeks(start: Date, count: number): string[] {
  const weeks: string[] = [];
  let d = dayjs(start).startOf('isoWeek');
  for (let i = 0; i < count; i++) { weeks.push(d.format('YYYY-MM-DD')); d = d.add(1, 'week'); }
  return weeks;
}

function computeLanes(allocs: any[]): { lanes: any[][]; rowH: number } {
  const sorted = [...allocs].sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));
  const lanes: any[][] = [];
  for (const alloc of sorted) {
    let placed = false;
    for (const lane of lanes) {
      if (alloc.startDate > lane[lane.length - 1].endDate) {
        lane.push(alloc);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([alloc]);
  }
  return { lanes, rowH: Math.max(lanes.length, 1) * ROW_H };
}

// ==================== Toast ====================
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm" style={{animation:'fadeIn .3s ease-out'}}>{message}</div>;
}

// ==================== Header ====================
function Header({ onExport }: { onExport: () => void }) {
  const viewMode = useStore((s: any) => s.viewMode);
  const setViewMode = useStore((s: any) => s.setViewMode);
  const sidebarOpen = useStore((s: any) => s.sidebarOpen);
  const setSidebarOpen = useStore((s: any) => s.setSidebarOpen);
  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700 text-lg">☰</button>
      <h1 className="text-base font-semibold text-gray-800">人力排期</h1>
      <nav className="flex gap-1 ml-4">
        {[['person','按人排期'],['project','按项目排期'],['availability','空闲人力']].map(([k,l]: any) => (
          <button key={k} onClick={() => setViewMode(k)} className={`px-3 py-1 text-sm rounded-md ${viewMode===k?'bg-indigo-100 text-indigo-700 font-medium':'text-gray-600 hover:bg-gray-100'}`}>{l}</button>
        ))}
      </nav>
      <div className="flex-1"/>
      <button onClick={onExport} className="text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-md">📷 导出图片</button>
    </header>
  );
}

// ==================== ExportModal ====================
function ExportModal({ onClose, viewMode, onSuccess }: { onClose: () => void; viewMode: string; onSuccess: () => void }) {
  const [rangeType, setRangeType] = useState('8w');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [resolution, setResolution] = useState(2);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const validate = () => {
    if (rangeType === 'custom') {
      if (!customStart || !customEnd) { setError('请输入开始和结束日期'); return false; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(customStart) || !/^\d{4}-\d{2}-\d{2}$/.test(customEnd)) { setError('日期格式: YYYY-MM-DD'); return false; }
      if (customEnd < customStart) { setError('结束日期必须 ≥ 开始日期'); return false; }
      const weeks = dayjs(customEnd).diff(dayjs(customStart), 'week') + 1;
      if (weeks > 52) { setError('日期范围不能超过52周'); return false; }
    }
    setError('');
    return true;
  };

  const handleExport = async () => {
    if (!validate()) return;
    setExporting(true);
    try {
      const containerId = viewMode === 'person' ? 'person-timeline-scroll' : viewMode === 'project' ? 'proj-timeline-scroll' : 'avail-scroll';
      const container = document.getElementById(containerId);
      if (!container) { setError('未找到视图元素'); setExporting(false); return; }

      const scrollH = container.scrollHeight;
      if (scrollH < 80) { setError('当前视图为空，无法导出'); setExporting(false); return; }

      const fullW = container.scrollWidth;
      const fullH = scrollH;

      const dataUrl = await toPng(container, {
        pixelRatio: resolution,
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: { overflow: 'visible', width: fullW + 'px', height: fullH + 'px' },
      });

      let finalUrl = dataUrl;
      if (rangeType !== 'all' && viewMode !== 'availability') {
        const leftColW = viewMode === 'person' ? 128 : 192;
        const allStart = dayjs().subtract(TIMELINE_START_WEEKS, 'week').startOf('isoWeek');
        let startIdx: number, endIdx: number;
        if (rangeType === 'custom') {
          startIdx = Math.max(0, dayjs(customStart).startOf('isoWeek').diff(allStart, 'week'));
          endIdx = startIdx + dayjs(customEnd).diff(dayjs(customStart), 'week');
        } else {
          const n = parseInt(rangeType);
          startIdx = TIMELINE_START_WEEKS;
          endIdx = startIdx + n - 1;
        }
        const maxIdx = TIMELINE_START_WEEKS + TIMELINE_END_WEEKS - 1;
        startIdx = Math.max(0, startIdx);
        endIdx = Math.min(maxIdx, endIdx);

        const pr = resolution;
        const cropW = (leftColW + (endIdx - startIdx + 1) * CELL_W) * pr;
        const cropH = fullH * pr;
        const offsetX = (leftColW + startIdx * CELL_W) * pr;

        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });

        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, -offsetX, 0);
        finalUrl = canvas.toDataURL('image/png');
      }

      const link = document.createElement('a');
      const viewLabel = viewMode === 'person' ? '按人排期' : viewMode === 'project' ? '按项目排期' : '空闲人力';
      link.download = `排期_${viewLabel}_${dayjs().format('YYYYMMDD')}.png`;
      link.href = finalUrl;
      link.click();
      onSuccess();
      onClose();
    } catch (err) {
      setError('导出失败: ' + (err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  if (viewMode === 'availability') {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl p-5 w-80" onClick={e => e.stopPropagation()}>
          <h2 className="text-base font-semibold mb-3">导出图片</h2>
          <p className="text-sm text-gray-500 mb-4">将导出完整的空闲人力表格</p>
          <label className="block text-sm text-gray-600 mb-1">分辨率</label>
          <div className="flex gap-1 mb-4">
            {[[2,'2x 高清'],[3,'3x 超高清']].map(([v,l]: any) => (
              <button key={v} onClick={() => setResolution(v)} className={`px-3 py-1 text-xs rounded border ${resolution===v?'bg-indigo-100 border-indigo-300 text-indigo-700':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">取消</button>
            <button onClick={handleExport} disabled={exporting} className={`px-4 py-1.5 text-sm rounded ${exporting?'bg-gray-300 text-gray-500 cursor-not-allowed':'bg-indigo-600 text-white hover:bg-indigo-500'}`}>{exporting ? '导出中...' : '导出'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-5 w-96" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-4">导出图片</h2>
        <label className="block text-sm text-gray-600 mb-1">时间范围</label>
        <div className="flex gap-1 mb-3 flex-wrap">
          {[['4w','4周'],['8w','8周'],['12w','12周'],['all','全部'],['custom','自定义']].map(([v,l]: any) => (
            <button key={v} onClick={() => { setRangeType(v); setError(''); }} className={`px-2 py-1 text-xs rounded border ${rangeType===v?'bg-indigo-100 border-indigo-300 text-indigo-700':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{l}</button>
          ))}
        </div>
        {rangeType === 'custom' && (
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">开始日期</label>
              <input type="text" value={customStart} onChange={e => { setCustomStart(e.target.value); setError(''); }} placeholder="YYYY-MM-DD" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"/>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">结束日期</label>
              <input type="text" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setError(''); }} placeholder="YYYY-MM-DD" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"/>
            </div>
          </div>
        )}
        <label className="block text-sm text-gray-600 mb-1">分辨率</label>
        <div className="flex gap-1 mb-4">
          {[[2,'2x 高清'],[3,'3x 超高清']].map(([v,l]: any) => (
            <button key={v} onClick={() => setResolution(v)} className={`px-3 py-1 text-xs rounded border ${resolution===v?'bg-indigo-100 border-indigo-300 text-indigo-700':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{l}</button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">取消</button>
          <button onClick={handleExport} disabled={exporting} className={`px-4 py-1.5 text-sm rounded ${exporting?'bg-gray-300 text-gray-500 cursor-not-allowed':'bg-indigo-600 text-white hover:bg-indigo-500'}`}>{exporting ? '导出中...' : '导出'}</button>
        </div>
      </div>
    </div>
  );
}

// ==================== Sidebar ====================
function Sidebar() {
  const persons = useStore((s: any) => s.persons);
  const projects = useStore((s: any) => s.projects);
  const requirements = useStore((s: any) => s.requirements);
  const phases = useStore((s: any) => s.phases);
  const addPerson = useStore((s: any) => s.addPerson);
  const deletePerson = useStore((s: any) => s.deletePerson);
  const addProject = useStore((s: any) => s.addProject);
  const deleteProject = useStore((s: any) => s.deleteProject);
  const addRequirement = useStore((s: any) => s.addRequirement);
  const deleteRequirement = useStore((s: any) => s.deleteRequirement);
  const addPhase = useStore((s: any) => s.addPhase);
  const deletePhase = useStore((s: any) => s.deletePhase);
  const exportData = useStore((s: any) => s.exportData);
  const importData = useStore((s: any) => s.importData);
  const clearAll = useStore((s: any) => s.clearAll);

  const [np, setNp] = useState('');
  const [npr, setNpr] = useState('');
  const [reqProjectId, setReqProjectId] = useState('');
  const [reqName, setReqName] = useState('');
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
  const [phaseName, setPhaseName] = useState('');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { const r = localStorage.getItem(SIDEBAR_KEY); if (r) return JSON.parse(r); } catch {}
    return { persons: false, projects: false, requirements: false, data: false };
  });

  const toggleSection = (key: string) => {
    const next = { ...collapsed, [key]: !collapsed[key] };
    setCollapsed(next);
    try { localStorage.setItem(SIDEBAR_KEY, JSON.stringify(next)); } catch {}
  };

  const sq = search.toLowerCase();
  const fPersons = sq ? persons.filter((p: any) => p.name.toLowerCase().includes(sq)) : persons;
  const fProjects = sq ? projects.filter((p: any) => p.name.toLowerCase().includes(sq)) : projects;
  const fRequirements = sq ? requirements.filter((r: any) => r.name.toLowerCase().includes(sq)) : requirements;

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '排期数据_' + dayjs().format('YYYYMMDD') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (importData(text)) { alert('导入成功！'); } else { alert('导入失败'); }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleAddReq = () => {
    if (!reqProjectId || !reqName.trim()) return;
    addRequirement(reqProjectId, reqName.trim());
    setReqName('');
  };

  const handleAddPhase = (reqId: string) => {
    if (!phaseName.trim()) return;
    addPhase(reqId, phaseName.trim());
    setPhaseName('');
  };

  const reqsByProject = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const r of fRequirements) {
      if (!m.has(r.projectId)) m.set(r.projectId, []);
      m.get(r.projectId)!.push(r);
    }
    return m;
  }, [fRequirements]);

  return (
    <aside className="w-64 bg-gray-800 text-gray-100 p-4 overflow-y-auto shrink-0">
      {/* 搜索框 */}
      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 搜索人员/项目..." className="w-full bg-gray-700 text-white text-sm px-3 py-1.5 rounded border-0 outline-none placeholder-gray-400"/>
      </div>

      {/* 人员 */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 cursor-pointer hover:text-gray-300 flex items-center gap-1 select-none" onClick={() => toggleSection('persons')}>
          <span className="text-[10px] w-3">{collapsed.persons ? '▸' : '▾'}</span>人员<span className="text-gray-500 ml-auto text-[10px]">{fPersons.length}</span>
        </h3>
        {!collapsed.persons && (
          <>
            <div className="flex gap-1 mb-2">
              <input value={np} onChange={e=>setNp(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&np.trim()){addPerson(np.trim());setNp('');}}} placeholder="输入姓名" className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded border-0 outline-none"/>
              <button onClick={()=>{if(np.trim()){addPerson(np.trim());setNp('');}}} className="bg-indigo-600 text-white text-sm px-2 py-1 rounded">+</button>
            </div>
            <ul className="space-y-1">{fPersons.map((p:any)=><li key={p.id} className="flex items-center gap-2 group"><span className="w-3 h-3 rounded-full" style={{background:p.color}}/><span className="text-sm flex-1">{p.name}</span><button onClick={()=>deletePerson(p.id)} className="text-gray-500 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100">✕</button></li>)}</ul>
            {search && fPersons.length === 0 && <p className="text-xs text-gray-500">无匹配</p>}
          </>
        )}
      </section>

      {/* 项目 */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 cursor-pointer hover:text-gray-300 flex items-center gap-1 select-none" onClick={() => toggleSection('projects')}>
          <span className="text-[10px] w-3">{collapsed.projects ? '▸' : '▾'}</span>项目<span className="text-gray-500 ml-auto text-[10px]">{fProjects.length}</span>
        </h3>
        {!collapsed.projects && (
          <>
            <div className="flex gap-1 mb-2">
              <input value={npr} onChange={e=>setNpr(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&npr.trim()){addProject(npr.trim());setNpr('');}}} placeholder="项目名称" className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded border-0 outline-none"/>
              <button onClick={()=>{if(npr.trim()){addProject(npr.trim());setNpr('');}}} className="bg-indigo-600 text-white text-sm px-2 py-1 rounded">+</button>
            </div>
            <ul className="space-y-1">{fProjects.map((p:any)=><li key={p.id} className="flex items-center gap-2 group"><span className="w-3 h-3 rounded-sm" style={{background:p.color}}/><span className="text-sm flex-1">{p.name}</span><button onClick={()=>deleteProject(p.id)} className="text-gray-500 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100">✕</button></li>)}</ul>
            {search && fProjects.length === 0 && <p className="text-xs text-gray-500">无匹配</p>}
          </>
        )}
      </section>

      {/* 需求/阶段管理 */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 cursor-pointer hover:text-gray-300 flex items-center gap-1 select-none" onClick={() => toggleSection('requirements')}>
          <span className="text-[10px] w-3">{collapsed.requirements ? '▸' : '▾'}</span>需求<span className="text-gray-500 ml-auto text-[10px]">{fRequirements.length}</span>
        </h3>
        {!collapsed.requirements && (
          <>
            <div className="flex gap-1 mb-2">
              <select value={reqProjectId} onChange={e=>setReqProjectId(e.target.value)} className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded border-0 outline-none">
                <option value="">选择项目</option>
                {projects.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex gap-1 mb-2">
              <input value={reqName} onChange={e=>setReqName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleAddReq();}} placeholder="需求名称" className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded border-0 outline-none"/>
              <button onClick={handleAddReq} className="bg-indigo-600 text-white text-sm px-2 py-1 rounded">+</button>
            </div>
            <div className="space-y-1">
              {projects.map((proj: any) => {
                const reqs = reqsByProject.get(proj.id) || [];
                if (reqs.length === 0) return null;
                return (
                  <div key={proj.id}>
                    {reqs.map((req: any) => {
                      const reqPhases = phases.filter((p: any) => p.requirementId === req.id);
                      const expanded = expandedReqId === req.id;
                      return (
                        <div key={req.id} className="mb-1">
                          <div className="flex items-center gap-1 group cursor-pointer hover:bg-gray-700 rounded px-1 py-0.5" onClick={() => setExpandedReqId(expanded ? null : req.id)}>
                            <span className="text-xs text-gray-500">{expanded ? '▾' : '▸'}</span>
                            <span className="text-xs text-gray-400">{proj.name}</span><span className="text-xs text-gray-400">/</span>
                            <span className="text-sm flex-1">{req.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); deleteRequirement(req.id); }} className="text-gray-500 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100">✕</button>
                          </div>
                          {expanded && (
                            <div className="ml-4 space-y-0.5">
                              {reqPhases.map((ph: any) => (
                                <div key={ph.id} className="flex items-center gap-2 group hover:bg-gray-700 rounded px-1 py-0.5">
                                  <span className="text-xs text-gray-500">├─</span>
                                  <span className="text-sm flex-1">{ph.name}</span>
                                  <button onClick={() => deletePhase(ph.id)} className="text-gray-500 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100">✕</button>
                                </div>
                              ))}
                              <div className="flex gap-1 mt-1">
                                <input value={expandedReqId === req.id ? phaseName : ''} onChange={e=>setPhaseName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleAddPhase(req.id);}} placeholder="阶段名称" className="flex-1 bg-gray-700 text-white text-xs px-2 py-1 rounded border-0 outline-none" onClick={e=>e.stopPropagation()}/>
                                <button onClick={()=>handleAddPhase(req.id)} className="bg-gray-600 text-white text-xs px-2 py-1 rounded">+</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {fRequirements.length === 0 && <p className="text-xs text-gray-500">{search ? '无匹配' : '暂无需求，请先添加'}</p>}
            </div>
          </>
        )}
      </section>

      {/* 数据 */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 cursor-pointer hover:text-gray-300 flex items-center gap-1 select-none" onClick={() => toggleSection('data')}>
          <span className="text-[10px] w-3">{collapsed.data ? '▸' : '▾'}</span>数据
        </h3>
        {!collapsed.data && (
          <div className="flex flex-col gap-2">
            <button onClick={handleExport} className="w-full text-left text-sm text-gray-300 hover:text-white hover:bg-gray-700 px-2 py-1.5 rounded">📤 导出 JSON</button>
            <button onClick={handleImport} className="w-full text-left text-sm text-gray-300 hover:text-white hover:bg-gray-700 px-2 py-1.5 rounded">📥 导入 JSON</button>
            <button onClick={()=>{if(confirm('确定清空所有数据？'))clearAll();}} className="w-full text-left text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 px-2 py-1.5 rounded">🗑️ 清空数据</button>
          </div>
        )}
      </section>
    </aside>
  );
}

// ==================== TimelineView (按人排期) ====================
function TimelineView() {
  const persons = useStore((s: any) => s.persons);
  const projects = useStore((s: any) => s.projects);
  const requirements = useStore((s: any) => s.requirements);
  const phases = useStore((s: any) => s.phases);
  const allocations = useStore((s: any) => s.allocations);
  const moveAllocation = useStore((s: any) => s.moveAllocation);
  const deleteAllocation = useStore((s: any) => s.deleteAllocation);
  const [showModal, setShowModal] = useState<any>(null);
  const [editId, setEditId] = useState<string|null>(null);
  const dragRef = useRef<{allocId:string;startX:number}|null>(null);

  const startDate = useMemo(() => dayjs().subtract(TIMELINE_START_WEEKS, 'week').toDate(), []);
  const periods = useMemo(() => generateWeeks(startDate, TIMELINE_START_WEEKS + TIMELINE_END_WEEKS), [startDate]);
  const today = dayjs().format('YYYY-MM-DD');

  const personLanes = useMemo(() => {
    const map = new Map<string, { lanes: any[][]; rowH: number }>();
    for (const person of persons) {
      const pa = allocations.filter((a: any) => a.personId === person.id);
      map.set(person.id, computeLanes(pa));
    }
    return map;
  }, [persons, allocations]);

  const getLoad = (pid: string, week: string) => {
    const weekEnd = dayjs(week).endOf('isoWeek').format('YYYY-MM-DD');
    return allocations.filter((a: any) => a.personId === pid && a.startDate <= weekEnd && a.endDate >= week).reduce((s: number, a: any) => s + a.effortPercent, 0);
  };

  const handleDragStart = useCallback((allocId: string, e: React.DragEvent) => {
    dragRef.current = { allocId, startX: e.clientX };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', allocId);
  }, []);

  const handleDrop = useCallback((targetWeek: string, e: React.DragEvent) => {
    e.preventDefault();
    const allocId = e.dataTransfer.getData('text/plain');
    if (!allocId) return;
    const alloc = allocations.find((a: any) => a.id === allocId);
    if (!alloc) return;
    const currentWeek = dayjs(alloc.startDate).startOf('isoWeek').format('YYYY-MM-DD');
    if (currentWeek === targetWeek) return;
    const daysDiff = dayjs(targetWeek).diff(dayjs(currentWeek), 'day');
    moveAllocation(allocId, daysDiff);
    dragRef.current = null;
  }, [allocations, moveAllocation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // 辅助：获取 allocation 的需求名/阶段名
  const getAllocLabel = (alloc: any) => {
    const phase = phases.find((p: any) => p.id === alloc.phaseId);
    if (!phase) return alloc.requirementName || '?';
    const req = requirements.find((r: any) => r.id === phase.requirementId);
    return (req?.name || '?') + '/' + (phase.name || '?');
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto" id="person-timeline-scroll">
      <div style={{ minWidth: 128 + periods.length * CELL_W }}>
        {/* Sticky header row */}
        <div className="flex sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="w-32 shrink-0 sticky left-0 z-30 bg-white px-3 flex items-center text-sm font-medium text-gray-600 border-r border-gray-200" style={{ height: HEADER_H }}>人员</div>
          {periods.map(p => (
            <div key={p} className={`flex items-center justify-center px-1 text-xs border-r-0 ${p===today?'bg-indigo-50 font-semibold text-indigo-600':''}`} style={{ minWidth: CELL_W, height: HEADER_H }}>
              {dayjs(p).format('M/D')}
            </div>
          ))}
        </div>
        {/* Body rows */}
        {persons.length===0 && (
          <div className="flex items-center justify-center h-40 text-gray-400 text-xs px-2 text-center">
            ← 在左侧添加人员和项目，然后点击时间轴分配排期
          </div>
        )}
        {persons.map((person: any) => {
          const { lanes, rowH } = personLanes.get(person.id) || { lanes: [], rowH: ROW_H };
          return (
            <div key={person.id} className="flex border-b border-gray-200">
              <div className="w-32 shrink-0 sticky left-0 z-10 bg-white border-r border-gray-200 px-3 flex items-center gap-2" style={{ height: rowH }}>
                <span className="w-2 h-2 rounded-full" style={{ background: person.color }} />
                <span className="text-sm truncate">{person.name}</span>
              </div>
              <div className="flex-1 relative" style={{ height: rowH, minWidth: periods.length * CELL_W }}>
                {periods.map(week => {
                  const load = getLoad(person.id, week);
                  const bg = load>100?'#FEE2E2':load>80?'#FEF3C7':load>0?'#ECFDF5':'';
                  return (
                    <div
                      key={week}
                      className={week===today?'bg-indigo-50':''}
                      style={{ background: bg||undefined, position: 'absolute', left: periods.indexOf(week) * CELL_W, width: CELL_W, height: rowH }}
                      onClick={() => setShowModal({ personId: person.id, date: week })}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(week, e)}
                    />
                  );
                })}
                {lanes.map((lane, li) => lane.map((alloc: any) => {
                  const proj = projects.find((p: any) => p.id === alloc.projectId);
                  if (!proj) return null;
                  const si = periods.indexOf(dayjs(alloc.startDate).startOf('isoWeek').format('YYYY-MM-DD'));
                  if (si < 0) return null;
                  const ei = periods.indexOf(dayjs(alloc.endDate).startOf('isoWeek').format('YYYY-MM-DD'));
                  if (ei < 0) return null;
                  const label = getAllocLabel(alloc);
                  return (
                    <div
                      key={alloc.id}
                      draggable
                      onDragStart={(e) => handleDragStart(alloc.id, e)}
                      className="absolute h-6 rounded cursor-grab active:cursor-grabbing flex items-center px-1.5 text-white text-xs truncate hover:shadow-lg hover:z-10"
                      style={{
                        left: si * CELL_W,
                        width: (ei - si + 1) * CELL_W,
                        top: li * ROW_H + (ROW_H - 24) / 2,
                        background: proj.color
                      }}
                      title={label + ' (' + alloc.effortPercent + '%)'}
                      onClick={e => { e.stopPropagation(); setEditId(alloc.id); }}
                    >
                      {label} {alloc.effortPercent}%
                    </div>
                  );
                }))}
              </div>
            </div>
          );
        })}
      </div>

      {(showModal||editId) && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={()=>{setShowModal(null);setEditId(null);}}>
          <div className="bg-white rounded-lg shadow-xl p-5 w-96" onClick={e=>e.stopPropagation()}>
            {editId ? <EditAlloc id={editId} onClose={()=>setEditId(null)} onDelete={()=>{deleteAllocation(editId);setEditId(null);}}/> : <NewAlloc personId={showModal.personId} date={showModal.date} onClose={()=>setShowModal(null)}/>}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== NewAlloc ====================
function NewAlloc({personId,date,onClose}:{personId:string;date:string;onClose:()=>void}) {
  const projects = useStore((s:any) => s.projects);
  const requirements = useStore((s:any) => s.requirements);
  const phases = useStore((s:any) => s.phases);
  const addAllocation = useStore((s:any) => s.addAllocation);
  const [projectId, setProjectId] = useState('');
  const [requirementId, setRequirementId] = useState('');
  const [phaseId, setPhaseId] = useState('');
  // 默认开始日期 = 当天所在周的周一
  const [startDate, setStartDate] = useState(dayjs().startOf('isoWeek').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().startOf('isoWeek').format('YYYY-MM-DD'));
  const [effort, setEffort] = useState(100);
  const [duration, setDuration] = useState('custom');
  const [customWeeks, setCustomWeeks] = useState('');
  const [customMonths, setCustomMonths] = useState('');

  // 级联过滤
  const filteredReqs = useMemo(() => requirements.filter((r:any) => r.projectId === projectId), [requirements, projectId]);
  const filteredPhases = useMemo(() => phases.filter((p:any) => p.requirementId === requirementId), [phases, requirementId]);

  const calcEndDate = (s: string, dur: string, w: string, m: string) => {
    const start = dayjs(s);
    let end;
    if (dur !== 'custom') {
      switch(dur) {
        case '1w': end = start.add(6, 'day'); break;
        case '2w': end = start.add(13, 'day'); break;
        case '1m': end = start.add(1, 'month').subtract(1, 'day'); break;
        case '2m': end = start.add(2, 'month').subtract(1, 'day'); break;
        case '3m': end = start.add(3, 'month').subtract(1, 'day'); break;
        default: return null;
      }
    } else if (w && Number(w) > 0) {
      end = start.add(Number(w) * 7 - 1, 'day');
    } else if (m && Number(m) > 0) {
      end = start.add(Number(m), 'month').subtract(1, 'day');
    } else {
      return null;
    }
    return end.format('YYYY-MM-DD');
  };

  const handleDurationChange = (d: string) => {
    setDuration(d);
    setCustomWeeks('');
    setCustomMonths('');
    if (d === 'custom') return;
    const end = calcEndDate(startDate, d, '', '');
    if (end) setEndDate(end);
  };

  const handleCustomWeeks = (v: string) => {
    setCustomWeeks(v);
    setCustomMonths('');
    setDuration('custom');
    const end = calcEndDate(startDate, 'custom', v, '');
    if (end) setEndDate(end);
  };

  const handleCustomMonths = (v: string) => {
    setCustomMonths(v);
    setCustomWeeks('');
    setDuration('custom');
    const end = calcEndDate(startDate, 'custom', '', v);
    if (end) setEndDate(end);
  };

  const handleStartDateChange = (d: string) => {
    setStartDate(d);
    const end = calcEndDate(d, duration, customWeeks, customMonths);
    if (end) setEndDate(end);
  };

  // 项目变更时重置需求和阶段
  const handleProjectChange = (pid: string) => {
    setProjectId(pid);
    setRequirementId('');
    setPhaseId('');
  };

  // 需求变更时重置阶段
  const handleReqChange = (rid: string) => {
    setRequirementId(rid);
    setPhaseId('');
  };

  const handleSave = () => {
    if (!phaseId) return;
    const phase = phases.find((p:any) => p.id === phaseId);
    if (!phase) return;
    const req = requirements.find((r:any) => r.id === phase.requirementId);
    if (!req) return;
    addAllocation({ personId, projectId: req.projectId, phaseId, startDate, endDate, effortPercent: effort });
    onClose();
  };

  return (<>
    <h2 className="text-base font-semibold mb-4">新建排期</h2>
    <label className="block text-sm text-gray-600 mb-1">项目</label>
    <select value={projectId} onChange={e=>handleProjectChange(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3">
      <option value="">选择项目</option>
      {projects.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select>

    <label className="block text-sm text-gray-600 mb-1">需求</label>
    <select value={requirementId} onChange={e=>handleReqChange(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3" disabled={!projectId}>
      <option value="">{!projectId ? '请先选择项目' : filteredReqs.length === 0 ? '请先在侧边栏添加需求' : '选择需求'}</option>
      {filteredReqs.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}
    </select>

    <label className="block text-sm text-gray-600 mb-1">阶段</label>
    <select value={phaseId} onChange={e=>setPhaseId(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3" disabled={!requirementId}>
      <option value="">{!requirementId ? '请先选择需求' : filteredPhases.length === 0 ? '请先在侧边栏添加阶段' : '选择阶段'}</option>
      {filteredPhases.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select>

    <label className="block text-sm text-gray-600 mb-1">时长</label>
    <select value={duration} onChange={e=>handleDurationChange(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2">
      <option value="custom">自定义</option>
      <option value="1w">1周</option>
      <option value="2w">2周</option>
      <option value="1m">1个月</option>
      <option value="2m">2个月</option>
      <option value="3m">3个月</option>
    </select>
    <div className="flex gap-1 mb-2">
      {[['1w','1周'],['2w','2周'],['1m','1月'],['2m','2月'],['3m','3月']].map(([v,l]:any)=>
        <button key={v} onClick={()=>handleDurationChange(v)} className={`px-2 py-0.5 text-xs rounded border ${duration===v?'bg-indigo-100 border-indigo-300 text-indigo-700':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{l}</button>
      )}
    </div>
    <div className="flex gap-2 mb-3 text-xs text-gray-500">
      <span>或输入:</span>
      <input type="number" min="1" max="52" value={customWeeks} onChange={e=>handleCustomWeeks(e.target.value)} placeholder="周数" className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"/>
      <span>周</span>
      <span className="text-gray-300">/</span>
      <input type="number" min="1" max="24" value={customMonths} onChange={e=>handleCustomMonths(e.target.value)} placeholder="月数" className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"/>
      <span>月</span>
    </div>
    <div className="flex gap-2 mb-3"><div className="flex-1"><label className="block text-sm text-gray-600 mb-1">开始</label><input type="text" value={startDate} onChange={e=>handleStartDateChange(e.target.value)} placeholder="YYYY-MM-DD" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"/></div><div className="flex-1"><label className="block text-sm text-gray-600 mb-1">结束</label><input type="text" value={endDate} onChange={e=>setEndDate(e.target.value)} placeholder="YYYY-MM-DD" disabled={duration!=='custom'||!!customWeeks||!!customMonths} className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm ${duration!=='custom'||!!customWeeks||!!customMonths?'bg-gray-100':''}`}/></div></div>
    <label className="block text-sm text-gray-600 mb-1">投入比例: <span className="font-semibold text-indigo-600">{effort}%</span></label>
    <input type="range" min={10} max={200} step={10} value={effort} onChange={e=>setEffort(Number(e.target.value))} className="w-full mb-4"/>
    <div className="flex gap-2 justify-end"><button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">取消</button><button onClick={handleSave} disabled={!phaseId} className={`px-4 py-1.5 text-sm rounded ${phaseId?'bg-indigo-600 text-white hover:bg-indigo-500':'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>保存</button></div>
  </>);
}

// ==================== EditAlloc ====================
function EditAlloc({id,onClose,onDelete}:{id:string;onClose:()=>void;onDelete:()=>void}) {
  const alloc = useStore((s:any) => s.allocations.find((a:any) => a.id === id));
  const updateAllocation = useStore((s:any) => s.updateAllocation);
  const projects = useStore((s:any) => s.projects);
  const requirements = useStore((s:any) => s.requirements);
  const phases = useStore((s:any) => s.phases);
  if (!alloc) return null;

  const phase = phases.find((p:any) => p.id === alloc.phaseId);
  const req = phase ? requirements.find((r:any) => r.id === phase.requirementId) : null;
  const proj = req ? projects.find((p:any) => p.id === req.projectId) : projects.find((p:any) => p.id === alloc.projectId);

  const [editPhaseId, setEditPhaseId] = useState(alloc.phaseId);
  const [startDate, setStartDate] = useState(alloc.startDate);
  const [endDate, setEndDate] = useState(alloc.endDate);
  const [effort, setEffort] = useState(alloc.effortPercent);
  const [editing, setEditing] = useState(false);
  const [duration, setDuration] = useState('custom');
  const [customWeeks, setCustomWeeks] = useState('');
  const [customMonths, setCustomMonths] = useState('');

  // 编辑时的级联选择
  const [editProjectId, setEditProjectId] = useState(req?.projectId || '');
  const [editRequirementId, setEditRequirementId] = useState(req?.id || '');
  const filteredReqs = useMemo(() => requirements.filter((r:any) => r.projectId === editProjectId), [requirements, editProjectId]);
  const filteredPhases = useMemo(() => phases.filter((p:any) => p.requirementId === editRequirementId), [phases, editRequirementId]);

  const calcEndDate = (s: string, dur: string, w: string, m: string) => {
    const start = dayjs(s);
    let end;
    if (dur !== 'custom') {
      switch(dur) {
        case '1w': end = start.add(6, 'day'); break;
        case '2w': end = start.add(13, 'day'); break;
        case '1m': end = start.add(1, 'month').subtract(1, 'day'); break;
        case '2m': end = start.add(2, 'month').subtract(1, 'day'); break;
        case '3m': end = start.add(3, 'month').subtract(1, 'day'); break;
        default: return null;
      }
    } else if (w && Number(w) > 0) {
      end = start.add(Number(w) * 7 - 1, 'day');
    } else if (m && Number(m) > 0) {
      end = start.add(Number(m), 'month').subtract(1, 'day');
    } else {
      return null;
    }
    return end.format('YYYY-MM-DD');
  };

  const handleDurationChange = (d: string) => {
    setDuration(d);
    setCustomWeeks('');
    setCustomMonths('');
    if (d === 'custom') return;
    const end = calcEndDate(startDate, d, '', '');
    if (end) setEndDate(end);
  };

  const handleCustomWeeks = (v: string) => {
    setCustomWeeks(v);
    setCustomMonths('');
    setDuration('custom');
    const end = calcEndDate(startDate, 'custom', v, '');
    if (end) setEndDate(end);
  };

  const handleCustomMonths = (v: string) => {
    setCustomMonths(v);
    setCustomWeeks('');
    setDuration('custom');
    const end = calcEndDate(startDate, 'custom', '', v);
    if (end) setEndDate(end);
  };

  const handleStartDateChange = (d: string) => {
    setStartDate(d);
    const end = calcEndDate(d, duration, customWeeks, customMonths);
    if (end) setEndDate(end);
  };

  // 获取显示标签
  const getLabel = () => {
    if (!phase || !req) return alloc.requirementName || '?';
    return req.name + '/' + phase.name;
  };

  if (!editing) return (<>
    <h2 className="text-base font-semibold mb-4">排期详情</h2>
    <p className="text-sm text-gray-600 mb-1">项目: {proj?.name}</p>
    <p className="text-sm text-gray-600 mb-1">需求/阶段: {getLabel()}</p>
    <p className="text-sm text-gray-600 mb-1">时间: {alloc.startDate} ~ {alloc.endDate}</p>
    <p className="text-sm text-gray-600 mb-4">投入: {alloc.effortPercent}%</p>
    <div className="flex gap-2 justify-end"><button onClick={onDelete} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded">删除</button><button onClick={()=>setEditing(true)} className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded">编辑</button><button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">关闭</button></div>
  </>);
  return (<>
    <h2 className="text-base font-semibold mb-4">编辑排期</h2>
    <p className="text-sm text-gray-600 mb-3">项目: {proj?.name}</p>

    <label className="block text-sm text-gray-600 mb-1">需求</label>
    <select value={editRequirementId} onChange={e=>{setEditRequirementId(e.target.value);setEditPhaseId('');}} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3">
      <option value="">{filteredReqs.length === 0 ? '无需求' : '选择需求'}</option>
      {filteredReqs.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}
    </select>

    <label className="block text-sm text-gray-600 mb-1">阶段</label>
    <select value={editPhaseId} onChange={e=>setEditPhaseId(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3">
      <option value="">{filteredPhases.length === 0 ? '无阶段' : '选择阶段'}</option>
      {filteredPhases.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select>

    <label className="block text-sm text-gray-600 mb-1">时长</label>
    <select value={duration} onChange={e=>handleDurationChange(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2">
      <option value="custom">自定义</option>
      <option value="1w">1周</option>
      <option value="2w">2周</option>
      <option value="1m">1个月</option>
      <option value="2m">2个月</option>
      <option value="3m">3个月</option>
    </select>
    <div className="flex gap-1 mb-2">
      {[['1w','1周'],['2w','2周'],['1m','1月'],['2m','2月'],['3m','3月']].map(([v,l]:any)=>
        <button key={v} onClick={()=>handleDurationChange(v)} className={`px-2 py-0.5 text-xs rounded border ${duration===v?'bg-indigo-100 border-indigo-300 text-indigo-700':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{l}</button>
      )}
    </div>
    <div className="flex gap-2 mb-3 text-xs text-gray-500">
      <span>或输入:</span>
      <input type="number" min="1" max="52" value={customWeeks} onChange={e=>handleCustomWeeks(e.target.value)} placeholder="周数" className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"/>
      <span>周</span>
      <span className="text-gray-300">/</span>
      <input type="number" min="1" max="24" value={customMonths} onChange={e=>handleCustomMonths(e.target.value)} placeholder="月数" className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"/>
      <span>月</span>
    </div>
    <div className="flex gap-2 mb-3"><div className="flex-1"><label className="block text-sm text-gray-600 mb-1">开始</label><input type="text" value={startDate} onChange={e=>handleStartDateChange(e.target.value)} placeholder="YYYY-MM-DD" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"/></div><div className="flex-1"><label className="block text-sm text-gray-600 mb-1">结束</label><input type="text" value={endDate} onChange={e=>setEndDate(e.target.value)} placeholder="YYYY-MM-DD" disabled={duration!=='custom'||!!customWeeks||!!customMonths} className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm ${duration!=='custom'||!!customWeeks||!!customMonths?'bg-gray-100':''}`}/></div></div>
    <label className="block text-sm text-gray-600 mb-1">投入比例: <span className="font-semibold text-indigo-600">{effort}%</span></label>
    <input type="range" min={10} max={200} step={10} value={effort} onChange={e=>setEffort(Number(e.target.value))} className="w-full mb-4"/>
    <div className="flex gap-2 justify-end"><button onClick={()=>setEditing(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">取消</button><button onClick={()=>{updateAllocation(id,{phaseId:editPhaseId,startDate,endDate,effortPercent:effort});setEditing(false);}} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-500">保存</button></div>
  </>);
}

// ==================== ProjectTimelineView (按项目排期) ====================
function ProjectTimelineView() {
  const projects = useStore((s:any) => s.projects);
  const persons = useStore((s:any) => s.persons);
  const requirements = useStore((s:any) => s.requirements);
  const phases = useStore((s:any) => s.phases);
  const allocations = useStore((s:any) => s.allocations);
  const startDate = useMemo(() => dayjs().subtract(TIMELINE_START_WEEKS, 'week').toDate(), []);
  const periods = useMemo(() => generateWeeks(startDate, TIMELINE_START_WEEKS + TIMELINE_END_WEEKS), [startDate]);
  const today = dayjs().format('YYYY-MM-DD');

  // 按需求分组：每需求一行，合并该需求下所有阶段的 allocations
  const { rowList, rowLanes } = useMemo(() => {
    type RowItem = { key: string; proj: any; req: any };
    const rows: RowItem[] = [];
    const lanes = new Map<string, { lanes: any[][]; rowH: number }>();

    for (const proj of projects) {
      const projReqs = requirements.filter((r: any) => r.projectId === proj.id);
      if (projReqs.length === 0) {
        rows.push({ key: proj.id + '__empty', proj, req: null });
      } else {
        for (const req of projReqs) {
          rows.push({ key: 'req_' + req.id, proj, req });
          // 合并该需求下所有阶段的 allocations
          const reqPhases = phases.filter((p: any) => p.requirementId === req.id);
          const reqPhaseIds = reqPhases.map((p: any) => p.id);
          const reqAllocs = allocations.filter((a: any) => reqPhaseIds.includes(a.phaseId));
          if (reqAllocs.length > 0) {
            lanes.set('req_' + req.id, computeLanes(reqAllocs));
          }
        }
      }
    }
    return { rowList: rows, rowLanes: lanes };
  }, [projects, requirements, phases, allocations]);

  return (
    <div className="flex-1 min-h-0 overflow-auto" id="proj-timeline-scroll">
      <div style={{ minWidth: 192 + periods.length * CELL_W }}>
        {/* Sticky header row */}
        <div className="flex sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="w-48 shrink-0 sticky left-0 z-30 bg-white px-3 flex items-center text-sm font-medium text-gray-600 border-r border-gray-200" style={{ height: HEADER_H }}>项目 / 需求</div>
          {periods.map(p => (
            <div key={p} className={`flex items-center justify-center px-1 text-xs ${p===today?'bg-indigo-50 font-semibold text-indigo-600':''}`} style={{ minWidth: CELL_W, height: HEADER_H }}>
              {dayjs(p).format('M/D')}
            </div>
          ))}
        </div>
        {/* Body rows - 每需求一行 */}
        {rowList.map((row) => {
          const isEmpty = row.key.endsWith('__empty');
          const rowH = isEmpty ? ROW_H : (rowLanes.get(row.key)?.rowH || ROW_H);
          const laneData = isEmpty ? [] : (rowLanes.get(row.key)?.lanes || []);

          return (
            <div key={row.key} className="flex border-b border-gray-200">
              <div className="w-48 shrink-0 sticky left-0 z-10 bg-white border-r border-gray-200 px-3 flex items-center gap-2" style={{ height: rowH }}>
                <span className="w-2 h-2 rounded-sm" style={{ background: row.proj.color }} />
                <div className="truncate">
                  <span className="text-xs text-gray-400">{row.proj.name}</span>
                  {row.req ? (
                    <span className="text-sm font-medium ml-1">{row.req.name}</span>
                  ) : (
                    <span className="text-xs text-gray-400 ml-1">无需求</span>
                  )}
                </div>
              </div>
              <div className="flex-1 relative" style={{ height: rowH, minWidth: periods.length * CELL_W }}>
                {periods.map((week, wi) => (
                  <div key={week} className={week===today?'bg-indigo-50':''} style={{ position: 'absolute', left: wi * CELL_W, width: CELL_W, height: rowH }} />
                ))}
                {!isEmpty && laneData.map((lane, li) => lane.map((alloc: any) => {
                  const person = persons.find((p: any) => p.id === alloc.personId);
                  if (!person) return null;
                  const si = periods.indexOf(dayjs(alloc.startDate).startOf('isoWeek').format('YYYY-MM-DD'));
                  if (si < 0) return null;
                  const ei = periods.indexOf(dayjs(alloc.endDate).startOf('isoWeek').format('YYYY-MM-DD'));
                  if (ei < 0) return null;
                  return (
                    <div
                      key={alloc.id}
                      className="absolute h-6 rounded cursor-pointer flex items-center px-1.5 text-white text-xs truncate hover:shadow-lg"
                      style={{ left: si * CELL_W, width: (ei - si + 1) * CELL_W, top: li * ROW_H + (ROW_H - 24) / 2, background: row.proj.color }}
                    >
                      {person.name} {alloc.effortPercent}%
                    </div>
                  );
                }))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== AvailabilityView ====================
function AvailabilityView() {
  const persons = useStore((s:any) => s.persons);
  const allocations = useStore((s:any) => s.allocations);
  const weeks = useMemo(() => generateWeeks(dayjs().subtract(TIMELINE_START_WEEKS,'week').toDate(), TIMELINE_START_WEEKS + TIMELINE_END_WEEKS), []);
  const getLoad = (pid:string, ws:string) => { const we = dayjs(ws).endOf('isoWeek').format('YYYY-MM-DD'); return allocations.filter((a:any) => a.personId===pid && a.startDate<=we && a.endDate>=ws).reduce((s:number,a:any) => s+a.effortPercent, 0); };
  const getColor = (l:number) => l===0?'#ECFDF5':l<=50?'#DBEAFE':l<=80?'#FEF3C7':l<=100?'#FED7AA':'#FEE2E2';
  return (
    <div className="flex-1 min-h-0 overflow-auto p-6" id="avail-scroll">
      <h2 className="text-lg font-semibold mb-2">空闲人力视图</h2>
      <p className="text-sm text-gray-500 mb-4">绿色=空闲，红色=超载</p>
      <div className="overflow-x-auto"><table className="border-collapse"><thead><tr><th className="text-left text-sm font-medium text-gray-600 px-3 py-2 border-b border-gray-200 w-24 sticky left-0 z-10 bg-white" style={{boxShadow:'2px 0 4px -2px rgba(0,0,0,0.1)'}}>人员</th>{weeks.map(w=><th key={w} className="text-center text-xs text-gray-500 px-2 py-2 border-b border-gray-200" style={{minWidth:64}}>{dayjs(w).format('M/D')}</th>)}</tr></thead><tbody>{persons.map((p:any)=><tr key={p.id} className="hover:bg-gray-50"><td className="px-3 py-2 border-b border-gray-200 sticky left-0 z-10 bg-white" style={{boxShadow:'2px 0 4px -2px rgba(0,0,0,0.1)'}}><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background:p.color}}/><span className="text-sm">{p.name}</span></div></td>{weeks.map(w=>{const l=getLoad(p.id,w);return <td key={w} className="text-center text-xs px-2 py-2 border-b border-gray-200 font-medium" style={{background:getColor(l)}}>{l>0?l+'%':'空'}</td>;})}</tr>)}</tbody></table></div>
      <div className="flex gap-4 mt-4 text-xs text-gray-500">{[ ['空闲','#ECFDF5'],['≤50%','#DBEAFE'],['≤80%','#FEF3C7'],['≤100%','#FED7AA'],['超载','#FEE2E2'] ].map(([l,c]:any)=><span key={l} className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{background:c}}/> {l}</span>)}</div>
    </div>
  );
}

// ==================== App ====================
export default function App() {
  const viewMode = useStore((s: any) => s.viewMode);
  const sidebarOpen = useStore((s: any) => s.sidebarOpen);
  const [exportModal, setExportModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  return (
    <div className="flex flex-col h-screen">
      <Header onExport={() => setExportModal(true)}/>
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar/>}
        <main className="flex-1 overflow-hidden flex flex-col">
          {viewMode==='person'?<TimelineView/>:viewMode==='project'?<ProjectTimelineView/>:<AvailabilityView/>}
        </main>
      </div>
      {exportModal && <ExportModal onClose={() => setExportModal(false)} viewMode={viewMode} onSuccess={() => setToast('📷 图片已保存')}/>}
      {toast && <Toast message={toast} onClose={() => setToast(null)}/>}
    </div>
  );
}
