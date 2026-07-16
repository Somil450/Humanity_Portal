import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { createEmployee } from '../../services/authService';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme';
import { CREATION_PERMISSIONS, UserRole, DEPARTMENTS } from '../../types';
import { firebaseConfig } from '../../config/firebase';

const DEFAULT_PASSWORD = 'OneHumanity@123';

export default function CreateEmployeeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [useCustomPassword, setUseCustomPassword] = useState(false);

  const availableRoles: UserRole[] = user?.role
    ? (CREATION_PERMISSIONS[user.role as UserRole] ?? [])
    : [];

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: (availableRoles[0] ?? '') as UserRole | '',
    department: DEPARTMENTS[0] ?? '',
    password: '',
  });

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    hr: 'HR',
    manager: 'Manager',
    employee: 'Employee',
  };

  const selectedRole = form.role || (availableRoles[0] ?? '');
  const screenTitle = selectedRole
    ? `Add ${roleLabels[selectedRole] || selectedRole}`
    : 'Add Team Member';

  const handleCreate = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Error', "Please enter the employee's full name.");
      return;
    }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role.');
      return;
    }
    if (!form.department) {
      Alert.alert('Error', 'Please select a department.');
      return;
    }
    if (useCustomPassword && form.password.trim().length < 8) {
      Alert.alert('Error', 'Custom password must be at least 8 characters.');
      return;
    }

    const password = useCustomPassword && form.password.trim()
      ? form.password.trim()
      : DEFAULT_PASSWORD;

    try {
      setLoading(true);
      await createEmployee(
        {
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          role: selectedRole as string,
          department: form.department,
          password,
        },
        user?.uid || '',
        firebaseConfig.projectId,
        firebaseConfig.apiKey,
      );
      Alert.alert(
        'Success ✅',
        `${form.fullName} has been added.\n\nPassword: ${useCustomPassword ? form.password.trim() : DEFAULT_PASSWORD}`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create employee.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{screenTitle}</Text>
          {user?.role === 'super_admin' && (
            <Text style={styles.headerSub}>Super Admin · All roles available</Text>
          )}
          {user?.role === 'admin' && (
            <Text style={styles.headerSub}>Admin · Can add admins &amp; employees</Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Full Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. John Doe"
            placeholderTextColor={COLORS.textMuted}
            value={form.fullName}
            onChangeText={t => setForm({ ...form, fullName: t })}
          />
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. john@company.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={t => setForm({ ...form, email: t })}
          />
        </View>

        {/* Password Section */}
        <View style={styles.fieldGroup}>
          <View style={styles.passwordHeader}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TouchableOpacity
              style={[styles.toggleBtn, useCustomPassword && styles.toggleBtnActive]}
              onPress={() => {
                setUseCustomPassword(v => !v);
                setForm(f => ({ ...f, password: '' }));
              }}
            >
              <Text style={[styles.toggleBtnText, useCustomPassword && styles.toggleBtnTextActive]}>
                {useCustomPassword ? 'Custom ✓' : 'Use Default'}
              </Text>
            </TouchableOpacity>
          </View>

          {useCustomPassword ? (
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Min. 8 characters"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={form.password}
                onChangeText={t => setForm({ ...form, password: t })}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                style={styles.eyeBtn}
              >
                <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.defaultPasswordBox}>
              <Text style={styles.defaultPasswordText}>
                🔑 Default: <Text style={styles.defaultPasswordValue}>{DEFAULT_PASSWORD}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Role */}
        {availableRoles.length > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ROLE</Text>
            <View style={styles.chipGroup}>
              {availableRoles.map(role => {
                const isActive = form.role ? form.role === role : availableRoles[0] === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setForm({ ...form, role })}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {roleLabels[role] || role}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Department */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DEPARTMENT</Text>
          <View style={styles.chipGroup}>
            {DEPARTMENTS.map(dept => (
              <TouchableOpacity
                key={dept}
                style={[styles.chip, form.department === dept && styles.chipActive]}
                onPress={() => setForm({ ...form, department: dept })}
              >
                <Text style={[styles.chipText, form.department === dept && styles.chipTextActive]}>
                  {dept}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createBtn, loading && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={COLORS.bgDeep} />
            : <Text style={styles.createBtnText}>Create Account</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle, gap: SPACING.md,
  },
  backBtn: { padding: SPACING.xs },
  backIcon: { fontSize: 22, color: COLORS.textSecondary },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  content: { padding: SPACING.lg },

  fieldGroup: { marginBottom: SPACING.xl },
  fieldLabel: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
    fontWeight: '700', letterSpacing: 2, marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
  },

  // Password
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  toggleBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    backgroundColor: COLORS.bgCard,
  },
  toggleBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.successBg,
  },
  toggleBtnText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
  },
  passwordInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    paddingVertical: SPACING.md,
  },
  eyeBtn: {
    padding: SPACING.xs,
  },
  defaultPasswordBox: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  defaultPasswordText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
  },
  defaultPasswordValue: {
    color: COLORS.textSecondary,
    fontWeight: '700',
  },

  // Chips
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg, borderWidth: 1,
    backgroundColor: COLORS.bgCard, borderColor: COLORS.borderDefault,
  },
  chipActive: { backgroundColor: COLORS.successBg, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Create button
  createBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: SPACING.lg, alignItems: 'center',
    marginTop: SPACING.sm,
  },
  createBtnText: { color: COLORS.bgDeep, fontSize: FONTS.sizes.md, fontWeight: '800' },
});
