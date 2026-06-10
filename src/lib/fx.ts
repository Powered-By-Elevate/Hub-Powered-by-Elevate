// ════════════════════════════════════════════════════════════════════════
// The Hub — interaction engine (Batch 2).
// Adds a click ripple to buttons and a subtle cursor-tracking glow to cards.
// Bound once, delegated, and disabled under prefers-reduced-motion.
// ════════════════════════════════════════════════════════════════════════

let initialized = false;

export function initFx(): void {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  // Click ripple on interactive controls.
  document.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest<HTMLElement>(
      '.btn-primary,.btn-ghost,.btn-danger-soft,.btn-signin,.filter-chip,.tab-btn,.nav-btn,.close-x',
    );
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'fx-ripple';
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    btn.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 620);
  }, true);

  // Cursor-tracking inner glow on cards (fine pointers only).
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    let raf = 0;
    document.addEventListener('mousemove', (e) => {
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>('.card,.stat-card');
      if (!card || raf) return;
      raf = window.requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--fx-mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty('--fx-my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
        raf = 0;
      });
    }, { passive: true });
  }
}
