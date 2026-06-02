import { useState, useMemo, useCallback, useRef } from 'react';
import { create } from 'zustand';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import './index.css';

dayjs.extend(isoWeek);

const STORAGE_KEY = 'team-capacity-planner';
function loadFromStorage() { try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {} return null; }
function saveToStorage(s: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ persons: s.persons, projects: s.projects, allocations: s.allocations })); } catch {} }
const saved = loadFromStorage();

const useStore = create((set, get) => ({
  persons: (saved?.persons || []) as any[],
  projects: (saved?.projects || []) as any[],
  allocations: (saved?.allocations || []) as any[],
  viewMode: 'person',
  sidebarOpen: true,
  _save: () => saveToStorage(get()),
  addPerson: (name: string) => { set((s: any) => ({ persons: [...s.persons, { id: crypto.randomUUID(), name, color: ['#4F46E5','#0891B2','#059669','#D97706','#DC2626','#7C3AED'][s.persons.length % 6] }] })); (get() as any)._save(); },
  deletePerson: (id: string) => { set((s: any) => ({ persons: s.persons.filter((p: any) => p.id !== id), allocations: s.allocations.filter((a: any) => a.personId !== id) })); (get() as any)._save(); },
  addProject: (name: string) => { set((s: any) => ({ projects: [...s.projects, { id: crypto.randomUUID(), name, color: ['#4F46E5','#0891B2','#059669','#D97706','#DC2626','#7C3AED'][s.projects.length % 6] }] })); (get() as any)._save(); },
  deleteProject: (id: string) => { set((s: any) => ({ projects: s.projects.filter((p: any) => p.id !== id), allocations: s.allocations.filter((a: any) => a.projectId !== id) })); (get() as any)._save(); },
  addAllocation: (a: any) => { set((s: any) => ({ allocations: [...s.allocations, { ...a, id: crypto.randomUUID() }] })); (get() as any)._save(); },
  updateAllocation: (id: string, data: any) => { set((s: any) => ({ allocations: s.allocations.map((a: any) => a.id === id ? { ...a, ...data } : a) })); (get() as any)._save(); },
  moveAllocation: (id: string, days: number) => { set((s: any) => ({ allocations: s.allocations.map((a: any) => { if (a.id !== id) return a; const start = dayjs(a.startDate).add(days, 'day'); const end = dayjs(a.endDate).add(days, 'day'); return { ...a, startDate: start.format('YYYY-MM-DD'), endDate: end.format('YYYY-MM-DD') }; }) })); (get() as any)._save(); },
  deleteAllocation: (id: string) => { set((s: any) => ({ allocations: s.allocations.filter((a: any) => a.id !== id) })); (get() as any)._save(); },
  setViewMode: (m: string) => set({ viewMode: m }),
  setSidebarOpen: (o: boolean) => set({ sidebarOpen: o }),
  exportData: () => { const s = get() as any; return JSON.stringify({ persons: s.persons, projects: s.projects, allocations: s.allocations }, null, 2); },
  importData: (json: string) => { try { const d = JSON.parse(json); if (d.persons && d.projects && d.allocations) { set({ persons: d.persons, projects: d.projects, allocations: d.allocations }); saveToStorage(d); return true; } } catch {} return false; },
  clearAll: () => { set({ persons: [], projects: [], allocations: [] }); localStorage.removeItem(STORAGE_KEY); },
}));

const CELL_W = 80;
const ROW_H = 36;

function generateWeeks(start: Date, count: number): string[] {
  const weeks: string[] = [];
  let d = dayjs(start).startOf('isoWeek');
  for (let i = 0; i < count; i++) { weeks.push(d.format('YYYY-MM-DD')); d = d.add(1, 'week'); }
  return weeks;
}

function Header() {
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
    </header>
  );
}

function Sidebar() {
  const persons = useStore((s: any) => s.persons);
  const projects = useStore((s: any) => s.projects);
  const addPerson = useStore((s: any) => s.addPerson);
  const deletePerson = useStore((s: any) => s.deletePerson);
  const addProject = useStore((s: any) => s.addProject);
  const deleteProject = useStore((s: any) => s.deleteProject);
  const exportData = useStore((s: any) => s.exportData);
  const importData = useStore((s: any) => s.importData);
  const clearAll = useStore((s: any) => s.clearAll);
  const [np, setNp] = useState('');
  const [npr, setNpr] = useState('');
  const handleExport = () => { const data = exportData(); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = '排期数据_' + dayjs().format('YYYYMMDD') + '.json'; a.click(); URL.revokeObjectURL(url); };
  const handleImport = () => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { const text = e.target?.result as string; if (importData(text)) { alert('导入成功！'); } else { alert('导入失败'); } }; reader.readAsText(file); } }; input.click(); };
  return (
    <aside className="w-56 bg-gray-800 text-gray-100 p-4 overflow-y-auto shrink-0">
      <section className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">人员</h3>
        <div className="flex gap-1 mb-2">
          <input value={np} onChange={e=>setNp(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&np.trim()){addPerson(np.trim());setNp('');}}} placeholder="输入姓名" className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded border-0 outline-none"/>
          <button onClick={()=>{if(np.trim()){addPerson(np.trim());setNp('');}}} className="bg-indigo-600 text-white text-sm px-2 py-1 rounded">+</button>
        </div>
        <ul className="space-y-1">{persons.map((p:any)=><li key={p.id} className="flex items-center gap-2 group"><span className="w-3 h-3 rounded-full" style={{background:p.color}}/><span className="text-sm flex-1">{p.name}</span><button onClick={()=>deletePerson(p.id)} className="text-gray-500 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100">✕</button></li>)}</ul>
      </section>
      <section className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">项目</h3>
        <div className="flex gap-1 mb-2">
          <input value={npr} onChange={e=>setNpr(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&npr.trim()){addProject(npr.trim());setNpr('');}}} placeholder="项目名称" className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded border-0 outline-none"/>
          <button onClick={()=>{if(npr.trim()){addProject(npr.trim());setNpr('');}}} className="bg-indigo-600 text-white text-sm px-2 py-1 rounded">+</button>
        </div>
        <ul className="space-y-1">{projects.map((p:any)=><li key={p.id} className="flex items-center gap-2 group"><span className="w-3 h-3 rounded-sm" style={{background:p.color}}/><span className="text-sm flex-1">{p.name}</span><button onClick={()=>deleteProject(p.id)} className="text-gray-500 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100">✕</button></li>)}</ul>
      </section>
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">数据</h3>
        <div className="flex flex-col gap-2">
          <button onClick={handleExport} className="w-full text-left text-sm text-gray-300 hover:text-white hover:bg-gray-700 px-2 py-1.5 rounded">📤 导出 JSON</button>
          <button onClick={handleImport} className="w-full text-left text-sm text-gray-300 hover:text-white hover:bg-gray-700 px-2 py-1.5 rounded">📥 导入 JSON</button>
          <button onClick={()=>{if(confirm('确定清空所有数据？'))clearAll();}} className="w-full text-left text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 px-2 py-1.5 rounded">🗑️ 清空数据</button>
        </div>
      </section>
    </aside>
  );
}

function TimelineView() {
  const persons = useStore((s: any) => s.persons);
  const projects = useStore((s: any) => s.projects);
  const allocations = useStore((s: any) => s.allocations);
  const addAllocation = useStore((s: any) => s.addAllocation);
  const deleteAllocation = useStore((s: any) => s.deleteAllocation);
  const updateAllocation = useStore((s: any) => s.updateAllocation);
  const moveAllocation = useStore((s: any) => s.moveAllocation);
  const [showModal, setShowModal] = useState<any>(null);
  const [editId, setEditId] = useState<string|null>(null);
  const dragRef = useRef<{allocId:string;startX:number}|null>(null);
  const personSidebarRef = useRef<HTMLDivElement>(null);

  const startDate = useMemo(() => dayjs().subtract(4, 'week').toDate(), []);
  const periods = useMemo(() => generateWeeks(startDate, 26), [startDate]);
  const today = dayjs().format('YYYY-MM-DD');

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

  const handlePersonTimelineScroll = useCallback(() => {
    const el = document.getElementById('person-timeline-scroll');
    if (el && personSidebarRef.current) personSidebarRef.current.scrollTop = el.scrollTop;
  }, []);

  return (
    <div className="h-full flex">
      {/* Left fixed sidebar */}
      <div className="w-32 shrink-0 flex flex-col border-r border-gray-200 bg-white z-20">
        <div className="px-3 py-2 text-sm font-medium text-gray-600 border-b border-gray-200" style={{height:41}}>人员</div>
        <div className="flex-1 overflow-hidden" ref={personSidebarRef}>
          {persons.length===0 && <div className="flex items-center justify-center h-40 text-gray-400 text-xs px-2 text-center">← 在左侧添加人员和项目，然后点击时间轴分配排期</div>}
          {persons.map((person: any) => {
            const pa = allocations.filter((a: any) => a.personId === person.id);
            const sorted = [...pa].sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));
            const lanes: any[][] = [];
            for (const alloc of sorted) { let placed = false; for (const lane of lanes) { if (alloc.startDate > lane[lane.length-1].endDate) { lane.push(alloc); placed = true; break; } } if (!placed) lanes.push([alloc]); }
            const rowH = Math.max(lanes.length, 1) * ROW_H;
            return (
              <div key={person.id} className="border-b border-gray-200 px-3 flex items-center gap-2" style={{height:rowH}}>
                <span className="w-2 h-2 rounded-full" style={{background:person.color}}/>
                <span className="text-sm truncate">{person.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right scrollable timeline */}
      <div className="flex-1 overflow-auto" id="person-timeline-scroll" onScroll={handlePersonTimelineScroll}>
        <div style={{minWidth:periods.length*CELL_W}}>
          {/* Sticky date header */}
          <div className="flex bg-white sticky top-0 z-10 border-b border-gray-200">
            {periods.map(p => <div key={p} className={`text-center px-1 py-2 text-xs ${p===today?'bg-indigo-50 font-semibold text-indigo-600':''}`} style={{minWidth:CELL_W}}>{dayjs(p).format('M/D')}</div>)}
          </div>
          {/* Timeline body rows */}
          {persons.map((person: any) => {
            const pa = allocations.filter((a: any) => a.personId === person.id);
            const sorted = [...pa].sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));
            const lanes: any[][] = [];
            for (const alloc of sorted) { let placed = false; for (const lane of lanes) { if (alloc.startDate > lane[lane.length-1].endDate) { lane.push(alloc); placed = true; break; } } if (!placed) lanes.push([alloc]); }
            const rowH = Math.max(lanes.length, 1) * ROW_H;
            return (
              <div key={person.id} className="flex relative border-b border-gray-200" style={{height:rowH,minWidth:periods.length*CELL_W}}>
                {periods.map(week => { const load = getLoad(person.id, week); const bg = load>100?'#FEE2E2':load>80?'#FEF3C7':load>0?'#ECFDF5':''; return <div key={week} className={week===today?'bg-indigo-50':''} style={{background:bg||undefined,minWidth:CELL_W,height:rowH}} onClick={()=>setShowModal({personId:person.id,date:week})} onDragOver={handleDragOver} onDrop={(e)=>handleDrop(week,e)}/>; })}
                {lanes.map((lane, li) => lane.map((alloc: any) => {
                  const proj = projects.find((p: any) => p.id === alloc.projectId);
                  if (!proj) return null;
                  const si = periods.indexOf(dayjs(alloc.startDate).startOf('isoWeek').format('YYYY-MM-DD'));
                  if (si < 0) return null;
                  const ei = periods.indexOf(dayjs(alloc.endDate).startOf('isoWeek').format('YYYY-MM-DD'));
                  if (ei < 0) return null;
                  return <div key={alloc.id} draggable onDragStart={(e)=>handleDragStart(alloc.id,e)} className="absolute h-6 rounded cursor-grab active:cursor-grabbing flex items-center px-1.5 text-white text-xs truncate hover:shadow-lg hover:z-10" style={{left:si*CELL_W,width:(ei-si+1)*CELL_W,top:li*ROW_H+6,background:proj.color}} title={proj.name+' - '+alloc.requirementName+' ('+alloc.effortPercent+'%)'} onClick={e=>{e.stopPropagation();setEditId(alloc.id);}}>{proj.name} {alloc.requirementName} {alloc.effortPercent}%</div>;
                }))}
              </div>
            );
          })}
        </div>
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

function NewAlloc({personId,date,onClose}:{personId:string;date:string;onClose:()=>void}) {
  const projects = useStore((s:any) => s.projects);
  const addAllocation = useStore((s:any) => s.addAllocation);
  const [projectId, setProjectId] = useState('');
  const [reqName, setReqName] = useState('');
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [effort, setEffort] = useState(100);
  const [duration, setDuration] = useState('custom');
  
  const handleDurationChange = (d: string) => {
    setDuration(d);
    if (d === 'custom') return;
    const start = dayjs(startDate);
    let end;
    switch(d) {
      case '1w': end = start.add(6, 'day'); break;  // 1周=7天(含开始日)
      case '2w': end = start.add(13, 'day'); break;  // 2周=14天(含开始日)
      case '1m': end = start.add(1, 'month').subtract(1, 'day'); break;  // 1个月(含开始日)
      case '2m': end = start.add(2, 'month').subtract(1, 'day'); break;
      case '3m': end = start.add(3, 'month').subtract(1, 'day'); break;
      default: return;
    }
    setEndDate(end.format('YYYY-MM-DD'));
  };
  
  const handleStartDateChange = (d: string) => {
    setStartDate(d);
    if (duration !== 'custom') {
      const start = dayjs(d);
      let end;
      switch(duration) {
        case '1w': end = start.add(6, 'day'); break;
        case '2w': end = start.add(13, 'day'); break;
        case '1m': end = start.add(1, 'month').subtract(1, 'day'); break;
        case '2m': end = start.add(2, 'month').subtract(1, 'day'); break;
        case '3m': end = start.add(3, 'month').subtract(1, 'day'); break;
        default: return;
      }
      setEndDate(end.format('YYYY-MM-DD'));
    }
  };
  
  const handleSave = () => { if (!projectId || !reqName.trim()) return; addAllocation({ personId, projectId, requirementName: reqName.trim(), startDate, endDate, effortPercent: effort }); onClose(); };
  return (<>
    <h2 className="text-base font-semibold mb-4">新建排期</h2>
    <label className="block text-sm text-gray-600 mb-1">项目</label>
    <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3"><option value="">选择项目</option>{projects.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <label className="block text-sm text-gray-600 mb-1">需求名称</label>
    <input value={reqName} onChange={e=>setReqName(e.target.value)} placeholder="需求名称" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3"/>
    <label className="block text-sm text-gray-600 mb-1">时长</label>
    <select value={duration} onChange={e=>handleDurationChange(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3">
      <option value="custom">自定义</option>
      <option value="1w">1周</option>
      <option value="2w">2周</option>
      <option value="1m">1个月</option>
      <option value="2m">2个月</option>
      <option value="3m">3个月</option>
    </select>
    <div className="flex gap-2 mb-3"><div className="flex-1"><label className="block text-sm text-gray-600 mb-1">开始</label><input type="text" value={startDate} onChange={e=>handleStartDateChange(e.target.value)} placeholder="YYYY-MM-DD" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"/></div><div className="flex-1"><label className="block text-sm text-gray-600 mb-1">结束</label><input type="text" value={endDate} onChange={e=>setEndDate(e.target.value)} placeholder="YYYY-MM-DD" disabled={duration!=='custom'} className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm ${duration!=='custom'?'bg-gray-100':''}`}/></div></div>
    <label className="block text-sm text-gray-600 mb-1">投入比例: <span className="font-semibold text-indigo-600">{effort}%</span></label>
    <input type="range" min={10} max={200} step={10} value={effort} onChange={e=>setEffort(Number(e.target.value))} className="w-full mb-4"/>
    <div className="flex gap-2 justify-end"><button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">取消</button><button onClick={handleSave} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-500">保存</button></div>
  </>);
}

function EditAlloc({id,onClose,onDelete}:{id:string;onClose:()=>void;onDelete:()=>void}) {
  const alloc = useStore((s:any) => s.allocations.find((a:any) => a.id === id));
  const updateAllocation = useStore((s:any) => s.updateAllocation);
  const projects = useStore((s:any) => s.projects);
  if (!alloc) return null;
  const proj = projects.find((p:any) => p.id === alloc.projectId);
  const [reqName, setReqName] = useState(alloc.requirementName);
  const [startDate, setStartDate] = useState(alloc.startDate);
  const [endDate, setEndDate] = useState(alloc.endDate);
  const [effort, setEffort] = useState(alloc.effortPercent);
  const [editing, setEditing] = useState(false);
  const [duration, setDuration] = useState('custom');
  
  const handleDurationChange = (d: string) => {
    setDuration(d);
    if (d === 'custom') return;
    const start = dayjs(startDate);
    let end;
    switch(d) {
      case '1w': end = start.add(6, 'day'); break;  // 1周=7天(含开始日)
      case '2w': end = start.add(13, 'day'); break;  // 2周=14天(含开始日)
      case '1m': end = start.add(1, 'month').subtract(1, 'day'); break;  // 1个月(含开始日)
      case '2m': end = start.add(2, 'month').subtract(1, 'day'); break;
      case '3m': end = start.add(3, 'month').subtract(1, 'day'); break;
      default: return;
    }
    setEndDate(end.format('YYYY-MM-DD'));
  };
  
  const handleStartDateChange = (d: string) => {
    setStartDate(d);
    if (duration !== 'custom') {
      const start = dayjs(d);
      let end;
      switch(duration) {
        case '1w': end = start.add(6, 'day'); break;
        case '2w': end = start.add(13, 'day'); break;
        case '1m': end = start.add(1, 'month').subtract(1, 'day'); break;
        case '2m': end = start.add(2, 'month').subtract(1, 'day'); break;
        case '3m': end = start.add(3, 'month').subtract(1, 'day'); break;
        default: return;
      }
      setEndDate(end.format('YYYY-MM-DD'));
    }
  };
  
  if (!editing) return (<>
    <h2 className="text-base font-semibold mb-4">排期详情</h2>
    <p className="text-sm text-gray-600 mb-1">项目: {proj?.name}</p>
    <p className="text-sm text-gray-600 mb-1">需求: {alloc.requirementName}</p>
    <p className="text-sm text-gray-600 mb-1">时间: {alloc.startDate} ~ {alloc.endDate}</p>
    <p className="text-sm text-gray-600 mb-4">投入: {alloc.effortPercent}%</p>
    <div className="flex gap-2 justify-end"><button onClick={onDelete} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded">删除</button><button onClick={()=>setEditing(true)} className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded">编辑</button><button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">关闭</button></div>
  </>);
  return (<>
    <h2 className="text-base font-semibold mb-4">编辑排期</h2>
    <p className="text-sm text-gray-600 mb-3">项目: {proj?.name}</p>
    <label className="block text-sm text-gray-600 mb-1">需求名称</label>
    <input value={reqName} onChange={e=>setReqName(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3"/>
    <label className="block text-sm text-gray-600 mb-1">时长</label>
    <select value={duration} onChange={e=>handleDurationChange(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3">
      <option value="custom">自定义</option>
      <option value="1w">1周</option>
      <option value="2w">2周</option>
      <option value="1m">1个月</option>
      <option value="2m">2个月</option>
      <option value="3m">3个月</option>
    </select>
    <div className="flex gap-2 mb-3"><div className="flex-1"><label className="block text-sm text-gray-600 mb-1">开始</label><input type="text" value={startDate} onChange={e=>handleStartDateChange(e.target.value)} placeholder="YYYY-MM-DD" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"/></div><div className="flex-1"><label className="block text-sm text-gray-600 mb-1">结束</label><input type="text" value={endDate} onChange={e=>setEndDate(e.target.value)} placeholder="YYYY-MM-DD" disabled={duration!=='custom'} className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm ${duration!=='custom'?'bg-gray-100':''}`}/></div></div>
    <label className="block text-sm text-gray-600 mb-1">投入比例: <span className="font-semibold text-indigo-600">{effort}%</span></label>
    <input type="range" min={10} max={200} step={10} value={effort} onChange={e=>setEffort(Number(e.target.value))} className="w-full mb-4"/>
    <div className="flex gap-2 justify-end"><button onClick={()=>setEditing(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">取消</button><button onClick={()=>{updateAllocation(id,{requirementName:reqName,startDate,endDate,effortPercent:effort});setEditing(false);}} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-500">保存</button></div>
  </>);
}

function ProjectTimelineView() {
  const projects = useStore((s:any) => s.projects);
  const persons = useStore((s:any) => s.persons);
  const allocations = useStore((s:any) => s.allocations);
  const projSidebarRef = useRef<HTMLDivElement>(null);
  const startDate = useMemo(() => dayjs().subtract(4, 'week').toDate(), []);
  const periods = useMemo(() => generateWeeks(startDate, 26), [startDate]);
  const today = dayjs().format('YYYY-MM-DD');
  const reqMap = useMemo(() => { const m = new Map<string, any[]>(); for (const a of allocations) { const k = a.projectId+'__'+a.requirementName; if (!m.has(k)) m.set(k, []); m.get(k)!.push(a); } return m; }, [allocations]);

  const handleProjTimelineScroll = useCallback(() => {
    const el = document.getElementById('proj-timeline-scroll');
    if (el && projSidebarRef.current) projSidebarRef.current.scrollTop = el.scrollTop;
  }, []);

  return (
    <div className="h-full flex">
      {/* Left fixed sidebar */}
      <div className="w-48 shrink-0 flex flex-col border-r border-gray-200 bg-white z-20">
        <div className="px-3 py-2 text-sm font-medium text-gray-600 border-b border-gray-200" style={{height:41}}>项目 / 需求</div>
        <div className="flex-1 overflow-hidden" ref={projSidebarRef}>
          {projects.length===0 && <div className="flex items-center justify-center h-40 text-gray-400 text-sm">暂无项目</div>}
          {projects.map((proj:any) => {
            const entries = [...reqMap.entries()].filter(([k])=>k.startsWith(proj.id+'__'));
            if (entries.length===0) return (
              <div key={proj.id} className="border-b border-gray-200 px-3 py-2 flex items-center gap-2 bg-gray-50" style={{height:ROW_H}}>
                <span className="w-3 h-3 rounded-sm" style={{background:proj.color}}/>
                <span className="text-sm font-medium">{proj.name}</span>
                <span className="text-xs text-gray-400 ml-auto">无需求</span>
              </div>
            );
            return entries.map(([key,allocs])=>{
              const reqName = key.split('__')[1];
              const sorted = [...allocs].sort((a:any,b:any)=>a.startDate.localeCompare(b.startDate));
              const lanes:any[][]=[]; for(const alloc of sorted){let placed=false;for(const lane of lanes){if(alloc.startDate>lane[lane.length-1].endDate){lane.push(alloc);placed=true;break;}}if(!placed)lanes.push([alloc]);}
              const rowH = Math.max(lanes.length,1)*ROW_H;
              return (
                <div key={key} className="border-b border-gray-200 px-3 flex items-center gap-2" style={{height:rowH}}>
                  <span className="w-2 h-2 rounded-sm" style={{background:proj.color}}/>
                  <div className="truncate">
                    <div className="text-xs text-gray-400">{proj.name}</div>
                    <div className="text-sm">{reqName}</div>
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* Right scrollable timeline */}
      <div className="flex-1 overflow-auto" id="proj-timeline-scroll" onScroll={handleProjTimelineScroll}>
        <div style={{minWidth:periods.length*CELL_W}}>
          {/* Sticky date header */}
          <div className="flex bg-white sticky top-0 z-10 border-b border-gray-200">
            {periods.map(p=><div key={p} className={`text-center px-1 py-2 text-xs ${p===today?'bg-indigo-50 font-semibold text-indigo-600':''}`} style={{minWidth:CELL_W}}>{dayjs(p).format('M/D')}</div>)}
          </div>
          {/* Timeline body rows */}
          {projects.map((proj:any) => {
            const entries = [...reqMap.entries()].filter(([k])=>k.startsWith(proj.id+'__'));
            if (entries.length===0) return <div key={proj.id} className="border-b border-gray-200" style={{height:ROW_H,minWidth:periods.length*CELL_W}}/>;
            return entries.map(([key,allocs])=>{
              const sorted = [...allocs].sort((a:any,b:any)=>a.startDate.localeCompare(b.startDate));
              const lanes:any[][]=[]; for(const alloc of sorted){let placed=false;for(const lane of lanes){if(alloc.startDate>lane[lane.length-1].endDate){lane.push(alloc);placed=true;break;}}if(!placed)lanes.push([alloc]);}
              const rowH = Math.max(lanes.length,1)*ROW_H;
              return (
                <div key={key} className="flex relative border-b border-gray-200" style={{height:rowH,minWidth:periods.length*CELL_W}}>
                  {periods.map(week=><div key={week} className={week===today?'bg-indigo-50':''} style={{minWidth:CELL_W,height:rowH}}/>)}
                  {lanes.map((lane,li)=>lane.map((alloc:any)=>{
                    const person=persons.find((p:any)=>p.id===alloc.personId);
                    if(!person)return null;
                    const si=periods.indexOf(dayjs(alloc.startDate).startOf('isoWeek').format('YYYY-MM-DD'));
                    if(si<0)return null;
                    const ei=periods.indexOf(dayjs(alloc.endDate).startOf('isoWeek').format('YYYY-MM-DD'));
                    if(ei<0)return null;
                    return <div key={alloc.id} className="absolute h-6 rounded cursor-pointer flex items-center px-1.5 text-white text-xs truncate hover:shadow-lg" style={{left:si*CELL_W,width:(ei-si+1)*CELL_W,top:li*ROW_H+6,background:proj.color}}>{person.name} {alloc.effortPercent}%</div>;
                  }))}
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

function AvailabilityView() {
  const persons = useStore((s:any) => s.persons);
  const allocations = useStore((s:any) => s.allocations);
  const weeks = useMemo(() => generateWeeks(dayjs().subtract(4,'week').toDate(), 26), []);
  const getLoad = (pid:string, ws:string) => { const we = dayjs(ws).endOf('isoWeek').format('YYYY-MM-DD'); return allocations.filter((a:any) => a.personId===pid && a.startDate<=we && a.endDate>=ws).reduce((s:number,a:any) => s+a.effortPercent, 0); };
  const getColor = (l:number) => l===0?'#ECFDF5':l<=50?'#DBEAFE':l<=80?'#FEF3C7':l<=100?'#FED7AA':'#FEE2E2';
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-2">空闲人力视图</h2>
      <p className="text-sm text-gray-500 mb-4">绿色=空闲，红色=超载</p>
      <div className="overflow-x-auto"><table className="border-collapse"><thead><tr><th className="text-left text-sm font-medium text-gray-600 px-3 py-2 border-b border-gray-200 w-24">人员</th>{weeks.map(w=><th key={w} className="text-center text-xs text-gray-500 px-2 py-2 border-b border-gray-200" style={{minWidth:64}}>{dayjs(w).format('M/D')}</th>)}</tr></thead><tbody>{persons.map((p:any)=><tr key={p.id} className="hover:bg-gray-50"><td className="px-3 py-2 border-b border-gray-200"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background:p.color}}/><span className="text-sm">{p.name}</span></div></td>{weeks.map(w=>{const l=getLoad(p.id,w);return <td key={w} className="text-center text-xs px-2 py-2 border-b border-gray-200 font-medium" style={{background:getColor(l)}}>{l>0?l+'%':'空'}</td>;})}</tr>)}</tbody></table></div>
      <div className="flex gap-4 mt-4 text-xs text-gray-500">{[ ['空闲','#ECFDF5'],['≤50%','#DBEAFE'],['≤80%','#FEF3C7'],['≤100%','#FED7AA'],['超载','#FEE2E2'] ].map(([l,c]:any)=><span key={l} className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{background:c}}/> {l}</span>)}</div>
    </div>
  );
}

export default function App() {
  const viewMode = useStore((s:any) => s.viewMode);
  const sidebarOpen = useStore((s:any) => s.sidebarOpen);
  return (
    <div className="flex flex-col h-screen">
      <Header/>
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar/>}
        <main className="flex-1 overflow-auto">{viewMode==='person'?<TimelineView/>:viewMode==='project'?<ProjectTimelineView/>:<AvailabilityView/>}</main>
      </div>
    </div>
  );
}
