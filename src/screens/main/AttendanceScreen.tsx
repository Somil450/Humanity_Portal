import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { getAttendanceHistory } from '../../services/attendanceService';
import { getAllUsers } from '../../services/authService';
import { AttendanceRecord, User } from '../../types';
import { format, getDaysInMonth, startOfMonth, getDay, endOfMonth, subMonths, addMonths } from 'date-fns';

export default function AttendanceScreen({ navigation }: any) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  useEffect(() => {
    loadInitialData();
  }, [currentUser]);

  const loadInitialData = async () => {
    try {
      if (isAdmin) {
        const allUsers = await getAllUsers();
        const activeUsers = allUsers.filter(u => u.role !== 'super_admin');
        setUsers(activeUsers);
        if (activeUsers.length > 0) setSelectedUserId(activeUsers[0].uid);
      } else if (currentUser) {
        setSelectedUserId(currentUser.uid);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      loadUserAttendance(selectedUserId);
    }
  }, [selectedUserId, currentMonth]);

  const loadUserAttendance = async (uid: string) => {
    // In a real app we might fetch only the month's data, but reusing the existing service
    const records = await getAttendanceHistory(uid);
    setHistory(records);
  };

  const selectedUser = isAdmin ? users.find(u => u.uid === selectedUserId) : currentUser;

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthHistory = history.filter(h => h.date >= monthStart && h.date <= monthEnd);

  const presentDays = monthHistory.filter(h => h.status !== 'absent').length;
  const absentDays = monthHistory.filter(h => h.status === 'absent').length;
  const totalSeconds = monthHistory.reduce((acc, h) => acc + (h.activeSeconds || 0), 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const attendancePct = monthHistory.length > 0
    ? Math.round((presentDays / monthHistory.length) * 100)
    : 0;

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfWeek = getDay(startOfMonth(currentMonth));
  const blanks = Array(firstDayOfWeek).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getRecord = (day: number) =>
    history.find(h =>
      new Date(h.date).getDate() === day &&
      new Date(h.date).getMonth() === currentMonth.getMonth() &&
      new Date(h.date).getFullYear() === currentMonth.getFullYear()
    );

  const filteredUsers = users.filter(u => u.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color="#C8A97E" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const renderCalendar = () => (
    <View style={s.calendarCard}>
      {/* Month Heatmap streak */}
      <View style={s.streakRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.streakTitle}>⚡ MONTH HEATMAP</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[...Array(31)].map((_, i) => {
              const r = getRecord(i + 1);
              let color = '#1A1A28';
              if (r) {
                if (r.status === 'absent') color = '#3F1212';
                else if (r.status === 'on-leave') color = '#2563EB';
                else {
                  const hrs = (r.activeSeconds || 0) / 3600;
                  if (hrs >= 7) color = '#22C55E';
                  else if (hrs >= 4) color = '#F97316';
                  else if (hrs > 0) color = '#EAB308';
                }
              }
              return <View key={i} style={[s.heatmapBlock, { backgroundColor: color }]} />;
            })}
          </View>
        </View>
        <Text style={s.streakText}>🔥 {presentDays > 0 ? '3 day streak' : 'No streak'}</Text>
      </View>

      <View style={s.calHeader}>
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
          <Text key={d} style={s.calDayHead}>{d}</Text>
        ))}
      </View>
      <View style={s.calGrid}>
        {blanks.map((_, i) => <View key={`blank-${i}`} style={s.calCellEmpty} />)}
        {days.map(day => {
          const r = getRecord(day);
          let borderColor = '#222';
          let textColor = '#FFF';
          let label = '';
          let subLabel = '';
          
          if (r) {
            if (r.status === 'absent') {
              borderColor = '#EF444455';
              label = 'Absent';
              textColor = '#EF4444';
            } else if (r.status === 'on-leave') {
              borderColor = '#3B82F655';
              label = 'Leave';
              textColor = '#3B82F6';
            } else if (r.status === 'clocked-in' || r.status === 'away') {
              borderColor = '#EAB30855';
              label = 'NOW';
              textColor = '#EAB308';
            } else {
              const hrs = (r.activeSeconds || 0) / 3600;
              subLabel = `${Math.floor(hrs)}h ${Math.round((hrs % 1) * 60)}m`;
              if (hrs >= 7) borderColor = '#22C55E88';
              else if (hrs >= 4) borderColor = '#F9731688';
              else borderColor = '#EAB30888';
            }
          }

          const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth();

          return (
            <TouchableOpacity key={day} style={[s.calCell, { borderColor }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.calCellDay}>{day}</Text>
                {isToday && <View style={s.todayBadge}><Text style={s.todayBadgeText}>NOW</Text></View>}
              </View>
              <View style={s.calCellContent}>
                {label ? <Text style={[s.calCellLabel, { color: textColor }]}>{label}</Text> : null}
                {subLabel ? <Text style={s.calCellSub}>{subLabel}</Text> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Legend */}
      <View style={s.legendRow}>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#22C55E' }]} /><Text style={s.legendText}>7+ HOURS</Text></View>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#F97316' }]} /><Text style={s.legendText}>4-6 HOURS</Text></View>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#EAB308' }]} /><Text style={s.legendText}>1-3 HOURS</Text></View>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#EAB308' }]} /><Text style={s.legendText}>WORKING NOW</Text></View>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#3B82F6' }]} /><Text style={s.legendText}>ON LEAVE</Text></View>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#EF4444' }]} /><Text style={s.legendText}>ABSENT</Text></View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.heroName}>{selectedUser?.fullName || 'Select an employee'}</Text>
          <Text style={s.heroSub}>Attendance record & timesheet</Text>
        </View>
        <View style={s.monthSelector}>
          <TouchableOpacity onPress={() => setCurrentMonth(prev => subMonths(prev, 1))} style={s.monthBtn}>
            <Text style={s.monthBtnText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{format(currentMonth, 'MMM yyyy')}</Text>
          <TouchableOpacity onPress={() => setCurrentMonth(prev => addMonths(prev, 1))} style={s.monthBtn}>
            <Text style={s.monthBtnText}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── EMPLOYEE SELECTOR (Admin) ─────────────────────────── */}
      {isAdmin && (
        <View style={s.empSelectorSection}>
          <View style={s.searchWrap}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search employee..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.empHScroll}>
            {filteredUsers.map(u => (
              <TouchableOpacity
                key={u.uid}
                style={[s.empChip, selectedUserId === u.uid && s.empChipActive]}
                onPress={() => setSelectedUserId(u.uid)}
              >
                <View style={[s.empAvatar, selectedUserId === u.uid && s.empAvatarActive]}>
                  <Text style={[s.empAvatarText, selectedUserId === u.uid && { color: '#000' }]}>{u.fullName[0]}</Text>
                </View>
                <Text style={[s.empName, selectedUserId === u.uid && s.empNameActive]} numberOfLines={1}>{u.fullName.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ─── MAIN CONTENT ──────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.mainContent}>
        <Text style={s.sectionEyebrow}>INSIGHTS</Text>

        {/* Insight Cards — 2x2 grid */}
        <View style={s.insightsGrid}>
          <View style={s.insightCard}>
            <Text style={s.insightCardIcon}>📅</Text>
            <Text style={s.insightCardNum}>{presentDays}<Text style={s.insightCardNumSub}> days</Text></Text>
            <Text style={s.insightCardLabel}>PRESENT</Text>
          </View>
          <View style={s.insightCard}>
            <Text style={s.insightCardIcon}>⚠️</Text>
            <Text style={s.insightCardNum}>{absentDays}<Text style={s.insightCardNumSub}> days</Text></Text>
            <Text style={s.insightCardLabel}>ABSENT</Text>
          </View>
          <View style={s.insightCard}>
            <Text style={s.insightCardIcon}>⏱</Text>
            <Text style={s.insightCardNum}>{totalHours}<Text style={s.insightCardNumSub}> hrs</Text></Text>
            <Text style={s.insightCardLabel}>HOURS LOGGED</Text>
          </View>
          <View style={s.insightCard}>
            <Text style={s.insightCardIcon}>📈</Text>
            <Text style={s.insightCardNum}>{attendancePct}<Text style={s.insightCardNumSub}>%</Text></Text>
            <Text style={s.insightCardLabel}>ATTENDANCE</Text>
          </View>
        </View>

        {renderCalendar()}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060608' },

  // ─── HEADER
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1A1A28',
  },
  heroName: { fontSize: 18, color: '#FFF', fontWeight: '700', marginBottom: 2 },
  heroSub: { fontSize: 12, color: '#888' },

  // ─── MONTH SELECTOR
  monthSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161622', borderRadius: 8, paddingHorizontal: 8 },
  monthBtn: { padding: 8 },
  monthBtnText: { color: '#888', fontSize: 16, fontWeight: '700' },
  monthLabel: { color: '#FFF', fontSize: 12, fontWeight: '600', marginHorizontal: 4 },

  // ─── EMPLOYEE SELECTOR
  empSelectorSection: { borderBottomWidth: 1, borderBottomColor: '#1A1A28', paddingBottom: 10 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161622', marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 12, borderRadius: 8, height: 40 },
  searchIcon: { fontSize: 14, color: '#666', marginRight: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13 },
  empHScroll: { paddingHorizontal: 16, gap: 8 },
  empChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2A2A40', backgroundColor: '#0D0D12' },
  empChipActive: { borderColor: '#C8A97E55', backgroundColor: '#1A1A10' },
  empAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center' },
  empAvatarActive: { backgroundColor: '#C8A97E' },
  empAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  empName: { color: '#888', fontSize: 13, fontWeight: '500' },
  empNameActive: { color: '#C8A97E', fontWeight: '700' },

  // ─── MAIN CONTENT
  mainContent: { padding: 16, paddingBottom: 32 },
  sectionEyebrow: { color: '#666', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },

  // Insight Cards — 2x2 grid
  insightsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  insightCard: { width: '47%', backgroundColor: '#111116', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 10, padding: 14 },
  insightCardIcon: { fontSize: 18, marginBottom: 8 },
  insightCardNum: { color: '#FFF', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  insightCardNumSub: { color: '#888', fontSize: 13, fontWeight: '400' },
  insightCardLabel: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  // Calendar
  calendarCard: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 12, padding: 14, paddingBottom: 20 },
  streakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  streakTitle: { color: '#666', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heatmapBlock: { width: 8, height: 8, borderRadius: 2 },
  streakText: { color: '#EAB308', fontSize: 12, fontWeight: '700' },

  calHeader: { flexDirection: 'row', marginBottom: 6 },
  calDayHead: { flex: 1, textAlign: 'center', color: '#666', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  calCellEmpty: { width: '13.2%', aspectRatio: 1 },
  calCell: { width: '13.2%', aspectRatio: 1, backgroundColor: '#161622', borderWidth: 1, borderRadius: 5, padding: 4, justifyContent: 'space-between' },
  calCellDay: { color: '#888', fontSize: 10, fontWeight: '600' },
  todayBadge: { backgroundColor: '#EAB308', paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2 },
  todayBadgeText: { color: '#000', fontSize: 7, fontWeight: '800' },
  calCellContent: { alignItems: 'center', justifyContent: 'center' },
  calCellLabel: { fontSize: 8, fontWeight: '700', marginTop: 2 },
  calCellSub: { color: '#AAA', fontSize: 9, fontWeight: '600', marginTop: 1 },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1F1F2A' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { color: '#888', fontSize: 10, fontWeight: '700' },
});
