const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT environment variable.');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async (to, subject, html) => {
  if (!process.env.EMAIL_USER) return;
  await transporter.sendMail({
    from: `"One Humanity Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const runMonthlyJob = async () => {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  
  if (now.getDate() !== lastDayOfMonth) {
    console.log('Not the last day of the month. Exiting.');
    process.exit(0);
  }

  console.log('📊 Running monthly report cron...');

  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthName = MONTH_NAMES[month - 1];

  const monthStart = `${year}-${String(month).padStart(2,'0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2,'0')}-${String(lastDayOfMonth).padStart(2,'0')}`;

  const activeUsersSnap = await db.collection('users').where('status', '==', 'active').get();

  for (const userDoc of activeUsersSnap.docs) {
    const user = userDoc.data();
    try {
      const attendanceSnap = await db.collection('attendance')
        .where('userId', '==', userDoc.id)
        .where('date', '>=', monthStart)
        .where('date', '<=', monthEnd)
        .get();

      const records = attendanceSnap.docs.map(d => d.data());
      const daysPresent = records.filter(r => ['clocked-in','clocked-out','away'].includes(r.status)).length;
      const daysAbsent = records.filter(r => r.status === 'absent').length;
      const totalActiveSeconds = records.reduce((s, r) => s + (r.activeSeconds || 0), 0);
      const totalWorkingHours = Math.round((totalActiveSeconds / 3600) * 10) / 10;
      const attendanceRate = records.length > 0 ? Math.round((daysPresent / records.length) * 100) : 0;

      const tasksSnap = await db.collection('urgentTasks')
        .where('assignees', 'array-contains', userDoc.id)
        .get();
      const allTasks = tasksSnap.docs.map(d => d.data());
      const doneTasks = allTasks.filter(t => t.status === 'completed').length;

      await sendMail(
        user.email,
        `📊 Monthly Report: ${monthName} ${year}`,
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10B981;">Monthly Report — ${monthName} ${year}</h2>
            <p>Hi ${user.fullName}, here's your performance summary:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Days Present</strong></td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${daysPresent}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Days Absent</strong></td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${daysAbsent}</td>
              </tr>
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Total Working Hours</strong></td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${totalWorkingHours}h</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Attendance Rate</strong></td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${attendanceRate}%</td>
              </tr>
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Tasks Completed</strong></td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${doneTasks}</td>
              </tr>
            </table>
            <p style="color: #6b7280; font-size: 12px;">This is an automated report from One Humanity Portal.</p>
          </div>
        `
      );
      console.log(`✅ Monthly report sent → ${user.fullName}`);
    } catch (err) {
      console.error(`❌ Monthly report failed for ${user.fullName}:`, err);
    }
  }

  process.exit(0);
};

runMonthlyJob().catch(async err => {
  console.error('❌ Monthly job failed:', err);
  if (process.env.ADMIN_EMAIL && process.env.EMAIL_USER) {
    try {
      await transporter.sendMail({
        from: `"One Humanity Portal Cron" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `🚨 CRON JOB FAILED: Monthly Report`,
        text: `The monthly report cron job failed with the following error:\n\n${err.message}\n\nStack Trace:\n${err.stack}`
      });
      console.log('Failure email sent to admin.');
    } catch (mailErr) {
      console.error('Failed to send failure email:', mailErr);
    }
  }
  process.exit(1);
});
