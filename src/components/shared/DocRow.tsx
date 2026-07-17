import { useState } from 'react';
import { FileText, Eye, Download, Trash2 } from 'lucide-react';
import type { Document } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { DocumentPreview } from './DocumentPreview';

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
  const [dlLoading, setDlLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState(false);

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
      <button
        onClick={() => setPreview(true)}
        title="Click to open this document"
        style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}
      >
        <FileText size={18} style={{ color: '#1B3F6E', flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="doc-name" style={{ color: '#1B3F6E' }}>{doc.name}</div>
          <div className="doc-meta">
            {doc.category}
            {doc.size_label && ` · ${doc.size_label}`}
            {doc.section && ` · ${doc.section}`}
          </div>
        </div>
      </button>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="btn-ghost sm" onClick={() => setPreview(true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Eye size={12} /> View
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

      {preview && (
        <DocumentPreview
          name={doc.name}
          filePath={doc.file_path}
          mimeType={doc.mime_type}
          fileUrl={doc.file_url}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
