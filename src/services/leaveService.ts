import { queryDocuments, createDocument, updateDocument, getDocument, listenToQuery, where, orderBy, limit } from './firestoreService';
import { Leave, LeaveStatus } from '../types';
import { uploadLeaveDocument } from './storageService';

const COLLECTION = 'leaves';

export const getMyLeaves = async (userId: string): Promise<Leave[]> => {
  const leaves = await queryDocuments<Leave>(COLLECTION, [where('userId', '==', userId)]);
  return leaves.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
};

export const getAllLeaves = async (status?: LeaveStatus): Promise<Leave[]> => {
  const constraints: any[] = [];
  if (status) constraints.unshift(where('status', '==', status));
  const leaves = await queryDocuments<Leave>(COLLECTION, constraints);
  return leaves.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
};

export const applyForLeave = async (
  data: Omit<Leave, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  documentUri?: string,
  documentMimeType?: string,
  documentFileName?: string,
  onUploadProgress?: (p: number) => void
): Promise<string> => {
  const leaveId = Date.now().toString();
  let documentUrl: string | undefined;

  if (documentUri && documentMimeType && documentFileName) {
    documentUrl = await uploadLeaveDocument(
      data.userId,
      leaveId,
      documentUri,
      documentMimeType,
      documentFileName,
      onUploadProgress
    );
  }

  return createDocument<Omit<Leave, 'id'>>(COLLECTION, {
    ...data,
    documentUrl,
    documentFileName,
    status: 'pending',
  });
};

export const approveLeave = async (
  leaveId: string,
  approvedBy: string,
  adminNotes?: string,
  grantedDays?: number
): Promise<void> => {
  await updateDocument(COLLECTION, leaveId, {
    status: 'approved' as LeaveStatus,
    approvedBy,
    actionDate: new Date().toISOString(),
    adminNotes: adminNotes ?? '',
    grantedDays: grantedDays ?? null,
  });

  const leave = await getDocument<Leave>(COLLECTION, leaveId);
  if (leave) {
    await createDocument('notifications', {
      recipientId: leave.userId,
      title: '✅ Leave Approved',
      message: `Your leave request has been approved!${grantedDays ? ` (${grantedDays} days granted)` : ''}`,
      tone: 'success',
      type: 'leave_status',
      entityType: 'leave',
      entityId: leaveId,
      read: false,
    });
  }
};

export const declineLeave = async (
  leaveId: string,
  declinedBy: string,
  adminNotes?: string
): Promise<void> => {
  await updateDocument(COLLECTION, leaveId, {
    status: 'declined' as LeaveStatus,
    approvedBy: declinedBy,
    actionDate: new Date().toISOString(),
    adminNotes: adminNotes ?? '',
  });

  const leave = await getDocument<Leave>(COLLECTION, leaveId);
  if (leave) {
    await createDocument('notifications', {
      recipientId: leave.userId,
      title: '❌ Leave Declined',
      message: `Your leave request has been declined.${adminNotes ? ` Reason: ${adminNotes}` : ''}`,
      tone: 'warning',
      type: 'leave_status',
      entityType: 'leave',
      entityId: leaveId,
      read: false,
    });
  }
};

export const listenToMyLeaves = (
  userId: string,
  onUpdate: (leaves: Leave[]) => void
): (() => void) => {
  return listenToQuery<Leave>(
    COLLECTION,
    [where('userId', '==', userId)],
    (leaves) => {
      const sorted = [...leaves].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(sorted);
    }
  );
};

export const listenToPendingLeaves = (
  onUpdate: (leaves: Leave[]) => void
): (() => void) => {
  return listenToQuery<Leave>(
    COLLECTION,
    [where('status', '==', 'pending')],
    (leaves) => {
      const sorted = [...leaves].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      onUpdate(sorted);
    }
  );
};
