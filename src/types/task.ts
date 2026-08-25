export type LinkType = 'FS' | 'SS' | 'FF' | 'SF';

export interface Predecessor {
  taskUid: string;
  type: LinkType;
  lagDays: number;
}

export interface Task {
  /** Stable internal identifier, never changes. Used for predecessor references. */
  uid: string;
  /** Hierarchical display id (1, 1.1, 1.2, 2...), recomputed on every reorder/indent. */
  id: string;
  parentUid: string | null;
  /** Sibling order under the same parent. */
  order: number;
  name: string;
  quantity?: number;
  unit?: string;
  /** 0 = hito (milestone). Ignored for summary/chapter rows (derived from children instead). */
  durationDays: number;
  startDate: string;
  endDate: string;
  /** When true, startDate is user-fixed instead of computed from predecessors. */
  manualStart: boolean;
  predecessors: Predecessor[];
  percentComplete: number;
  colorKey?: string;
  /** Set by the schedule engine when a manual start violates a predecessor constraint. */
  conflictWarning?: string;
  /** Set by the CPM engine. */
  slackDays?: number;
  isCritical?: boolean;
}
