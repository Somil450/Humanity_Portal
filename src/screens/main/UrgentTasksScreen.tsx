import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Modal,
  KeyboardAvoidingView, Platform, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { listenToUrgentTasks, createUrgentTask } from '../../services/urgentTaskService';
import { getAllUsers } from '../../services/authService';
import { UrgentTask, User } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS, CARD, PRIORITY_COLORS } from '../../theme';

const STATUS_OPTIONS = ['All', 'todo', 'in-progress', 'awaiting-review', 'completed'] as const;
type StatusFilter = typeof STATUS_OPTIONS[number];

export default function UrgentTasksScreen({ navigation }: any) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<UrgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [showCreate, setShowCreate] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Create task form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'normal' | 'high' | 'critical'>('normal');
  const [creating, setCreating] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'manager';

  // Android back button: close modal first
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (showCreate) { setShowCreate(false); return true; }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [showCreate]),
  );

  const closeCreate = () => {
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    setNewPriority('normal');
  };

  useEffect(() => {
    if (!user) return;
    const unsub = listenToUrgentTasks(user.uid, isAdmin, (updatedTasks) => {
      setTasks(updatedTasks);
      setLoading(false);
    });
    if (isAdmin) {
      getAllUsers().then(u => setAllUsers(u.filter(x => x.status === 'active' && x.role !== 'super_admin')));
    }
    return unsub;
  }, [user]);

  const filtered = tasks.filter(t => {
    if (t.isArchived) return false;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeCount = tasks.filter(t => !t.isArchived && t.status !== 'completed').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length;

  const handleCreateTask = async () => {
    if (!newName.trim()) { Alert.alert('Error', 'Task name is required.'); return; }
    if (!user) return;
    setCreating(true);
    try {
      await createUrgentTask({
        name: newName.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        status: 'todo',
        assignees: [],
        assignedBy: user.uid,
        instructions: [],
        references: [],
        attachments: [],
        timeline: [],
        isArchived: false,
      }, user.fullName);
      setShowCreate(false);
      setNewName(''); setNewDesc(''); setNewPriority('normal');
      Alert.alert('✅ Created', 'Urgent task created successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>PRIORITY WORK</Text>
          <Text style={styles.headerTitle}>Urgent Tasks</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.createBtnText}>+ Create</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <KPIBox label="ACTIVE" value={activeCount} color={COLORS.warning} />
        <View style={styles.kpiDivider} />
        <KPIBox label="OVERDUE" value={overdueCount} color={COLORS.danger} />
        <View style={styles.kpiDivider} />
        <KPIBox label="DONE" value={completedCount} color={COLORS.primary} />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {STATUS_OPTIONS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
              {s.toUpperCase().replace(/-/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚡</Text>
            <Text style={styles.emptyText}>
              {search ? 'No tasks match your search.' : 'No urgent tasks right now.'}
            </Text>
            {isAdmin && !search && (
              <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setShowCreate(true)}>
                <Text style={styles.emptyCreateText}>+ Create First Task</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map(task => {
            const pColor = (PRIORITY_COLORS as any)[task.priority] || COLORS.textSecondary;
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
            const statusColor = task.status === 'completed' ? COLORS.primary
              : task.status === 'in-progress' ? COLORS.info
              : task.status === 'awaiting-review' ? COLORS.secondary
              : COLORS.textMuted;
            return (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('More', { screen: 'UrgentTasks' })}
              >
                <View style={[styles.priorityStripe, { backgroundColor: pColor }]} />
                <View style={styles.taskBody}>
                  <View style={styles.taskTopRow}>
                    <Text style={styles.taskName} numberOfLines={2}>{task.name}</Text>
                    {isOverdue && <View style={styles.overdueTag}><Text style={styles.overdueText}>OVERDUE</Text></View>}
                  </View>
                  {task.description ? (
                    <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
                  ) : null}
                  <View style={styles.taskMeta}>
                    <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {(task.status || 'todo').replace(/-/g, ' ').toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.priorityPill, { backgroundColor: pColor + '22', borderColor: pColor + '55' }]}>
                      <Text style={[styles.priorityText, { color: pColor }]}>{(task.priority || 'normal').toUpperCase()}</Text>
                    </View>
                    {task.dueDate && (
                      <Text style={[styles.dueText, isOverdue && { color: COLORS.danger }]}>
                        📅 {format(new Date(task.dueDate), 'dd MMM')}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Task Modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={closeCreate}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            {/* Sticky Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Urgent Task</Text>
              <TouchableOpacity onPress={closeCreate} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Body */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
            >
              <Text style={styles.inputLabel}>TASK NAME *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter task name..."
                placeholderTextColor={COLORS.textMuted}
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.inputLabel}>DESCRIPTION</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMulti]}
                placeholder="Enter description..."
                placeholderTextColor={COLORS.textMuted}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>PRIORITY</Text>
              <View style={styles.priorityRow}>
                {(['normal', 'high', 'critical'] as const).map(p => {
                  const pc = (PRIORITY_COLORS as any)[p] || COLORS.primary;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.priorityChip, newPriority === p && { backgroundColor: pc + '33', borderColor: pc }]}
                      onPress={() => setNewPriority(p)}
                    >
                      <Text style={[styles.priorityChipText, newPriority === p && { color: pc }]}>
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeCreate}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTask} disabled={creating}>
                  {creating
                    ? <ActivityIndicator color={COLORS.white} size="small" />
                    : <Text style={styles.submitText}>Create Task</Text>}
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const KPIBox = ({ label, value, color }: any) => (
  <View style={styles.kpiBox}>
    <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle, gap: SPACING.md,
  },
  backBtn: { padding: SPACING.xs },
  backIcon: { fontSize: 22, color: COLORS.textSecondary },
  headerEyebrow: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '700' },
  headerTitle: { fontSize: FONTS.sizes.xxl, color: COLORS.textPrimary, fontWeight: '800', marginTop: 2 },
  createBtn: {
    backgroundColor: COLORS.primary + '22', borderWidth: 1, borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.lg,
  },
  createBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '700' },

  kpiRow: {
    flexDirection: 'row', backgroundColor: COLORS.bgCard,
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  kpiBox: { flex: 1, alignItems: 'center' },
  kpiDivider: { width: 1, backgroundColor: COLORS.borderSubtle },
  kpiValue: { fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  kpiLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1, marginTop: 2 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle, gap: SPACING.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.md, paddingVertical: SPACING.xs },

  filterScroll: {
    backgroundColor: COLORS.bgCard, maxHeight: 48,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  filterChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    marginLeft: SPACING.md, marginVertical: SPACING.xs,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderDefault,
    backgroundColor: COLORS.bgElevated,
  },
  filterChipActive: { backgroundColor: COLORS.successBg, borderColor: COLORS.primary },
  filterText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  filterTextActive: { color: COLORS.primary },

  content: { padding: SPACING.lg },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center' },
  emptyCreateBtn: {
    marginTop: SPACING.sm, backgroundColor: COLORS.primary + '22', borderWidth: 1,
    borderColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  emptyCreateText: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.sizes.sm },

  taskCard: { ...CARD, flexDirection: 'row', marginBottom: SPACING.md, overflow: 'hidden' },
  priorityStripe: { width: 4 },
  taskBody: { flex: 1, padding: SPACING.md },
  taskTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.xs },
  taskName: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: '700' },
  overdueTag: {
    backgroundColor: COLORS.dangerBg, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.danger + '44',
  },
  overdueText: { fontSize: 9, color: COLORS.danger, fontWeight: '800' },
  taskDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginBottom: SPACING.sm, lineHeight: 16 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexWrap: 'wrap' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  priorityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1 },
  priorityText: { fontSize: 9, fontWeight: '700' },
  dueText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  modalTitle: { fontSize: FONTS.sizes.xl, color: COLORS.textPrimary, fontWeight: '800' },
  modalClose: { fontSize: 20, color: COLORS.textSecondary },
  modalBody: { padding: SPACING.xl },
  inputLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  modalInput: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.borderDefault, color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.md,
  },
  modalInputMulti: { height: 80, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  priorityChip: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.borderDefault, backgroundColor: COLORS.bgElevated,
  },
  priorityChipText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderDefault,
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  submitBtn: {
    flex: 2, alignItems: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
  },
  submitText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
});
