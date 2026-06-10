// ════════════════════════════════════════════════════════════════════════
// Lightweight toast store + API.
// Import { toast } anywhere and call toast.ok('Saved'). Mount <Toaster /> once
// (done in main.tsx). No React context needed — this is a tiny pub/sub store.
// ════════════════════════════════════════════════════════════════════════

export type ToastType = 'ok' | 'info' | 'warn' | 'error';
export interface ToastItem { id: number; type: ToastType; msg: string; sub?: string; }

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let seq = 0;

function emit(): void {
  for (const l of listeners) l(toasts);
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => { listeners.delete(listener); };
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(type: ToastType, msg: string, sub?: string): number {
  const id = ++seq;
  toasts = [...toasts, { id, type, msg, sub }];
  emit();
  window.setTimeout(() => dismissToast(id), 4000);
  return id;
}

export const toast = {
  ok: (msg: string, sub?: string) => push('ok', msg, sub),
  info: (msg: string, sub?: string) => push('info', msg, sub),
  warn: (msg: string, sub?: string) => push('warn', msg, sub),
  error: (msg: string, sub?: string) => push('error', msg, sub),
};
