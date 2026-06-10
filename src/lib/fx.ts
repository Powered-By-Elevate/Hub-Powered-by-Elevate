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

  // ── Sliding active-pill (sidebar nav) + sliding tab underline ──
  // DOM-driven so it works across the HR and employee shells without touching
  // components. The native .active highlight is the fallback: fx.css only hides
  // it once these classes are applied, so if positioning ever fails the app
  // still shows the active state.
  const OBS = { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] };
  let observer: MutationObserver | null = null;
  let scheduled = 0;

  function positionNavPill(): void {
    const nav = document.querySelector<HTMLElement>('.sidebar-nav');
    let pill = document.getElementById('fx-navpill');
    if (!nav) { if (pill) pill.style.opacity = '0'; return; }
    const active = nav.querySelector<HTMLElement>('.nav-btn.active');
    if (!active) { nav.classList.remove('fx-pill-on'); if (pill) pill.style.opacity = '0'; return; }
    if (!pill || pill.parentElement !== nav) {
      pill = pill || document.createElement('div');
      pill.id = 'fx-navpill';
      nav.insertBefore(pill, nav.firstChild);
    }
    nav.classList.add('fx-pill-on');
    pill.style.opacity = '1';
    pill.style.top = `${active.offsetTop}px`;
    pill.style.left = `${active.offsetLeft}px`;
    pill.style.width = `${active.offsetWidth}px`;
    pill.style.height = `${active.offsetHeight}px`;
  }

  function positionTabInks(): void {
    const seen = new Set<HTMLElement>();
    document.querySelectorAll<HTMLElement>('.tab-btn.active').forEach((active) => {
      const parent = active.parentElement;
      if (!parent || seen.has(parent)) return;
      seen.add(parent);
      parent.classList.add('fx-ink-on');
      if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
      let ink = parent.querySelector<HTMLElement>(':scope > .fx-tab-ink');
      if (!ink) { ink = document.createElement('span'); ink.className = 'fx-tab-ink'; parent.appendChild(ink); }
      ink.style.left = `${active.offsetLeft}px`;
      ink.style.width = `${active.offsetWidth}px`;
    });
  }

  function reposition(): void {
    if (scheduled) return;
    scheduled = window.requestAnimationFrame(() => {
      scheduled = 0;
      // Disconnect while we mutate so our own pill/ink edits don't re-trigger us.
      observer?.disconnect();
      try { positionNavPill(); positionTabInks(); } catch { /* never break the app */ }
      observer?.observe(document.body, OBS);
    });
  }

  observer = new MutationObserver(reposition);
  observer.observe(document.body, OBS);
  window.addEventListener('resize', reposition, { passive: true });
  reposition();
  window.setTimeout(reposition, 150);
  window.setTimeout(reposition, 450);
}
