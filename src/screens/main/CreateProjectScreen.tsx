import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { createProject } from '../../services/projectService';
import { getAllUsers } from '../../services/authService';
import { User } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme';
import { Avatar } from '../../components/ui';

export default function CreateProjectScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(true);

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'internal' as 'internal' | 'external' | 'other',
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    getAllUsers().then(data => {
      // Don't include super admins in normal project assignments usually, but we can list all active
      setUsers(data.filter(u => u.status === 'active' || u.status === 'pending'));
      setFetchingUsers(false);
    });
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Please enter a project name.'); return; }
    if (!form.type) { Alert.alert('Error', 'Please select a project type.'); return; }

    try {
      setLoading(true);
      await createProject({
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        status: 'active',
        members: selectedMembers,
        createdBy: user?.uid || '',
        links: [],
        origin: 'portal',
      });
      Alert.alert('Success ✅', 'Project has been created and assigned.', [
        { text: 'Done', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (uid: string) => {
    if (selectedMembers.includes(uid)) {
      setSelectedMembers(prev => prev.filter(id => id !== uid));
    } else {
      setSelectedMembers(prev => [...prev, uid]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Create Project</Text>
          <Text style={styles.headerSub}>Setup workspace & assign team</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>PROJECT NAME *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mobile App Redesign"
            placeholderTextColor={COLORS.textMuted}
            value={form.name}
            onChangeText={t => setForm({ ...form, name: t })}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Optional project details..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            value={form.description}
            onChangeText={t => setForm({ ...form, description: t })}
          />
        </View>

        {/* Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>PROJECT TYPE *</Text>
          <View style={styles.optionsRow}>
            {['internal', 'external', 'other'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.optionBtn, form.type === type && styles.optionBtnActive]}
                onPress={() => setForm({ ...form, type: type as any })}
              >
                <Text style={[styles.optionText, form.type === type && styles.optionTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Team Assignment */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>ASSIGN TEAM MEMBERS</Text>
          {fetchingUsers ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <View style={styles.membersList}>
              {users.map(u => {
                const isSelected = selectedMembers.includes(u.uid);
                return (
                  <TouchableOpacity
                    key={u.uid}
                    style={[styles.memberRow, isSelected && styles.memberRowActive]}
                    onPress={() => toggleMember(u.uid)}
                  >
                    <Avatar name={u.fullName} size={36} />
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text style={styles.memberName}>{u.fullName}</Text>
                      <Text style={styles.memberRole}>{u.role}</Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>Create Project</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
    backgroundColor: COLORS.bgElevated,
  },
  backBtn: { padding: SPACING.xs, marginRight: SPACING.sm },
  backIcon: { fontSize: 22, color: COLORS.textSecondary },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  fieldGroup: { marginBottom: SPACING.xl },
  fieldLabel: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
    fontWeight: '700', letterSpacing: 1, marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md, color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  optionsRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  optionBtn: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.borderDefault,
    backgroundColor: COLORS.bgElevated,
  },
  optionBtnActive: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  optionText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: FONTS.sizes.sm },
  optionTextActive: { color: COLORS.primary },

  membersList: { gap: SPACING.sm },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.md,
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.borderDefault,
  },
  memberRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  memberName: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: '600' },
  memberRole: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textTransform: 'capitalize' },
  checkbox: {
    width: 24, height: 24, borderRadius: RADIUS.sm, borderWidth: 2, borderColor: COLORS.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.white, fontSize: 14, fontWeight: '900' },

  footer: {
    padding: SPACING.lg, backgroundColor: COLORS.bgElevated,
    borderTopWidth: 1, borderTopColor: COLORS.borderSubtle,
  },
  submitBtn: {
    backgroundColor: COLORS.primary, paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, alignItems: 'center',
  },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
});
