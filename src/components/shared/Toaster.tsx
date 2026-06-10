import { useEffect, useState } from 'react';
import { subscribeToasts, dismissToast, type ToastItem } from '../../lib/toast';

const ICON: Record<ToastItem['type'], string> = { ok: '✓', info: 'ⓘ', warn: '!', error: '✕' };

/** Renders the toast stack. Mount once near the app root. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;
  return (
    <div className="fx-toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`fx-toast ${t.type}`} onClick={() => dismissToast(t.id)}>
          <div className="fx-toast-ic">{ICON[t.type] ?? 'ⓘ'}</div>
          <div>
            <div>{t.msg}</div>
            {t.sub && <div className="fx-toast-sub">{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
