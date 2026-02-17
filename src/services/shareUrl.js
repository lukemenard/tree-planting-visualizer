/**
 * URL-based project sharing for CanopyViz.
 *
 * Two modes:
 * 1. Local share: ?project=ID — references localStorage (fast, but only works on same device)
 * 2. Portable share: #data=BASE64 — encodes tree positions + species inline (works anywhere)
 */

import { saveProject, loadProject, generateProjectId } from './projectStore';

// ─── Portable encoding ───────────────────────────────────────────────────

/**
 * Encode project essentials into a compact base64 string.
 * Format: JSON → UTF-8 → base64url
 */
function encodeProjectToHash(project) {
  const compact = {
    c: [Math.round(project.center[0] * 1e6) / 1e6, Math.round(project.center[1] * 1e6) / 1e6],
    z: Math.round(project.zoom * 10) / 10,
    n: project.name || '',
    a: project.address || '',
    t: project.trees.map((t) => [
      Math.round(t.lng * 1e6) / 1e6,
      Math.round(t.lat * 1e6) / 1e6,
      t.speciesId,
    ]),
  };

  try {
    const json = JSON.stringify(compact);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return encoded;
  } catch {
    return null;
  }
}

function decodeProjectFromHash(hash) {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    const compact = JSON.parse(json);
    return {
      id: generateProjectId(),
      name: compact.n || 'Shared Plan',
      address: compact.a || null,
      center: compact.c,
      zoom: compact.z || 17,
      pitch: 45,
      bearing: 0,
      trees: (compact.t || []).map((t, i) => ({
        id: `tree-shared-${i}`,
        lng: t[0],
        lat: t[1],
        speciesId: t[2],
        placedAt: Date.now(),
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ─── URL generation ──────────────────────────────────────────────────────

export function generateShareUrl(project) {
  const hash = encodeProjectToHash(project);
  if (!hash) return null;

  // If the encoded data is small enough (< 2000 chars), use portable hash
  if (hash.length < 2000) {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = `data=${hash}`;
    return url.toString();
  }

  // Otherwise, save to localStorage and share with project ID
  const saved = saveProject(project);
  const url = new URL(window.location.href);
  url.search = `?project=${saved.id}`;
  url.hash = '';
  return url.toString();
}

// ─── URL parsing on load ─────────────────────────────────────────────────

export function parseShareUrl() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  // Check for portable hash first
  if (hash.startsWith('#data=')) {
    const data = hash.slice(6);
    const project = decodeProjectFromHash(data);
    if (project) {
      // Clean URL
      window.history.replaceState(null, '', window.location.pathname);
      return project;
    }
  }

  // Check for localStorage project ID
  const projectId = params.get('project');
  if (projectId) {
    const project = loadProject(projectId);
    if (project) {
      window.history.replaceState(null, '', window.location.pathname);
      return project;
    }
  }

  return null;
}
