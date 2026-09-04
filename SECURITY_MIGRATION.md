# Security Migration: Firebase Authentication

## What was wrong

The login page downloaded **every user document** from Firestore (including **plain-text passwords**) and checked credentials in the browser. Anyone could open DevTools → Network and read all accounts.

## What we changed in the app

1. **Firebase Authentication** — login uses `signInWithEmailAndPassword` (passwords never sent to Firestore).
2. **No passwords in Firestore** — user profiles store username, email, name, role only.
3. **No passwords in localStorage** — session profile excludes password.
4. **`firestore.rules`** — blocks unauthenticated reads; blocks writing `password` to user docs.

## Required steps in Firebase Console (do these before deploying)

### 1. Enable Email/Password sign-in

1. Open [Firebase Console](https://console.firebase.google.com/) → project **aztec-warehouse**
2. **Authentication** → **Sign-in method**
3. Enable **Email/Password**

### 2. Migrate existing users

For **each** user in Firestore `users` collection:

1. **Authentication** → **Users** → **Add user**
   - Email: same as their `email` field in Firestore (required)
   - Password: set a temporary password (or their current one)
2. Copy the new user's **UID** from Authentication
3. In Firestore `users`:
   - Create/update document at **`users/{UID}`** with: `username`, `email`, `name`, `role`
   - **Delete the `password` field** (or delete the old document if it used a random ID)
4. Tell users to sign in with **email + password** (not username)

> On first login after migration, if a profile exists only under an old document ID, the app will copy it to `users/{UID}` when emails match.

### 3. Remove all plain-text passwords from Firestore

In Firestore → `users` collection → delete the **`password`** field from every document (or re-create docs without it).

### 4. Deploy Firestore security rules

From this project folder (with Firebase CLI installed and logged in):

```bash
firebase init firestore   # if not already linked — select existing project aztec-warehouse
firebase deploy --only firestore:rules
```

Or paste the contents of `firestore.rules` into Firebase Console → **Firestore** → **Rules** → **Publish**.

### 5. Deploy the updated website

Build and deploy the new frontend so login uses Firebase Auth.

### 6. Verify

1. Open login in an incognito window
2. Try wrong credentials
3. DevTools → Network — you should **not** see user passwords or a full user list
4. Confirm sign-in works with email + password for migrated accounts

## Ongoing

- **New users** (Settings → Add User): created in Firebase Auth + Firestore profile (no password in Firestore).
- **Change own password**: Settings uses Firebase Auth (re-authenticate + update password).
- **Admin reset another user's password**: sends a Firebase password reset email (does not store passwords).

## If login breaks after deploying rules

Rules require users to be signed in before reading most data. Complete steps 1–2 (Auth users + profile docs at `users/{uid}`) before publishing strict rules.
