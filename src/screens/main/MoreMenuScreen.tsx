import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, CARD } from '../../theme';
import { Avatar } from '../../components/ui';

interface MenuItemProps {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  accent?: string;
}

const MenuItem = ({ icon, label, subtitle, onPress, danger, accent }: MenuItemProps) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIconWrap, danger && styles.menuIconDanger]}>
      <Text style={styles.menuIconEmoji}>{icon}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.menuLabel, danger && { color: COLORS.danger }]}>{label}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    <Text style={styles.menuChevron}>›</Text>
  </TouchableOpacity>
);

export default function MoreMenuScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isHR = user?.role === 'hr';
  const canSeeLeaveManagement = isAdmin || isHR;
  const canSeePeople = isAdmin || isHR;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const roleDisplay = (user?.role || '').replace('_', ' ').toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Avatar name={user?.fullName ?? 'U'} size={52} />
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={styles.profileName}>{user?.fullName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.profileBadges}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleDisplay}</Text>
              </View>
              {user?.department && (
                <View style={styles.deptBadge}>
                  <Text style={styles.deptBadgeText}>{user.department}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* General */}
        <Text style={styles.sectionLabel}>GENERAL</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="🔔" label="Notifications" subtitle="Alerts & updates" onPress={() => navigation.navigate('Notifications')} />
          {!isAdmin && <MenuItem icon="⚡" label="Urgent Tasks" subtitle="Critical assignments" onPress={() => navigation.navigate('UrgentTasks')} />}
          <MenuItem icon="⚙️" label="Settings" subtitle="App & account preferences" onPress={() => navigation.navigate('Settings')} />
        </View>

        {/* Admin / HR Management */}
        {isAdmin && (
          <>
            <Text style={styles.sectionLabel}>MANAGEMENT</Text>
            <View style={styles.menuGroup}>
              <MenuItem icon="⚡" label="Urgent Tasks" subtitle="Critical assignments" onPress={() => navigation.navigate('UrgentTasks')} />
              <MenuItem icon="🔍" label="Employee Oversight" subtitle="Scores, flags & oversight" onPress={() => navigation.navigate('EmployeeOversight')} />
              <MenuItem icon="📋" label="Daily Task Reviews" subtitle="Review daily employee reports" onPress={() => navigation.navigate('DailyTasksReview')} />
              <MenuItem icon="👁️" label="Admin Dashboard" subtitle="Full system overview" onPress={() => navigation.navigate('AdminDashboard')} />
            </View>
          </>
        )}

        {/* Employee-only items */}
        {!isAdmin && (canSeeLeaveManagement || canSeePeople) && (
          <>
            <Text style={styles.sectionLabel}>MANAGEMENT</Text>
            <View style={styles.menuGroup}>
              {canSeePeople && (
                <MenuItem icon="👥" label="People" subtitle="Employee directory" onPress={() => navigation.navigate('People')} />
              )}
              {canSeeLeaveManagement && (
                <MenuItem icon="🌴" label="Leave Management" subtitle="Review & approve leaves" onPress={() => navigation.navigate('LeaveManagement')} />
              )}
            </View>
          </>
        )}

        {/* Account */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="🔴"
            label="Sign Out"
            subtitle={user?.email ?? ''}
            onPress={handleLogout}
            danger
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerAppName}>ONE HUMANITY PORTAL</Text>
          <Text style={styles.footerVersion}>v1.0.0 · Firebase Backend</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDeep },
  header: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },

  content: { padding: SPACING.lg },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.borderDefault,
    padding: SPACING.lg, marginBottom: SPACING.lg,
  },
  profileName: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary },
  profileEmail: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  profileBadges: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs },
  roleBadge: {
    backgroundColor: COLORS.goldBg, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.gold + '44',
  },
  roleBadgeText: { fontSize: 9, color: COLORS.gold, fontWeight: '700', letterSpacing: 0.8 },
  deptBadge: {
    backgroundColor: COLORS.bgHighlight, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderStrong,
  },
  deptBadgeText: { fontSize: 9, color: COLORS.textSecondary, fontWeight: '600' },

  sectionLabel: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
    fontWeight: '700', letterSpacing: 2,
    marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },

  menuGroup: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderDefault, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md + 2,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  menuIconWrap: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated, justifyContent: 'center',
    alignItems: 'center', marginRight: SPACING.md,
  },
  menuIconDanger: { backgroundColor: COLORS.dangerBg },
  menuIconEmoji: { fontSize: 20 },
  menuLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary },
  menuSubtitle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },
  menuChevron: { fontSize: 22, color: COLORS.textMuted, marginLeft: SPACING.sm },

  footer: { alignItems: 'center', paddingVertical: SPACING.xl, marginTop: SPACING.lg },
  footerAppName: { fontSize: FONTS.sizes.xs, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 2 },
  footerVersion: { fontSize: FONTS.sizes.xs, color: COLORS.borderStrong, marginTop: 4 },
});
