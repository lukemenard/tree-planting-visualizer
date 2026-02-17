import { useState, useRef, useEffect } from 'react';
import { generateShareUrl } from '../services/shareUrl';
import { generatePDF } from '../services/pdfExport';
import { saveProjectHybrid, listProjectsHybrid, deleteProjectHybrid } from '../services/cloudStore';
import { deleteAllProjects as deleteAllLocalProjects } from '../services/projectStore';

export default function ProjectDrawer({
  open,
  onClose,
  trees,
  speciesMap,
  mapRef,
  projectId,
  projectName,
  address,
  currentUser,
  onProjectNameChange,
  onLoadProject,
  onSignInClick,
  onProjectSaved,
  prescription,
  siteIndex,
  projectionYear,
}) {
  const [toast, setToast] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedProjects, setSavedProjects] = useState([]);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (open) {
      listProjectsHybrid().then(setSavedProjects).catch(() => setSavedProjects([]));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let armed = false;
    const armTimeout = setTimeout(() => { armed = true; }, 100);
    const handleClick = (e) => {
      if (armed && drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      clearTimeout(armTimeout);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const buildProject = () => ({
    id: projectId,
    name: projectName || 'Untitled Plan',
    address: address || null,
    center: mapRef?.current
      ? [mapRef.current.getCenter().lng, mapRef.current.getCenter().lat]
      : [-73.985, 40.748],
    zoom: mapRef?.current?.getZoom() || 17,
    pitch: mapRef?.current?.getPitch() || 45,
    bearing: mapRef?.current?.getBearing() || 0,
    trees,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const project = buildProject();
      await saveProjectHybrid(project);
      const updated = await listProjectsHybrid();
      setSavedProjects(updated);
      onProjectSaved?.();
      showToast(currentUser ? 'Saved to cloud' : 'Saved locally');
    } catch (err) {
      console.warn('[ProjectDrawer] Save error:', err);
      showToast('Save failed — try again');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    const project = buildProject();
    const url = generateShareUrl(project);
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Share link copied');
      } catch {
        showToast('Share URL generated');
      }
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await generatePDF({
        mapRef,
        trees,
        speciesMap,
        address: address || '',
        projectName: projectName || 'Planting Plan',
        prescription,
        siteIndex,
        projectionYear,
      });
      showToast('PDF downloaded');
    } catch (err) {
      console.warn('[PDF] Export error:', err);
      showToast('PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleLoadProject = (proj) => {
    onLoadProject(proj);
    onClose();
  };

  const handleDeleteProject = async (id) => {
    await deleteProjectHybrid(id);
    const updated = await listProjectsHybrid();
    setSavedProjects(updated);
  };

  const handleClearAll = async () => {
    deleteAllLocalProjects();
    setSavedProjects([]);
    showToast('All saved projects cleared');
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full glass-panel rounded-t-2xl overflow-y-auto animate-drawer-up scrollbar-thin"
        style={{ maxHeight: 'calc(100dvh - 48px)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 z-10 bg-[rgba(12,12,12,0.95)] backdrop-blur-xl rounded-t-2xl">
          <div className="w-8 h-1 rounded-full bg-white/[0.12]" />
        </div>

        <div className="max-w-md mx-auto px-5 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-slate-200 font-semibold text-[15px]">Project</h2>
            <div className="flex items-center gap-3">
              {currentUser ? (
                <span className="text-[9px] text-emerald-400/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Synced
                </span>
              ) : (
                <button onClick={onSignInClick} className="text-[9px] text-slate-600 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  Sign in to sync
                </button>
              )}
              <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors p-0.5">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Project name */}
          <div className="mb-4">
            <label className="text-[10px] text-slate-600 font-medium block mb-1.5">NAME</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              placeholder="My Planting Plan"
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-700 outline-none focus:border-emerald-500/30 transition-colors"
            />
          </div>

          {address && (
            <div className="mb-4">
              <label className="text-[10px] text-slate-600 font-medium block mb-1.5">ADDRESS</label>
              <div className="text-[12px] text-slate-400 bg-white/[0.03] border border-white/[0.04] rounded-lg px-3 py-2">{address}</div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <ActionButton onClick={handleSave} label="Save" color="emerald" disabled={saving}>
              {saving ? (
                <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              )}
            </ActionButton>
            <ActionButton onClick={handleShare} label="Share" color="sky">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </ActionButton>
            <ActionButton onClick={handleExportPDF} label="Export" color="violet" disabled={exporting || trees.length === 0}>
              {exporting ? (
                <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </ActionButton>
          </div>

          {/* Saved Projects */}
          {savedProjects.length > 0 && (
            <div className="border-t border-white/[0.06] pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] text-slate-600 font-semibold tracking-wider">SAVED ({savedProjects.length})</h3>
                {savedProjects.length > 1 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[9px] text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {savedProjects.map((proj) => {
                  const isCurrent = proj.id === projectId;
                  return (
                  <div key={proj.id} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                    isCurrent
                      ? 'bg-emerald-950/30 border border-emerald-500/20'
                      : 'bg-white/[0.03] border border-white/[0.04]'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-slate-300 truncate flex items-center gap-1.5">
                        {proj.name || 'Untitled Plan'}
                        {isCurrent && <span className="text-[8px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Current</span>}
                      </div>
                      <div className="text-[9px] text-slate-600 truncate">
                        {proj.address || 'No address'} · {proj.trees?.length || 0} trees · {new Date(proj.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoadProject(proj)}
                      className="text-[10px] font-medium text-emerald-400/80 hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-950/30 transition-colors"
                    >
                      Load
                    </button>
                    <button onClick={() => handleDeleteProject(proj.id)} className="text-slate-700 hover:text-red-400 p-1 transition-colors">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-[rgba(12,12,12,0.9)] backdrop-blur-xl border border-white/[0.08] rounded-lg px-4 py-2 text-[12px] font-medium text-emerald-400 shadow-lg animate-slide-up">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({ onClick, label, color, disabled, children }) {
  const colorMap = {
    emerald: 'bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-400 border-emerald-500/10',
    sky: 'bg-sky-950/30 hover:bg-sky-950/50 text-sky-400 border-sky-500/10',
    violet: 'bg-violet-950/30 hover:bg-violet-950/50 text-violet-400 border-violet-500/10',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1.5 border rounded-xl px-3 py-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${colorMap[color]}`}
    >
      {children}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
