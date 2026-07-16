import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { getNotifications, markNotificationRead } from '../../services/notificationService';
import { Notification } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS, CARD } from '../../theme';
import { format } from 'date-fns';

const TONE_COLORS: Record<string, string> = {
  success: COLORS.primary,
  warning: COLORS.warning,
  info: COLORS.info,
};

const TONE_ICONS: Record<string, string> = {
  success: '✅',
  warning: '⚠️',
  info: 'ℹ️',
};

export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getNotifications(user.uid).then(data => {
      setNotifications(data);
      setLoading(false);
    });
  }, [user]);

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} unread</Text>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet.</Text>
            <Text style={styles.emptySubtext}>You'll see important updates here.</Text>
          </View>
        ) : (
          notifications.map((n, i) => {
            const color = TONE_COLORS[n.tone] || COLORS.info;
            const icon = TONE_ICONS[n.tone] || 'ℹ️';
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.notifCard, !n.read && styles.notifCardUnread]}
                onPress={() => !n.read && handleRead(n.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.notifIconWrap, { backgroundColor: color + '22' }]}>
                  <Text style={styles.notifIcon}>{icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.notifTitleRow}>
                    <Text style={styles.notifTitle}>{n.title}</Text>
                    {!n.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifMessage}>{n.message}</Text>
                  {n.createdAt && (
                    <Text style={styles.notifTime}>{format(new Date(n.createdAt), 'dd MMM, HH:mm')}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
  unreadCount: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '600', marginTop: 2 },

  content: { padding: SPACING.lg },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: FONTS.sizes.lg, color: COLORS.textPrimary, fontWeight: '700' },
  emptySubtext: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },

  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    ...CARD,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  notifCardUnread: {
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.bgElevated,
  },
  notifIconWrap: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  notifIcon: { fontSize: 20 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 4 },
  notifTitle: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, fontWeight: '700', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  notifMessage: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 16 },
  notifTime: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: SPACING.xs },
});
