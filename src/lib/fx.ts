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

  // ── Count-up stat numbers + progress bars filling from zero (once each) ──
  const counted = new WeakSet<Element>();
  const filled = new WeakSet<Element>();

  function animateCounts(): void {
    document.querySelectorAll<HTMLElement>('.stat-value').forEach((el) => {
      if (counted.has(el)) return;
      const raw = (el.textContent ?? '').trim();
      const target = parseInt(raw.replace(/[^0-9-]/g, ''), 10);
      if (Number.isNaN(target)) return;
      counted.add(el);
      if (target === 0) return;
      const suffix = raw.replace(/[0-9,\s-]/g, '');
      const dur = 850;
      const start = performance.now();
      const step = (now: number): void => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = `${Math.round(eased * target)}${suffix}`;
        if (p < 1) window.requestAnimationFrame(step);
        else el.textContent = `${target}${suffix}`;
      };
      window.requestAnimationFrame(step);
    });
  }

  function animateFills(): void {
    document.querySelectorAll<HTMLElement>('.prog-fill, .wb-fill').forEach((el) => {
      if (filled.has(el)) return;
      const target = el.style.width;
      if (!target) return;            // width not set yet — retry on next cycle
      filled.add(el);
      if (target === '0%') return;
      el.style.width = '0%';
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => { el.style.width = target; }));
    });
  }

  // ── Live clock in the topbar (date · time with a pulsing status dot) ──
  function injectClock(): void {
    const bar = document.querySelector<HTMLElement>('.topbar');
    if (!bar) return;
    let actions = bar.querySelector<HTMLElement>('.topbar-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'topbar-actions';
      bar.appendChild(actions);
    }
    if (actions.querySelector('.fx-clock')) return;
    const clock = document.createElement('div');
    clock.className = 'fx-clock';
    clock.innerHTML = '<span class="fx-clock-dot"></span><span class="fx-clock-t"></span>';
    actions.insertBefore(clock, actions.firstChild);
    tickClock();
  }

  function tickClock(): void {
    const d = new Date();
    const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    document.querySelectorAll<HTMLElement>('.fx-clock-t').forEach((t) => { t.textContent = `${day} · ${time}`; });
  }
  window.setInterval(tickClock, 1000);

  function reposition(): void {
    if (scheduled) return;
    scheduled = window.requestAnimationFrame(() => {
      scheduled = 0;
      // Disconnect while we mutate so our own edits don't re-trigger us.
      observer?.disconnect();
      try { positionNavPill(); positionTabInks(); animateCounts(); animateFills(); injectClock(); } catch { /* never break the app */ }
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
