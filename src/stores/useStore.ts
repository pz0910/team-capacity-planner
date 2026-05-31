import { create } from 'zustand';

const useStore = create((set) => ({
  viewMode: 'person',
  sidebarOpen: true,
  persons: [],
  projects: [],
  setViewMode: (mode) => set({ viewMode: mode }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  addPerson: (person) => set((s) => ({ persons: [...s.persons, person] })),
  deletePerson: (id) => set((s) => ({ persons: s.persons.filter((p) => p.id !== id) })),
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
  deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
  loadAll: async () => {},
}));

export default useStore;
