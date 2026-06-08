import Dexie, { type Table } from 'dexie';
import type { Person, Project, Requirement, Phase, Allocation } from '../types';

export class CapacityPlannerDB extends Dexie {
  persons!: Table<Person>;
  projects!: Table<Project>;
  requirements!: Table<Requirement>;
  phases!: Table<Phase>;
  allocations!: Table<Allocation>;

  constructor() {
    super('CapacityPlannerDB');
    this.version(1).stores({
      persons: 'id, name',
      projects: 'id, name',
      requirements: 'id, projectId',
      phases: 'id, requirementId',
      allocations: 'id, personId, phaseId, startDate, endDate',
    });
  }
}

export const db = new CapacityPlannerDB();
