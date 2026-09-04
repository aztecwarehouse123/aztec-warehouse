import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase';

/** Create a Firebase Auth account without signing out the current admin session. */
export async function createAuthUserAccount(email: string, password: string): Promise<string> {
  let secondaryApp: FirebaseApp | null = null;
  try {
    secondaryApp = initializeApp(firebaseConfig, `AdminCreateUser_${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth);
    return credential.user.uid;
  } finally {
    if (secondaryApp) {
      await deleteApp(secondaryApp);
    }
  }
}
