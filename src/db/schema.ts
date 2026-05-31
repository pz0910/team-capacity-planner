import Dexie, { type Table } from 'dexie';
import type { Person, Project, Requirement, Allocation } from '../types';

export class CapacityPlannerDB extends Dexie {
  persons!: Table<Person>;
  projects!: Table<Project>;
  requirements!: Table<Requirement>;
  allocations!: Table<Allocation>;

  constructor() {
    super('CapacityPlannerDB');
    this.version(1).stores({
      persons: 'id, name',
      projects: 'id, name',
      requirements: 'id, projectId, status',
      allocations: 'id, personId, requirementId, startDate, endDate',
    });
  }
}

export const db = new CapacityPlannerDB();
