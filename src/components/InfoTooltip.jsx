import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import EDUCATIONAL_CONTENT from '../data/educationalContent';

export default function InfoTooltip({ topic, className = '' }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popoverRef = useRef(null);

  const content = EDUCATIONAL_CONTENT[topic];
  if (!content) return null;

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popoverW = 240;
    const popoverH = 110;

    let top = rect.top - popoverH - 6;
    let left = rect.left + rect.width / 2 - popoverW / 2;

    if (top < 8) top = rect.bottom + 6;
    if (left < 8) left = 8;
    if (left + popoverW > window.innerWidth - 8) left = window.innerWidth - popoverW - 8;

    setPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleClick = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleScroll = () => setOpen(false);

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className={`w-3.5 h-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-slate-600 hover:text-slate-400 text-[8px] font-bold inline-flex items-center justify-center transition-colors leading-none shrink-0 ${className}`}
        aria-label={`Learn about ${content.title}`}
      >
        i
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[100] w-60 animate-slide-up pointer-events-auto"
          style={{ top: position.top, left: position.left }}
        >
          <div className="bg-[rgba(12,12,12,0.95)] backdrop-blur-xl border border-white/[0.08] rounded-xl p-3 shadow-2xl">
            <h4 className="text-emerald-400 text-[11px] font-semibold mb-1">{content.title}</h4>
            <p className="text-slate-400 text-[10px] leading-relaxed mb-1.5">{content.body}</p>
            {content.source && (
              <p className="text-[8px] text-slate-700 italic">Source: {content.source}</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
