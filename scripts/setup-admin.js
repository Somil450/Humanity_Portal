// One-time setup script — creates first super_admin user in Firebase
// Uses Firebase REST API (no admin SDK needed)
const https = require('https');

const API_KEY = 'AIzaSyBXk2Ejmkjg_MNmw2wG5HvP6645PCnPIWM';
const PROJECT_ID = 'taskmate-somil-81c1b';

const ADMIN_EMAIL = 'admin@onehumanity.org';
const ADMIN_PASSWORD = 'Admin@12345';
const ADMIN_NAME = 'Super Admin';

function httpsPost(hostname, path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ raw }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsRequest(method, hostname, path, data, token) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);

    const options = { hostname, path, method, headers };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ raw }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  console.log('\n🚀 One Humanity Portal — First Admin Setup\n');

  // STEP 1: Create the user in Firebase Auth
  console.log('1️⃣  Creating admin user in Firebase Auth...');
  const signUpRes = await httpsPost(
    'identitytoolkit.googleapis.com',
    `/v1/accounts:signUp?key=${API_KEY}`,
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }
  );

  if (signUpRes.error) {
    if (signUpRes.error.message === 'EMAIL_EXISTS') {
      console.log('   ℹ️  User already exists — signing in instead...');
      // Sign in to get UID and token
      const signInRes = await httpsPost(
        'identitytoolkit.googleapis.com',
        `/v1/accounts:signInWithPassword?key=${API_KEY}`,
        { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }
      );
      if (signInRes.error) {
        console.error('   ❌ Sign-in failed:', signInRes.error.message);
        return;
      }
      await createFirestoreDoc(signInRes.localId, signInRes.idToken);
    } else {
      console.error('   ❌ Auth error:', signUpRes.error.message);
    }
    return;
  }

  const uid = signUpRes.localId;
  const token = signUpRes.idToken;
  console.log(`   ✅ Auth user created! UID: ${uid}`);

  // STEP 2: Update display name
  await httpsPost(
    'identitytoolkit.googleapis.com',
    `/v1/accounts:update?key=${API_KEY}`,
    { idToken: token, displayName: ADMIN_NAME }
  );

  await createFirestoreDoc(uid, token);
}

async function createFirestoreDoc(uid, token) {
  // STEP 3: Create Firestore user document
  console.log('\n2️⃣  Creating Firestore profile for super_admin...');

  const now = new Date().toISOString();
  const firestoreDoc = {
    fields: {
      uid: { stringValue: uid },
      fullName: { stringValue: ADMIN_NAME },
      email: { stringValue: ADMIN_EMAIL },
      role: { stringValue: 'super_admin' },
      status: { stringValue: 'active' },
      department: { stringValue: 'Management' },
      phone: { stringValue: '' },
      address: { stringValue: '' },
      isTracked: { booleanValue: false },
      profilePhoto: { stringValue: '' },
      startDate: { stringValue: now },
      createdAt: { stringValue: now },
      updatedAt: { stringValue: now },
    }
  };

  // Check if doc already exists first
  const checkRes = await httpsRequest(
    'GET',
    'firestore.googleapis.com',
    `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    null,
    token
  );

  if (checkRes.name) {
    console.log('   ℹ️  Firestore document already exists — updating role to super_admin...');
    // PATCH to update
    const patchRes = await httpsRequest(
      'PATCH',
      'firestore.googleapis.com',
      `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=role&updateMask.fieldPaths=status`,
      { fields: { role: { stringValue: 'super_admin' }, status: { stringValue: 'active' } } },
      token
    );
    if (patchRes.name) {
      console.log('   ✅ Role updated to super_admin!');
    } else {
      console.log('   ⚠️  Patch response:', JSON.stringify(patchRes).slice(0, 200));
    }
  } else {
    // CREATE with uid as document ID
    const createRes = await httpsRequest(
      'PATCH',
      'firestore.googleapis.com',
      `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
      firestoreDoc,
      token
    );

    if (createRes.name) {
      console.log('   ✅ Firestore profile created!');
    } else {
      console.log('   ⚠️  Firestore response:', JSON.stringify(createRes).slice(0, 300));
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Setup complete! You can now log in to the app:');
  console.log(`   📧 Email:    ${ADMIN_EMAIL}`);
  console.log(`   🔑 Password: ${ADMIN_PASSWORD}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch(console.error);
