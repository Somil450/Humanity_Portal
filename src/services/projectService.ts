import { queryDocuments, createDocument, updateDocument, deleteDocument, getDocument, listenToQuery, where, orderBy, limit } from './firestoreService';
import { Project, Task, TaskStatus, TaskPriority } from '../types';

const PROJECTS_COLLECTION = 'projects';
const TASKS_COLLECTION = 'tasks';

// ─── PROJECTS ──────────────────────────────────────────────────────────────

export const getProjects = async (userId?: string, status?: string): Promise<Project[]> => {
  const constraints: any[] = [];
  if (userId) constraints.unshift(where('members', 'array-contains', userId));
  if (status) constraints.unshift(where('status', '==', status));
  const projects = await queryDocuments<Project>(PROJECTS_COLLECTION, constraints);
  return projects.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
};

export const getProject = async (projectId: string): Promise<Project | null> => {
  return getDocument<Project>(PROJECTS_COLLECTION, projectId);
};

export const createProject = async (
  data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  return createDocument<Omit<Project, 'id'>>(PROJECTS_COLLECTION, data);
};

export const updateProject = async (projectId: string, data: Partial<Project>): Promise<void> => {
  const { id, createdAt, ...safeData } = data as any;
  await updateDocument(PROJECTS_COLLECTION, projectId, safeData);
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await deleteDocument(PROJECTS_COLLECTION, projectId);
};

export const archiveProject = async (projectId: string): Promise<void> => {
  await updateDocument(PROJECTS_COLLECTION, projectId, { status: 'archived' });
};

export const addMemberToProject = async (projectId: string, userId: string, currentMembers: string[]): Promise<void> => {
  await updateDocument(PROJECTS_COLLECTION, projectId, {
    members: [...currentMembers, userId],
  });
};

export const removeMemberFromProject = async (projectId: string, userId: string, currentMembers: string[]): Promise<void> => {
  await updateDocument(PROJECTS_COLLECTION, projectId, {
    members: currentMembers.filter(m => m !== userId),
  });
};

// ─── TASKS ────────────────────────────────────────────────────────────────

export const getTasksForProject = async (projectId: string, parentTaskId?: string | null): Promise<Task[]> => {
  const constraints: any[] = [
    where('projectId', '==', projectId),
  ];
  const tasks = await queryDocuments<Task>(TASKS_COLLECTION, constraints);
  let filtered = tasks.filter(t => !t.isArchived);
  if (parentTaskId !== undefined) {
    filtered = filtered.filter(t => (t.parentTaskId ?? null) === (parentTaskId ?? null));
  }
  return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const getMyTasks = async (userId: string): Promise<Task[]> => {
  const tasks = await queryDocuments<Task>(TASKS_COLLECTION, [
    where('assignees', 'array-contains', userId),
  ]);
  const filtered = tasks.filter(t => !t.isArchived);
  return filtered.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
};

export const getTask = async (taskId: string): Promise<Task | null> => {
  return getDocument<Task>(TASKS_COLLECTION, taskId);
};

export const createTask = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return createDocument<Omit<Task, 'id'>>(TASKS_COLLECTION, data);
};

export const updateTask = async (taskId: string, data: Partial<Task>): Promise<void> => {
  const { id, createdAt, ...safeData } = data as any;
  const updatePayload: any = { ...safeData };
  if (safeData.status === 'done' && !safeData.completedAt) {
    updatePayload.completedAt = new Date().toISOString();
  }
  await updateDocument(TASKS_COLLECTION, taskId, updatePayload);
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<void> => {
  const update: any = { status };
  if (status === 'done') update.completedAt = new Date().toISOString();
  await updateDocument(TASKS_COLLECTION, taskId, update);
};

export const archiveTask = async (taskId: string, archivedBy: string): Promise<void> => {
  await updateDocument(TASKS_COLLECTION, taskId, {
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archivedBy,
  });
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await deleteDocument(TASKS_COLLECTION, taskId);
};

// Real-time project tasks
export const listenToProjectTasks = (
  projectId: string,
  onUpdate: (tasks: Task[]) => void
): (() => void) => {
  return listenToQuery<Task>(
    TASKS_COLLECTION,
    [where('projectId', '==', projectId)],
    (tasks) => {
      const filtered = tasks.filter(t => !t.isArchived);
      const sorted = [...filtered].sort((a, b) => (a.order || 0) - (b.order || 0));
      onUpdate(sorted);
    }
  );
};
