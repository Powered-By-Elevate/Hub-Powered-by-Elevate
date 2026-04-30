import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

function SingleToast({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => { setVisible(false); setTimeout(onRemove, 300); }, 3500);
    return () => clearTimeout(t);
  }, [onRemove]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: toast.type === 'success' ? '#1A3A2A' : '#3A1A1A',
      color: '#fff', padding: '12px 16px', borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      fontSize: 13, fontWeight: 500, maxWidth: 360,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.25s ease',
      pointerEvents: 'auto',
    }}>
      {toast.type === 'success'
        ? <CheckCircle size={17} style={{ color: '#4ADE80', flexShrink: 0 }} />
        : <XCircle size={17} style={{ color: '#F87171', flexShrink: 0 }} />
      }
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 2, display: 'flex', alignItems: 'center' }}>
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <SingleToast key={t.id} toast={t} onRemove={() => onRemove(t.id)} />
      ))}
    </div>
  );
}
