const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// 1. Initialize Firebase Admin using Service Account from env
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT environment variable.');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Initialize Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async (to, subject, html) => {
  if (!process.env.EMAIL_USER) {
    console.warn('Skipping email. EMAIL_USER not set.');
    return;
  }
  await transporter.sendMail({
    from: `"One Humanity Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const runDailyJob = async () => {
  console.log('⏱️ Running daily cron: overdue tasks + absent emails');

  const todayIST = new Date();
  todayIST.setHours(0, 0, 0, 0);

  // ── 1. Overdue Tasks ────────────────────────────────────────────────
  const overdueSnap = await db.collection('urgentTasks')
    .where('status', '!=', 'completed')
    .where('isArchived', '==', false)
    .get();

  for (const taskDoc of overdueSnap.docs) {
    const task = taskDoc.data();
    if (!task.dueDate) continue;
    
    const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
    if (dueDate >= todayIST) continue; // Not yet overdue
    if (task.overdueEmailSent) continue;

    for (const assigneeUid of (task.assignees || [])) {
      const userDoc = await db.collection('users').doc(assigneeUid).get();
      const user = userDoc.data();
      if (!user || user.status !== 'active') continue;

      try {
        await sendMail(
          user.email,
          `Overdue Task: ${task.name}`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h3 style="color: #EF4444;">⚠️ Overdue Task Alert</h3>
              <p>Hi ${user.fullName},</p>
              <p>Your task <strong>"${task.name}"</strong> was due on <strong>${dueDate.toDateString()}</strong> and has not been completed yet.</p>
              <p>Please update the task status on the portal.</p>
            </div>
          `
        );
      } catch (e) {
        console.error('Overdue email failed for', user.email, e);
      }

      await db.collection('notifications').add({
        recipientId: assigneeUid,
        title: '⚠️ Overdue Task',
        message: `Your task "${task.name}" is overdue. Please update its status.`,
        tone: 'warning',
        type: 'task_overdue',
        entityType: 'urgentTask',
        entityId: taskDoc.id,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await taskDoc.ref.update({ overdueEmailSent: true });
  }

  // ── 2. Mark Absent for Yesterday ────────────────────────────────────
  const yesterdayIST = new Date(todayIST);
  yesterdayIST.setDate(yesterdayIST.getDate() - 1);
  const yesterdayStr = yesterdayIST.toISOString().split('T')[0];

  const activeUsersSnap = await db.collection('users').where('status', '==', 'active').get();

  for (const userDoc of activeUsersSnap.docs) {
    const user = userDoc.data();
    const existingSnap = await db.collection('attendance')
      .where('userId', '==', userDoc.id)
      .where('date', '==', yesterdayStr)
      .limit(1)
      .get();

    if (existingSnap.empty) {
      await db.collection('attendance').add({
        userId: userDoc.id,
        date: yesterdayStr,
        status: 'absent',
        trackingMode: 'tracked',
        activeSeconds: 0,
        sessions: [],
        breaks: [],
        dailyReport: 'System marked absent (No clock in/out).',
        clockInTaskSelections: [],
        clockInProjectSelections: [],
        clockOutCompletedTaskSelections: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      try {
        await sendMail(
          user.email,
          `Absent: ${yesterdayStr}`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h3 style="color: #EF4444;">Attendance Notification</h3>
              <p>Hi ${user.fullName},</p>
              <p>You were marked as <strong>absent</strong> on <strong>${yesterdayStr}</strong>.</p>
              <p>If this is incorrect, please contact your manager or HR.</p>
            </div>
          `
        );
      } catch (e) {
        console.error('Absent email failed for', user.email, e);
      }
    }
  }

  console.log('✅ Daily cron completed successfully.');
  process.exit(0);
};

runDailyJob().catch(err => {
  console.error('❌ Daily job failed:', err);
  process.exit(1);
});
