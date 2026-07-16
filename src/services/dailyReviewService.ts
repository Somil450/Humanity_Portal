import { queryDocuments, createDocument, updateDocument, where, getDocument } from './firestoreService';
import { AttendanceRecord, DailyUpdateReview, User } from '../types';
import { getAllUsers } from './authService';

const ATTENDANCE_COLLECTION = 'attendance';
const REVIEW_COLLECTION = 'dailyUpdateReviews';

export interface PendingReview {
  attendance: AttendanceRecord;
  user: User;
  reviewStatus: 'pending' | 'approved' | 'declined';
  reviewId?: string;
}

// Fetch all attendance records with daily reports that are either pending or already reviewed
export const getPendingReviews = async (): Promise<PendingReview[]> => {
  // Fetch clocked-out attendance records
  const attendanceRecords = await queryDocuments<AttendanceRecord>(ATTENDANCE_COLLECTION, [
    where('status', '==', 'clocked-out'),
    // Note: In Firestore, it's hard to filter "dailyReport is not empty", 
    // so we fetch all clocked-out and filter client-side. 
    // In a production app with huge data, consider a boolean flag 'hasDailyReport'.
  ]);

  // Filter records that actually have a report
  const recordsWithReports = attendanceRecords.filter(
    (record) => record.dailyReport && record.dailyReport.trim().length > 0
  );

  if (recordsWithReports.length === 0) return [];

  // Sort by date descending
  recordsWithReports.sort((a, b) => b.date.localeCompare(a.date));

  // Get all users to map user details
  const allUsers = await getAllUsers();
  const userMap = new Map<string, User>();
  allUsers.forEach((u) => userMap.set(u.uid, u));

  // Get existing reviews for these attendance records
  // We can fetch all reviews, or specifically query if we have a way. 
  // For simplicity, we fetch all reviews and map them.
  const allReviews = await queryDocuments<DailyUpdateReview>(REVIEW_COLLECTION, []);
  const reviewMap = new Map<string, DailyUpdateReview>();
  allReviews.forEach((r) => reviewMap.set(r.attendanceId, r));

  const pendingReviews: PendingReview[] = recordsWithReports.map((record) => {
    const existingReview = reviewMap.get(record.id);
    // Determine status from review, or 'pending' if no review exists
    let status: 'pending' | 'approved' | 'declined' = 'pending';
    if (existingReview) {
       // Our DailyUpdateReview type has 'needs-improvement', we'll map that to 'declined' in UI
       if (existingReview.reviewStatus === 'approved') status = 'approved';
       else if (existingReview.reviewStatus === 'needs-improvement') status = 'declined';
       else status = 'pending';
    }

    return {
      attendance: record,
      user: userMap.get(record.userId) as User,
      reviewStatus: status,
      reviewId: existingReview?.id,
    };
  });

  return pendingReviews;
};

// Submit a review for a daily update
export const submitReview = async (
  attendanceId: string,
  userId: string,
  reviewerId: string,
  status: 'approved' | 'needs-improvement',
  notes?: string
): Promise<string> => {
  const now = new Date().toISOString();

  // Check if review already exists
  const existingReviews = await queryDocuments<DailyUpdateReview>(REVIEW_COLLECTION, [
    where('attendanceId', '==', attendanceId),
  ]);

  if (existingReviews.length > 0) {
    // Update existing
    const reviewId = existingReviews[0].id;
    await updateDocument(REVIEW_COLLECTION, reviewId, {
      reviewStatus: status,
      reviewerId,
      reviewNotes: notes,
      reviewedAt: now,
    });
    return reviewId;
  } else {
    // Create new
    const reviewId = await createDocument<Omit<DailyUpdateReview, 'id'>>(REVIEW_COLLECTION, {
      attendanceId,
      userId,
      reviewerId,
      reviewStatus: status,
      reviewNotes: notes,
      reviewedAt: now,
      createdAt: now,
    });
    return reviewId;
  }
};
