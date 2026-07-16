import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, Alert, TextInput, Switch, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { applyForLeave, listenToMyLeaves } from '../../services/leaveService';
import { Leave, LeaveReason } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS, CARD } from '../../theme';
import DateTimePicker from '@react-native-community/datetimepicker';

const LEAVE_REASONS: { key: LeaveReason; label: string; emoji: string }[] = [
  { key: 'paid',      label: 'Paid Leave',  emoji: '💼' },
  { key: 'medical',   label: 'Medical',     emoji: '🏥' },
  { key: 'exam',      label: 'Exam',        emoji: '📝' },
  { key: 'maternity', label: 'Maternity',   emoji: '🤱' },
  { key: 'unpaid',    label: 'Unpaid',      emoji: '📋' },
  { key: 'other',     label: 'Other',       emoji: '📌' },
];

const DESCRIPTION_MAX = 500;

const EMPTY_FORM = {
  startDate: '',
  endDate: '',
  reason: '' as LeaveReason | '',
  reportingManager: '',
  description: '',
  managerInformed: false,
  digitalSignature: '',
  declarationAccepted: false,
};

export default function LeavesScreen() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'pending' | 'approved' | 'declined'>('All');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showReasonPicker, setShowReasonPicker] = useState(false);

  // Android back: close modal first
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (showReasonPicker) { setShowReasonPicker(false); return true; }
        if (showApplyModal) { closeModal(); return true; }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [showApplyModal, showReasonPicker]),
  );

  useEffect(() => {
    if (!user) return;
    const unsub = listenToMyLeaves(user.uid, (data) => {
      setLeaves(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const closeModal = () => {
    setShowApplyModal(false);
    setShowReasonPicker(false);
    setForm({ ...EMPTY_FORM });
  };

  const handleApply = async () => {
    if (!form.startDate || !form.endDate) {
      Alert.alert('Error', 'Please select both start and end dates.');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      Alert.alert('Error', 'End date cannot be before start date.');
      return;
    }
    if (!form.reason) {
      Alert.alert('Error', 'Please select a reason for your leave.');
      return;
    }
    if (!form.reportingManager.trim()) {
      Alert.alert('Error', 'Please enter your reporting manager\'s name.');
      return;
    }
    if (!form.digitalSignature.trim()) {
      Alert.alert('Error', 'Please enter your digital signature (full name).');
      return;
    }
    if (!form.declarationAccepted) {
      Alert.alert('Error', 'Please accept the declaration to proceed.');
      return;
    }

    setApplyLoading(true);
    try {
      await applyForLeave({
        userId: user!.uid,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason as LeaveReason,
        description: form.description.trim(),
        reportingManager: form.reportingManager.trim(),
        managerInformed: form.managerInformed,
        declarationAccepted: form.declarationAccepted,
        digitalSignature: form.digitalSignature.trim(),
      });
      closeModal();
      Alert.alert('✅ Submitted', 'Your leave request has been submitted successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit leave request.');
    } finally {
      setApplyLoading(false);
    }
  };

  const selectedReason = LEAVE_REASONS.find(r => r.key === form.reason);
  const filteredLeaves = activeTab === 'All' ? leaves : leaves.filter(l => l.status === activeTab);
  const pendingCount  = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;
  const declinedCount = leaves.filter(l => l.status === 'declined').length;

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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Leave Requests</Text>
          <Text style={styles.headerSub}>Track and manage your time off</Text>
        </View>
        <TouchableOpacity style={styles.applyBtn} onPress={() => setShowApplyModal(true)}>
          <Text style={styles.applyBtnText}>+ Request Leave</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          label="PENDING" value={pendingCount}
          sub={pendingCount === 0 ? 'No pending' : `${pendingCount} pending`}
          emoji="⏳" color={COLORS.secondary}
        />
        <StatCard
          label="APPROVED" value={approvedCount}
          sub={approvedCount === 0 ? '0 days taken' : `${approvedCount} approved`}
          emoji="✅" color={COLORS.primary}
        />
        <StatCard
          label="DECLINED" value={declinedCount}
          sub=""
          emoji="🚫" color={COLORS.danger}
        />
        <StatCard
          label="TOTAL" value={leaves.length}
          sub="All requests"
          emoji="📈" color={COLORS.textSecondary}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['All', 'pending', 'approved', 'declined'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'All' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>
                {tab === 'All' ? leaves.length : tab === 'pending' ? pendingCount : tab === 'approved' ? approvedCount : declinedCount}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Leave List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {filteredLeaves.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>📄</Text>
            </View>
            <Text style={styles.emptyTitle}>No leave requests</Text>
            <Text style={styles.emptyText}>Click "Request Leave" to get started.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowApplyModal(true)}>
              <Text style={styles.emptyBtnText}>+ Request Leave</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredLeaves.map(leave => {
            const sColor = leave.status === 'approved' ? COLORS.primary
              : leave.status === 'declined' ? COLORS.danger
              : COLORS.secondary;
            const days = Math.ceil(
              (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 86400)
            ) + 1;
            const reasonMeta = LEAVE_REASONS.find(r => r.key === leave.reason);
            return (
              <View key={leave.id} style={styles.leaveCard}>
                <View style={styles.leaveCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                    <Text style={styles.leaveEmoji}>{reasonMeta?.emoji || '📋'}</Text>
                    <View>
                      <Text style={styles.leaveName}>{reasonMeta?.label || leave.reason} Leave</Text>
                      <Text style={styles.leaveSubtitle}>{days} day{days !== 1 ? 's' : ''} requested</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sColor + '22', borderColor: sColor + '55' }]}>
                    <Text style={[styles.statusText, { color: sColor }]}>{leave.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.datesRow}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateLabel}>FROM</Text>
                    <Text style={styles.dateValue}>{format(new Date(leave.startDate), 'dd MMM yyyy')}</Text>
                  </View>
                  <Text style={styles.dateArrow}>→</Text>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateLabel}>TO</Text>
                    <Text style={styles.dateValue}>{format(new Date(leave.endDate), 'dd MMM yyyy')}</Text>
                  </View>
                </View>

                {leave.description ? (
                  <View style={[styles.noteBox, { borderLeftColor: COLORS.info }]}>
                    <Text style={styles.noteLabel}>DESCRIPTION</Text>
                    <Text style={styles.noteText}>{leave.description}</Text>
                  </View>
                ) : null}

                <View style={[styles.noteBox, { borderLeftColor: sColor }]}>
                  <Text style={styles.noteLabel}>STATUS</Text>
                  <Text style={styles.noteText}>
                    {leave.adminNotes || (
                      leave.status === 'approved'
                        ? 'Your leave has been approved.'
                        : leave.status === 'declined'
                        ? 'Your leave request was declined. Please contact your manager.'
                        : 'Your leave request is awaiting review.'
                    )}
                  </Text>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ─── Request Leave Modal ─── (full screen, no scroll) */}
      <Modal
        visible={showApplyModal}
        animationType="slide"
        transparent={false}
        onRequestClose={closeModal}
        statusBarTranslucent={false}
      >
        <SafeAreaView style={styles.modalScreen}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Leave</Text>
            <TouchableOpacity onPress={closeModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form body — no scroll */}
          <View style={styles.modalBody}>
              {/* Date Row */}
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>FROM DATE</Text>
                  <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
                    <Text style={[styles.dateInputText, !form.startDate && styles.placeholder]}>
                      {form.startDate ? format(new Date(form.startDate), 'dd-MM-yyyy') : 'dd-mm-yyyy'}
                    </Text>
                    <Text style={styles.calIcon}>📅</Text>
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={form.startDate ? new Date(form.startDate) : new Date()}
                      mode="date" display="default"
                      onChange={(e, d) => {
                        setShowStartPicker(false);
                        if (d) setForm(f => ({ ...f, startDate: format(d, 'yyyy-MM-dd') }));
                      }}
                    />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>TO DATE</Text>
                  <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
                    <Text style={[styles.dateInputText, !form.endDate && styles.placeholder]}>
                      {form.endDate ? format(new Date(form.endDate), 'dd-MM-yyyy') : 'dd-mm-yyyy'}
                    </Text>
                    <Text style={styles.calIcon}>📅</Text>
                  </TouchableOpacity>
                  {showEndPicker && (
                    <DateTimePicker
                      value={form.endDate ? new Date(form.endDate) : new Date()}
                      mode="date" display="default"
                      onChange={(e, d) => {
                        setShowEndPicker(false);
                        if (d) setForm(f => ({ ...f, endDate: format(d, 'yyyy-MM-dd') }));
                      }}
                    />
                  )}
                </View>
              </View>

              {/* Reason Dropdown */}
              <Text style={styles.fieldLabel}>REASON</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setShowReasonPicker(v => !v)}
              >
                <Text style={[styles.dropdownText, !form.reason && styles.placeholder]}>
                  {selectedReason ? `${selectedReason.emoji}  ${selectedReason.label}` : 'Select a reason...'}
                </Text>
                <Text style={styles.dropdownArrow}>{showReasonPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showReasonPicker && (
                <View style={styles.dropdownList}>
                  {LEAVE_REASONS.map(r => (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.dropdownItem, form.reason === r.key && styles.dropdownItemActive]}
                      onPress={() => { setForm(f => ({ ...f, reason: r.key })); setShowReasonPicker(false); }}
                    >
                      <Text style={styles.dropdownItemEmoji}>{r.emoji}</Text>
                      <Text style={[styles.dropdownItemText, form.reason === r.key && styles.dropdownItemTextActive]}>
                        {r.label}
                      </Text>
                      {form.reason === r.key && <Text style={{ color: COLORS.primary }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Reporting Manager */}
              <Text style={styles.fieldLabel}>REPORTING MANAGER NAME <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your reporting manager's full name"
                placeholderTextColor={COLORS.textMuted}
                value={form.reportingManager}
                onChangeText={t => setForm(f => ({ ...f, reportingManager: t }))}
              />

              {/* Description */}
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>DESCRIPTION <Text style={styles.optional}>(OPTIONAL)</Text></Text>
                <Text style={styles.charCount}>{form.description.length}/{DESCRIPTION_MAX}</Text>
              </View>
              <TextInput
                style={styles.textAreaInput}
                placeholder="Provide additional details..."
                placeholderTextColor={COLORS.textMuted}
                value={form.description}
                onChangeText={t => { if (t.length <= DESCRIPTION_MAX) setForm(f => ({ ...f, description: t })); }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Manager Informed Toggle */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Is your manager informed?</Text>
                <Switch
                  value={form.managerInformed}
                  onValueChange={v => setForm(f => ({ ...f, managerInformed: v }))}
                  trackColor={{ false: COLORS.borderDefault, true: COLORS.primary + '88' }}
                  thumbColor={form.managerInformed ? COLORS.primary : COLORS.textMuted}
                />
              </View>

              {/* Digital Signature */}
              <Text style={styles.fieldLabel}>DIGITAL SIGNATURE <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.textInput, { fontStyle: 'italic' }]}
                placeholder="Type your full name as signature"
                placeholderTextColor={COLORS.textMuted}
                value={form.digitalSignature}
                onChangeText={t => setForm(f => ({ ...f, digitalSignature: t }))}
              />

              {/* Declaration */}
              <TouchableOpacity
                style={styles.declarationBox}
                onPress={() => setForm(f => ({ ...f, declarationAccepted: !f.declarationAccepted }))}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, form.declarationAccepted && styles.checkboxChecked]}>
                  {form.declarationAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.declarationText}>
                  <Text style={styles.declarationBold}>Declaration: </Text>
                  I confirm that the information provided above is true and accurate to the best of my knowledge. I understand that providing incorrect, false, or misleading information may lead to corrective actions by the organization, in accordance with company policies.
                </Text>
              </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, applyLoading && { opacity: 0.6 }]}
                onPress={handleApply}
                disabled={applyLoading}
              >
                {applyLoading
                  ? <ActivityIndicator color={COLORS.bgDeep} />
                  : <Text style={styles.submitBtnText}>Submit Request</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Stat Card Component ─────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, emoji, color }: any) => (
  <View style={styles.statCard}>
    <View style={styles.statCardTop}>
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={styles.statCardEmoji}>{emoji}</Text>
    </View>
    <Text style={[styles.statCardValue, { color }]}>{value}</Text>
    {sub ? <Text style={styles.statCardSub}>{sub}</Text> : null}
  </View>
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDeep },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  headerTitle: { fontSize: FONTS.sizes.xl, color: COLORS.primary, fontWeight: '800' },
  headerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  applyBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
  },
  applyBtnText: { color: COLORS.bgDeep, fontSize: FONTS.sizes.xs, fontWeight: '800' },

  // Stats grid (2x2)
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: SPACING.md, gap: SPACING.sm,
  },
  statCard: {
    width: '48%', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.borderDefault, padding: SPACING.md,
  },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  statCardLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1 },
  statCardEmoji: { fontSize: 16 },
  statCardValue: { fontSize: FONTS.sizes.xxl, fontWeight: '800', marginBottom: 2 },
  statCardSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
    gap: SPACING.xs,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md, gap: 4,
  },
  tabActive: { backgroundColor: COLORS.primary + '22' },
  tabText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  tabBadge: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 1,
    minWidth: 18, alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: COLORS.primary + '33' },
  tabBadgeText: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700' },
  tabBadgeTextActive: { color: COLORS.primary },

  content: { padding: SPACING.lg },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.bgCard, borderWidth: 1,
    borderColor: COLORS.borderDefault,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyIcon: { fontSize: 28 },
  emptyTitle: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: '700' },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  emptyBtnText: { color: COLORS.bgDeep, fontWeight: '800', fontSize: FONTS.sizes.sm },

  // Leave cards
  leaveCard: { ...CARD, marginBottom: SPACING.lg, overflow: 'hidden' },
  leaveCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  leaveEmoji: { fontSize: 24 },
  leaveName: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: '700' },
  leaveSubtitle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  datesRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.lg, gap: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  dateBox: {
    flex: 1, backgroundColor: COLORS.bgElevated, padding: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderDefault,
  },
  dateLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  dateValue: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, fontWeight: '700' },
  dateArrow: { fontSize: FONTS.sizes.lg, color: COLORS.textMuted },
  noteBox: {
    margin: SPACING.lg, padding: SPACING.md,
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.sm, borderLeftWidth: 3,
  },
  noteLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  noteText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 18 },

  // Modal (full screen)
  modalScreen: { flex: 1, backgroundColor: COLORS.bgDeep },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary },
  modalClose: { fontSize: 20, color: COLORS.textSecondary },
  modalBody: { flex: 1, padding: SPACING.md, justifyContent: 'space-between' },

  // Form fields — compact for full-screen no-scroll layout
  fieldLabel: {
    fontSize: 9, color: COLORS.textMuted,
    fontWeight: '700', letterSpacing: 1.5, marginBottom: 3, marginTop: SPACING.sm,
  },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm },
  required: { color: COLORS.danger },
  optional: { color: COLORS.textMuted, fontWeight: '500', letterSpacing: 0 },
  charCount: { fontSize: 9, color: COLORS.textMuted },

  dateRow: { flexDirection: 'row', gap: SPACING.sm },
  dateInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: 10,
    marginBottom: 2,
  },
  dateInputText: { fontSize: FONTS.sizes.xs, color: COLORS.textPrimary, fontWeight: '500' },
  calIcon: { fontSize: 13 },

  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  dropdownText: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, fontWeight: '500' },
  dropdownArrow: { fontSize: 11, color: COLORS.textMuted },
  dropdownList: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md, marginTop: 2, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  dropdownItemActive: { backgroundColor: COLORS.primary + '15' },
  dropdownItemEmoji: { fontSize: 14 },
  dropdownItemText: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '500' },
  dropdownItemTextActive: { color: COLORS.primary, fontWeight: '700' },

  placeholder: { color: COLORS.textMuted },

  textInput: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.xs,
  },
  textAreaInput: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 8,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.xs, height: 52,
    lineHeight: 18,
  },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10,
    marginTop: SPACING.sm,
  },
  toggleLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textPrimary, fontWeight: '500' },

  declarationBox: {
    flexDirection: 'row', gap: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm,
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 3,
    borderWidth: 1.5, borderColor: COLORS.borderDefault,
    backgroundColor: COLORS.bgDeep, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { fontSize: 11, color: COLORS.bgDeep, fontWeight: '900' },
  declarationText: { flex: 1, fontSize: 10, color: COLORS.textSecondary, lineHeight: 15 },
  declarationBold: { fontWeight: '800', color: COLORS.textPrimary },

  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderDefault,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: FONTS.sizes.sm },
  submitBtn: {
    flex: 2, padding: SPACING.sm, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  submitBtnText: { color: COLORS.bgDeep, fontWeight: '800', fontSize: FONTS.sizes.sm },
});
