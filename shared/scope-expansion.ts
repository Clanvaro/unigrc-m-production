/**
 * Scope Expansion Utilities
 * 
 * Handles hierarchical expansion of audit scope entities:
 * - Subproceso: just that subproceso
 * - Proceso: proceso + all its subprocesos
 * - Macroproceso: macroproceso + all its procesos + all their subprocesos
 */

interface Process {
  id: string;
  code: string;
  name: string;
  macroprocesoId: string | null;
}

interface Subproceso {
  id: string;
  code: string;
  name: string;
  procesoId: string | null;
}

interface Macroproceso {
  id: string;
  code: string;
  name: string;
}

export interface ExpandedScopeResult {
  // All entity IDs after expansion (with type prefix like 'process-123')
  expandedEntities: string[];
  // Grouped by type for UI display
  displayGroups: {
    macroprocesos: Array<{ id: string; code: string; name: string }>;
    procesos: Array<{ id: string; code: string; name: string; isChild: boolean }>;
    subprocesos: Array<{ id: string; code: string; name: string; isChild: boolean }>;
  };
}

/**
 * Expands raw scope selections to include all hierarchical children
 * 
 * @param rawSelections - Array of selected entity IDs with type prefix (e.g., ['macroproceso-123', 'process-456'])
 * @param macroprocesos - All available macroprocesos
 * @param processes - All available processes
 * @param subprocesos - All available subprocesos
 * @returns Expanded entity list with all children included
 */
export function expandScopeEntities(
  rawSelections: string[],
  macroprocesos: Macroproceso[],
  processes: Process[],
  subprocesos: Subproceso[]
): ExpandedScopeResult {
  const expandedSet = new Set<string>();
  const displayGroups: ExpandedScopeResult['displayGroups'] = {
    macroprocesos: [],
    procesos: [],
    subprocesos: []
  };

  // Track which entities are children (auto-included) vs explicitly selected
  const childProcesses = new Set<string>();
  const childSubprocesos = new Set<string>();

  // Process each raw selection
  for (const entityId of rawSelections) {
    const firstDashIndex = entityId.indexOf('-');
    const type = entityId.substring(0, firstDashIndex);
    const id = entityId.substring(firstDashIndex + 1);

    if (type === 'macroproceso') {
      // Add the macroproceso itself
      expandedSet.add(entityId);
      const macro = macroprocesos.find(m => m.id === id);
      if (macro) {
        displayGroups.macroprocesos.push({
          id: macro.id,
          code: macro.code,
          name: macro.name
        });

        // Find and add all processes of this macroproceso
        const childProcessesOfMacro = processes.filter(p => p.macroprocesoId === id);
        for (const proc of childProcessesOfMacro) {
          const procEntityId = `process-${proc.id}`;
          expandedSet.add(procEntityId);
          childProcesses.add(proc.id);
          displayGroups.procesos.push({
            id: proc.id,
            code: proc.code,
            name: proc.name,
            isChild: true
          });

          // Find and add all subprocesos of this process
          const childSubsOfProc = subprocesos.filter(s => s.procesoId === proc.id);
          for (const sub of childSubsOfProc) {
            const subEntityId = `subproceso-${sub.id}`;
            expandedSet.add(subEntityId);
            childSubprocesos.add(sub.id);
            displayGroups.subprocesos.push({
              id: sub.id,
              code: sub.code,
              name: sub.name,
              isChild: true
            });
          }
        }
      }
    } else if (type === 'process') {
      // Add the process itself
      expandedSet.add(entityId);
      const proc = processes.find(p => p.id === id);
      if (proc) {
        displayGroups.procesos.push({
          id: proc.id,
          code: proc.code,
          name: proc.name,
          isChild: false
        });

        // Find and add all subprocesos of this process
        const childSubs = subprocesos.filter(s => s.procesoId === id);
        for (const sub of childSubs) {
          const subEntityId = `subproceso-${sub.id}`;
          expandedSet.add(subEntityId);
          childSubprocesos.add(sub.id);
          displayGroups.subprocesos.push({
            id: sub.id,
            code: sub.code,
            name: sub.name,
            isChild: true
          });
        }
      }
    } else if (type === 'subproceso') {
      // Add only the subproceso itself
      expandedSet.add(entityId);
      const sub = subprocesos.find(s => s.id === id);
      if (sub) {
        displayGroups.subprocesos.push({
          id: sub.id,
          code: sub.code,
          name: sub.name,
          isChild: false
        });
      }
    }
  }

  return {
    expandedEntities: Array.from(expandedSet),
    displayGroups
  };
}

/**
 * Removes child selections when parent is selected to avoid duplicates
 * 
 * @param selections - Current selection array
 * @param entityId - Entity being toggled
 * @param isSelected - Whether it's being selected or deselected
 * @param macroprocesos - All macroprocesos
 * @param processes - All processes
 * @param subprocesos - All subprocesos
 * @returns Cleaned selection array
 */
export function sanitizeSelections(
  selections: string[],
  entityId: string,
  isSelected: boolean,
  macroprocesos: Macroproceso[],
  processes: Process[],
  subprocesos: Subproceso[]
): string[] {
  const firstDashIndex = entityId.indexOf('-');
  const type = entityId.substring(0, firstDashIndex);
  const id = entityId.substring(firstDashIndex + 1);

  let newSelections = [...selections];

  if (isSelected) {
    // Add the entity
    newSelections.push(entityId);

    // Remove children to avoid redundancy
    if (type === 'macroproceso') {
      // Remove all processes and subprocesos of this macro
      const childProcesses = processes.filter(p => p.macroprocesoId === id);
      const childProcessIds = childProcesses.map(p => `process-${p.id}`);
      newSelections = newSelections.filter(s => !childProcessIds.includes(s));

      // Remove all subprocesos of child processes
      for (const proc of childProcesses) {
        const childSubs = subprocesos.filter(s => s.procesoId === proc.id);
        const childSubIds = childSubs.map(s => `subproceso-${s.id}`);
        newSelections = newSelections.filter(s => !childSubIds.includes(s));
      }
    } else if (type === 'process') {
      // Remove all subprocesos of this process
      const childSubs = subprocesos.filter(s => s.procesoId === id);
      const childSubIds = childSubs.map(s => `subproceso-${s.id}`);
      newSelections = newSelections.filter(s => !childSubIds.includes(s));
    }
  } else {
    // Remove the entity
    newSelections = newSelections.filter(s => s !== entityId);
  }

  return newSelections;
}
