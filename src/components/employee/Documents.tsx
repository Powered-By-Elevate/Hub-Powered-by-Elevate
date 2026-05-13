import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Document, DocumentBucket, DocumentAcknowledgment } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { DocRow } from '../shared/DocRow';
import { FileText, AlertCircle, Check } from 'lucide-react';
import { ToastContainer, ToastItem } from '../shared/Toast';

interface Props {
  documents: Document[];
  onDocumentDeleted?: (id: string) => void;
}

export function EmpDocuments({ documents, onDocumentDeleted }: Props) {
  const { profile } = useAuth();
  const [buckets, setBuckets] = useState<DocumentBucket[]>([]);
  const [acks, setAcks] = useState<DocumentAcknowledgment[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const loadMeta = useCallback(async () => {
    const [{ data: bks }, { data: ackData }] = await Promise.all([
      supabase.from('document_buckets').select('*').eq('active', true).order('sort_order'),
      profile?.employee_id 
        ? supabase.from('document_acknowledgments').select('*').eq('employee_id', profile.employee_id)
        : Promise.resolve({ data: [] }),
    ]);
    setBuckets(bks ?? []);
    setAcks(ackData ?? []);
  }, [profile?.employee_id]);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  function showToast(message: string, type: ToastItem['type'] = 'success') {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }

  async function acknowledge(docId: string) {
    if (!profile?.employee_id) return;
    const { error } = await supabase.from('document_acknowledgments').insert({
      document_id: docId,
      employee_id: profile.employee_id,
    });
    if (error) { showToast('Failed to acknowledge: ' + error.message, 'error'); return; }
    loadMeta();
    showToast('Document acknowledged');
  }

  function handleDeleted(id: string) {
    onDocumentDeleted?.(id);
    showToast('Document deleted');
  }

  const ackedIds = new Set(acks.map(a => a.document_id));
  const unackedRequired = documents.filter(d => d.requires_acknowledgment && !ackedIds.has(d.id));

  // Group by bucket; fallback to section
  const byBucket: Record<string, Document[]> = {};
  const noBucket: Document[] = [];
  for (const doc of documents) {
    if (doc.bucket_id) {
      if (!byBucket[doc.bucket_id]) byBucket[doc.bucket_id] = [];
      byBucket[doc.bucket_id].push(doc);
    } else {
      noBucket.push(doc);
    }
  }

  const hasDocs = documents.length > 0;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Documents</h1>
          <p>Files and resources shared with you</p>
        </div>
      </div>
      <div className="content">
      {unackedRequired.length > 0 && (
          <div id="emp-documents-ack-banner" className="card mb2" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
            <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertCircle size={20} style={{ color: '#92400E', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#92400E', marginBottom: 4 }}>
                  {unackedRequired.length} document{unackedRequired.length !== 1 ? 's' : ''} require{unackedRequired.length === 1 ? 's' : ''} your acknowledgment
                </div>
                <div style={{ fontSize: 12, color: '#92400E' }}>
                  Please review and acknowledge below.
                </div>
              </div>
            </div>
          </div>
        )}

        {!hasDocs ? (
          <div className="card">
            <div className="empty-state" style={{ padding: '2.5rem 1.25rem' }}>
              <FileText size={32} style={{ color: '#BCBAB3', margin: '0 auto 12px', display: 'block' }} />
              <p>No documents have been shared with you yet</p>
              <div className="esub">Documents from HR will appear here.</div>
            </div>
          </div>
        ) : (
          <div id="emp-documents-list">
            {buckets.map(bucket => {
              const docs = byBucket[bucket.id];
              if (!docs || docs.length === 0) return null;
              return (
                <div key={bucket.id} className="card mb2">
                  <div className="card-header">
                    <div>
                      <h3>{bucket.name}</h3>
                      {bucket.description && <div style={{ fontSize: 11, color: '#9B9890', marginTop: 2 }}>{bucket.description}</div>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9890', background: '#F2F1ED', padding: '2px 8px', borderRadius: 10 }}>
                      {docs.length}
                    </span>
                  </div>
                  <div style={{ padding: '0 1.25rem' }}>
                    {docs.map(d => {
                      const isAcked = ackedIds.has(d.id);
                      const needsAck = d.requires_acknowledgment && !isAcked;
                      return (
                        <div key={d.id} style={{ borderBottom: '1px solid #F2F1ED' }}>
                          <DocRow doc={d} onDeleted={handleDeleted} onError={msg => showToast(msg, 'error')} />
                          {d.requires_acknowledgment && (
                            <div style={{ padding: '0 0 12px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
                              {isAcked ? (
                                <span style={{ fontSize: 11, color: '#065F46', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Check size={12} /> Acknowledged
                                </span>
                              ) : (
                                <button
                                  className="btn-primary sm"
                                  onClick={() => acknowledge(d.id)}
                                  style={{ fontSize: 11 }}
                                >
                                  Acknowledge this document
                                </button>
                              )}
                              {needsAck && (
                                <span style={{ fontSize: 11, color: '#92400E' }}>Required</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {noBucket.length > 0 && (
              <div className="card mb2">
                <div className="card-header">
                  <h3>Other</h3>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9890', background: '#F2F1ED', padding: '2px 8px', borderRadius: 10 }}>
                    {noBucket.length}
                  </span>
                </div>
                <div style={{ padding: '0 1.25rem' }}>
                  {noBucket.map(d => (
                    <DocRow key={d.id} doc={d} onDeleted={handleDeleted} onError={msg => showToast(msg, 'error')} />
                  ))}
                </div>
                </div>
            )}
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </>
  );
}