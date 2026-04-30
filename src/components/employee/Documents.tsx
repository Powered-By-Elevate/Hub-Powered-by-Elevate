import { useState } from 'react';
import { Document } from '../../lib/database.types';
import { DocRow } from '../shared/DocRow';
import { FileText } from 'lucide-react';
import { ToastContainer, ToastItem } from '../shared/Toast';

interface Props {
  documents: Document[];
  onDocumentDeleted?: (id: string) => void;
}

export function EmpDocuments({ documents, onDocumentDeleted }: Props) {
  const [localDocs, setLocalDocs] = useState<Document[]>(documents);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Keep in sync when parent updates
  if (documents !== localDocs && documents.length !== localDocs.length) {
    setLocalDocs(documents);
  }

  function showToast(message: string, type: ToastItem['type'] = 'success') {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }

  function handleDeleted(id: string) {
    setLocalDocs(prev => prev.filter(d => d.id !== id));
    onDocumentDeleted?.(id);
    showToast('Document deleted');
  }

  function handleError(msg: string) {
    showToast(msg, 'error');
  }

  // Group by section
  const sections: Record<string, Document[]> = {};
  for (const doc of localDocs) {
    const sec = doc.section ?? 'Documents';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(doc);
  }

  const hasDocs = localDocs.length > 0;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Documents</h1>
          <p>Files and forms shared with you by HR</p>
        </div>
      </div>
      <div className="content">
        {!hasDocs ? (
          <div className="card">
            <div className="empty-state" style={{ padding: '2.5rem 1.25rem' }}>
              <FileText size={32} style={{ color: '#BCBAB3', margin: '0 auto 12px', display: 'block' }} />
              <p>No documents have been shared with you yet</p>
              <div className="esub">Your HR team will share documents here during onboarding.</div>
            </div>
          </div>
        ) : (
          Object.entries(sections).map(([section, docs]) => (
            <div key={section} className="card mb2">
              <div className="card-header">
                <h3>{section}</h3>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#9B9890',
                  background: '#F2F1ED', padding: '2px 8px', borderRadius: 10,
                }}>
                  {docs.length}
                </span>
              </div>
              <div style={{ padding: '0 1.25rem' }}>
                {docs.map(d => (
                  <DocRow
                    key={d.id}
                    doc={d}
                    onDeleted={handleDeleted}
                    onError={handleError}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <ToastContainer toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </>
  );
}
