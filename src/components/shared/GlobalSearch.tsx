import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee, Document } from '../../lib/database.types';
import { Search, User, FileText, UserPlus, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmployee?: (id: string) => void;
  onSelectApplicant?: (id: string) => void;
  onSelectDocument?: (doc: Document) => void;
}

interface SearchResult {
  type: 'employee' | 'applicant' | 'document';
  id: string;
  title: string;
  subtitle: string;
  raw: Employee | Document;
}

export function GlobalSearch({ isOpen, onClose, onSelectEmployee, onSelectApplicant, onSelectDocument }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search debounced
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = query.trim();

      // Search employees + applicants (one query, split into buckets)
      const empPromise = supabase
      .from('employees')
      .select('id, name, email, role, department')
      .neq('is_test_account', true)
      .ilike('name', `%${query}%`)
        .or(`name.ilike.%${q}%,email.ilike.%${q}%,role.ilike.%${q}%,department.ilike.%${q}%,position_applied_for.ilike.%${q}%`)
        .eq('archived', false)
        .limit(15);

      // Search documents
      const docPromise = supabase
        .from('documents')
        .select('*')
        .ilike('name', `%${q}%`)
        .limit(5);

      const [empRes, docRes] = await Promise.all([empPromise, docPromise]);

      const combined: SearchResult[] = [];

      // Employees + applicants
      (empRes.data ?? []).forEach((e: Employee) => {
        if (e.lifecycle_status === 'applicant') {
          combined.push({
            type: 'applicant',
            id: e.id,
            title: e.name,
            subtitle: `Applicant · ${e.position_applied_for ?? 'No position'}`,
            raw: e,
          });
        } else {
          combined.push({
            type: 'employee',
            id: e.id,
            title: e.name,
            subtitle: `${e.role} · ${e.department ?? '—'}`,
            raw: e,
          });
        }
      });

      // Documents
      (docRes.data ?? []).forEach((d: Document) => {
        combined.push({
          type: 'document',
          id: d.id,
          title: d.name,
          subtitle: `Document · ${d.category ?? 'Other'}`,
          raw: d,
        });
      });

      setResults(combined);
      setActiveIndex(0);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((r: SearchResult) => {
    if (r.type === 'employee' && onSelectEmployee) onSelectEmployee(r.id);
    else if (r.type === 'applicant' && onSelectApplicant) onSelectApplicant(r.id);
    else if (r.type === 'document' && onSelectDocument) onSelectDocument(r.raw as Document);
    onClose();
  }, [onSelectEmployee, onSelectApplicant, onSelectDocument, onClose]);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[activeIndex]) handleSelect(results[activeIndex]);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, results, activeIndex, handleSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80,
      }}
    >
      <div
        onClick={ev => ev.stopPropagation()}
        style={{
          width: 'min(600px, 90vw)', maxHeight: 'calc(100vh - 160px)',
          background: '#fff', borderRadius: 14, border: '1px solid #E5E3DC',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Input */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F2F1ED', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search size={18} style={{ color: '#9B9890', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search employees, applicants, documents..."
            style={{
              flex: 1, fontSize: 15, color: '#1A1916', border: 'none', outline: 'none', background: 'transparent',
            }}
          />
          <button
            onClick={onClose}
            style={{
              padding: 4, borderRadius: 6, border: '1px solid #E5E3DC', background: '#F8F7F4', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><X size={14} color="#6B6860" /></button>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 60 }}>
          {!query.trim() ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: '#9B9890', fontSize: 13 }}>
              Start typing to search across employees, applicants, and documents
            </div>
          ) : loading ? (
            <div style={{ padding: '20px 18px', textAlign: 'center', color: '#9B9890', fontSize: 13 }}>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '20px 18px', textAlign: 'center', color: '#9B9890', fontSize: 13 }}>
              No results for "{query}"
            </div>
          ) : (
            results.map((r, i) => {
              const Icon = r.type === 'employee' ? User : r.type === 'applicant' ? UserPlus : FileText;
              const iconColor = r.type === 'employee' ? '#1B3F6E' : r.type === 'applicant' ? '#2D9A60' : '#D97706';
              const isActive = i === activeIndex;
              return (
                <div
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{
                    padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    background: isActive ? '#F0F9FF' : 'transparent',
                    borderLeft: isActive ? '3px solid #1B3F6E' : '3px solid transparent',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: iconColor + '15', color: iconColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1916' }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: '#9B9890' }}>{r.subtitle}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px', borderTop: '1px solid #F2F1ED', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#9B9890',
        }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>{results.length > 0 && `${results.length} result${results.length !== 1 ? 's' : ''}`}</span>
        </div>
      </div>
    </div>
  );
}