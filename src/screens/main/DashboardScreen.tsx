import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
  Platform, FlatList, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenToTodayAttendance, clockIn, clockOut, getAttendanceHistory,
} from '../../services/attendanceService';
import { getMyTasks, getProjects } from '../../services/projectService';
import { listenToUrgentTasks } from '../../services/urgentTaskService';
import { AttendanceRecord, Task, UrgentTask, Project } from '../../types';
import { format } from 'date-fns';

// ─── Greeting Helper ─────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Motivational Quote logic ─────────────────────────────────────────────────
const POSITIVE_QUOTES = [
  '"Your dedication and consistency haven\'t gone unnoticed. You\'re setting the bar high for the team, and great things are coming your way. Keep up the excellent work!"',
  '"You\'re doing an outstanding job! Your commitment to quality is what sets this team apart. Thank you for everything."',
];
const WARNING_QUOTES = [
  '"We\'ve noticed you\'ve been falling behind lately, and we want to see you bounce back. You have the potential to do better — let\'s refocus, prioritize your tasks, and finish strong. We\'re rooting for you!"',
];

// ─── Project Avatar colors ────────────────────────────────────────────────────
const AVATAR_COLORS = ['#7C3AED', '#059669', '#2563EB', '#D97706', '#DC2626', '#0891B2'];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  // ── Data state
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<UrgentTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Timer
  const [liveSeconds, setLiveSeconds] = useState(0);

  // ── Clock-in flow modals
  const [showPlanDay, setShowPlanDay] = useState(false);
  const [showAccuracyNotice, setShowAccuracyNotice] = useState(false);
  const [planSelectedTasks, setPlanSelectedTasks] = useState<Task[]>([]);
  const [planProjectFilter, setPlanProjectFilter] = useState<string>('all');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);

  // ── Clock-out flow modal
  const [showClockOut, setShowClockOut] = useState(false);
  const [clockOutTab, setClockOutTab] = useState<'today' | 'all'>('today');
  const [clockOutCompleted, setClockOutCompleted] = useState<string[]>([]);
  const [workSummary, setWorkSummary] = useState('');
  const [relatedLink, setRelatedLink] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [tasks, userProjects, hist] = await Promise.all([
        getMyTasks(user.uid),
        getProjects(user.uid),
        getAttendanceHistory(user.uid),
      ]);
      setMyTasks(tasks.filter(t => !t.isArchived));
      setProjects(userProjects.filter(p => p.status === 'active'));
      setHistory(hist.slice(0, 5));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubAttendance = listenToTodayAttendance(user.uid, (record) => {
      setAttendance(record);
      setLiveSeconds(record?.activeSeconds || 0);
      setLoading(false);
    });
    const unsubUrgent = listenToUrgentTasks(user.uid, false, (tasks) => {
      setUrgentTasks(tasks.filter(t => t.status !== 'completed' && !t.isArchived));
    });
    loadData();
    return () => { unsubAttendance(); unsubUrgent(); };
  }, [user]);

  // ── Live timer
  const clockStatus = attendance?.status;
  const isClocked = clockStatus === 'clocked-in' || clockStatus === 'away';
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isClocked) {
      interval = setInterval(() => setLiveSeconds(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isClocked]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); };

  // ── Formatters
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatHours = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Derived data
  const overdueUrgent = urgentTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
  const openUrgent = urgentTasks.filter(t => !t.dueDate || new Date(t.dueDate) >= new Date());
  const roleLabel = (user?.role || 'employee').replace('_', ' ').toUpperCase();
  const deptLabel = (user?.department || '').toUpperCase();
  const firstName = user?.fullName?.split(' ')[0] || 'User';

  const workspaceActive = isClocked;
  const workspaceTasks = myTasks.filter(t => t.status !== 'done');
  const inProgressTasks = myTasks.filter(t => t.status === 'in-progress');
  const doneTasks = myTasks.filter(t => t.status === 'done');

  // ── Quote logic
  const netScore = user?.netScore || 0;
  const quotes = netScore < 0 ? WARNING_QUOTES : POSITIVE_QUOTES;
  const quote = quotes[0];
  const quoteColor = netScore < 0 ? '#EF4444' : '#22C55E';

  // ── Plan Your Day helpers
  const filteredPlanTasks = myTasks.filter(t => {
    const statusOk = t.status !== 'done';
    const projOk = planProjectFilter === 'all' || t.projectId === planProjectFilter;
    return statusOk && projOk;
  });

  const togglePlanTask = (task: Task) => {
    setPlanSelectedTasks(prev =>
      prev.some(t => t.id === task.id)
        ? prev.filter(t => t.id !== task.id)
        : [...prev, task]
    );
  };

  const handleOpenPlanDay = () => {
    setPlanSelectedTasks([]);
    setPlanProjectFilter('all');
    setShowPlanDay(true);
  };

  const handleProceedClockIn = () => {
    setShowPlanDay(false);
    setShowAccuracyNotice(true);
  };

  const handleConfirmClockIn = async () => {
    if (!user) return;
    setShowAccuracyNotice(false);
    setClockLoading(true);
    try {
      const taskSels = planSelectedTasks.map(t => ({
        taskType: 'project' as const,
        taskId: t.id,
        taskName: t.name,
        projectId: t.projectId,
        selectedAt: new Date().toISOString(),
      }));
      const projSels = [...new Set(planSelectedTasks.map(t => t.projectId))]
        .filter(Boolean)
        .map(pid => {
          const proj = projects.find(p => p.id === pid);
          return { projectId: pid!, projectName: proj?.name };
        });
      await clockIn(user.uid, taskSels, projSels);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to clock in.');
    } finally {
      setClockLoading(false);
    }
  };

  // ── Clock Out helpers
  const handleOpenClockOut = () => {
    setClockOutCompleted([]);
    setWorkSummary('');
    setRelatedLink('');
    setClockOutTab('today');
    setShowClockOut(true);
  };

  const toggleClockOutTask = (taskId: string) => {
    setClockOutCompleted(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSubmitClockOut = async () => {
    if (!attendance) return;
    if (workSummary.trim().length < 20) {
      Alert.alert('Work Summary Required', 'Please enter at least 20 characters for your work summary.');
      return;
    }
    setClockLoading(true);
    try {
      const completedTaskSels = clockOutCompleted.map(id => {
        const t = myTasks.find(t => t.id === id);
        return { taskType: 'project' as const, taskId: id, taskName: t?.name, projectId: t?.projectId };
      });
      await clockOut(attendance.id, workSummary.trim(), '', relatedLink.trim(), completedTaskSels);
      setShowClockOut(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to clock out.');
    } finally {
      setClockLoading(false);
    }
  };

  const todaySelectedTasks = planSelectedTasks;
  const clockOutTasksToShow = clockOutTab === 'today'
    ? myTasks.filter(t => planSelectedTasks.some(pt => pt.id === t.id))
    : myTasks;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#C8A97E" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C8A97E" />}
      >
        {/* ── HERO SECTION ── */}
        <View style={styles.heroSection}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroDate}>📅 {format(new Date(), 'EEEE, dd MMM yyyy').toUpperCase()}</Text>
            <Text style={styles.heroGreeting}>
              {getGreeting()}, <Text style={styles.heroName}>{firstName}</Text>
            </Text>
            <View style={styles.heroTags}>
              {deptLabel ? (
                <View style={styles.tag}><Text style={styles.tagText}>{deptLabel}</Text></View>
              ) : null}
              <View style={styles.tagGold}><Text style={styles.tagGoldText}>{roleLabel}</Text></View>
              {!isClocked && (
                <View style={styles.tagMuted}><Text style={styles.tagMutedText}>● NOT CLOCKED IN</Text></View>
              )}
              {isClocked && (
                <View style={styles.tagGreen}>
                  <View style={styles.tagDot} />
                  <Text style={styles.tagGreenText}>WORKING</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.quoteBox, { borderColor: netScore < 0 ? '#3D0000' : '#0D2A0D' }]}>
            <Text style={[styles.quoteText, { color: quoteColor }]}>{quote}</Text>
          </View>
        </View>

        {/* ── CARDS SECTION ── */}
        <View style={styles.cardsScroll}>
          <View style={styles.cardsRow}>
          {/* ATTENDANCE CARD */}
          <View style={[styles.card, styles.attendanceCard]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardIcon}>🕒</Text>
                <View>
                  <Text style={styles.cardTitle}>ATTENDANCE</Text>
                  <Text style={styles.cardSub}>Start today with planned tasks</Text>
                </View>
              </View>
            </View>

            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(liveSeconds)}</Text>
              <Text style={styles.timerLabel}>{isClocked ? 'RUNNING TIME' : 'NOT CLOCKED IN'}</Text>
            </View>

            <View style={styles.clockActions}>
              {clockLoading ? (
                <ActivityIndicator color="#C8A97E" />
              ) : isClocked ? (
                <>
                  <TouchableOpacity style={styles.clockOutBtnGold} onPress={handleOpenClockOut}>
                    <Text style={styles.clockOutBtnGoldText}>⏹ CLOCK OUT</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.clockInBtn} onPress={handleOpenPlanDay}>
                    <Text style={styles.clockInBtnText}>🕒 CLOCK IN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.clockOutBtnOutline}>
                    <Text style={styles.clockOutBtnOutlineText}>CLOCK OUT</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* NEEDS ATTENTION CARD */}
          <View style={[styles.card, styles.attentionCard]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardIcon}>⚠️</Text>
                <Text style={styles.cardTitle}>NEEDS ATTENTION</Text>
              </View>
              <View style={styles.dangerBadge}>
                <Text style={styles.dangerBadgeText}>{urgentTasks.length}</Text>
              </View>
            </View>

            <View style={styles.attentionGrid}>
              <View style={styles.attentionBox}>
                <Text style={styles.attentionSubLabel}>OVERDUE</Text>
                <Text style={[styles.attentionValue, { color: '#EF4444' }]}>{overdueUrgent.length}</Text>
                <Text style={styles.attentionSub}>Past due tasks</Text>
              </View>
              <View style={[styles.attentionBox, { borderLeftWidth: 1, borderLeftColor: '#1F1F2A' }]}>
                <Text style={styles.attentionSubLabel}>URGENT</Text>
                <Text style={[styles.attentionValue, { color: '#F0C040' }]}>{openUrgent.length}</Text>
                <Text style={styles.attentionSub}>Open urgent tasks</Text>
              </View>
            </View>

            <View style={{ gap: 0 }}>
              {urgentTasks.slice(0, 3).map((t, i) => {
                const proj = projects.find(p => t.source === p.id || t.source === p.name);
                return (
                  <View key={t.id} style={[styles.urgentRow, i < 2 && styles.urgentRowBorder]}>
                    <View style={[styles.urgentDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.urgentName} numberOfLines={1}>{t.name}</Text>
                    <Text style={styles.urgentProject}>{t.source?.toUpperCase() || 'TASK'}</Text>
                  </View>
                );
              })}
              {urgentTasks.length === 0 && (
                <Text style={styles.emptyText}>No urgent items. All clear! 🎉</Text>
              )}
            </View>
          </View>

          {/* ACTIVE PROJECTS CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardIcon}>📁</Text>
                <Text style={styles.cardTitle}>ACTIVE PROJECTS</Text>
              </View>
              <View style={styles.neutralBadge}>
                <Text style={styles.neutralBadgeText}>{projects.length}</Text>
              </View>
            </View>

            <View style={{ gap: 0 }}>
              {projects.slice(0, 5).map((p, i) => {
                const color = getAvatarColor(p.name);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.projectRow, i < projects.slice(0, 5).length - 1 && styles.urgentRowBorder]}
                    onPress={() => navigation.navigate('More', { screen: 'ProjectWorkspace', params: { projectId: p.id, projectName: p.name } })}
                  >
                    <View style={[styles.projectAvatar, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                      <Text style={[styles.projectAvatarText, { color }]}>{p.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.urgentName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.arrowIcon}>→</Text>
                  </TouchableOpacity>
                );
              })}
              {projects.length === 0 && (
                <Text style={styles.emptyText}>No active projects.</Text>
              )}
            </View>

            {projects.length > 5 && (
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('Projects')}>
                <Text style={styles.viewAllText}>VIEW ALL →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        </View>

        {/* ── DAILY TASK WORKSPACE ── */}
        <View style={styles.workspaceSection}>
          <View style={styles.workspaceHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#C8A97E', fontSize: 14 }}>☑</Text>
              <Text style={styles.workspaceTitle}>DAILY TASK WORKSPACE</Text>
              <View style={[styles.wLockedBadge, workspaceActive && styles.wActiveBadge]}>
                <Text style={[styles.wLockedText, workspaceActive && styles.wActiveText]}>
                  {workspaceActive ? '🔓 WORKSPACE ACTIVE' : '🔒 WORKSPACE LOCKED'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <TouchableOpacity style={styles.addTaskBtn} onPress={() => navigation.navigate('Projects')}>
                <Text style={styles.addTaskText}>+ ADD TASK</Text>
              </TouchableOpacity>
              <View style={styles.wStat}><Text style={styles.wStatText}>TOTAL: {workspaceTasks.length}</Text></View>
              <View style={[styles.wStat, { borderColor: '#C8A97E22' }]}>
                <Text style={[styles.wStatText, { color: '#C8A97E' }]}>▷ IN PROGRESS: {inProgressTasks.length}</Text>
              </View>
              <View style={[styles.wStat, { borderColor: '#22C55E22' }]}>
                <Text style={[styles.wStatText, { color: '#22C55E' }]}>✓ COMPLETED: {doneTasks.length}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.workspaceSub}>
            Keep work focused by updating each selected task as{' '}
            <Text style={{ color: '#C8A97E' }}>In Progress</Text> or{' '}
            <Text style={{ color: '#22C55E' }}>Completed</Text>
          </Text>

          <View style={{ marginTop: 16 }}>
            {!workspaceActive ? (
              <View style={styles.workspaceLocked}>
                <Text style={styles.workspaceLockedText}>
                  No daily tasks yet. Select tasks in planner and clock in to activate your workspace.
                </Text>
              </View>
            ) : workspaceTasks.length === 0 ? (
              <View style={styles.workspaceLocked}>
                <Text style={styles.workspaceLockedText}>No tasks assigned right now.</Text>
              </View>
            ) : (
              workspaceTasks.map((t) => {
                const proj = projects.find(p => p.id === t.projectId);
                return (
                  <View key={t.id} style={styles.taskItem}>
                    <View style={styles.taskRadio} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskProject}>{proj?.name?.toUpperCase() || 'TASK'}</Text>
                      <Text style={styles.taskNameFull}>{t.name}</Text>
                    </View>
                    <View style={[styles.taskStatusChip, t.status === 'in-progress' && styles.taskStatusChipActive]}>
                      <Text style={[styles.taskStatusText, t.status === 'in-progress' && styles.taskStatusTextActive]}>
                        {t.status === 'in-progress' ? 'IN PROGRESS' : 'TO DO'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* ── RECENT HISTORY ── */}
        <View style={styles.workspaceSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Text style={{ color: '#C8A97E', fontSize: 14 }}>🕒</Text>
            <Text style={styles.workspaceTitle}>RECENT HISTORY</Text>
          </View>
          <View style={styles.historyTable}>
            <View style={styles.historyHeaderRow}>
              <Text style={[styles.historyCol, styles.historyHeader]}>DATE</Text>
              <Text style={[styles.historyCol, styles.historyHeader]}>HOURS</Text>
              <Text style={[styles.historyCol, styles.historyHeader]}>STATUS</Text>
              <Text style={[styles.historyCol, styles.historyHeader, { flex: 2 }]}>SUMMARY</Text>
            </View>
            {history.length === 0 ? (
              <Text style={[styles.emptyText, { padding: 16 }]}>No history yet.</Text>
            ) : (
              history.map((rec) => {
                const hrs = formatHours(rec.activeSeconds || 0);
                const isAbsent = rec.status === 'absent' || rec.activeSeconds === 0;
                const isGood = (rec.activeSeconds || 0) >= 25200; // 7h
                return (
                  <View key={rec.id} style={styles.historyRow}>
                    <Text style={styles.historyCol}>{rec.date}</Text>
                    <Text style={styles.historyCol}>{hrs}</Text>
                    <View style={styles.historyCol}>
                      <View style={isAbsent ? styles.statusAbsent : styles.statusPresent}>
                        <Text style={isAbsent ? styles.statusAbsentText : styles.statusPresentText}>
                          {isAbsent ? 'ABSENT' : isGood ? '7+ HRS' : 'PARTIAL'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.historyCol, { flex: 2, color: '#666', fontSize: 11 }]} numberOfLines={2}>
                      {rec.dailyReport || 'No report submitted'}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: PLAN YOUR DAY
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showPlanDay} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#C8A97E', fontSize: 16 }}>✓</Text>
                  <Text style={styles.modalTitle}>Add Tasks to Current Clock-In</Text>
                </View>
                <Text style={styles.modalSub}>Browse, create, and select tasks to add to your running session.</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Text style={styles.availableCount}>{filteredPlanTasks.length} AVAILABLE</Text>
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>{planSelectedTasks.length} SELECTED</Text>
                </View>
              </View>
            </View>

            {/* Two Column Layout */}
            <View style={[styles.planBody, { flexDirection: isLargeScreen ? 'row' : 'column' }]}>
              {/* LEFT: To-Do Notepad */}
              <View style={[styles.planLeft, { marginRight: isLargeScreen ? 16 : 0, marginBottom: isLargeScreen ? 0 : 16 }]}>
                <View style={styles.planLeftHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.planSectionTitle}>📋 To-Do Notepad</Text>
                    <View style={styles.countChip}><Text style={styles.countChipText}>{filteredPlanTasks.length}</Text></View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {planSelectedTasks.length > 0 && (
                      <TouchableOpacity style={styles.planHeaderBtn} onPress={() => setPlanSelectedTasks([])}>
                        <Text style={styles.planHeaderBtnText}>Clear Plan</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.planHeaderBtn} onPress={() => navigation.navigate('Projects')}>
                      <Text style={styles.planHeaderBtnText}>+ Add Task</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.planHeaderBtn} onPress={loadData}>
                      <Text style={styles.planHeaderBtnText}>↻ Refresh</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Project filter */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 1, flex: 1 }}>SELECT TASKS, THEN MOVE OR DRAG</Text>
                  <View style={{ flex: 1, position: 'relative' }}>
                    <TouchableOpacity
                      style={styles.filterChip}
                      onPress={() => setShowProjectDropdown(!showProjectDropdown)}
                    >
                      <Text style={styles.filterChipText}>
                        {planProjectFilter === 'all'
                          ? 'Select project'
                          : projects.find(p => p.id === planProjectFilter)?.name || 'Filter'} ▾
                      </Text>
                    </TouchableOpacity>
                    {showProjectDropdown && (
                      <View style={styles.dropdown}>
                        <TouchableOpacity style={styles.dropdownItem} onPress={() => { setPlanProjectFilter('all'); setShowProjectDropdown(false); }}>
                          <Text style={styles.dropdownItemText}>All Projects</Text>
                        </TouchableOpacity>
                        {projects.map(p => (
                          <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => { setPlanProjectFilter(p.id); setShowProjectDropdown(false); }}>
                            <Text style={styles.dropdownItemText}>{p.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={[styles.filterChip, { flex: 0.7 }]}>
                    <Text style={styles.filterChipText}>All tasks ▾</Text>
                  </View>
                </View>

                {/* Task list */}
                <ScrollView style={{ flex: 1 }}>
                  {filteredPlanTasks.length === 0 ? (
                    <Text style={[styles.emptyText, { padding: 16 }]}>No tasks available.</Text>
                  ) : (
                    filteredPlanTasks.map(t => {
                      const proj = projects.find(p => p.id === t.projectId);
                      const isSelected = planSelectedTasks.some(s => s.id === t.id);
                      const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
                      const daysDue = t.dueDate ? Math.floor((Date.now() - new Date(t.dueDate).getTime()) / 86400000) : 0;
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.planTaskRow, isSelected && styles.planTaskRowSelected]}
                          onPress={() => togglePlanTask(t)}
                        >
                          <View style={[styles.planCheckbox, isSelected && styles.planCheckboxChecked]}>
                            {isSelected && <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>✓</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.planTaskName}>{t.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                              {proj && (
                                <Text style={styles.planProjectLabel}>{proj.name.toUpperCase().substring(0, 12)}</Text>
                              )}
                              {isOverdue && daysDue > 0 && (
                                <Text style={styles.overdueLabel}>📅 {daysDue} days overdue</Text>
                              )}
                              {t.priority && t.priority !== 'none' && (
                                <View style={[styles.priorityChip, t.priority === 'high' || t.priority === 'urgent' ? styles.priorityChipHigh : {}]}>
                                  <Text style={[styles.priorityChipText, t.priority === 'high' || t.priority === 'urgent' ? { color: '#EF4444' } : {}]}>
                                    {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                                  </Text>
                                </View>
                              )}
                              <View style={styles.statusChipSmall}>
                                <Text style={styles.statusChipSmallText}>{t.status === 'todo' ? 'To Do' : 'In Progress'}</Text>
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>

              {/* RIGHT: Today's Tasks */}
              <View style={[styles.planRight, { borderTopWidth: isLargeScreen ? 0 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Text style={{ color: '#C8A97E', fontSize: 14 }}>✓</Text>
                  <Text style={styles.planSectionTitle}>Today's Tasks</Text>
                  <View style={styles.countChipGold}><Text style={styles.countChipGoldText}>{planSelectedTasks.length}</Text></View>
                </View>
                {planSelectedTasks.length === 0 ? (
                  <View style={styles.planRightEmpty}>
                    <Text style={styles.planRightEmptyIcon}>○</Text>
                    <Text style={styles.planRightEmptyText}>Drag here or click a task to add it to today.</Text>
                  </View>
                ) : (
                  <>
                    {planSelectedTasks.length < 3 && (
                      <View style={styles.tipBox}>
                        <Text style={styles.tipText}>💡 Tip: select at least 3 tasks for a productive session.</Text>
                      </View>
                    )}
                    <ScrollView style={{ marginTop: 8 }}>
                      {planSelectedTasks.map(t => {
                        const proj = projects.find(p => p.id === t.projectId);
                        return (
                          <TouchableOpacity key={t.id} style={styles.planSelectedRow} onPress={() => togglePlanTask(t)}>
                            <View style={styles.planSelectedDot} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.planSelectedProject}>{proj?.name?.toUpperCase() || 'TASK'}</Text>
                              <Text style={styles.planSelectedTask}>{t.name}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={[styles.planFooter, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
              <Text style={styles.planFooterNote}>
                Select tasks from the left or update projects for your daily report.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPlanDay(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.goldBtn} onPress={handleProceedClockIn}>
                  <Text style={styles.goldBtnText}>→ Save Project Selection</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: CLOCK IN ACCURACY NOTICE
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showAccuracyNotice} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.accuracySheet}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 20 }}>⚠️</Text>
              <Text style={styles.accuracyTitle}>Clock In — Accuracy Notice</Text>
            </View>
            <Text style={styles.accuracyBody}>
              Before clocking in, verify your task selection is correct. Your session will be subject to review and any discrepancies found may result in corrective action.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity style={styles.goldBtn} onPress={handleConfirmClockIn}>
                <Text style={styles.goldBtnText}>Clock In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAccuracyNotice(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: CLOCK OUT WORKSPACE
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showClockOut} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#C8A97E', fontSize: 16 }}>✓</Text>
                  <Text style={styles.modalTitle}>Clock Out Workspace</Text>
                </View>
                <Text style={styles.modalSub}>Select tasks you completed, attach evidence if needed, and submit your final report.</Text>
              </View>
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>SELECTED: {clockOutCompleted.length}</Text>
              </View>
            </View>

            {/* Tabs */}
            <View style={styles.coTabs}>
              <TouchableOpacity
                style={[styles.coTab, clockOutTab === 'today' && styles.coTabActive]}
                onPress={() => setClockOutTab('today')}
              >
                <Text style={[styles.coTabText, clockOutTab === 'today' && styles.coTabTextActive]}>
                  TODAY'S TASKS {myTasks.filter(t => planSelectedTasks.some(pt => pt.id === t.id)).length}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.coTab, clockOutTab === 'all' && styles.coTabActive]}
                onPress={() => setClockOutTab('all')}
              >
                <Text style={[styles.coTabText, clockOutTab === 'all' && styles.coTabTextActive]}>
                  ALL TASKS {myTasks.length}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {/* Task selection */}
              <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
                {clockOutTasksToShow.length === 0 ? (
                  <Text style={[styles.emptyText, { padding: 16 }]}>No tasks to show.</Text>
                ) : (
                  clockOutTasksToShow.map(t => {
                    const proj = projects.find(p => p.id === t.projectId);
                    const isChecked = clockOutCompleted.includes(t.id);
                    return (
                      <TouchableOpacity key={t.id} style={styles.coTaskRow} onPress={() => toggleClockOutTask(t.id)}>
                        <View style={[styles.coRadio, isChecked && styles.coRadioActive]}>
                          {isChecked && <View style={styles.coRadioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.coProjectLabel}>{proj?.name?.toUpperCase() || 'TASK'}</Text>
                          <Text style={styles.coTaskName}>{t.name}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {/* Work summary & Attachments Row */}
              <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: 16, paddingHorizontal: 20, paddingTop: 16 }}>
                <View style={{ flex: isLargeScreen ? 2 : 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={styles.coFormLabel}>WORK SUMMARY <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <Text style={[styles.coFormLabel, { color: workSummary.length < 20 ? '#EF4444' : '#22C55E' }]}>
                      {workSummary.length} / 100 chars (min)
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.coTextArea, workSummary.length > 0 && workSummary.length < 20 && styles.coTextAreaError]}
                    placeholder="Describe what you worked on today..."
                    placeholderTextColor="#444"
                    value={workSummary}
                    onChangeText={setWorkSummary}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                </View>

                <View style={{ flex: isLargeScreen ? 1 : 1, gap: 16 }}>
                  <View>
                    <Text style={styles.coFormLabel}>ATTACH SCREENSHOT (optional)</Text>
                    <TouchableOpacity style={styles.uploadBtn}>
                      <Text style={styles.uploadBtnText}>↑ Choose Image</Text>
                    </TouchableOpacity>
                  </View>
                  <View>
                    <Text style={styles.coFormLabel}>RELATED LINK (optional)</Text>
                    <TextInput
                      style={styles.coInput}
                      placeholder="https://github.com/... or https://figma.com/..."
                      placeholderTextColor="#444"
                      value={relatedLink}
                      onChangeText={setRelatedLink}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                </View>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.planFooter, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowClockOut(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.goldBtn, clockLoading && { opacity: 0.6 }]}
                onPress={handleSubmitClockOut}
                disabled={clockLoading}
              >
                {clockLoading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.goldBtnText}>Submit & Clock Out</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060608' },
  content: { padding: 16, paddingBottom: 32 },

  // ── HERO
  heroSection: {
    marginBottom: 16, padding: 16,
    backgroundColor: '#0D0D12', borderRadius: 14,
    borderWidth: 1, borderColor: '#1A1A28',
  },
  heroLeft: {},
  heroDate: { fontSize: 10, color: '#666', fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  heroGreeting: { fontSize: 24, color: '#FFF', marginBottom: 10 },
  heroName: { color: '#C8A97E', fontWeight: '700' },
  heroTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#888' },
  tagGold: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#C8A97E66', borderRadius: 4, backgroundColor: '#12100A' },
  tagGoldText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#C8A97E' },
  tagMuted: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#333', borderRadius: 4 },
  tagMutedText: { fontSize: 10, fontWeight: '700', color: '#555' },
  tagGreen: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#22C55E44', borderRadius: 4, backgroundColor: '#052E1644', gap: 6 },
  tagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  tagGreenText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#22C55E' },
  quoteBox: { padding: 12, borderRadius: 10, borderWidth: 1, backgroundColor: '#0A0A0A', marginTop: 4 },
  quoteText: { fontSize: 12, fontStyle: 'italic', lineHeight: 18 },

  // ── CARDS — full width, stacked vertically
  cardsScroll: { marginBottom: 0 },
  cardsRow: { gap: 0 },
  card: {
    width: '100%', backgroundColor: '#0D0D12',
    borderRadius: 12, borderWidth: 1, borderColor: '#1A1A28',
    overflow: 'hidden', marginBottom: 14,
  },
  attendanceCard: { borderColor: '#1A2810', backgroundColor: '#09100C' },
  attentionCard: { borderColor: '#200E0E' },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A28',
  },
  cardIcon: { fontSize: 14, color: '#888' },
  cardTitle: { fontSize: 11, color: '#FFF', fontWeight: '800', letterSpacing: 1.5 },
  cardSub: { fontSize: 10, color: '#555', marginTop: 2 },
  dangerBadge: { backgroundColor: '#1C0707', borderWidth: 1, borderColor: '#EF444433', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  dangerBadgeText: { color: '#EF4444', fontWeight: '800', fontSize: 12 },
  neutralBadge: { backgroundColor: '#1A1A28', borderWidth: 1, borderColor: '#33333366', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  neutralBadgeText: { color: '#AAA', fontWeight: '800', fontSize: 12 },

  // ── ATTENDANCE CARD
  timerContainer: { alignItems: 'center', paddingVertical: 24 },
  timerText: { fontSize: 40, fontWeight: '900', color: '#E0E0E0', letterSpacing: 2, fontVariant: ['tabular-nums'] as any },
  timerLabel: { fontSize: 10, color: '#555', fontWeight: '700', letterSpacing: 2, marginTop: 6 },
  clockActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  clockInBtn: { flex: 1, backgroundColor: '#C8A97E', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  clockInBtnText: { color: '#000', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  clockOutBtnOutline: { flex: 1, paddingVertical: 12, borderRadius: 6, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  clockOutBtnOutlineText: { color: '#555', fontWeight: '700', fontSize: 12 },
  clockOutBtnGold: { flex: 1, backgroundColor: '#C8A97E', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  clockOutBtnGoldText: { color: '#000', fontWeight: '800', fontSize: 12, letterSpacing: 1 },

  // ── NEEDS ATTENTION
  attentionGrid: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14 },
  attentionBox: { flex: 1 },
  attentionSubLabel: { fontSize: 9, color: '#666', fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  attentionValue: { fontSize: 36, fontWeight: '300', color: '#FFF', marginBottom: 2 },
  attentionSub: { fontSize: 10, color: '#555' },
  urgentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  urgentRowBorder: { borderBottomWidth: 1, borderBottomColor: '#1A1A28' },
  urgentDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10, flexShrink: 0 },
  urgentName: { flex: 1, fontSize: 13, color: '#CCC', fontWeight: '500' },
  urgentProject: { fontSize: 10, color: '#666', fontWeight: '700', letterSpacing: 0.5 },
  emptyText: { fontSize: 12, color: '#555', fontStyle: 'italic' },

  // ── ACTIVE PROJECTS
  projectRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  projectAvatar: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  projectAvatarText: { fontSize: 13, fontWeight: '800' },
  arrowIcon: { color: '#444', fontSize: 14 },
  viewAllBtn: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1A1A28' },
  viewAllText: { color: '#C8A97E', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  // ── WORKSPACE
  workspaceSection: { backgroundColor: '#0D0D12', borderRadius: 14, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1A1A28' },
  workspaceHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 },
  workspaceTitle: { fontSize: 12, color: '#FFF', fontWeight: '800', letterSpacing: 2 },
  workspaceSub: { fontSize: 11, color: '#555' },
  wLockedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#555', backgroundColor: '#111' },
  wLockedText: { fontSize: 9, color: '#666', fontWeight: '800', letterSpacing: 1 },
  wActiveBadge: { borderColor: '#22C55E44', backgroundColor: '#052E16' },
  wActiveText: { color: '#22C55E' },
  addTaskBtn: { backgroundColor: '#C8A97E', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  addTaskText: { color: '#000', fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  wStat: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4 },
  wStatText: { fontSize: 10, color: '#777', fontWeight: '800', letterSpacing: 0.5 },
  workspaceLocked: { backgroundColor: '#0A0A0A', borderRadius: 8, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#1A1A28' },
  workspaceLockedText: { color: '#555', fontSize: 12, fontStyle: 'italic', textAlign: 'center', lineHeight: 18 },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#0A0A0A', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#1A1A28', gap: 12 },
  taskRadio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#444' },
  taskProject: { fontSize: 10, color: '#C8A97E', fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  taskNameFull: { fontSize: 13, color: '#DDD' },
  taskStatusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#333' },
  taskStatusChipActive: { borderColor: '#C8A97E44', backgroundColor: '#12100A' },
  taskStatusText: { fontSize: 9, color: '#666', fontWeight: '800', letterSpacing: 0.5 },
  taskStatusTextActive: { color: '#C8A97E' },

  // ── HISTORY
  historyTable: {},
  historyHeaderRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1A1A28' },
  historyRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  historyCol: { flex: 1, color: '#AAA', fontSize: 11 },
  historyHeader: { color: '#555', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  statusAbsent: { paddingHorizontal: 6, paddingVertical: 3, backgroundColor: '#1C0707', borderColor: '#EF444444', borderWidth: 1, borderRadius: 4, alignSelf: 'flex-start' },
  statusAbsentText: { color: '#EF4444', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statusPresent: { paddingHorizontal: 6, paddingVertical: 3, backgroundColor: '#052E16', borderColor: '#22C55E44', borderWidth: 1, borderRadius: 4, alignSelf: 'flex-start' },
  statusPresentText: { color: '#22C55E', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // ── MODALS
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0D0D12', borderRadius: 20,
    borderWidth: 1, borderColor: '#1A1A28',
    width: '100%', maxHeight: '95%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A28',
    flexWrap: 'wrap', gap: 12,
  },
  modalTitle: { fontSize: 20, color: '#FFF', fontWeight: '700' },
  modalSub: { fontSize: 12, color: '#666', marginTop: 4 },
  availableCount: { fontSize: 11, color: '#888', fontWeight: '700' },
  selectedBadge: { backgroundColor: '#1A1A12', borderWidth: 1, borderColor: '#C8A97E44', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  selectedBadgeText: { color: '#C8A97E', fontWeight: '800', fontSize: 11 },

  // ── PLAN YOUR DAY BODY — single column on mobile
  planBody: { flex: 1, flexDirection: 'column' },
  planLeft: { flex: 1 },
  planRight: { padding: 12, borderTopWidth: 1, borderTopColor: '#1A1A28' },
  planLeftHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A28', flexWrap: 'wrap', gap: 8,
  },
  planSectionTitle: { fontSize: 12, color: '#CCC', fontWeight: '700' },
  countChip: { backgroundColor: '#1A1A28', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  countChipText: { color: '#888', fontSize: 10, fontWeight: '800' },
  countChipGold: { backgroundColor: '#C8A97E22', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#C8A97E55' },
  countChipGoldText: { color: '#C8A97E', fontSize: 10, fontWeight: '800' },
  planHeaderBtn: { backgroundColor: '#1A1A28', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  planHeaderBtnText: { color: '#AAA', fontSize: 11, fontWeight: '700' },
  filterChip: { borderWidth: 1, borderColor: '#252525', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#111' },
  filterChipText: { color: '#888', fontSize: 11 },
  dropdown: {
    position: 'absolute', top: 38, left: 0, right: 0, zIndex: 99,
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#222', borderRadius: 8, maxHeight: 180,
  },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  dropdownItemText: { color: '#DDD', fontSize: 13 },
  planTaskRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111', gap: 10 },
  planTaskRowSelected: { backgroundColor: '#0D0D0A' },
  planCheckbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#333', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  planCheckboxChecked: { backgroundColor: '#C8A97E', borderColor: '#C8A97E' },
  planTaskName: { fontSize: 13, color: '#DDD', fontWeight: '500' },
  planProjectLabel: { fontSize: 10, color: '#C8A97E', fontWeight: '700', letterSpacing: 0.5 },
  overdueLabel: { fontSize: 10, color: '#888' },
  priorityChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#333', backgroundColor: '#111' },
  priorityChipText: { fontSize: 10, color: '#888', fontWeight: '700' },
  priorityChipHigh: { backgroundColor: '#1C0707', borderColor: '#EF444433' },
  statusChipSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#22C55E33', backgroundColor: '#052E16' },
  statusChipSmallText: { fontSize: 10, color: '#22C55E', fontWeight: '700' },
  planRightEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  planRightEmptyIcon: { fontSize: 32, color: '#333' },
  planRightEmptyText: { color: '#555', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  tipBox: { backgroundColor: '#12100A', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#C8A97E22', marginTop: 8 },
  tipText: { color: '#C8A97E', fontSize: 11, lineHeight: 16 },
  planSelectedRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#0A0A0A', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#1A1A1A', gap: 10 },
  planSelectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C8A97E', flexShrink: 0 },
  planSelectedProject: { fontSize: 9, color: '#C8A97E', fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  planSelectedTask: { fontSize: 12, color: '#DDD' },
  planFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: '#1A1A28',
  },
  planFooterNote: { fontSize: 12, color: '#666', flex: 1 },

  // ── ACCURACY NOTICE
  accuracySheet: {
    backgroundColor: '#0D0D12', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#1A1A28', width: '100%',
    marginHorizontal: 16,
  },
  accuracyTitle: { fontSize: 18, color: '#FFF', fontWeight: '700' },
  accuracyBody: { fontSize: 14, color: '#AAA', lineHeight: 22 },

  // ── CLOCK OUT MODAL
  coTabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1A1A28',
  },
  coTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  coTabActive: { borderBottomColor: '#C8A97E' },
  coTabText: { fontSize: 11, color: '#666', fontWeight: '800', letterSpacing: 1 },
  coTabTextActive: { color: '#C8A97E' },
  coTaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#111', gap: 12 },
  coRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  coRadioActive: { borderColor: '#C8A97E' },
  coRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C8A97E' },
  coProjectLabel: { fontSize: 10, color: '#C8A97E', fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  coTaskName: { fontSize: 14, color: '#DDD' },
  coFormSection: { paddingHorizontal: 20, paddingTop: 16 },
  coFormLabel: { fontSize: 10, color: '#666', fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  coTextArea: {
    backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1A1A28',
    borderRadius: 8, color: '#FFF', fontSize: 13, padding: 14, minHeight: 120,
    textAlignVertical: 'top',
  },
  coTextAreaError: { borderColor: '#EF4444' },
  coInput: {
    backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1A1A28',
    borderRadius: 8, color: '#FFF', fontSize: 13, padding: 14,
  },

  // ── SHARED BUTTONS
  goldBtn: { backgroundColor: '#C8A97E', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  goldBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#2A2A2A' },
  cancelText: { color: '#AAA', fontWeight: '600', fontSize: 13 },
  uploadBtn: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#0A0A0A' },
  uploadBtnText: { color: '#AAA', fontSize: 12, fontWeight: '700' },
});
