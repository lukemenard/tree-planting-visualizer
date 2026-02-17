/**
 * localStorage-based project persistence for CanopyViz.
 *
 * Project shape:
 * {
 *   id: string,
 *   name: string,
 *   address: string | null,
 *   center: [lng, lat],
 *   zoom: number,
 *   pitch: number,
 *   bearing: number,
 *   trees: Array<{ id, lng, lat, speciesId, placedAt }>,
 *   siteSettings: { soilType, hasUtilityLines, utilityLineHeight },
 *   createdAt: number (timestamp),
 *   updatedAt: number (timestamp),
 * }
 */

const PREFIX = 'canopyviz_project_';
const INDEX_KEY = 'canopyviz_project_index';

function generateId() {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Index management ────────────────────────────────────────────────────

function getIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY)) || [];
  } catch {
    return [];
  }
}

function setIndex(ids) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

// ─── CRUD ────────────────────────────────────────────────────────────────

export function saveProject(project) {
  const now = Date.now();
  const id = project.id || generateId();
  const record = {
    ...project,
    id,
    createdAt: project.createdAt || now,
    updatedAt: now,
  };

  localStorage.setItem(PREFIX + id, JSON.stringify(record));

  // Update index
  const index = getIndex().filter((i) => i !== id);
  index.unshift(id); // most recent first
  setIndex(index);

  return record;
}

export function loadProject(id) {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function listProjects() {
  const index = getIndex();
  return index
    .map((id) => loadProject(id))
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteProject(id) {
  localStorage.removeItem(PREFIX + id);
  const index = getIndex().filter((i) => i !== id);
  setIndex(index);
}

export function deleteAllProjects() {
  const index = getIndex();
  index.forEach((id) => localStorage.removeItem(PREFIX + id));
  setIndex([]);
}

export function generateProjectId() {
  return generateId();
}
