import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllLeaves } from '../../services/leaveService';
import { Leave } from '../../types';

export default function LeaveManagementScreen({ navigation }: any) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeStatus, setActiveStatus] = useState<string>('pending');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allLeaves = await getAllLeaves();
      setLeaves(allLeaves);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color="#C8A97E" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;
  const declinedCount = leaves.filter(l => l.status === 'declined').length;
  
  // Fake category stats since `LeaveRequest` type doesn't have an exact matching breakdown out of the box
  const medicalCount = leaves.filter(l => l.reason.toLowerCase().includes('medical') || l.reason.toLowerCase().includes('sick')).length;
  const examCount = leaves.filter(l => l.reason.toLowerCase().includes('exam')).length;
  const miscCount = leaves.length - (medicalCount + examCount);

  let filtered = leaves;
  if (activeStatus !== 'all') {
    filtered = filtered.filter(l => l.status === activeStatus);
  }
  if (activeCategory) {
    if (activeCategory === 'medical') filtered = filtered.filter(l => l.reason.toLowerCase().includes('medical') || l.reason.toLowerCase().includes('sick'));
    if (activeCategory === 'exam') filtered = filtered.filter(l => l.reason.toLowerCase().includes('exam'));
    if (activeCategory === 'misc') filtered = filtered.filter(l => !l.reason.toLowerCase().includes('medical') && !l.reason.toLowerCase().includes('sick') && !l.reason.toLowerCase().includes('exam'));
  }
  if (searchQuery) {
    filtered = filtered.filter(l => 
      l.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.userId.toLowerCase().includes(searchQuery.toLowerCase()) // In a real app we'd map this to names
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        
        {/* HEADER */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.pageTitle}>Leave Management</Text>
            <Text style={s.pageSub}>Review, approve and track team leave requests</Text>
          </View>
          <TouchableOpacity style={s.refreshBtn} onPress={loadData}>
            <Text style={s.refreshIcon}>↻</Text>
            <Text style={s.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* STATS ROW */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={s.statCardHeader}>
              <Text style={s.statCardLabel}>PENDING REVIEW</Text>
              <Text style={[s.statCardIcon, { color: '#EAB308' }]}>⏳</Text>
            </View>
            <Text style={s.statCardVal}>{pendingCount}</Text>
            <Text style={s.statCardSub}>{pendingCount === 0 ? 'All caught up' : `${pendingCount} to review`}</Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statCardHeader}>
              <Text style={s.statCardLabel}>APPROVED</Text>
              <Text style={[s.statCardIcon, { color: '#22C55E' }]}>✅</Text>
            </View>
            <Text style={s.statCardVal}>{approvedCount}</Text>
            <Text style={s.statCardSub}>- days total</Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statCardHeader}>
              <Text style={s.statCardLabel}>DECLINED</Text>
              <Text style={[s.statCardIcon, { color: '#EF4444' }]}>🚫</Text>
            </View>
            <Text style={s.statCardVal}>{declinedCount}</Text>
            <Text style={s.statCardSub}></Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statCardHeader}>
              <Text style={s.statCardLabel}>TOTAL REQUESTS</Text>
              <Text style={[s.statCardIcon, { color: '#C8A97E' }]}>📈</Text>
            </View>
            <Text style={s.statCardVal}>{leaves.length}</Text>
            <Text style={s.statCardSub}>All time</Text>
          </View>
        </View>

        {/* STATUS FILTER TABS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterTabsRow} style={{ marginBottom: 8 }}>
          {(['pending', 'approved', 'declined', 'all'] as const).map(status => (
            <TouchableOpacity
              key={status}
              style={[s.filterTab, activeStatus === status && s.filterTabActive]}
              onPress={() => setActiveStatus(status)}
            >
              <Text style={[s.filterTabText, activeStatus === status && s.filterTabTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
              <View style={[s.filterTabBadge, activeStatus === status && s.filterTabBadgeActive]}>
                <Text style={[s.filterTabBadgeText, activeStatus === status && s.filterTabBadgeTextActive]}>
                  {status === 'pending' ? pendingCount : status === 'approved' ? approvedCount : status === 'declined' ? declinedCount : leaves.length}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* CATEGORY FILTER */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRow} style={{ marginBottom: 16 }}>
          {(['medical', 'exam', 'misc'] as const).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[s.categoryChip, activeCategory === cat && s.categoryChipActive]}
              onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
            >
              <Text style={[s.categoryChipText, activeCategory === cat && s.categoryChipTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* MAIN LIST AREA */}
        <View style={s.mainArea}>
          <View style={s.searchWrap}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search by name, reason..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <Text style={s.showingText}>Showing {filtered.length} requests</Text>

          {filtered.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>📄</Text>
              <Text style={s.emptyTitle}>No leave requests found</Text>
              <Text style={s.emptySub}>Nothing matches the current filter</Text>
            </View>
          ) : (
            filtered.map(l => (
              <View key={l.id} style={s.leaveItem}>
                <Text style={{color: '#FFF'}}>{l.reason}</Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060608' },
  content: { padding: 16, paddingBottom: 32 },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontSize: 20, color: '#C8A97E', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  pageSub: { color: '#666', fontSize: 12 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111116', borderWidth: 1, borderColor: '#1F1F2A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  refreshIcon: { color: '#888', marginRight: 6 },
  refreshBtnText: { color: '#CCC', fontSize: 12, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#111116', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 8, padding: 12 },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statCardLabel: { color: '#888', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  statCardIcon: { fontSize: 12 },
  statCardVal: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 2 },
  statCardSub: { color: '#555', fontSize: 10 },

  // Filter Tabs
  filterTabsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: '#252538' },
  filterTabActive: { backgroundColor: '#EAB30822', borderColor: '#EAB30866' },
  filterTabText: { fontSize: 12, color: '#666', fontWeight: '700' },
  filterTabTextActive: { color: '#EAB308' },
  filterTabBadge: { backgroundColor: '#1A1A28', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  filterTabBadgeActive: { backgroundColor: '#3A2F10' },
  filterTabBadgeText: { color: '#555', fontSize: 10, fontWeight: '800' },
  filterTabBadgeTextActive: { color: '#EAB308' },

  // Category row
  categoryRow: { paddingHorizontal: 16, gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#252538' },
  categoryChipActive: { backgroundColor: '#C8A97E22', borderColor: '#C8A97E55' },
  categoryChipText: { fontSize: 11, color: '#666', fontWeight: '700' },
  categoryChipTextActive: { color: '#C8A97E' },

  // Main Area
  mainArea: { flex: 1 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111116', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 6, paddingHorizontal: 16, height: 44, marginBottom: 12 },
  searchIcon: { color: '#666', fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13 },

  showingText: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },

  listContainer: { flex: 1, minHeight: 200, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, color: '#666', marginBottom: 16 },
  emptyTitle: { color: '#CCC', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: '#666', fontSize: 13 },

  leaveItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F2A' },

  // Legacy aliases (unused now but kept for safety)
  splitLayout: {},
  sidebar: {},
  sideSectionLabel: {},
  sideFilterItem: {},
  sideFilterActive: {},
  sideFilterText: {},
  sideFilterTextActive: {},
  sideFilterBadge: {},
  sideFilterBadgeActive: {},
  sideFilterBadgeText: {},
  sideFilterBadgeTextActive: {},
  controlsRow: {},
  dropdownWrap: {},
  dropdownText: {},
});
