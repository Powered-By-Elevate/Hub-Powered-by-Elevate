import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Document } from '../../lib/database.types';

interface MobileDocumentsProps {
  documents: Document[];
  isHR: boolean;
  employeeId: string;
  onDelete: (id: string, filePath: string) => void;
  onAcknowledge: (id: string) => void;
}

const SECTIONS = ['Onboarding Documents', 'HR Forms', 'Policies', 'Training Materials', 'Contracts', 'Company Documents'];

function fileIcon(mime: string | null) {
  if (!mime) return { icon: '📋', cls: 'm-doc-icon-form' };
  if (mime.includes('pdf')) return { icon: '📄', cls: 'm-doc-icon-pdf' };
  if (mime.includes('word') || mime.includes('doc')) return { icon: '📝', cls: 'm-doc-icon-doc' };
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return { icon: '📊', cls: 'm-doc-icon-excel' };
  if (mime.includes('image')) return { icon: '🖼', cls: 'm-doc-icon-img' };
  return { icon: '📋', cls: 'm-doc-icon-form' };
}

function formatSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function MobileDocuments({ documents, isHR, onDelete, onAcknowledge }: MobileDocumentsProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  const grouped = SECTIONS.reduce<Record<string, Document[]>>((acc, sec) => {
    const docs = documents.filter(d => d.section === sec);
    if (docs.length > 0) acc[sec] = docs;
    return acc;
  }, {});

  const handleView = async (doc: Document) => {
    if (!doc.file_path) return;
    const { data } = await supabase.storage.from('employee-documents').createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const handleDownload = async (doc: Document) => {
    if (!doc.file_path) return;
    const { data } = await supabase.storage.from('employee-documents').createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    setDeleting(doc.id);
    if (doc.file_path) onDelete(doc.id, doc.file_path);
    setDeleting(null);
  };

  const toggle = (sec: string) => setCollapsed(c => ({ ...c, [sec]: !c[sec] }));

  if (Object.keys(grouped).length === 0) {
    return (
      <div className="m-screen">
        <div className="m-empty" style={{ marginTop: 40 }}>
          <div className="m-empty-icon">📁</div>
          <div className="m-empty-text">
            {isHR ? 'No documents uploaded yet' : 'No documents have been shared with you yet'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="m-screen">
      {Object.entries(grouped).map(([section, docs]) => (
        <div key={section}>
          <div className="m-sec-hdr" onClick={() => toggle(section)}>
            <span className="m-sec-hdr-title">{section}</span>
            <div className="m-sec-hdr-right">
              <span>{docs.length}</span>
              <span>{collapsed[section] ? '▶' : '▼'}</span>
            </div>
          </div>
          {!collapsed[section] && docs.map(doc => {
            const { icon, cls } = fileIcon(doc.mime_type);
            const needsAck = doc.requires_acknowledgment;
            return (
              <div key={doc.id} className="m-doc-card">
                <div className="m-doc-row">
                  <div className={`m-doc-icon ${cls}`}>{icon}</div>
                  <div>
                    <div className="m-doc-name">{doc.name}</div>
                    <div className="m-doc-meta">
                      {[formatSize(doc.file_size_bytes), doc.category, new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
                {needsAck && !doc.acknowledged_at && (
                  <div className="m-ack-box">
                    Acknowledgment required
                    <br />
                    <button
                      onClick={() => onAcknowledge(doc.id)}
                      style={{ marginTop: 6, fontWeight: 600, color: '#B45309', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12 }}
                    >
                      I have read and understood this document →
                    </button>
                  </div>
                )}
                {doc.acknowledged_at && (
                  <div style={{ fontSize: 11, color: '#2D9A60', marginBottom: 8 }}>
                    Acknowledged {new Date(doc.acknowledged_at).toLocaleDateString()}
                  </div>
                )}
                <div className="m-doc-btns">
                  <button className="m-doc-view" onClick={() => handleView(doc)}>View</button>
                  <button className="m-doc-dl" onClick={() => handleDownload(doc)}>Download</button>
                </div>
                {isHR && (
                  <button
                    className="m-doc-del"
                    onClick={() => handleDelete(doc)}
                    disabled={deleting === doc.id}
                  >
                    {deleting === doc.id ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
