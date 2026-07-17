import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Download, ExternalLink } from 'lucide-react';

interface Props {
  name: string;
  filePath: string | null;
  mimeType: string | null;
  /** Fallback direct URL for legacy rows stored outside the bucket (file_url). */
  fileUrl?: string | null;
  /** Storage bucket the file lives in. Defaults to the company/employee docs bucket. */
  bucket?: string;
  onClose: () => void;
}

// PDFs and images render inline; everything else (Word, Excel, etc.) can't be
// shown by the browser, so we offer download instead of a broken frame.
function previewKind(name: string, mime: string | null): 'pdf' | 'image' | 'other' {
  const m = (mime ?? '').toLowerCase();
  const n = name.toLowerCase();
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(n)) return 'image';
  return 'other';
}

export function DocumentPreview({ name, filePath, mimeType, fileUrl = null, bucket = 'employee-documents', onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const kind = previewKind(name, mimeType);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!filePath) {
        // Legacy rows keep a direct URL instead of a storage object.
        if (fileUrl) setUrl(fileUrl);
        else setError('This document doesn’t have a file attached yet.');
        setLoading(false);
        return;
      }
      // 10 minutes — long enough to actually read the document in the frame.
      const { data, error: sErr } = await supabase.storage.from(bucket).createSignedUrl(filePath, 600);
      if (cancelled) return;
      if (sErr || !data?.signedUrl) {
        setError(sErr?.message ?? 'Could not open this document.');
      } else {
        setUrl(data.signedUrl);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [filePath, fileUrl, bucket]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function download() {
    if (!filePath) {
      if (fileUrl) window.open(fileUrl, '_blank');
      return;
    }
    const { data } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60, { download: name });
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '92vw', maxWidth: 1180, height: '92vh',
          background: '#fff', borderRadius: 12, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid #F2F1ED', flexShrink: 0,
        }}>
          <FileText size={16} style={{ color: '#1B3F6E', flexShrink: 0 }} />
          <div style={{
            fontSize: 14, fontWeight: 600, color: '#1A1916',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            {url && (
              <>
                <button className="btn-ghost sm" onClick={() => window.open(url, '_blank')} title="Open in a new tab">
                  <ExternalLink size={12} style={{ marginRight: 4 }} /> Open
                </button>
                <button className="btn-ghost sm" onClick={download} title="Download">
                  <Download size={12} style={{ marginRight: 4 }} /> Download
                </button>
              </>
            )}
            <button className="close-x" onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{
          flex: 1, minHeight: 0, background: '#F8F7F4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {loading ? (
            <div style={{ fontSize: 13, color: '#9B9890' }}>Opening document…</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <FileText size={32} style={{ color: '#BCBAB3', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1916', marginBottom: 6 }}>Couldn’t open this document</p>
              <div style={{ fontSize: 12.5, color: '#6B6860' }}>{error}</div>
            </div>
          ) : kind === 'pdf' ? (
            <iframe src={url!} title={name} style={{ width: '100%', height: '100%', border: 'none' }} />
          ) : kind === 'image' ? (
            <img src={url!} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <FileText size={32} style={{ color: '#BCBAB3', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1916', marginBottom: 6 }}>
                This file type can’t be previewed in the browser
              </p>
              <div style={{ fontSize: 12.5, color: '#6B6860', marginBottom: 16 }}>
                Word, Excel and similar files need to be downloaded to open.
              </div>
              <button className="btn-primary" onClick={download}>
                <Download size={13} style={{ marginRight: 5 }} /> Download {name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
