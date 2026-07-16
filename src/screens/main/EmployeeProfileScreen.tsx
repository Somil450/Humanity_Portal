import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { getUserProfile, updateUserProfile } from '../../services/authService';
import { getAttendanceHistory } from '../../services/attendanceService';
import { getMyTasks } from '../../services/projectService';
import { getMyLeaves } from '../../services/leaveService';
import { User, AttendanceRecord, Task, Leave } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

// ─── Avatar color ────────────────────────────────────────────────────────────
const AV_COLORS = ['#7C3AED', '#059669', '#2563EB', '#D97706', '#DC2626', '#0891B2'];
function avColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

// ─── Attendance status color ──────────────────────────────────────────────────
function dayColor(rec: AttendanceRecord | undefined): string {
  if (!rec) return 'transparent';
  const hrs = (rec.activeSeconds || 0) / 3600;
  if (rec.status === 'absent') return '#1C0707';
  if (hrs >= 7) return '#22C55E';
  if (hrs >= 4) return '#F97316';
  if (hrs > 0) return '#C8A97E';
  return 'transparent';
}

// ═══════════════════════════════════════════════════════════════════════════════
// EmployeeProfileScreen
// ═══════════════════════════════════════════════════════════════════════════════
export default function EmployeeProfileScreen({ route, navigation }: any) {
  const { user: currentUser } = useAuth();
  const { employeeId } = route.params;
  const [employee, setEmployee] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'leaves'>('overview');
  const [calMonth, setCalMonth] = useState(new Date());

  const [showEditModal, setShowEditModal] = useState(false);
  const [editDept, setEditDept] = useState('');
  const [editRole, setEditRole] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isSelf = currentUser?.uid === employeeId;

  useEffect(() => { loadData(); }, [employeeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profile, hist, taskList, leaveList] = await Promise.all([
        getUserProfile(employeeId),
        getAttendanceHistory(employeeId),
        getMyTasks(employeeId),
        getMyLeaves(employeeId),
      ]);
      setEmployee(profile);
      setAttendance(hist);
      setTasks(taskList.filter(t => !t.isArchived));
      setLeaves(leaveList);
      if (profile) {
        setEditDept(profile.department ?? '');
        setEditRole(profile.role ?? '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!employee) return;
    setSaveLoading(true);
    try {
      await updateUserProfile(employeeId, { department: editDept, role: editRole as any });
      setEmployee({ ...employee, department: editDept, role: editRole as any });
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!employee) return;
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    Alert.alert(
      `${newStatus === 'inactive' ? 'Deactivate' : 'Activate'} Account`,
      `Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: async () => {
          await updateUserProfile(employeeId, { status: newStatus as any });
          setEmployee({ ...employee, status: newStatus as any });
        }}
      ]
    );
  };

  // ── Computed stats
  const thisMonthStr = format(new Date(), 'yyyy-MM');
  const thisMonthRecords = attendance.filter(a => a.date.startsWith(thisMonthStr));
  const presentDays = attendance.filter(a => ['clocked-in', 'clocked-out', 'away'].includes(a.status)).length;
  const totalHours = attendance.reduce((s, a) => s + (a.activeSeconds || 0) / 3600, 0);
  const avgHours = presentDays > 0 ? (totalHours / presentDays).toFixed(1) : '0.0';
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const urgentDone = tasks.filter(t => t.status === 'done' && t.priority === 'urgent').length;
  const bestDayHrs = attendance.reduce((best, a) => Math.max(best, (a.activeSeconds || 0) / 3600), 0);
  const netScore = employee?.netScore || 0;
  const scoreColor = netScore >= 0 ? '#22C55E' : '#EF4444';
  const scoreBg = netScore >= 0 ? '#052E16' : '#1C0707';

  // Attendance streak
  const sortedAtt = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const rec of sortedAtt) {
    if (['clocked-in', 'clocked-out', 'away'].includes(rec.status)) streak++;
    else break;
  }

  // ── Calendar
  const calMonthStr = format(calMonth, 'yyyy-MM');
  const calRecords: Record<string, AttendanceRecord> = {};
  for (const a of attendance) {
    if (a.date.startsWith(calMonthStr)) calRecords[a.date] = a;
  }
  const daysInMonth = getDaysInMonth(calMonth);
  const firstDayOfWeek = getDay(startOfMonth(calMonth)); // 0=Sun
  const calDays: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (calDays.length % 7 !== 0) calDays.push(null);

  // Stats summary
  const fullDays = thisMonthRecords.filter(a => (a.activeSeconds || 0) / 3600 >= 7).length;
  const halfDays = thisMonthRecords.filter(a => { const h = (a.activeSeconds || 0) / 3600; return h >= 4 && h < 7; }).length;
  const shortDays = thisMonthRecords.filter(a => { const h = (a.activeSeconds || 0) / 3600; return h > 0 && h < 4; }).length;
  const absentDays = thisMonthRecords.filter(a => a.status === 'absent').length;
  const leaveDays = leaves.filter(l => l.status === 'approved' && l.startDate.startsWith(thisMonthStr)).length;

  // AI insight
  const aiInsight = employee ? `${employee.fullName.split(' ')[0]}, you maintained a solid presence this month with a ${streak > 0 ? streak + '-day' : '0-day'} attendance streak. You have completed ${doneTasks} tasks and ${urgentDone} urgent tasks. Keep up the consistent work ethic and stay focused on your priorities.` : '';

  if (loading) {
    return <SafeAreaView style={s.container}><ActivityIndicator size="large" color="#C8A97E" style={{ flex: 1 }} /></SafeAreaView>;
  }

  if (!employee) {
    return <SafeAreaView style={s.container}><Text style={s.errorText}>Employee not found.</Text></SafeAreaView>;
  }

  const color = avColor(employee.fullName || 'U');
  const initials = (employee.fullName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const roleLabel = employee.role?.replace('_', ' ').toUpperCase() || 'EMPLOYEE';
  const deptLabel = (employee.department || '').toUpperCase();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── TOP HEADER BAR */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle} numberOfLines={1}>{employee.fullName}</Text>
        {isAdmin && !isSelf && (
          <TouchableOpacity onPress={() => setShowEditModal(true)} style={s.editBtn}>
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* ── PROFILE HERO */}
        <View style={s.profileHero}>
          {/* Left: Avatar + info */}
          <View style={s.heroLeft}>
            <View style={[s.heroAvatar, { backgroundColor: color + '22', borderColor: color + '66' }]}>
              <Text style={[s.heroAvatarText, { color }]}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroName}>{employee.fullName.toUpperCase()}</Text>
              <Text style={s.heroEmail}>{employee.email}</Text>
              <View style={s.heroTags}>
                <View style={s.tagGreen}><Text style={s.tagGreenText}>● {roleLabel}</Text></View>
                {deptLabel ? <View style={s.tagBlue}><Text style={s.tagBlueText}>⊞ {deptLabel}</Text></View> : null}
                {streak > 0 && <View style={s.tagGold}><Text style={s.tagGoldText}>🔥 {streak}D STREAK</Text></View>}
              </View>
            </View>
          </View>

          {/* Right: AI insight + score */}
          <View style={s.heroRight}>
            <View style={s.aiInsightBox}>
              <Text style={s.aiInsightLabel}>🤖 AI INSIGHT</Text>
              <Text style={s.aiInsightText} numberOfLines={5}>{aiInsight}</Text>
            </View>
            <View style={[s.scoreChip, { backgroundColor: scoreBg, borderColor: scoreColor + '55' }]}>
              <Text style={s.scoreLabel}>SCORE</Text>
              <Text style={[s.scoreValue, { color: scoreColor }]}>{netScore >= 0 ? '+' : ''}{netScore} PTS</Text>
            </View>
          </View>
        </View>

        {/* ── STAT ROW */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={s.statScroll}>
          <StatChip icon="📅" label="ATTENDANCE" value={`${thisMonthRecords.length}/12`} sub="this month" />
          <StatChip icon="⏱" label="AVG HOURS" value={`${avgHours}h`} sub="per active day" />
          <StatChip icon="⏳" label="TOTAL HOURS" value={`${totalHours.toFixed(1)}h`} sub="cumulative" />
          <StatChip icon="✅" label="TASKS DONE" value={`${doneTasks}`} sub="project tasks" />
          <StatChip icon="⚡" label="URGENT DONE" value={`${urgentDone}`} sub="urgent tasks" />
          <StatChip icon="📋" label="PROJECTS" value={`${0}`} sub="active" />
          <StatChip icon="📄" label="DAILY REVIEW" value={`0/0`} sub="approved/declined" />
          <StatChip icon="🏆" label="BEST DAY" value={`${bestDayHrs.toFixed(1)}h`} sub="" />
        </ScrollView>

        {/* ── TABS */}
        <View style={s.tabs}>
          {(['overview', 'tasks', 'leaves'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TAB CONTENT: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={s.overviewGrid}>
            {/* DAILY DETAIL section */}
            <View style={s.overviewCard}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionIcon}>📆</Text>
                <Text style={s.sectionTitle}>DAILY DETAIL</Text>
              </View>
              {/* Calendar nav */}
              <View style={s.calNav}>
                <TouchableOpacity onPress={() => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}>
                  <Text style={s.calNavArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={s.calNavTitle}>{format(calMonth, 'dd MMM yyyy').toUpperCase()}</Text>
                <TouchableOpacity onPress={() => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}>
                  <Text style={s.calNavArrow}>›</Text>
                </TouchableOpacity>
              </View>
              {/* Weekly labels */}
              <View style={s.calWeekRow}>
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <Text key={i} style={s.calWeekLabel}>{d}</Text>
                ))}
              </View>
              {/* Days grid */}
              <View style={s.calGrid}>
                {calDays.map((day, idx) => {
                  if (day === null) return <View key={`e-${idx}`} style={s.calDayEmpty} />;
                  const dateStr = `${calMonthStr}-${day.toString().padStart(2, '0')}`;
                  const rec = calRecords[dateStr];
                  const bg = dayColor(rec);
                  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
                  const hrs = rec ? (rec.activeSeconds || 0) / 3600 : 0;
                  return (
                    <View key={day} style={[s.calDay, { backgroundColor: bg }, isToday && s.calDayToday]}>
                      <Text style={[s.calDayNum, bg !== 'transparent' && { color: '#FFF' }]}>{day}</Text>
                    </View>
                  );
                })}
              </View>
              {/* Legend */}
              <View style={s.calLegend}>
                <LegendDot color="#22C55E" label="7h+" />
                <LegendDot color="#F97316" label="4-7h" />
                <LegendDot color="#C8A97E" label="4h" />
                <LegendDot color="#1C0707" label="absent" />
                <LegendDot color="#7C3AED" label="leave" />
                <LegendDot color="transparent" label="weekend" border />
              </View>
              {/* Summary stats */}
              <View style={s.calSummary}>
                <SummaryBox color="#22C55E" label="FULL DAYS ≥7H" value={fullDays} />
                <SummaryBox color="#7C3AED" label="HALF DAYS 4-7H" value={halfDays} />
                <SummaryBox color="#C8A97E" label="SHORT <4H" value={shortDays} />
                <SummaryBox color="#EF4444" label="ABSENT" value={absentDays} />
                <SummaryBox color="#3B82F6" label="ON LEAVE" value={leaveDays} />
              </View>
            </View>

            {/* ATTENDANCE MAP column header */}
            <View style={s.overviewCard}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionIcon}>📋</Text>
                <Text style={s.sectionTitle}>EMPLOYEE INFORMATION</Text>
              </View>
              <InfoRow label="Full Name" value={employee.fullName} />
              <InfoRow label="Email" value={employee.email} />
              <InfoRow label="Phone" value={employee.phone || '—'} />
              <InfoRow label="Department" value={employee.department || '—'} />
              <InfoRow label="Role" value={roleLabel} />
              <InfoRow label="Status" value={employee.status || '—'} />
              <InfoRow label="Joined" value={employee.startDate ? format(new Date(employee.startDate), 'd MMM yyyy') : '—'} />
              <InfoRow label="Net Score" value={`${netScore >= 0 ? '+' : ''}${netScore} pts`} />

              {isAdmin && !isSelf && (
                <TouchableOpacity
                  style={[s.statusBtn, { backgroundColor: employee.status === 'active' ? '#1C0707' : '#052E16', borderColor: employee.status === 'active' ? '#EF444444' : '#22C55E44' }]}
                  onPress={handleToggleStatus}
                >
                  <Text style={[s.statusBtnText, { color: employee.status === 'active' ? '#EF4444' : '#22C55E' }]}>
                    {employee.status === 'active' ? '🔴 Deactivate Account' : '🟢 Activate Account'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── TAB CONTENT: TASKS */}
        {activeTab === 'tasks' && (
          <View style={{ marginTop: 16 }}>
            {tasks.length === 0 ? (
              <View style={s.emptyState}><Text style={s.emptyText}>No tasks found.</Text></View>
            ) : (
              tasks.map(t => (
                <View key={t.id} style={s.taskCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={s.taskName}>{t.name}</Text>
                    <View style={[s.statusChip, {
                      backgroundColor: t.status === 'done' ? '#052E16' : t.status === 'in-progress' ? '#0C1829' : '#1A1A28',
                      borderColor: t.status === 'done' ? '#22C55E44' : t.status === 'in-progress' ? '#3B82F644' : '#33333344',
                    }]}>
                      <Text style={[s.statusChipText, { color: t.status === 'done' ? '#22C55E' : t.status === 'in-progress' ? '#60A5FA' : '#888' }]}>
                        {t.status.replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <View style={[s.priorityChip, { backgroundColor: t.priority === 'urgent' || t.priority === 'high' ? '#1C0707' : '#111' }]}>
                      <Text style={[s.priorityChipText, { color: t.priority === 'urgent' || t.priority === 'high' ? '#EF4444' : '#888' }]}>
                        {t.priority.toUpperCase()}
                      </Text>
                    </View>
                    {t.dueDate && (
                      <Text style={s.dueText}>Due: {format(new Date(t.dueDate), 'd MMM yyyy')}</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── TAB CONTENT: LEAVES */}
        {activeTab === 'leaves' && (
          <View style={{ marginTop: 16 }}>
            {leaves.length === 0 ? (
              <View style={s.emptyState}><Text style={s.emptyText}>No leaves found.</Text></View>
            ) : (
              leaves.map(l => (
                <View key={l.id} style={s.taskCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={s.taskName}>{l.reason.charAt(0).toUpperCase() + l.reason.slice(1)} Leave</Text>
                    <View style={[s.statusChip, {
                      backgroundColor: l.status === 'approved' ? '#052E16' : l.status === 'declined' ? '#1C0707' : '#1C1800',
                      borderColor: l.status === 'approved' ? '#22C55E44' : l.status === 'declined' ? '#EF444444' : '#F0C04044',
                    }]}>
                      <Text style={[s.statusChipText, { color: l.status === 'approved' ? '#22C55E' : l.status === 'declined' ? '#EF4444' : '#F0C040' }]}>
                        {l.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.dueText}>
                    {format(new Date(l.startDate), 'd MMM')} – {format(new Date(l.endDate), 'd MMM yyyy')}
                  </Text>
                  {l.description && <Text style={s.leaveDesc}>{l.description}</Text>}
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── EDIT MODAL */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Employee</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={s.fieldLabel}>DEPARTMENT</Text>
              <TextInput
                style={s.fieldInput}
                value={editDept}
                onChangeText={setEditDept}
                placeholder="e.g., Engineering"
                placeholderTextColor="#444"
              />
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>ROLE</Text>
              {(['employee', 'manager', 'hr', 'admin'] as const).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[s.roleOption, editRole === r && s.roleOptionActive]}
                  onPress={() => setEditRole(r)}
                >
                  <Text style={[s.roleText, editRole === r && { color: '#000' }]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, saveLoading && { opacity: 0.6 }]} onPress={handleSaveEdit} disabled={saveLoading}>
                <Text style={s.saveBtnText}>{saveLoading ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatChip({ icon, label, value, sub }: any) {
  return (
    <View style={s.statChip}>
      <Text style={s.statChipLabel}>{icon} {label}</Text>
      <Text style={s.statChipValue}>{value}</Text>
      {sub ? <Text style={s.statChipSub}>{sub}</Text> : null}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function LegendDot({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={[{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }, border && { borderWidth: 1, borderColor: '#333' }]} />
      <Text style={{ color: '#555', fontSize: 9 }}>{label}</Text>
    </View>
  );
}

function SummaryBox({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={s.summaryBox}>
      <Text style={[s.summaryLabel, { color }]}>{label}</Text>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060608' },
  content: { padding: 16 },
  errorText: { textAlign: 'center', marginTop: 100, color: '#555' },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A28', gap: 12,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: '#AAA' },
  topBarTitle: { flex: 1, fontSize: 16, color: '#FFF', fontWeight: '700' },
  editBtn: { backgroundColor: '#1A1A28', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  editBtnText: { color: '#C8A97E', fontSize: 12, fontWeight: '700' },

  // ── PROFILE HERO
  profileHero: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16, backgroundColor: '#0D0D12', borderRadius: 14, borderWidth: 1, borderColor: '#1A1A28', padding: 20 },
  heroLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 260 },
  heroAvatar: { width: 60, height: 60, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  heroAvatarText: { fontSize: 22, fontWeight: '900' },
  heroName: { fontSize: 16, color: '#FFF', fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  heroEmail: { fontSize: 12, color: '#666', marginBottom: 8 },
  heroTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tagGreen: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#22C55E33', backgroundColor: '#052E16' },
  tagGreenText: { fontSize: 10, fontWeight: '800', color: '#22C55E' },
  tagBlue: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#3B82F633', backgroundColor: '#0C1829' },
  tagBlueText: { fontSize: 10, fontWeight: '800', color: '#3B82F6' },
  tagGold: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#C8A97E33', backgroundColor: '#12100A' },
  tagGoldText: { fontSize: 10, fontWeight: '800', color: '#C8A97E' },
  heroRight: { flex: 1, minWidth: 220, alignItems: 'flex-end', gap: 12 },
  aiInsightBox: { backgroundColor: '#111', borderRadius: 8, borderWidth: 1, borderColor: '#1A1A28', padding: 12, width: '100%' },
  aiInsightLabel: { fontSize: 9, color: '#888', fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  aiInsightText: { fontSize: 11, color: '#999', lineHeight: 17 },
  scoreChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'flex-end' },
  scoreLabel: { fontSize: 9, color: '#888', fontWeight: '800', letterSpacing: 1 },
  scoreValue: { fontSize: 20, fontWeight: '800' },

  // ── STAT SCROLL
  statScroll: { gap: 10, paddingRight: 16 },
  statChip: { backgroundColor: '#0D0D12', borderRadius: 10, borderWidth: 1, borderColor: '#1A1A28', padding: 14, minWidth: 110 },
  statChipLabel: { fontSize: 9, color: '#555', fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
  statChipValue: { fontSize: 22, fontWeight: '600', color: '#FFF' },
  statChipSub: { fontSize: 10, color: '#555', marginTop: 3 },

  // ── TABS
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1A1A28', marginBottom: 0 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#C8A97E' },
  tabText: { fontSize: 12, color: '#666', fontWeight: '700' },
  tabTextActive: { color: '#C8A97E' },

  // ── OVERVIEW GRID
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 },
  overviewCard: { flex: 1, minWidth: 300, backgroundColor: '#0D0D12', borderRadius: 12, borderWidth: 1, borderColor: '#1A1A28', padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIcon: { fontSize: 14 },
  sectionTitle: { fontSize: 11, color: '#FFF', fontWeight: '800', letterSpacing: 1.5 },

  // ── CALENDAR
  calNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calNavArrow: { fontSize: 20, color: '#AAA', paddingHorizontal: 8 },
  calNavTitle: { fontSize: 12, color: '#CCC', fontWeight: '700', letterSpacing: 1 },
  calWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calWeekLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: '#555', fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayEmpty: { width: `${100 / 7}%`, aspectRatio: 1 },
  calDay: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 4, padding: 2 },
  calDayToday: { borderWidth: 1.5, borderColor: '#C8A97E' },
  calDayNum: { fontSize: 11, color: '#555', fontWeight: '600' },
  calLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, marginBottom: 12 },
  calSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  summaryBox: { minWidth: 100 },
  summaryLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '300' },

  // ── INFO ROWS
  infoRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#111' },
  infoLabel: { fontSize: 12, color: '#555', width: 110 },
  infoValue: { fontSize: 12, color: '#DDD', flex: 1, textTransform: 'capitalize' },
  statusBtn: { marginTop: 16, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  statusBtnText: { fontSize: 13, fontWeight: '700' },

  // ── TASK / LEAVE CARDS
  taskCard: { backgroundColor: '#0D0D12', borderRadius: 10, borderWidth: 1, borderColor: '#1A1A28', padding: 14, marginBottom: 10 },
  taskName: { fontSize: 14, color: '#DDD', fontWeight: '600', flex: 1 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  priorityChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  priorityChipText: { fontSize: 10, fontWeight: '800' },
  dueText: { fontSize: 11, color: '#666', marginTop: 4 },
  leaveDesc: { fontSize: 12, color: '#888', marginTop: 6 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#555', fontSize: 14 },

  // ── MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0D0D12', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: '#1A1A28', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A28' },
  modalTitle: { fontSize: 20, color: '#FFF', fontWeight: '700' },
  modalClose: { fontSize: 20, color: '#888' },
  fieldLabel: { fontSize: 10, color: '#666', fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  fieldInput: { backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1A1A28', borderRadius: 8, color: '#FFF', fontSize: 14, paddingHorizontal: 14, paddingVertical: 12 },
  roleOption: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#1A1A28', marginBottom: 8, backgroundColor: '#0A0A0A' },
  roleOptionActive: { backgroundColor: '#C8A97E', borderColor: '#C8A97E' },
  roleText: { fontSize: 14, color: '#CCC', textTransform: 'capitalize' },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#1A1A28' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: '#1A1A28', alignItems: 'center' },
  cancelText: { color: '#AAA', fontWeight: '600', fontSize: 14 },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: '#C8A97E', alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
});
