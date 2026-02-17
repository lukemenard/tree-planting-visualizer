/**
 * Cloud project storage using Firestore.
 * Falls back to localStorage when Firebase is not configured or user is not signed in.
 *
 * Firestore structure:
 *   users/{uid}/projects/{projectId} → project document
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { getCurrentUser } from './authService';
import * as localStore from './projectStore';

function getUserProjectsRef() {
  const user = getCurrentUser();
  if (!user || !db) return null;
  return collection(db, 'users', user.uid, 'projects');
}

// ─── Cloud CRUD ──────────────────────────────────────────────────────────

async function cloudSave(project) {
  const ref = getUserProjectsRef();
  if (!ref) return null;

  const docRef = doc(ref, project.id);
  const record = {
    ...project,
    updatedAt: serverTimestamp(),
    createdAt: project.createdAt || serverTimestamp(),
  };
  await setDoc(docRef, record, { merge: true });
  return record;
}

async function cloudLoad(projectId) {
  const ref = getUserProjectsRef();
  if (!ref) return null;

  const snap = await getDoc(doc(ref, projectId));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    ...data,
    updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
    createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
  };
}

async function cloudList() {
  const ref = getUserProjectsRef();
  if (!ref) return [];

  const q = query(ref, orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
      createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
    };
  });
}

async function cloudDelete(projectId) {
  const ref = getUserProjectsRef();
  if (!ref) return;
  await deleteDoc(doc(ref, projectId));
}

// ─── Hybrid API (cloud when available, localStorage fallback) ────────────

export async function saveProjectHybrid(project) {
  // Always save locally for offline access
  localStore.saveProject(project);

  // Also save to cloud if available
  if (isFirebaseConfigured() && getCurrentUser()) {
    try {
      await cloudSave(project);
    } catch (err) {
      console.warn('[CloudStore] Cloud save failed, local save succeeded:', err);
    }
  }

  return project;
}

export async function loadProjectHybrid(projectId) {
  // Try cloud first
  if (isFirebaseConfigured() && getCurrentUser()) {
    try {
      const cloud = await cloudLoad(projectId);
      if (cloud) return cloud;
    } catch (err) {
      console.warn('[CloudStore] Cloud load failed:', err);
    }
  }

  // Fall back to local
  return localStore.loadProject(projectId);
}

export async function listProjectsHybrid() {
  // If signed in, prefer cloud
  if (isFirebaseConfigured() && getCurrentUser()) {
    try {
      const cloudProjects = await cloudList();
      if (cloudProjects.length > 0) return cloudProjects;
    } catch (err) {
      console.warn('[CloudStore] Cloud list failed:', err);
    }
  }

  // Fall back to local
  return localStore.listProjects();
}

export async function deleteProjectHybrid(projectId) {
  localStore.deleteProject(projectId);

  if (isFirebaseConfigured() && getCurrentUser()) {
    try {
      await cloudDelete(projectId);
    } catch (err) {
      console.warn('[CloudStore] Cloud delete failed:', err);
    }
  }
}

/**
 * Migrate local projects to cloud after sign-in.
 * Uploads any localStorage projects that don't exist in the cloud.
 * Bails entirely if the network is unavailable.
 */
export async function migrateLocalToCloud() {
  if (!isFirebaseConfigured() || !getCurrentUser()) return;
  if (!navigator.onLine) return; // Don't attempt migration while offline

  const localProjects = localStore.listProjects();
  if (localProjects.length === 0) return;

  console.log(`[CloudStore] Migrating ${localProjects.length} local project(s) to cloud...`);

  for (const proj of localProjects) {
    try {
      const existing = await cloudLoad(proj.id);
      if (!existing) {
        await cloudSave(proj);
      }
    } catch (err) {
      // If any migration fails (offline, permission, etc.), stop retrying
      console.warn(`[CloudStore] Migration aborted (offline or error):`, err.message);
      return;
    }
  }
}
