// ─── Role & Status Constants ───────────────────────────────────────────────
export type UserRole = 'super_admin' | 'admin' | 'hr' | 'manager' | 'employee';
export type UserStatus = 'pending' | 'active' | 'inactive';

export const ROLES = {
  SUPER_ADMIN: 'super_admin' as UserRole,
  ADMIN: 'admin' as UserRole,
  HR: 'hr' as UserRole,
  MANAGER: 'manager' as UserRole,
  EMPLOYEE: 'employee' as UserRole,
};

export const USER_STATUS = {
  PENDING: 'pending' as UserStatus,
  ACTIVE: 'active' as UserStatus,
  INACTIVE: 'inactive' as UserStatus,
};

export const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Sales',
  'Finance',
  'Operations',
  'Design',
  'Management',
];

export const CREATION_PERMISSIONS: Record<UserRole, UserRole[]> = {
  super_admin: ['super_admin', 'admin', 'hr', 'manager', 'employee'],
  admin: ['admin', 'hr', 'manager', 'employee'],
  hr: ['manager', 'employee'],
  manager: [],
  employee: [],
};

// ─── User ──────────────────────────────────────────────────────────────────
export interface OnboardingData {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  aadhaarCardUrl?: string;
  panCardUrl?: string;
  declarationAccepted?: boolean;
  digitalSignature?: string;
  declarationDate?: string;
  completedAt?: string;
}

export interface User {
  uid: string;             // Firebase Auth UID (replaces MongoDB _id)
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  status: UserStatus;
  isTracked: boolean;
  phone?: string;
  address?: string;
  startDate?: string;
  profilePhoto?: string;   // Firebase Storage URL
  onboarding?: OnboardingData;
  clickupUserId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Attendance ────────────────────────────────────────────────────────────
export type AttendanceStatus = 'clocked-in' | 'clocked-out' | 'away' | 'absent' | 'on-leave' | 'review-paused';
export type TrackingMode = 'tracked' | 'untracked';

export interface WorkSession {
  id?: string;
  start: string;
  end?: string;
  duration?: number;
}

export interface BreakSession {
  id?: string;
  start: string;
  end?: string;
  duration?: number;
}

export interface TaskSelection {
  taskType: 'urgent' | 'project';
  taskId: string;
  taskName?: string;
  projectId?: string;
  selectedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;              // ISO date string (YYYY-MM-DD)
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  trackingMode: TrackingMode;
  activeSeconds: number;
  lastActiveAt?: string;
  sessions: WorkSession[];
  breaks: BreakSession[];
  dailyReport?: string;
  blockers?: string;
  notes?: string;
  shiftBrief?: string;
  screenshotUrl?: string;
  relatedLink?: string;
  relatedLinks?: string[];
  clockInTaskSelections: TaskSelection[];
  clockInProjectSelections: { projectId: string; projectName?: string; selectedAt?: string }[];
  clockOutCompletedTaskSelections: TaskSelection[];
  createdAt?: string;
  updatedAt?: string;
}

// ─── Project ───────────────────────────────────────────────────────────────
export type ProjectStatus = 'active' | 'completed' | 'on-hold' | 'archived';
export type ProjectType = 'internal' | 'external' | 'other';
export type ProjectOrigin = 'portal' | 'clickup';

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  members: string[];         // Array of user UIDs
  createdBy: string;
  deadline?: string;
  type: ProjectType;
  links: ProjectLink[];
  origin: ProjectOrigin;
  workspaceGroup?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Project Section ───────────────────────────────────────────────────────
export interface ProjectSection {
  id: string;
  projectId: string;
  name: string;
  order?: number;
  createdAt?: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  sectionId?: string;
  assignees: string[];       // User UIDs
  createdBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  overdueEmailSent?: boolean;
  deadlineExtended?: boolean;
  parentTaskId?: string;
  completedAt?: string;
  order?: number;
  isImportant?: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Urgent Task ───────────────────────────────────────────────────────────
export type UrgentTaskStatus = 'todo' | 'in-progress' | 'awaiting-review' | 'completed';
export type UrgentTaskPriority = 'critical' | 'high' | 'normal';

export interface UrgentTaskTimeline {
  id: string;
  actorId?: string;
  actorName?: string;
  message: string;
  tone: 'info' | 'warning' | 'success';
  createdAt: string;
}

export interface UrgentTaskAttachment {
  id: string;
  fileName: string;
  contentType: string;
  size?: number;
  downloadUrl: string;       // Firebase Storage URL (replaces Buffer)
  uploadedBy?: string;
  uploadedAt?: string;
}

export interface UrgentTask {
  id: string;
  name: string;
  description?: string;
  assignees: string[];
  assignedBy: string;
  status: UrgentTaskStatus;
  priority: UrgentTaskPriority;
  dueDate?: string;
  instructions: string[];
  references: string[];
  attachments: UrgentTaskAttachment[];
  timeline: UrgentTaskTimeline[];
  source?: string;
  completedAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  order?: number;
  isImportant?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Leave ─────────────────────────────────────────────────────────────────
export type LeaveReason = 'medical' | 'exam' | 'maternity' | 'paid' | 'unpaid' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'declined';

export interface Leave {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: LeaveReason;
  description?: string;
  documentUrl?: string;      // Firebase Storage URL
  documentFileName?: string;
  reportingManager?: string;
  managerInformed?: boolean;
  declarationAccepted?: boolean;
  digitalSignature?: string;
  status: LeaveStatus;
  approvedBy?: string;
  actionDate?: string;
  adminNotes?: string;
  grantedDays?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Notification ──────────────────────────────────────────────────────────
export type NotificationTone = 'info' | 'warning' | 'success';

export interface Notification {
  id: string;
  recipientId: string;
  triggeredById?: string;
  title: string;
  message: string;
  tone: NotificationTone;
  type?: string;
  entityType?: string;
  entityId?: string;
  read: boolean;
  readAt?: string;
  createdAt?: string;
}

// ─── Audit Log ─────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  targetUserId?: string;
  targetUser?: string;
  details?: string;
  createdAt?: string;
}

// ─── Daily Update Review ───────────────────────────────────────────────────
export interface DailyUpdateReview {
  id: string;
  attendanceId: string;
  userId: string;
  reviewerId?: string;
  reviewStatus: 'pending' | 'approved' | 'needs-improvement';
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt?: string;
}

// ─── Navigation Types ──────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Onboarding: undefined;
};

export type AppTabParamList = {
  Dashboard: undefined;
  Attendance: undefined;
  Projects: undefined;
  Leaves: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type ProjectsStackParamList = {
  ProjectsList: undefined;
  ProjectDetail: { projectId: string; projectName: string };
};

export type PeopleStackParamList = {
  PeopleList: undefined;
  EmployeeProfile: { employeeId: string };
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Notifications: undefined;
  People: undefined;
  EmployeeProfile: { employeeId: string };
  UrgentTasks: undefined;
  LeaveManagement: undefined;
  AdminDashboard: undefined;
  EmployeeOversight: undefined;
  DailyTasksReview: undefined;
  Settings: undefined;
};
