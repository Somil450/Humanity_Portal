import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, CARD } from '../../theme';
import { Avatar } from '../../components/ui';

export default function SettingsScreen({ navigation }: any) {
  const { user, changePassword, logout } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (newPw.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters.');
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      Alert.alert('Success', 'Password updated successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to change password. Check your current password.');
    } finally {
      setPwLoading(false);
    }
  };

  const roleDisplay = (user?.role || '').replace('_', ' ');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <Avatar name={user?.fullName || 'U'} size={64} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.profileMeta}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{roleDisplay.toUpperCase()}</Text>
              </View>
              {user?.department && (
                <View style={[styles.badge, styles.badgeMuted]}>
                  <Text style={[styles.badgeText, { color: COLORS.textSecondary }]}>{user.department}</Text>
                </View>
              )}
              <View style={[styles.badge, { backgroundColor: user?.status === 'active' ? COLORS.successBg : COLORS.dangerBg, borderColor: user?.status === 'active' ? COLORS.primary : COLORS.danger }]}>
                <Text style={[styles.badgeText, { color: user?.status === 'active' ? COLORS.primary : COLORS.danger }]}>{(user?.status || '').toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Details */}
        <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>
        <View style={styles.detailCard}>
          <DetailRow label="Full Name" value={user?.fullName || '—'} />
          <DetailRow label="Email Address" value={user?.email || '—'} />
          <DetailRow label="Role" value={roleDisplay} />
          <DetailRow label="Department" value={user?.department || '—'} />
          <DetailRow label="Status" value={user?.status || '—'} last />
        </View>

        {/* Change Password */}
        <Text style={styles.sectionLabel}>CHANGE PASSWORD</Text>
        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter current password"
            placeholderTextColor={COLORS.textMuted}
            value={currentPw}
            onChangeText={setCurrentPw}
            secureTextEntry
          />

          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 8 characters"
            placeholderTextColor={COLORS.textMuted}
            value={newPw}
            onChangeText={setNewPw}
            secureTextEntry
          />

          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <TextInput
            style={[styles.input, { marginBottom: 0 }]}
            placeholder="Repeat new password"
            placeholderTextColor={COLORS.textMuted}
            value={confirmPw}
            onChangeText={setConfirmPw}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.updateBtn, pwLoading && { opacity: 0.6 }]}
            onPress={handleChangePassword}
            disabled={pwLoading}
          >
            {pwLoading
              ? <ActivityIndicator color={COLORS.bgDeep} />
              : <Text style={styles.updateBtnText}>Update Password</Text>
            }
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <Text style={styles.sectionLabel}>APP INFO</Text>
        <View style={styles.detailCard}>
          <DetailRow label="App Name" value="One Humanity Portal" />
          <DetailRow label="Version" value="1.0.0" />
          <DetailRow label="Backend" value="Firebase Firestore" last />
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
          ])}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const DetailRow = ({ label, value, last }: { label: string; value: string; last?: boolean }) => (
  <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
    gap: SPACING.md,
  },
  backBtn: { padding: SPACING.xs },
  backIcon: { fontSize: 22, color: COLORS.textSecondary },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },

  content: { padding: SPACING.lg },

  profileCard: {
    ...CARD,
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.lg, marginBottom: SPACING.lg, gap: SPACING.lg,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary },
  profileEmail: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  profileMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  badge: {
    backgroundColor: COLORS.goldBg, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.gold + '44',
  },
  badgeMuted: { backgroundColor: COLORS.bgHighlight, borderColor: COLORS.borderStrong },
  badgeText: { fontSize: 9, color: COLORS.gold, fontWeight: '700', letterSpacing: 0.8 },

  sectionLabel: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
    fontWeight: '700', letterSpacing: 2,
    marginBottom: SPACING.sm, marginTop: SPACING.xl,
  },

  detailCard: {
    ...CARD, overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle },
  detailLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  detailValue: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: SPACING.md },

  formCard: {
    ...CARD, padding: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONTS.sizes.xs, color: COLORS.textSecondary,
    fontWeight: '700', letterSpacing: 0.5, marginBottom: SPACING.xs, marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.md, marginBottom: SPACING.xs,
  },
  updateBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.lg,
  },
  updateBtnText: { color: COLORS.bgDeep, fontSize: FONTS.sizes.md, fontWeight: '800' },

  signOutBtn: {
    marginTop: SPACING.xl, borderWidth: 1, borderColor: COLORS.danger + '66',
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    alignItems: 'center', backgroundColor: COLORS.dangerBg,
  },
  signOutText: { color: COLORS.danger, fontSize: FONTS.sizes.md, fontWeight: '700' },
});
