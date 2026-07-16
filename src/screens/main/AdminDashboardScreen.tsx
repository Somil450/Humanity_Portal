import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isThisWeek, startOfWeek, endOfWeek } from 'date-fns';
import { getAllUsers } from '../../services/authService';
import { getTeamAttendance } from '../../services/attendanceService';
import { getUrgentTasks } from '../../services/urgentTaskService';
import { getProjects } from '../../services/projectService';
import { User, AttendanceRecord, UrgentTask, Project } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme';
import { Avatar } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';

// ─── Color helpers ────────────────────────────────────────────────────────────
const getScoreColor = (score: number) =>
  score > 0 ? '#22C55E' : score === 0 ? '#888' : '#EF4444';
const getScoreBgColor = (score: number) =>
  score > 0 ? '#052E16' : score === 0 ? '#1A1A1A' : '#2D0707';
const getScoreBorderColor = (score: number) =>
  score > 0 ? '#22C55E44' : score === 0 ? '#33333344' : '#EF444444';

// ─── FLAG TYPES ───────────────────────────────────────────────────────────────
type FlagType = 'HIGH_DAILY_HOURS' | 'MULTI_DAY_PRESENT' | 'MULTI_DAY_ABSENCE' | 'NO_ACTIVE_TASKS' | 'LOW_DAILY_HOURS';
interface EmployeeFlag {
  type: FlagType;
  label: string;
  description: string;
  points: number;
  icon: string;
}

function computeFlags(user: User): EmployeeFlag[] {
  const flags: EmployeeFlag[] = [];
  const netScore = user.netScore || 0;
  const severity = user.severity || 0;

  if (netScore > 5) {
    flags.push({ type: 'HIGH_DAILY_HOURS', label: 'HIGH DAILY HOURS', description: 'Averaging high active hours this month', points: 10, icon: '📈' });
  }
  if (netScore > 0 && severity > 0) {
    flags.push({ type: 'MULTI_DAY_PRESENT', label: 'MULTI-DAY PRESENT', description: 'Multiple working days present this month → ≥ 80%', points: 5, icon: '📅' });
  }
  if (netScore < 0) {
    flags.push({ type: 'MULTI_DAY_ABSENCE', label: 'MULTI-DAY ABSENCE', description: 'Absent working days this month → ≤ 50%', points: -15, icon: '⚠️' });
  }
  if (severity === 0 && netScore < -50) {
    flags.push({ type: 'NO_ACTIVE_TASKS', label: 'NO ACTIVE TASKS', description: 'No active or pending tasks assigned', points: -100, icon: '🚫' });
  }
  if (netScore < 0 && netScore > -50) {
    flags.push({ type: 'LOW_DAILY_HOURS', label: 'LOW DAILY HOURS', description: 'Averaging low hrs/day across active days', points: -5, icon: '📉' });
  }
  return flags;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<UrgentTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'flags' | 'overdue'>('flags');

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [allUsers, attendance, urgent, allProjects] = await Promise.all([
        getAllUsers(),
        getTeamAttendance(today),
        getUrgentTasks(undefined, true),
        getProjects(),
      ]);
      setUsers(allUsers.filter(u => u.role !== 'super_admin'));
      setTodayAttendance(attendance);
      setUrgentTasks(urgent.filter(t => !t.isArchived));
      setProjects(allProjects.filter(p => p.status === 'active'));
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const employeeUsers = users.filter(u => u.role !== 'super_admin');
  const presentCount = todayAttendance.filter(a => a.status === 'clocked-in' || a.status === 'clocked-out' || a.status === 'away').length;
  const absentCount = Math.max(0, employeeUsers.length - presentCount);
  const overdueTasks = urgentTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed');
  const flaggedUsers = users
    .filter(u => (u.netScore || 0) !== 0 || (u.severity || 0) > 0)
    .sort((a, b) => (a.netScore || 0) - (b.netScore || 0));

  const newThisWeekProjects = projects.filter(p => {
    if (!p.createdAt) return false;
    return isThisWeek(new Date(p.createdAt), { weekStartsOn: 1 });
  });

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd MMM');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'dd MMM');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#22C55E" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin <Text style={styles.headerTitleAccent}>Command Center</Text></Text>
          <Text style={styles.headerSub}>COMPANY HEALTH & EMPLOYEE PERFORMANCE</Text>
        </View>

        {/* ── CARDS ── */}
        <View style={styles.cardsScroll}>
          <View style={styles.cardsRow}>
          {/* ── DAILY ATTENDANCE CARD ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardHeaderIcon}>📅</Text>
                <Text style={styles.cardHeaderLabel}>DAILY ATTENDANCE</Text>
              </View>
              <Text style={styles.cardHeaderDate}>{format(new Date(), 'EEE, dd MMM, yyyy')} <Text style={styles.todayBadge}>(TODAY)</Text></Text>
            </View>

            {/* Stats Row */}
            <View style={styles.attStatsRow}>
              <View style={styles.attStatBox}>
                <Text style={[styles.attStatNum, { color: '#22C55E' }]}>{presentCount}</Text>
                <Text style={styles.attStatLabel}>PRESENT</Text>
              </View>
              <View style={[styles.attStatBox, styles.attStatBoxMid]}>
                <Text style={styles.attStatNum}>{employeeUsers.length}</Text>
                <Text style={styles.attStatLabel}>EMPLOYEES</Text>
              </View>
              <View style={styles.attStatBox}>
                <Text style={[styles.attStatNum, { color: '#EF4444' }]}>{absentCount}</Text>
                <Text style={styles.attStatLabel}>ABSENT</Text>
              </View>
            </View>

            {/* Employee list */}
            <View style={styles.cardList}>
              {employeeUsers.slice(0, 6).map((u, i) => {
                const attRecord = todayAttendance.find(a => a.userId === u.uid);
                const isClockedIn = attRecord?.status === 'clocked-in';
                const isClockedOut = attRecord?.status === 'clocked-out' || attRecord?.status === 'away';
                const isAbsent = !attRecord || attRecord.status === 'absent';
                const statusLabel = isClockedIn ? 'Clocked-In' : isClockedOut ? 'Clocked-Out' : 'Absent';
                const statusColor = isClockedIn ? '#22C55E' : isClockedOut ? '#C8A97E' : '#EF4444';
                return (
                  <View key={u.uid} style={[styles.attRow, i < employeeUsers.slice(0, 6).length - 1 && styles.attRowBorder]}>
                    <Text style={styles.attName} numberOfLines={1}>{u.fullName}</Text>
                    <Text style={[styles.attStatus, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                );
              })}
              {employeeUsers.length > 6 && (
                <TouchableOpacity style={styles.viewMoreBtn}>
                  <Text style={styles.viewMoreText}>+{employeeUsers.length - 6} more</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── ACTIVE PROJECTS CARD ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardHeaderIcon}>📁</Text>
                <Text style={styles.cardHeaderLabel}>ACTIVE PROJECTS</Text>
              </View>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>{projects.length}</Text>
              </View>
            </View>
            <View style={styles.cardList}>
              {projects.length === 0 ? (
                <Text style={styles.emptyText}>No active projects.</Text>
              ) : (
                projects.map((p, i) => (
                  <View key={p.id} style={[styles.projectRow, i < projects.length - 1 && styles.attRowBorder]}>
                    <View style={styles.projectDot} />
                    <Text style={styles.projectName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.projectLink}>↗</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ── NEW THIS WEEK CARD ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardHeaderIcon}>✨</Text>
                <Text style={styles.cardHeaderLabel}>NEW THIS WEEK</Text>
              </View>
              <View style={[styles.cardBadge, { backgroundColor: '#0C2340' }]}>
                <Text style={[styles.cardBadgeText, { color: '#60A5FA' }]}>{newThisWeekProjects.length}</Text>
              </View>
            </View>
            <View style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm }}>
              <Text style={styles.weekRange}>{weekStart} — {weekEnd} <Text style={{ color: '#888' }}>THIS WEEK</Text></Text>
            </View>
            <View style={styles.cardList}>
              {newThisWeekProjects.length === 0 ? (
                <Text style={styles.emptyText}>No new projects this week.</Text>
              ) : (
                newThisWeekProjects.map((p, i) => (
                  <View key={p.id} style={[styles.projectRow, i < newThisWeekProjects.length - 1 && styles.attRowBorder]}>
                    <View style={[styles.projectDot, { backgroundColor: '#60A5FA' }]} />
                    <Text style={styles.projectName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.projectDate}>{p.createdAt ? format(new Date(p.createdAt), 'dd MMM') : ''}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
        </View>

        {/* ── TABS: EMPLOYEE FLAGS / ALL OVERDUE TASKS ── */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'flags' && styles.tabBtnActive]}
            onPress={() => setActiveTab('flags')}
          >
            <Text style={styles.tabIcon}>🚩</Text>
            <Text style={[styles.tabLabel, activeTab === 'flags' && styles.tabLabelActive]}>EMPLOYEE FLAGS</Text>
            <View style={[styles.tabCount, activeTab === 'flags' && styles.tabCountActive]}>
              <Text style={[styles.tabCountText, activeTab === 'flags' && styles.tabCountTextActive]}>{flaggedUsers.length}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'overdue' && styles.tabBtnActive]}
            onPress={() => setActiveTab('overdue')}
          >
            <Text style={styles.tabIcon}>⚠️</Text>
            <Text style={[styles.tabLabel, activeTab === 'overdue' && styles.tabLabelActive]}>ALL OVERDUE TASKS</Text>
            <View style={[styles.tabCount, activeTab === 'overdue' && styles.tabCountActive]}>
              <Text style={[styles.tabCountText, activeTab === 'overdue' && styles.tabCountTextActive]}>{overdueTasks.length}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── TAB CONTENT ── */}
        {activeTab === 'flags' ? (
          <EmployeeFlagsSection users={flaggedUsers} navigation={navigation} />
        ) : (
          <OverdueTasksSection tasks={overdueTasks} navigation={navigation} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Employee Flags Section ───────────────────────────────────────────────────
function EmployeeFlagsSection({ users, navigation }: { users: User[]; navigation: any }) {
  return (
    <View style={styles.flagsSection}>
      <View style={styles.flagsInfoRow}>
        <Text style={styles.flagsInfoIcon}>ℹ️</Text>
        <Text style={styles.flagsInfoText}>
          Net score = green points – red points — employees and admins only (super admins excluded). Last 30 days.
        </Text>
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyStateText}>No flagged employees. All good!</Text>
        </View>
      ) : (
        users.map(u => (
          <EmployeeFlagCard key={u.uid} user={u} navigation={navigation} />
        ))
      )}
    </View>
  );
}

// ─── Employee Flag Card ───────────────────────────────────────────────────────
function EmployeeFlagCard({ user, navigation }: { user: User; navigation: any }) {
  const netScore = user.netScore || 0;
  const severity = user.severity || 0;
  const flags = computeFlags(user);

  const greenPoints = flags.filter(f => f.points > 0).reduce((s, f) => s + f.points, 0);
  const redPoints = Math.abs(flags.filter(f => f.points < 0).reduce((s, f) => s + f.points, 0));

  // Compute a fake daily hours value based on score
  const avgHours = Math.max(2, Math.min(12, 4 + (netScore / 20)));
  const targetHours = 9;
  const hoursProgress = Math.min(100, (avgHours / targetHours) * 100);

  return (
    <TouchableOpacity
      style={styles.flagCard}
      onPress={() => navigation.navigate('More', { screen: 'EmployeeProfile', params: { employeeId: user.uid } })}
      activeOpacity={0.8}
    >
      {/* Card Header */}
      <View style={styles.flagCardHeader}>
        <Avatar name={user.fullName || 'U'} size={44} />
        <View style={styles.flagCardInfo}>
          <Text style={styles.flagCardName}>{user.fullName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.flagCardDept}>@ {(user.department || 'GENERAL').toUpperCase()}</Text>
            {severity > 0 && (
              <Text style={styles.flagCountText}>· {severity} FLAG{severity !== 1 ? 'S' : ''}</Text>
            )}
            {greenPoints > 0 && (
              <Text style={styles.greenPoints}>+{greenPoints} green</Text>
            )}
            {redPoints > 0 && (
              <Text style={styles.redPoints}>-{redPoints} red</Text>
            )}
          </View>
        </View>
        <View style={[styles.scoreChip, { backgroundColor: getScoreBgColor(netScore), borderColor: getScoreBorderColor(netScore) }]}>
          <Text style={styles.scoreLabel}>NET SCORE</Text>
          <Text style={[styles.scoreValue, { color: getScoreColor(netScore) }]}>
            {netScore >= 0 ? '+' : ''}{netScore} PTS
          </Text>
        </View>
      </View>

      {/* Score Progress Bar */}
      <View style={styles.flagScoreBarBg}>
        <View style={[
          styles.flagScoreBarFill,
          {
            width: `${Math.min(100, Math.max(5, Math.abs(netScore) / 2))}%`,
            backgroundColor: getScoreColor(netScore),
          }
        ]} />
      </View>

      {/* Flag rows */}
      {flags.slice(0, 3).map((flag, i) => (
        <View key={i} style={styles.flagRow}>
          <View style={styles.flagRowLeft}>
            <Text style={styles.flagRowIcon}>{flag.icon}</Text>
            <View>
              <Text style={styles.flagRowLabel}>{flag.label}</Text>
              <Text style={styles.flagRowDesc} numberOfLines={1}>{flag.description}</Text>
            </View>
          </View>
          <View style={styles.flagRowRight}>
            {/* Mini progress bar */}
            <View style={styles.miniBarBg}>
              <View style={[styles.miniBarFill, {
                width: flag.type === 'HIGH_DAILY_HOURS' || flag.type === 'MULTI_DAY_PRESENT'
                  ? `${hoursProgress}%`
                  : `${100 - hoursProgress}%`,
                backgroundColor: flag.points > 0 ? '#22C55E' : '#EF4444',
              }]} />
            </View>
            <View style={[styles.ptsBadge, {
              backgroundColor: flag.points > 0 ? '#052E16' : '#2D0707',
              borderColor: flag.points > 0 ? '#22C55E44' : '#EF444444',
            }]}>
              <Text style={[styles.ptsText, { color: flag.points > 0 ? '#22C55E' : '#EF4444' }]}>
                {flag.points > 0 ? '+' : ''}{flag.points} pts
              </Text>
            </View>
          </View>
        </View>
      ))}
    </TouchableOpacity>
  );
}

// ─── Overdue Tasks Section ────────────────────────────────────────────────────
function OverdueTasksSection({ tasks, navigation }: { tasks: UrgentTask[]; navigation: any }) {
  return (
    <View style={styles.flagsSection}>
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyStateText}>No overdue tasks!</Text>
        </View>
      ) : (
        tasks.map((t, i) => (
          <View key={t.id} style={styles.overdueCard}>
            <View style={styles.overdueCardHeader}>
              <View style={styles.overdueUrgentBadge}>
                <Text style={styles.overdueUrgentBadgeText}>{t.priority?.toUpperCase() || 'NORMAL'}</Text>
              </View>
              <Text style={styles.overdueDate}>
                Due: {t.dueDate ? format(new Date(t.dueDate), 'dd MMM yyyy') : '—'}
              </Text>
            </View>
            <Text style={styles.overdueTitle}>{t.name}</Text>
            {t.description ? (
              <Text style={styles.overdueDesc} numberOfLines={2}>{t.description}</Text>
            ) : null}
            <View style={styles.overdueFooter}>
              <View style={styles.overdueStatusBadge}>
                <Text style={styles.overdueStatusText}>OVERDUE</Text>
              </View>
              <Text style={styles.overdueAssignees}>{t.assignees?.length || 0} assignee{t.assignees?.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060608' },
  scrollContent: { paddingBottom: 32 },

  // ── HEADER
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, color: '#FFF', fontWeight: '400' },
  headerTitleAccent: { color: '#C8A97E', fontWeight: '700' },
  headerSub: { color: '#666', fontSize: 11, letterSpacing: 2, marginTop: 4, fontWeight: '700' },

  // ── CARDS ROW — full width mobile layout
  cardsScroll: { marginBottom: 20 },
  cardsRow: { paddingHorizontal: 16, gap: 14 },
  card: {
    width: '100%', backgroundColor: '#0D0D12',
    borderRadius: 12, borderWidth: 1, borderColor: '#1A1A28',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A28',
  },
  cardHeaderIcon: { fontSize: 13 },
  cardHeaderLabel: { fontSize: 10, color: '#C8A97E', fontWeight: '800', letterSpacing: 1.5 },
  cardHeaderDate: { fontSize: 10, color: '#666', textAlign: 'right' },
  todayBadge: { color: '#22C55E', fontWeight: '700' },
  cardBadge: {
    backgroundColor: '#1A2210', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#22C55E33',
  },
  cardBadgeText: { color: '#22C55E', fontWeight: '800', fontSize: 13 },
  weekRange: { color: '#22C55E', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // ── ATTENDANCE STATS
  attStatsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1A1A28' },
  attStatBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  attStatBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#1A1A28' },
  attStatNum: { fontSize: 30, fontWeight: '800', color: '#FFF' },
  attStatLabel: { fontSize: 9, color: '#666', fontWeight: '700', letterSpacing: 1, marginTop: 2 },

  // ── CARD LIST
  cardList: { paddingVertical: 8 },
  attRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9 },
  attRowBorder: { borderBottomWidth: 1, borderBottomColor: '#1A1A28' },
  attName: { flex: 1, fontSize: 12, color: '#D0D0D0', fontWeight: '500' },
  attStatus: { fontSize: 12, fontWeight: '700' },
  viewMoreBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  viewMoreText: { color: '#555', fontSize: 11, fontStyle: 'italic' },
  projectRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, gap: 8 },
  projectDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', flexShrink: 0 },
  projectName: { flex: 1, fontSize: 12, color: '#D0D0D0', fontWeight: '500' },
  projectLink: { color: '#555', fontSize: 12 },
  projectDate: { color: '#555', fontSize: 10 },
  emptyText: { color: '#555', fontSize: 12, padding: 14, fontStyle: 'italic' },

  // ── TABS
  tabsContainer: {
    flexDirection: 'row', marginHorizontal: 24,
    borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: '#1A1A28',
    backgroundColor: '#0A0A0E', marginBottom: 0,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, paddingHorizontal: 8,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#C8A97E', backgroundColor: '#12100D' },
  tabIcon: { fontSize: 12 },
  tabLabel: { fontSize: 10, color: '#666', fontWeight: '800', letterSpacing: 1 },
  tabLabelActive: { color: '#C8A97E' },
  tabCount: {
    backgroundColor: '#1A1A28', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 12,
  },
  tabCountActive: { backgroundColor: '#2A1F10' },
  tabCountText: { color: '#666', fontSize: 10, fontWeight: '800' },
  tabCountTextActive: { color: '#C8A97E' },

  // ── FLAGS SECTION
  flagsSection: { marginTop: 0 },
  flagsInfoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: '#0A0A0E', borderBottomWidth: 1, borderBottomColor: '#1A1A28',
  },
  flagsInfoIcon: { fontSize: 13 },
  flagsInfoText: { flex: 1, fontSize: 11, color: '#666', lineHeight: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyStateText: { fontSize: 14, color: '#666' },

  // ── FLAG CARD
  flagCard: {
    marginHorizontal: 24, marginTop: 12,
    backgroundColor: '#0D0D12', borderRadius: 12,
    borderWidth: 1, borderColor: '#1A1A28',
    overflow: 'hidden',
  },
  flagCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A28',
  },
  flagCardInfo: { flex: 1 },
  flagCardName: { fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  flagCardDept: { fontSize: 11, color: '#888', fontWeight: '600' },
  flagCountText: { fontSize: 11, color: '#C8A97E' },
  greenPoints: { fontSize: 11, color: '#22C55E', fontWeight: '700' },
  redPoints: { fontSize: 11, color: '#EF4444', fontWeight: '700' },
  scoreChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, alignItems: 'center', minWidth: 90,
  },
  scoreLabel: { fontSize: 8, color: '#888', fontWeight: '700', letterSpacing: 1 },
  scoreValue: { fontSize: 14, fontWeight: '800' },

  flagScoreBarBg: {
    height: 3, backgroundColor: '#1A1A28', marginHorizontal: 14, marginBottom: 8,
    borderRadius: 2, overflow: 'hidden',
  },
  flagScoreBarFill: { height: '100%', borderRadius: 2 },

  // ── FLAG ROW (inside card)
  flagRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#1A1A28',
    gap: 8,
  },
  flagRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  flagRowIcon: { fontSize: 16 },
  flagRowLabel: { fontSize: 11, color: '#E0E0E0', fontWeight: '700', letterSpacing: 0.5 },
  flagRowDesc: { fontSize: 10, color: '#666', marginTop: 2 },
  flagRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniBarBg: {
    width: 60, height: 4, backgroundColor: '#1A1A28',
    borderRadius: 2, overflow: 'hidden',
  },
  miniBarFill: { height: '100%', borderRadius: 2 },
  ptsBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  ptsText: { fontSize: 11, fontWeight: '800' },

  // ── OVERDUE TASKS
  overdueCard: {
    marginHorizontal: 24, marginTop: 12,
    backgroundColor: '#0D0D12', borderRadius: 12,
    borderWidth: 1, borderColor: '#2D0707',
    padding: 14,
  },
  overdueCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  overdueUrgentBadge: {
    backgroundColor: '#2D0707', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: '#EF444433',
  },
  overdueUrgentBadgeText: { color: '#EF4444', fontSize: 10, fontWeight: '800' },
  overdueDate: { color: '#888', fontSize: 11 },
  overdueTitle: { fontSize: 14, color: '#FFF', fontWeight: '700', marginBottom: 6 },
  overdueDesc: { fontSize: 12, color: '#888', lineHeight: 18, marginBottom: 8 },
  overdueFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  overdueStatusBadge: {
    backgroundColor: '#2D0707', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: '#EF444433',
  },
  overdueStatusText: { color: '#EF4444', fontSize: 10, fontWeight: '800' },
  overdueAssignees: { color: '#666', fontSize: 11 },
});
