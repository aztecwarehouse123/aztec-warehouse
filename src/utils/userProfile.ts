import { doc, getDoc, setDoc, query, collection, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from '../types';

/** Load WMS profile for a Firebase Auth user. Migrates legacy docs matched by email. */
export async function loadUserProfile(uid: string, email: string | null): Promise<User | null> {
  const profileRef = doc(db, 'users', uid);
  let snap = await getDoc(profileRef);

  if (!snap.exists() && email) {
    const legacyQuery = query(
      collection(db, 'users'),
      where('email', '==', email),
      limit(1)
    );
    const legacySnap = await getDocs(legacyQuery);
    if (!legacySnap.empty) {
      const legacyData = legacySnap.docs[0].data();
      const { password: _removed, ...profile } = legacyData;
      await setDoc(profileRef, profile, { merge: true });
      snap = await getDoc(profileRef);
    }
  }

  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    id: snap.id,
    username: String(data.username || ''),
    email: String(data.email || ''),
    name: String(data.name || ''),
    role: data.role as User['role'],
  };
}

/** Strip password field when reading user documents in admin lists. */
export function mapFirestoreUser(docId: string, data: Record<string, unknown>): User {
  return {
    id: docId,
    username: String(data.username || ''),
    email: String(data.email || ''),
    name: String(data.name || ''),
    role: data.role as User['role'],
  };
}
