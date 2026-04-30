import { useState } from 'react';
import { FileText, Eye, Download, Trash2 } from 'lucide-react';
import type { Document } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

async function getSignedUrl(doc: Document): Promise<string | null> {
  if (doc.file_path) {
    const { data } = await supabase.storage
      .from('employee-documents')
      .createSignedUrl(doc.file_path, 3600);
    return data?.signedUrl ?? null;
  }
  return doc.file_url ?? null;
}

interface Props {
  doc: Document;
  onDeleted?: (id: string) => void;
  onError?: (msg: string) => void;
}

export function DocRow({ doc, onDeleted, onError }: Props) {
  const [viewLoading, setViewLoading] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleView() {
    setViewLoading(true);
    const url = await getSignedUrl(doc);
    setViewLoading(false);
    if (!url) { onError?.('Could not load document. Please try again.'); return; }
    const mime = doc.mime_type ?? '';
    if (mime.startsWith('image/') || mime === 'application/pdf') {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = doc.name; a.click();
    }
  }

  async function handleDownload() {
    setDlLoading(true);
    const url = await getSignedUrl(doc);
    setDlLoading(false);
    if (!url) { onError?.('Could not load document. Please try again.'); return; }
    const a = document.createElement('a');
    a.href = url; a.download = doc.name; a.click();
  }

  async function handleDelete() {
    setDeleting(true);
    if (doc.file_path) {
      await supabase.storage.from('employee-documents').remove([doc.file_path]);
    }
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    setDeleting(false);
    if (error) { onError?.('Failed to delete document. Please try again.'); setConfirmDelete(false); return; }
    onDeleted?.(doc.id);
  }

  return (
    <div className="doc-row">
      <FileText size={18} style={{ color: '#1B3F6E', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="doc-name">{doc.name}</div>
        <div className="doc-meta">
          {doc.category}
          {doc.size_label && ` · ${doc.size_label}`}
          {doc.section && ` · ${doc.section}`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="btn-ghost sm" onClick={handleView} disabled={viewLoading} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Eye size={12} /> {viewLoading ? '…' : 'View'}
        </button>
        <button className="btn-ghost sm" onClick={handleDownload} disabled={dlLoading} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Download size={12} /> {dlLoading ? '…' : 'Download'}
        </button>
        {onDeleted && !confirmDelete && (
          <button className="btn-danger-soft sm" onClick={() => setConfirmDelete(true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }} title={`Delete ${doc.name}`}>
            <Trash2 size={12} />
          </button>
        )}
        {onDeleted && confirmDelete && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 500, whiteSpace: 'nowrap' }}>Delete?</span>
            <button className="btn-danger-soft sm" onClick={handleDelete} disabled={deleting}>{deleting ? '…' : 'Yes'}</button>
            <button className="btn-ghost sm" onClick={() => setConfirmDelete(false)}>No</button>
          </div>
        )}
      </div>
    </div>
  );
}
