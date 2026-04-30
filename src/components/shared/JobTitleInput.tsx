import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { JobTitle } from '../../lib/database.types';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function JobTitleInput({ value, onChange, placeholder = 'e.g. Project Manager' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [titles, setTitles] = useState<JobTitle[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('job_titles').select('*').eq('active', true).order('category').order('title').then(({ data }) => {
      setTitles(data ?? []);
    });
  }, []);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        onChange(query);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [query, onChange]);

  const q = query.toLowerCase().trim();
  const allTitleStrings = titles.map(t => t.title);
  const isCustom = query.length > 0 && !allTitleStrings.some(t => t.toLowerCase() === query.toLowerCase());

  // Group and filter
  const groups: Record<string, string[]> = {};
  for (const jt of titles) {
    const matches = !q || jt.title.toLowerCase().includes(q);
    if (matches) {
      if (!groups[jt.category]) groups[jt.category] = [];
      groups[jt.category].push(jt.title);
    }
  }
  const hasResults = Object.values(groups).some(arr => arr.length > 0);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); onChange(query); }
            if (e.key === 'Enter') { setOpen(false); onChange(query); }
          }}
          style={{ width: '100%', paddingRight: isCustom ? 70 : undefined }}
        />
        {isCustom && (
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, fontWeight: 600, color: '#9B9890', background: '#F2F1ED',
            padding: '2px 6px', borderRadius: 4, letterSpacing: 0.3, pointerEvents: 'none',
          }}>CUSTOM</span>
        )}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1px solid #E5E3DC', borderRadius: 8,
          boxShadow: '0 6px 24px rgba(0,0,0,0.10)', zIndex: 200,
          maxHeight: 280, overflowY: 'auto',
        }}>
          {!hasResults && (
            <div style={{ padding: '10px 14px', fontSize: 13, color: '#9B9890' }}>
              No matches — press Enter to use "{query}" as a custom title
            </div>
          )}
          {Object.entries(groups).map(([group, groupTitles]) => (
            <div key={group}>
              <div style={{
                padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                color: '#9B9890', textTransform: 'uppercase', borderTop: '1px solid #F2F1ED',
              }}>{group}</div>
              {groupTitles.map(t => (
                <button
                  key={t}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 14px', fontSize: 13, color: '#1C1B17',
                    background: t === value ? '#EEF4FF' : 'none',
                    border: 'none', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if (t !== value) e.currentTarget.style.background = '#F7F6F2'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = t === value ? '#EEF4FF' : 'none'; }}
                  onMouseDown={e => { e.preventDefault(); setQuery(t); onChange(t); setOpen(false); }}
                >
                  {t}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
