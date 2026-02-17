/**
 * Authentication service wrapping Firebase Auth.
 * Provides email/password and Google sign-in.
 * Gracefully degrades when Firebase is not configured.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

const googleProvider = isFirebaseConfigured() ? new GoogleAuthProvider() : null;

// ─── Auth state listener ─────────────────────────────────────────────────

export function onAuthChange(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// ─── Sign in ─────────────────────────────────────────────────────────────

export async function signInWithEmail(email, password) {
  if (!auth) throw new Error('Firebase not configured');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signUpWithEmail(email, password, displayName) {
  if (!auth) throw new Error('Firebase not configured');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return cred.user;
}

export async function signInWithGoogle() {
  if (!auth || !googleProvider) throw new Error('Firebase not configured');
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// ─── Sign out ────────────────────────────────────────────────────────────

export async function signOut() {
  if (!auth) return;
  await firebaseSignOut(auth);
}

// ─── Account management ──────────────────────────────────────────────────

export async function resetPassword(email) {
  if (!auth) throw new Error('Firebase not configured');
  await sendPasswordResetEmail(auth, email);
}

export async function updateDisplayName(name) {
  if (!auth?.currentUser) throw new Error('Not signed in');
  await updateProfile(auth.currentUser, { displayName: name });
}

export async function deleteAccount() {
  if (!auth?.currentUser) throw new Error('Not signed in');
  await deleteUser(auth.currentUser);
}

export function getCurrentUser() {
  return auth?.currentUser || null;
}

export function isAuthAvailable() {
  return isFirebaseConfigured();
}
