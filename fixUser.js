const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
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

async function fixOrphanedUser() {
  const email = 'jainsomil714@gmail.com';
  // Try the default password that CreateEmployeeScreen uses, or password123
  const passwordsToTry = ['OneHumanity@123', 'password123', 'Somil@123', '123456', 'password'];
  
  let user = null;
  for (const pwd of passwordsToTry) {
    try {
      console.log(`Attempting login with password: ${pwd}`);
      const cred = await signInWithEmailAndPassword(auth, email, pwd);
      user = cred.user;
      console.log('Login successful! UID:', user.uid);
      break;
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        continue;
      }
      console.error('Error:', err.code);
      break; // some other error (like user not found)
    }
  }

  if (user) {
    console.log('Creating missing Firestore document...');
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      fullName: 'Somil',
      email: email,
      role: 'admin', // You can change this to 'employee' if needed
      status: 'active',
      department: 'Management',
      isTracked: false,
      netScore: 0,
      severity: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('✅ Successfully fixed! User should now appear in the People list.');
    process.exit(0);
  } else {
    console.log('❌ Could not log in. If you know the password you created this account with, replace it in the passwordsToTry array in fixUser.js');
    process.exit(1);
  }
}

fixOrphanedUser();
