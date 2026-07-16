import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllUsers } from '../../services/authService';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

type RoleFilter = 'ALL' | 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';

export default function PeopleScreen({ navigation }: any) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState<RoleFilter>('ALL');
  const [sortOrder, setSortOrder] = useState('Name');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers.filter(u => u.role !== 'super_admin'));
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

  const activeCount = users.filter(u => u.status === 'active').length;
  const terminatedCount = users.filter(u => u.status === 'inactive').length;
  
  const adminCount = users.filter(u => u.role === 'admin').length;
  const hrCount = users.filter(u => u.role === 'hr').length;
  const managerCount = users.filter(u => u.role === 'manager').length;
  const empCount = users.filter(u => u.role === 'employee' || !u.role).length;

  let filteredUsers = users;
  if (activeRole !== 'ALL') {
    if (activeRole === 'EMPLOYEE') filteredUsers = users.filter(u => u.role === 'employee' || !u.role);
    else filteredUsers = users.filter(u => u.role?.toUpperCase() === activeRole);
  }

  if (searchQuery) {
    filteredUsers = filteredUsers.filter(u => 
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        
        {/* HEADER */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.pageTitle}>Employees</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={s.headerLine} />
              <Text style={s.pageSub}>MANAGE EMPLOYEES & ROLES</Text>
            </View>
          </View>
          <TouchableOpacity style={s.addBtn}>
            <Text style={s.addBtnText}>+ ADD EMPLOYEE</Text>
          </TouchableOpacity>
        </View>

        {/* STATS ROW */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={s.statCardHeader}>
              <Text style={s.statCardLabel}>TOTAL ACTIVE</Text>
              <Text style={s.statCardIcon}>👥</Text>
            </View>
            <Text style={s.statCardVal}>{activeCount}</Text>
            <Text style={s.statCardSub}>4 departments</Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statCardHeader}>
              <Text style={s.statCardLabel}>ACTIVE STATUS</Text>
              <Text style={s.statCardIcon}>✅</Text>
            </View>
            <Text style={s.statCardVal}>{activeCount}</Text>
            <Text style={s.statCardSub}>Onboarded</Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statCardHeader}>
              <Text style={s.statCardLabel}>PENDING</Text>
              <Text style={s.statCardIcon}>⏳</Text>
            </View>
            <Text style={s.statCardVal}>0</Text>
            <Text style={s.statCardSub}>None pending</Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statCardHeader}>
              <Text style={s.statCardLabel}>TERMINATED</Text>
              <Text style={s.statCardIcon}>🚫</Text>
            </View>
            <Text style={s.statCardVal}>{terminatedCount}</Text>
            <Text style={s.statCardSub}>Access revoked</Text>
          </View>
        </View>

        {/* TABLE CONTAINER */}
        <View style={s.tableContainer}>
          
          {/* Controls */}
          <View style={s.controlsRow}>
            <View style={s.searchWrap}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search by name, role, department or email..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <View style={s.dropdownWrap}>
              <Text style={s.dropdownText}>All Departments  ▼</Text>
            </View>
            <View style={s.dropdownWrap}>
              <Text style={s.dropdownText}>Sort: {sortOrder}  ▼</Text>
            </View>
          </View>

          {/* Role Filters */}
          <View style={s.roleFiltersRow}>
            <Text style={s.roleFilterLabel}>⚲ ROLE</Text>
            <TouchableOpacity onPress={() => setActiveRole('ALL')} style={[s.roleTab, activeRole === 'ALL' && s.roleTabActive]}>
              <Text style={[s.roleTabText, activeRole === 'ALL' && s.roleTabTextActive]}>ALL {users.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveRole('ADMIN')} style={[s.roleTab, activeRole === 'ADMIN' && s.roleTabActive]}>
              <Text style={[s.roleTabText, activeRole === 'ADMIN' && s.roleTabTextActive]}>ADMIN {adminCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveRole('HR')} style={[s.roleTab, activeRole === 'HR' && s.roleTabActive]}>
              <Text style={[s.roleTabText, activeRole === 'HR' && s.roleTabTextActive]}>HR {hrCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveRole('MANAGER')} style={[s.roleTab, activeRole === 'MANAGER' && s.roleTabActive]}>
              <Text style={[s.roleTabText, activeRole === 'MANAGER' && s.roleTabTextActive]}>MANAGER {managerCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveRole('EMPLOYEE')} style={[s.roleTab, activeRole === 'EMPLOYEE' && s.roleTabActive]}>
              <Text style={[s.roleTabText, activeRole === 'EMPLOYEE' && s.roleTabTextActive]}>EMPLOYEE {empCount}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <Text style={s.showingCount}>{filteredUsers.length} OF {users.length}</Text>
          </View>

          {/* Table Header */}
          <View style={s.tableHeaderRow}>
            <Text style={[s.thText, { flex: 2.5 }]}>EMPLOYEE</Text>
            <Text style={[s.thText, { flex: 1.5 }]}>ROLE</Text>
            <Text style={[s.thText, { flex: 1.5 }]}>DEPARTMENT</Text>
            <Text style={[s.thText, { flex: 1 }]}>STATUS</Text>
            <Text style={[s.thText, { flex: 1 }]}>CONTACT</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Table Rows */}
          {filteredUsers.map((u, i) => (
            <View key={u.uid} style={[s.tableRow, i !== filteredUsers.length -1 && { borderBottomWidth: 1, borderBottomColor: '#1A1A28' }]}>
              
              {/* EMPLOYEE */}
              <View style={[s.tdCell, { flex: 2.5, flexDirection: 'row', alignItems: 'center' }]}>
                <View style={s.avatar}><Text style={s.avatarText}>{u.fullName[0]}</Text></View>
                <View>
                  <Text style={s.empName}>{u.fullName}</Text>
                  <Text style={s.empEmail}>{u.email}</Text>
                </View>
              </View>

              {/* ROLE */}
              <View style={[s.tdCell, { flex: 1.5, flexDirection: 'row', alignItems: 'center' }]}>
                <Text style={s.roleDot}>○</Text>
                <Text style={s.roleText}>{(u.role || 'EMPLOYEE').toUpperCase()}</Text>
              </View>

              {/* DEPARTMENT */}
              <View style={[s.tdCell, { flex: 1.5, justifyContent: 'center' }]}>
                <Text style={s.deptText}>{u.department || 'Engineering'}</Text>
              </View>

              {/* STATUS */}
              <View style={[s.tdCell, { flex: 1, justifyContent: 'center' }]}>
                <View style={s.statusBadge}>
                  <Text style={s.statusBadgeText}>ACTIVE</Text>
                </View>
              </View>

              {/* CONTACT */}
              <View style={[s.tdCell, { flex: 1, justifyContent: 'center' }]}>
                <Text style={s.contactText}>-</Text>
              </View>

              {/* ACTION */}
              <TouchableOpacity 
                style={{ width: 60, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 16 }}
                onPress={() => navigation.navigate('More', { screen: 'EmployeeProfile', params: { userId: u.uid } })}
              >
                <Text style={s.viewBtnText}>VIEW →</Text>
              </TouchableOpacity>
            </View>
          ))}
          {filteredUsers.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: '#666' }}>No employees found matching filter.</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060608' },
  content: { padding: 32 },
  
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  pageTitle: { fontSize: 32, color: '#C8A97E', fontStyle: 'italic', fontWeight: '600', letterSpacing: 1 },
  headerLine: { width: 32, height: 1, backgroundColor: '#4A3D1A', marginRight: 12 },
  pageSub: { color: '#888', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  addBtn: { backgroundColor: '#EAB308', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  addBtnText: { color: '#000', fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: '#111116', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 8, padding: 16 },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statCardLabel: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statCardIcon: { fontSize: 12 },
  statCardVal: { color: '#FFF', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statCardSub: { color: '#555', fontSize: 11, fontStyle: 'italic' },

  // Table Container
  tableContainer: { backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 12, overflow: 'hidden' },
  
  // Controls
  controlsRow: { flexDirection: 'row', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#1A1A28' },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111116', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 6, paddingHorizontal: 12, height: 40 },
  searchIcon: { color: '#666', fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13 },
  dropdownWrap: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 6, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  dropdownText: { color: '#AAA', fontSize: 12, fontWeight: '600' },

  // Role Filters
  roleFiltersRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A28' },
  roleFilterLabel: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginRight: 16 },
  roleTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginRight: 8 },
  roleTabActive: { backgroundColor: '#4A3D1A' },
  roleTabText: { color: '#666', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  roleTabTextActive: { color: '#EAB308' },
  showingCount: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  // Table Header
  tableHeaderRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F1F2A' },
  thText: { color: '#555', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  // Table Row
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, minHeight: 64 },
  tdCell: { justifyContent: 'center' },
  
  avatar: { width: 32, height: 32, borderRadius: 4, backgroundColor: '#EAB308', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#000', fontSize: 14, fontWeight: '800' },
  empName: { color: '#FFF', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  empEmail: { color: '#666', fontSize: 11 },

  roleDot: { color: '#666', fontSize: 14, marginRight: 6 },
  roleText: { color: '#DDD', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  
  deptText: { color: '#888', fontSize: 12 },
  
  statusBadge: { alignSelf: 'flex-start', backgroundColor: '#052E16', borderWidth: 1, borderColor: '#22C55E33', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusBadgeText: { color: '#22C55E', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  contactText: { color: '#666', fontSize: 12 },

  viewBtnText: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
