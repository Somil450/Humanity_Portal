import { queryDocuments, createDocument, updateDocument, deleteDocument, getDocument, listenToQuery, where, orderBy, limit } from './firestoreService';
import { UrgentTask, UrgentTaskStatus, UrgentTaskAttachment, UrgentTaskTimeline } from '../types';
import { uploadUrgentTaskAttachment } from './storageService';

const COLLECTION = 'urgentTasks';

export const getUrgentTasks = async (userId?: string, adminView?: boolean): Promise<UrgentTask[]> => {
  const constraints: any[] = [];
  if (userId && !adminView) {
    constraints.unshift(where('assignees', 'array-contains', userId));
  }
  const tasks = await queryDocuments<UrgentTask>(COLLECTION, constraints);
  const filtered = tasks.filter(t => !t.isArchived);
  return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const getUrgentTask = async (taskId: string): Promise<UrgentTask | null> => {
  return getDocument<UrgentTask>(COLLECTION, taskId);
};

export const createUrgentTask = async (
  data: Omit<UrgentTask, 'id' | 'createdAt' | 'updatedAt'>,
  actorName: string
): Promise<string> => {
  const timelineEntry: UrgentTaskTimeline = {
    id: Date.now().toString(),
    actorName,
    message: `Task created by ${actorName}`,
    tone: 'info',
    createdAt: new Date().toISOString(),
  };
  const taskId = await createDocument<Omit<UrgentTask, 'id'>>(COLLECTION, {
    ...data,
    timeline: [timelineEntry],
    isArchived: false,
    order: 0,
  });

  // Create notifications for all assignees
  if (data.assignees && data.assignees.length > 0) {
    for (const assigneeUid of data.assignees) {
      await createDocument('notifications', {
        recipientId: assigneeUid,
        title: '⚡ New Urgent Task Assigned',
        message: `You've been assigned to: "${data.name}" — Priority: ${data.priority}`,
        tone: data.priority === 'critical' ? 'warning' : 'info',
        type: 'urgent_task_assigned',
        entityType: 'urgentTask',
        entityId: taskId,
        read: false,
      });
    }
  }

  return taskId;
};

export const updateUrgentTask = async (
  taskId: string,
  data: Partial<UrgentTask>,
  actorId: string,
  actorName: string,
  changeDescription: string
): Promise<void> => {
  const { id, createdAt, ...safeData } = data as any;
  const current = await getUrgentTask(taskId);
  if (!current) throw new Error('Urgent task not found');

  const timelineEntry: UrgentTaskTimeline = {
    id: Date.now().toString(),
    actorId,
    actorName,
    message: changeDescription,
    tone: 'info',
    createdAt: new Date().toISOString(),
  };

  await updateDocument(COLLECTION, taskId, {
    ...safeData,
    timeline: [...current.timeline, timelineEntry],
  });
};

export const updateUrgentTaskStatus = async (
  taskId: string,
  status: UrgentTaskStatus,
  actorId: string,
  actorName: string
): Promise<void> => {
  const current = await getUrgentTask(taskId);
  if (!current) throw new Error('Urgent task not found');

  const statusMessages: Record<UrgentTaskStatus, string> = {
    'todo': 'moved task to To Do',
    'in-progress': 'started working on task',
    'awaiting-review': 'submitted task for review',
    'completed': 'marked task as completed',
  };

  const update: any = { status };
  if (status === 'completed') update.completedAt = new Date().toISOString();

  const timelineEntry: UrgentTaskTimeline = {
    id: Date.now().toString(),
    actorId,
    actorName,
    message: `${actorName} ${statusMessages[status]}`,
    tone: status === 'completed' ? 'success' : 'info',
    createdAt: new Date().toISOString(),
  };

  await updateDocument(COLLECTION, taskId, {
    ...update,
    timeline: [...current.timeline, timelineEntry],
  });
};

export const addTimelineEntry = async (
  taskId: string,
  entry: Omit<UrgentTaskTimeline, 'id'>
): Promise<void> => {
  const current = await getUrgentTask(taskId);
  if (!current) throw new Error('Urgent task not found');
  const newEntry = { ...entry, id: Date.now().toString() };
  await updateDocument(COLLECTION, taskId, {
    timeline: [...current.timeline, newEntry],
  });
};

export const addAttachmentToUrgentTask = async (
  taskId: string,
  uri: string,
  mimeType: string,
  fileName: string,
  uploadedBy: string,
  onProgress?: (p: number) => void
): Promise<void> => {
  const downloadUrl = await uploadUrgentTaskAttachment(taskId, uri, mimeType, fileName, onProgress);
  const current = await getUrgentTask(taskId);
  if (!current) throw new Error('Urgent task not found');

  const attachment: UrgentTaskAttachment = {
    id: Date.now().toString(),
    fileName,
    contentType: mimeType,
    downloadUrl,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
  };

  await updateDocument(COLLECTION, taskId, {
    attachments: [...current.attachments, attachment],
  });
};

export const archiveUrgentTask = async (taskId: string, archivedBy: string): Promise<void> => {
  await updateDocument(COLLECTION, taskId, {
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archivedBy,
  });
};

export const listenToUrgentTasks = (
  userId: string,
  isAdmin: boolean,
  onUpdate: (tasks: UrgentTask[]) => void
): (() => void) => {
  const constraints: any[] = [];
  if (!isAdmin) constraints.unshift(where('assignees', 'array-contains', userId));
  return listenToQuery<UrgentTask>(COLLECTION, constraints, (tasks) => {
    const filtered = tasks.filter(t => !t.isArchived);
    const sorted = [...filtered].sort((a, b) => (a.order || 0) - (b.order || 0));
    onUpdate(sorted);
  });
};
