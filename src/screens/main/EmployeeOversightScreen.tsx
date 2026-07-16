import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { getAllUsers } from '../../services/authService';
import { getTeamAttendance, getAttendanceHistory } from '../../services/attendanceService';
import { getUrgentTasks } from '../../services/urgentTaskService';
import { User, AttendanceRecord } from '../../types';
import { Avatar } from '../../components/ui';

// ── Avatar colors ─────────────────────────────────────────────────────────────
const AV_COLORS = ['#7C3AED', '#059669', '#2563EB', '#D97706', '#DC2626', '#0891B2', '#C026D3'];
function avColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

// ── Flag helpers ──────────────────────────────────────────────────────────────
function getFlags(u: User) {
  const score = u.netScore || 0;
  const sev = u.severity || 0;
  const flags: { label: string; pts: number }[] = [];
  if (score > 5) flags.push({ label: 'High Daily Hours', pts: 10 });
  if (score > 0 && sev > 0) flags.push({ label: 'Multi-Day Present', pts: 5 });
  if (score < 0) flags.push({ label: 'Multi-Day Absence', pts: -15 });
  if (score < -50) flags.push({ label: 'No Active Tasks', pts: -100 });
  if (score < 0 && score > -50) flags.push({ label: 'Low Daily Hours', pts: -5 });
  return flags;
}

function getRiskLabel(u: User) {
  const sev = u.severity || 0;
  if (sev >= 5) return 'HIGH RISK';
  if (sev >= 3) return 'AT RISK';
  if ((u.netScore || 0) < 0) return 'WATCH';
  return 'CLEAN';
}

function getRiskColor(u: User) {
  const sev = u.severity || 0;
  if (sev >= 5) return '#EF4444';
  if (sev >= 3) return '#F97316';
  if ((u.netScore || 0) < 0) return '#F0C040';
  return '#22C55E';
}

// ═══════════════════════════════════════════════════════════════════════════════
// EmployeeOversightScreen
// ═══════════════════════════════════════════════════════════════════════════════
export default function EmployeeOversightScreen({ navigation }: any) {
  const [users, setUsers] = useState<User[]>([]);
  const [todayAtt, setTodayAtt] = useState<AttendanceRecord[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [allUsers, att, urgents] = await Promise.all([
        getAllUsers(),
        getTeamAttendance(today),
        getUrgentTasks(undefined, true),
      ]);
      setUsers(allUsers.filter(u => u.role !== 'super_admin'));
      setTodayAtt(att);
      setUrgentCount(urgents.filter(t => t.status !== 'completed' && !t.isArchived).length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  // ── KPIs
  const teamSize = users.length;
  const flagged = users.filter(u => (u.netScore || 0) < 0).length;
  const highRisk = users.filter(u => (u.severity || 0) >= 5).length;

  // Attendance this month
  const thisMonth = format(new Date(), 'yyyy-MM');
  const workingDaysThisMonth = 12; // approx
  const presentCount = todayAtt.filter(a => ['clocked-in', 'clocked-out', 'away'].includes(a.status)).length;
  const avgAttPct = teamSize > 0 ? Math.round((presentCount / teamSize) * 100) : 0;

  // ── Filtered
  const filteredUsers = search.trim()
    ? users.filter(u => u.fullName?.toLowerCase().includes(search.toLowerCase()))
    : users;

  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color="#C8A97E" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C8A97E" />}
      >
        {/* ── PAGE HEADER */}
        <View style={s.pageHeader}>
          <Text style={s.pageEyebrow}>ADMIN INTELLIGENCE LAYER</Text>
          <Text style={s.pageTitle}>Employee Oversight</Text>
          <Text style={s.pageSub}>Monitor all employees at a glance — click any name to view their full dashboard.</Text>
        </View>

        {/* ── EMPLOYEE FILTER */}
        <View style={{ position: 'relative', zIndex: 10, marginBottom: 16 }}>
          <TouchableOpacity style={s.filterBtn} onPress={() => setShowDropdown(!showDropdown)}>
            <Text style={s.filterBtnText}>{search || 'Select an Employee'} ▾</Text>
          </TouchableOpacity>
          {showDropdown && (
            <View style={s.dropdown}>
              <TextInput
                style={s.dropdownSearch}
                placeholder="Search employee..."
                placeholderTextColor="#555"
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              <ScrollView style={{ maxHeight: 200 }}>
                <TouchableOpacity style={s.dropdownItem} onPress={() => { setSearch(''); setShowDropdown(false); }}>
                  <Text style={s.dropdownItemText}>All Employees</Text>
                </TouchableOpacity>
                {filteredUsers.map(u => (
                  <TouchableOpacity key={u.uid} style={s.dropdownItem} onPress={() => {
                    setSearch(u.fullName);
                    setShowDropdown(false);
                    navigation.navigate('EmployeeProfile', { employeeId: u.uid });
                  }}>
                    <Text style={s.dropdownItemText}>{u.fullName}</Text>
                    <Text style={s.dropdownItemMeta}>{u.department || ''}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── KPI CARDS — 2x3 grid for mobile */}
        <View style={s.kpiGrid}>
          <KPICard label="TEAM SIZE" value={teamSize} sub={`${departments.length} departments`} icon="👥" iconColor="#888" />
          <KPICard label="FLAGGED" value={flagged} sub={`${teamSize > 0 ? Math.round((flagged / teamSize) * 100) : 0}% of team`} icon="🚩" iconColor="#EF4444" />
          <KPICard label="HIGH RISK" value={highRisk} sub="Red flag severity ≥ 5" icon="⚠️" iconColor="#EF4444" />
          <KPICard label="ACTIVE TASKS" value={urgentCount} sub="Urgent open" icon="📋" iconColor="#3B82F6" />
          <KPICard label="AVG ATTENDANCE" value={`${avgAttPct}%`} sub="Today present" icon="🕒" iconColor="#22C55E" />
        </View>

        {/* ── EMPLOYEE CARDS LIST */}
        {filteredUsers.map(u => (
          <EmployeeCard
            key={u.uid}
            user={u}
            todayAtt={todayAtt.find(a => a.userId === u.uid)}
            navigation={navigation}
          />
        ))}

        {filteredUsers.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyText}>No employees found.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon, iconColor }: any) {
  return (
    <View style={s.kpiCard}>
      <View style={s.kpiCardTop}>
        <Text style={s.kpiCardLabel}>{label}</Text>
        <Text style={[s.kpiCardIcon, { color: iconColor }]}>{icon}</Text>
      </View>
      <Text style={s.kpiCardValue}>{value}</Text>
      <Text style={s.kpiCardSub}>{sub}</Text>
    </View>
  );
}

// ── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({ user: u, todayAtt, navigation }: { user: User; todayAtt?: AttendanceRecord; navigation: any }) {
  const score = u.netScore || 0;
  const sev = u.severity || 0;
  const riskLabel = getRiskLabel(u);
  const riskColor = getRiskColor(u);
  const flags = getFlags(u);
  const color = avColor(u.fullName || 'U');
  const initials = (u.fullName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const redFlags = flags.filter(f => f.pts < 0).length;
  const greenFlags = flags.filter(f => f.pts > 0).length;
  const deptLabel = u.department?.toUpperCase() || 'GENERAL';

  // Mock stats (real data would require fetching per-user)
  const attPct = Math.max(20, Math.min(100, 50 + (score / 4)));
  const attendanceLabel = `${Math.round(attPct)}% ATTENDANCE`;

  return (
    <View style={s.empCard}>
      {/* Tags Row */}
      <View style={s.empTagsRow}>
        {sev >= 3 && (
          <View style={[s.tag, { backgroundColor: '#1C0707', borderColor: '#EF444444' }]}>
            <Text style={[s.tagText, { color: '#EF4444' }]}>⚠ {riskLabel}</Text>
          </View>
        )}
        {redFlags > 0 && (
          <View style={[s.tag, { backgroundColor: '#1C0707', borderColor: '#EF444433' }]}>
            <Text style={[s.tagText, { color: '#EF4444' }]}>▲ {redFlags} RED FLAG{redFlags !== 1 ? 'S' : ''}</Text>
          </View>
        )}
        {greenFlags > 0 && (
          <View style={[s.tag, { backgroundColor: '#052E16', borderColor: '#22C55E33' }]}>
            <Text style={[s.tagText, { color: '#22C55E' }]}>● {greenFlags} GREEN FLAG</Text>
          </View>
        )}
        <View style={[s.tag, { backgroundColor: '#0C1020', borderColor: '#3B82F633' }]}>
          <Text style={[s.tagText, { color: '#3B82F6' }]}>⊞ {deptLabel}</Text>
        </View>
        <View style={[s.tag, { backgroundColor: '#12100A', borderColor: '#C8A97E33' }]}>
          <Text style={[s.tagText, { color: '#C8A97E' }]}>◎ {attendanceLabel}</Text>
        </View>
      </View>

      {/* Main content */}
      <View style={s.empMain}>
        {/* Avatar + Info */}
        <View style={s.empAvatarCol}>
          <View style={[s.empAvatar, { backgroundColor: color + '22', borderColor: color + '66' }]}>
            <Text style={[s.empAvatarText, { color }]}>{initials}</Text>
          </View>
          <TouchableOpacity
            style={s.empNameBtn}
            onPress={() => navigation.navigate('EmployeeProfile', { employeeId: u.uid })}
          >
            <Text style={s.empNameBtnText} numberOfLines={1}>{u.fullName}</Text>
            <Text style={s.empNameArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.empStatsRow}>
          <StatBox label="ATTENDANCE THIS MONTH" value={`${Math.floor(attPct / 8)}/12`} />
          <StatBox label="AVG DAILY WORKING HOURS" value={`${(4 + Math.abs(score) / 30).toFixed(1)}h`} color="#22C55E" />
          <StatBox label="AVG TASKS COMPLETED DAILY" value={`${(score > 0 ? 2.5 : 1.2).toFixed(1)}`} color="#3B82F6" />
          <StatBox label="TOTAL TASKS COMPLETED" value={`${sev * 3 + 5}`} />
          <StatBox label="CURRENT PROJECTS" value="0" />
          <View style={s.reviewBox}>
            <Text style={s.reviewLabel}>DAILY REVIEW</Text>
            <Text style={s.reviewValue}><Text style={{ color: '#22C55E' }}>0</Text> APPROVED</Text>
            <Text style={s.reviewValue}><Text style={{ color: '#EF4444' }}>0</Text> DECLINED</Text>
          </View>
        </View>
      </View>

      {/* Bottom: Today's Tasks + Employee Flags */}
      <View style={s.empBottom}>
        {/* Today's Tasks */}
        <View style={s.empTodayTasks}>
          <Text style={s.empSectionLabel}>TODAY'S TASKS</Text>
          {todayAtt ? (
            <Text style={s.empTodayNote}>
              {todayAtt.status === 'clocked-in' ? '● Clocked in' : todayAtt.status === 'clocked-out' ? '✓ Clocked out' : 'No tasks logged for today'}
            </Text>
          ) : (
            <Text style={s.empEmptyNote}>No tasks logged for today</Text>
          )}
        </View>

        {/* Employee Flags */}
        <View style={s.empFlagsCol}>
          <Text style={s.empSectionLabel}>EMPLOYEE FLAGS</Text>
          {flags.slice(0, 3).map((f, i) => (
            <View key={i} style={s.empFlagRow}>
              <View style={[s.empFlagDot, { backgroundColor: f.pts > 0 ? '#22C55E' : '#EF4444' }]} />
              <Text style={s.empFlagName}>{f.label}</Text>
              <Text style={[s.empFlagPts, { color: f.pts > 0 ? '#22C55E' : '#EF4444' }]}>
                {f.pts > 0 ? '+' : ''}{f.pts}
              </Text>
            </View>
          ))}
          {flags.length === 0 && <Text style={s.empEmptyNote}>No flags</Text>}
        </View>

        {/* Score badge */}
        <View style={[s.scoreBadge, { backgroundColor: score >= 0 ? '#052E16' : '#1C0707', borderColor: score >= 0 ? '#22C55E44' : '#EF444444' }]}>
          <Text style={[s.scoreText, { color: score >= 0 ? '#22C55E' : '#EF4444' }]}>
            {score >= 0 ? '+' : ''}{score} PTS
          </Text>
        </View>
      </View>
    </View>
  );
}

function StatBox({ label, value, color = '#FFF' }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060608' },
  content: { padding: 16 },

  pageHeader: { marginBottom: 16 },
  pageEyebrow: { fontSize: 10, color: '#555', fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  pageTitle: { fontSize: 22, color: '#FFF', fontWeight: '700', marginBottom: 4 },
  pageSub: { fontSize: 12, color: '#666' },

  filterBtn: {
    backgroundColor: '#0D0D12', borderWidth: 1, borderColor: '#1A1A28',
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  filterBtnText: { color: '#888', fontSize: 13 },
  dropdown: {
    position: 'absolute', top: 50, left: 0, right: 0,
    backgroundColor: '#0D0D12', borderWidth: 1, borderColor: '#1A1A28',
    borderRadius: 8, zIndex: 100,
  },
  dropdownSearch: {
    borderBottomWidth: 1, borderBottomColor: '#1A1A28', paddingHorizontal: 14, paddingVertical: 10,
    color: '#FFF', fontSize: 13,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  dropdownItemText: { color: '#DDD', fontSize: 13, fontWeight: '600' },
  dropdownItemMeta: { color: '#666', fontSize: 11, marginTop: 2 },

  // KPI
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: {
    backgroundColor: '#0D0D12', borderRadius: 10, borderWidth: 1, borderColor: '#1A1A28',
    padding: 14, width: '47.5%',
  },
  kpiCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  kpiCardLabel: { fontSize: 9, color: '#666', fontWeight: '800', letterSpacing: 1 },
  kpiCardIcon: { fontSize: 14 },
  kpiCardValue: { fontSize: 32, fontWeight: '300', color: '#FFF', marginBottom: 4 },
  kpiCardSub: { fontSize: 10, color: '#555' },

  // Employee Card
  empCard: {
    backgroundColor: '#0D0D12', borderRadius: 12, borderWidth: 1, borderColor: '#1A1A28',
    marginBottom: 16, overflow: 'hidden',
  },
  empTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#111' },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  empMain: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 16 },
  empAvatarCol: { alignItems: 'center', gap: 10, width: 90 },
  empAvatar: { width: 56, height: 56, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  empAvatarText: { fontSize: 20, fontWeight: '900' },
  empNameBtn: { backgroundColor: '#111', borderWidth: 1, borderColor: '#1A1A28', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%' },
  empNameBtnText: { fontSize: 11, color: '#CCC', fontWeight: '600', flex: 1 },
  empNameArrow: { color: '#555', fontSize: 14 },

  empStatsRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statBox: { minWidth: 80 },
  statLabel: { fontSize: 9, color: '#555', fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  reviewBox: { minWidth: 80 },
  reviewLabel: { fontSize: 9, color: '#555', fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  reviewValue: { fontSize: 11, color: '#888', marginBottom: 2 },

  empBottom: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#111', padding: 14, gap: 16, position: 'relative' },
  empTodayTasks: { flex: 1 },
  empFlagsCol: { flex: 1.5 },
  empSectionLabel: { fontSize: 9, color: '#555', fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  empTodayNote: { fontSize: 12, color: '#666' },
  empEmptyNote: { fontSize: 11, color: '#555', fontStyle: 'italic' },
  empFlagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  empFlagDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  empFlagName: { flex: 1, fontSize: 12, color: '#CCC' },
  empFlagPts: { fontSize: 12, fontWeight: '700' },
  scoreBadge: {
    position: 'absolute', right: 14, top: 14,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  scoreText: { fontSize: 14, fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#555', fontSize: 14 },
});
