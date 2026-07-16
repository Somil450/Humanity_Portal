const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyBXk2Ejmkjg_MNmw2wG5HvP6645PCnPIWM',
  authDomain: 'taskmate-somil-81c1b.firebaseapp.com',
  projectId: 'taskmate-somil-81c1b',
  storageBucket: 'taskmate-somil-81c1b.firebasestorage.app',
  messagingSenderId: '405265620356',
  appId: '1:405265620356:web:382825c4bb419cf69711d1',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, 'admin@example.com', 'password123');
    await updateProfile(cred.user, { displayName: 'System Admin' });
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      fullName: 'System Admin',
      email: 'admin@example.com',
      role: 'super_admin',
      status: 'active',
      department: 'Management',
      isTracked: false,
      netScore: 0,
      severity: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('Admin user created successfully!');
    process.exit(0);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists.');
      const { signInWithEmailAndPassword } = require('firebase/auth');
      const cred = await signInWithEmailAndPassword(auth, 'admin@example.com', 'password123');
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        fullName: 'System Admin',
        email: 'admin@example.com',
        role: 'super_admin',
        status: 'active',
        department: 'Management',
        isTracked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log('Admin user role updated.');
      process.exit(0);
    }
    console.error('Error creating admin user:', err);
    process.exit(1);
  }
}

createAdmin();
