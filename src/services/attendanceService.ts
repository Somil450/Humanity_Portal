import { queryDocuments, createDocument, updateDocument, deleteDocument, getDocument, listenToQuery, where, orderBy, limit } from './firestoreService';
import { AttendanceRecord, AttendanceStatus, TaskSelection } from '../types';

const COLLECTION = 'attendance';

// ─── Get Today's Attendance (replaces GET /api/attendance/today) ──────────
export const getTodayAttendance = async (userId: string): Promise<AttendanceRecord | null> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const results = await queryDocuments<AttendanceRecord>(COLLECTION, [
    where('userId', '==', userId),
    where('date', '==', today),
    limit(1),
  ]);
  return results[0] ?? null;
};

// ─── Clock In (replaces POST /api/attendance/clock-in) ────────────────────
export const clockIn = async (
  userId: string,
  taskSelections: TaskSelection[] = [],
  projectSelections: { projectId: string; projectName?: string }[] = []
): Promise<string> => {
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  // Check for existing record
  const existing = await getTodayAttendance(userId);

  if (existing) {
    // Resume from away/clocked-out
    const updatedSessions = [
      ...existing.sessions,
      { start: now },
    ];
    await updateDocument(COLLECTION, existing.id, {
      status: 'clocked-in' as AttendanceStatus,
      clockIn: existing.clockIn ?? now,
      lastActiveAt: now,
      sessions: updatedSessions,
    });
    return existing.id;
  } else {
    // New record
    const id = await createDocument<Omit<AttendanceRecord, 'id'>>(COLLECTION, {
      userId,
      date: today,
      clockIn: now,
      status: 'clocked-in',
      trackingMode: 'tracked',
      activeSeconds: 0,
      lastActiveAt: now,
      sessions: [{ start: now }],
      breaks: [],
      dailyReport: '',
      blockers: '',
      notes: '',
      clockInTaskSelections: taskSelections,
      clockInProjectSelections: projectSelections.map(p => ({
        ...p,
        selectedAt: now,
      })),
      clockOutCompletedTaskSelections: [],
    });
    return id;
  }
};

// ─── Clock Out (replaces POST /api/attendance/clock-out) ──────────────────
export const clockOut = async (
  attendanceId: string,
  report: string,
  blockers: string,
  notes: string,
  completedTaskSelections: TaskSelection[] = []
): Promise<void> => {
  const record = await getDocument<AttendanceRecord>(COLLECTION, attendanceId);
  if (!record) throw new Error('Attendance record not found');

  const now = new Date().toISOString();
  const lastActive = record.lastActiveAt ? new Date(record.lastActiveAt) : new Date(record.clockIn!);
  const elapsedSeconds = Math.floor((Date.now() - lastActive.getTime()) / 1000);

  // Close last open session
  const sessions = record.sessions.map((s, i) => {
    if (i === record.sessions.length - 1 && !s.end) {
      return { ...s, end: now, duration: elapsedSeconds };
    }
    return s;
  });

  await updateDocument(COLLECTION, attendanceId, {
    status: 'clocked-out' as AttendanceStatus,
    clockOut: now,
    activeSeconds: (record.activeSeconds ?? 0) + elapsedSeconds,
    lastActiveAt: null,
    sessions,
    dailyReport: report,
    blockers,
    notes,
    clockOutCompletedTaskSelections: completedTaskSelections,
  });
};

// ─── Go on Break/Away (replaces POST /api/attendance/away) ────────────────
export const goAway = async (attendanceId: string): Promise<void> => {
  const record = await getDocument<AttendanceRecord>(COLLECTION, attendanceId);
  if (!record) throw new Error('Attendance record not found');

  const now = new Date().toISOString();
  const lastActive = record.lastActiveAt ? new Date(record.lastActiveAt) : new Date(record.clockIn!);
  const elapsedSeconds = Math.floor((Date.now() - lastActive.getTime()) / 1000);

  // Close last session
  const sessions = record.sessions.map((s, i) => {
    if (i === record.sessions.length - 1 && !s.end) {
      return { ...s, end: now, duration: elapsedSeconds };
    }
    return s;
  });

  await updateDocument(COLLECTION, attendanceId, {
    status: 'away' as AttendanceStatus,
    activeSeconds: (record.activeSeconds ?? 0) + elapsedSeconds,
    lastActiveAt: null,
    sessions,
    breaks: [...record.breaks, { start: now }],
  });
};

// ─── Resume from Break (replaces POST /api/attendance/resume) ─────────────
export const resumeFromBreak = async (attendanceId: string): Promise<void> => {
  const record = await getDocument<AttendanceRecord>(COLLECTION, attendanceId);
  if (!record) throw new Error('Attendance record not found');

  const now = new Date().toISOString();

  // Close last open break
  const breaks = record.breaks.map((b, i) => {
    if (i === record.breaks.length - 1 && !b.end) {
      const dur = Math.floor((Date.now() - new Date(b.start).getTime()) / 1000);
      return { ...b, end: now, duration: dur };
    }
    return b;
  });

  await updateDocument(COLLECTION, attendanceId, {
    status: 'clocked-in' as AttendanceStatus,
    lastActiveAt: now,
    sessions: [...record.sessions, { start: now }],
    breaks,
  });
};

// ─── Get Attendance History (replaces GET /api/attendance/history) ─────────
export const getAttendanceHistory = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<AttendanceRecord[]> => {
  // Fetch all for user to avoid composite index (userId + date) requirement
  const records = await queryDocuments<AttendanceRecord>(COLLECTION, [
    where('userId', '==', userId)
  ]);
  
  let filtered = records;
  if (startDate) filtered = filtered.filter(r => r.date >= startDate);
  if (endDate) filtered = filtered.filter(r => r.date <= endDate);
  
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
};

// ─── Get Team Attendance (admin - replaces GET /api/attendance/team) ───────
export const getTeamAttendance = async (date: string): Promise<AttendanceRecord[]> => {
  // Fetch by date, sort client-side to avoid composite index requirement
  const records = await queryDocuments<AttendanceRecord>(COLLECTION, [
    where('date', '==', date)
  ]);
  
  return records.sort((a, b) => (a.clockIn || '').localeCompare(b.clockIn || ''));
};

// ─── Real-time listener for current user's today record ───────────────────
export const listenToTodayAttendance = (
  userId: string,
  onUpdate: (record: AttendanceRecord | null) => void
): (() => void) => {
  const today = new Date().toISOString().split('T')[0];
  return listenToQuery<AttendanceRecord>(
    COLLECTION,
    [where('userId', '==', userId), where('date', '==', today), limit(1)],
    (records) => onUpdate(records[0] ?? null)
  );
};

// ─── Mark Attendance Untracked (replaces PATCH /api/attendance/untracked) ──
export const markUntrackedAttendance = async (
  userId: string,
  date: string,
  report: string
): Promise<string> => {
  const existing = await getTodayAttendance(userId);
  if (existing) {
    await updateDocument(COLLECTION, existing.id, {
      trackingMode: 'untracked',
      status: 'clocked-out' as AttendanceStatus,
      dailyReport: report,
    });
    return existing.id;
  }
  return createDocument<Omit<AttendanceRecord, 'id'>>(COLLECTION, {
    userId,
    date,
    status: 'clocked-out',
    trackingMode: 'untracked',
    activeSeconds: 0,
    sessions: [],
    breaks: [],
    dailyReport: report,
    blockers: '',
    notes: '',
    clockInTaskSelections: [],
    clockInProjectSelections: [],
    clockOutCompletedTaskSelections: [],
  });
};


