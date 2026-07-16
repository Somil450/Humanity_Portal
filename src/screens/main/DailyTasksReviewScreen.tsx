import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { getPendingReviews, submitReview, PendingReview } from '../../services/dailyReviewService';
import { useAuth } from '../../contexts/AuthContext';

export default function DailyTasksReviewScreen({ navigation }: any) {
  const { user: currentUser } = useAuth();
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const data = await getPendingReviews();
      setReviews(data);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (attendanceId: string, status: 'approved' | 'needs-improvement') => {
    if (!currentUser) return;
    Alert.alert(
      status === 'approved' ? 'Approve Review?' : 'Decline Review?',
      `Are you sure you want to ${status === 'approved' ? 'approve' : 'decline'} this submission?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: status === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await submitReview(attendanceId, currentUser.uid, currentUser.uid, status);
              setReviews(prev => prev.filter(r => r.attendance.id !== attendanceId));
            } catch (err) {
              Alert.alert('Error', 'Failed to submit review.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color="#C8A97E" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const pendingCount = reviews.length;
  // Just for UI mirroring, show today's date in the header
  const headerDateStr = format(new Date(), 'dd MMM yyyy').toUpperCase();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        
        {/* HEADER */}
        <View style={s.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={s.headerDot}>●</Text>
            <Text style={s.headerDate}>{headerDateStr}</Text>
            <Text style={s.headerCount}> · {pendingCount} entries</Text>
          </View>
          <View style={s.pendingBadgeTop}>
            <Text style={s.pendingBadgeTopIcon}>📋</Text>
            <Text style={s.pendingBadgeTopText}>{pendingCount} reviews pending</Text>
          </View>
        </View>

        {/* REVIEW LIST */}
        <View style={s.listContainer}>
          {reviews.map(item => {
            const { attendance, user: employee } = item;
            
            // Reconstruct tasks from attendance
            const completed = attendance.clockOutCompletedTaskSelections || [];
            const incomplete = (attendance.clockInTaskSelections || []).filter(
              inTask => !completed.find(outTask => outTask.taskId === inTask.taskId)
            );
            const totalTasks = completed.length + incomplete.length;
            
            const cardDateStr = format(new Date(attendance.date), 'dd MMM yyyy').toUpperCase();

            return (
              <View key={attendance.id} style={s.card}>
                
                {/* Card Header */}
                <View style={s.cardHeader}>
                  <View>
                    <Text style={s.cardName}>{employee?.fullName}</Text>
                    <Text style={s.cardDate}>{cardDateStr}</Text>
                  </View>
                  <View style={s.pendingBadgeCard}>
                    <Text style={s.pendingBadgeCardText}>PENDING</Text>
                  </View>
                </View>

                {/* Card Body Split */}
                <View style={s.cardBody}>
                  
                  {/* Left Col (Summary & Links) */}
                  <View style={s.leftCol}>
                    <View style={s.summaryBox}>
                      <Text style={s.sectionLabel}>WORK SUMMARY</Text>
                      <Text style={s.summaryText}>{attendance.dailyReport || 'No summary provided.'}</Text>
                    </View>
                    
                    <View style={s.linksRow}>
                      <View style={s.linkBox}>
                        <Text style={s.sectionLabel}>LINK</Text>
                        {attendance.relatedLink ? (
                          <TouchableOpacity onPress={() => Linking.openURL(attendance.relatedLink!)}>
                            <Text style={s.linkTextValue} numberOfLines={1}>{attendance.relatedLink}</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={s.emptyPlaceholder}>No link submitted</Text>
                        )}
                      </View>
                      <View style={s.linkBox}>
                        <Text style={s.sectionLabel}>SCREENSHOT</Text>
                        {attendance.screenshotUrl ? (
                          <TouchableOpacity onPress={() => Linking.openURL(attendance.screenshotUrl!)}>
                            <Text style={s.linkTextValue}>View screenshot</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={s.emptyPlaceholder}>No screenshot submitted</Text>
                        )}
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={s.actionsRow}>
                      <TouchableOpacity 
                        style={[s.actionBtn, { borderColor: '#22C55E55' }]} 
                        onPress={() => handleReview(attendance.id, 'approved')}
                      >
                        <Text style={[s.actionBtnIcon, { color: '#22C55E' }]}>⌖</Text>
                        <Text style={[s.actionBtnText, { color: '#22C55E' }]}>APPROVE</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[s.actionBtn, { borderColor: '#EF444455' }]} 
                        onPress={() => handleReview(attendance.id, 'needs-improvement')}
                      >
                        <Text style={[s.actionBtnIcon, { color: '#EF4444' }]}>⊗</Text>
                        <Text style={[s.actionBtnText, { color: '#EF4444' }]}>DECLINE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Right Col (Tasks) */}
                  <View style={s.rightCol}>
                    <View style={s.tasksHeader}>
                      <Text style={s.sectionLabel}>DAILY TASKS</Text>
                      <View style={s.taskCountBadge}><Text style={s.taskCountText}>{totalTasks}</Text></View>
                    </View>

                    <Text style={s.tasksStatusLabel}>COMPLETED</Text>
                    <View style={s.tasksList}>
                      {completed.length === 0 ? <Text style={s.emptyPlaceholder}>None</Text> : completed.map((t, i) => (
                        <View key={i} style={s.taskItemRow}>
                          <Text style={[s.taskDot, { color: '#22C55E' }]}>●</Text>
                          <Text style={s.taskTitle}>{t.taskName || 'Task completed'}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={[s.tasksStatusLabel, { color: '#EF4444' }]}>INCOMPLETE</Text>
                    <View style={s.tasksList}>
                      {incomplete.length === 0 ? <Text style={s.emptyPlaceholder}>None</Text> : incomplete.map((t, i) => (
                        <View key={i} style={s.taskItemRow}>
                          <Text style={[s.taskDot, { color: '#EF4444' }]}>●</Text>
                          <Text style={s.taskTitle}>{t.taskName || 'Task pending'}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                </View>
              </View>
            );
          })}

          {reviews.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 100 }}>
              <Text style={{ color: '#666', fontSize: 16 }}>No pending reviews found.</Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingHorizontal: 16 },
  headerDot: { color: '#EAB308', fontSize: 10, marginRight: 8 },
  headerDate: { color: '#CCC', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  headerCount: { color: '#666', fontSize: 13, fontWeight: '700' },
  pendingBadgeTop: { flexDirection: 'row', alignItems: 'center', borderColor: '#4A3D1A', borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1A1A10' },
  pendingBadgeTopIcon: { fontSize: 12, marginRight: 6 },
  pendingBadgeTopText: { color: '#EAB308', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // List
  listContainer: { paddingHorizontal: 16 },
  card: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 12, padding: 16, marginBottom: 16, width: '100%' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  cardName: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardDate: { color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  pendingBadgeCard: { backgroundColor: '#1A1A28', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  pendingBadgeCardText: { color: '#888', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  cardBody: { flexDirection: 'column', gap: 16 },
  
  // Left Column
  leftCol: { gap: 16 },
  summaryBox: { backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 8, padding: 14 },
  sectionLabel: { color: '#888', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  summaryText: { color: '#CCC', fontSize: 13, lineHeight: 20 },

  linksRow: { flexDirection: 'row', gap: 12 },
  linkBox: { flex: 1, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 8, padding: 14 },
  linkTextValue: { color: '#3B82F6', fontSize: 12 },
  emptyPlaceholder: { color: '#555', fontSize: 12, fontStyle: 'italic' },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 6, borderWidth: 1 },
  actionBtnIcon: { fontSize: 14, marginRight: 8 },
  actionBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // Right Column (tasks)
  rightCol: { backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: '#1F1F2A', borderRadius: 8, padding: 14 },
  tasksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  taskCountBadge: { backgroundColor: '#1A1A28', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  taskCountText: { color: '#888', fontSize: 10, fontWeight: '800' },
  
  tasksStatusLabel: { color: '#22C55E', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  tasksList: { marginBottom: 24, paddingHorizontal: 8, gap: 12 },
  taskItemRow: { flexDirection: 'row', alignItems: 'center' },
  taskDot: { fontSize: 10, marginRight: 12 },
  taskTitle: { color: '#CCC', fontSize: 13, fontWeight: '500', flex: 1 },
});
