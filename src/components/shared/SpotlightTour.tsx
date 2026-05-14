import { useState, useEffect, useRef, useCallback } from 'react';

export interface TourStep {
  targetId: string;
  title: string;
  body: string;
  onEnter?: () => void; // Fires when this step becomes active — used to switch tabs
}

interface Props {
  steps: TourStep[];
  currentStep: number;
  onAdvance: (newStep: number) => void;
  onComplete: () => void;
  introTitle?: string;
  introBody?: string;
  outroTitle?: string;
  outroBody?: string;
}

const PADDING = 8;
const TOOLTIP_WIDTH = typeof window !== 'undefined' && window.innerWidth < 480 ? Math.min(window.innerWidth - 32, 320) : 340;
const TOOLTIP_OFFSET = 14;

export function SpotlightTour({
  steps, currentStep, onAdvance, onComplete,
  introTitle, introBody, outroTitle, outroBody,
}: Props) {
  const phase: 'intro' | 'spotlight' | 'outro' =
    currentStep === -1 ? 'intro' :
    currentStep >= steps.length ? 'outro' : 'spotlight';

  const step = phase === 'spotlight' ? steps[currentStep] : null;
  const [rect, setRect] = useState<DOMRect | null>(null);
  const stepRanRef = useRef<number>(-2);

  // Fire onEnter when step changes
  useEffect(() => {
    if (phase !== 'spotlight' || !step) return;
    if (stepRanRef.current === currentStep) return;
    stepRanRef.current = currentStep;
    if (step.onEnter) step.onEnter();
  }, [phase, currentStep, step]);

  const updateRect = useCallback(() => {
    if (!step) { setRect(null); return; }
    const el = document.getElementById(step.targetId);
    if (!el) { setRect(null); return; }
    
    // Don't scroll fixed-position elements (like mobile bottom nav) — they're already in view
    const computed = window.getComputedStyle(el);
    const isFixed = computed.position === 'fixed';
    const parentFixed = el.closest('.mobile-bottom-nav, .mobile-header') !== null;
    
    if (!isFixed && !parentFixed) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      console.log('[Tour] target:', step.targetId, 'rect:', { x: r.x, y: r.y, w: r.width, h: r.height });
      if (r.width === 0 && r.height === 0) {
        setRect(null);
        return;
      }
      setRect(r);
    });
  }, [step]);

  // Auto-skip steps where target element doesn't exist (e.g. conditional sections)
  useEffect(() => {
    if (phase !== 'spotlight' || !step) return;
    const skipTimer = setTimeout(() => {
      const el = document.getElementById(step.targetId);
      if (!el) {
        // Element never appeared — skip to next step
        if (currentStep + 1 >= steps.length) onComplete();
        else onAdvance(currentStep + 1);
      }
    }, 1500);
    return () => clearTimeout(skipTimer);
  }, [phase, currentStep, step, steps.length, onAdvance, onComplete]);

  useEffect(() => {
    if (phase !== 'spotlight') return;
    // Multiple measure attempts to handle late-rendering elements after tab switch
    const t1 = setTimeout(updateRect, 50);
    const t2 = setTimeout(updateRect, 250);
    const t3 = setTimeout(updateRect, 500);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [phase, currentStep, updateRect]);

  useEffect(() => {
    function block(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
    }
    window.addEventListener('keydown', block, true);
    return () => window.removeEventListener('keydown', block, true);
  }, []);

  function next() {
    if (phase === 'intro') onAdvance(0);
    else if (phase === 'spotlight') onAdvance(currentStep + 1);
    else onComplete();
  }

  function back() {
    if (phase === 'spotlight' && currentStep > 0) onAdvance(currentStep - 1);
    else if (phase === 'outro') onAdvance(steps.length - 1);
  }

  if (phase === 'intro') {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👋</div>
          <h2 style={{ margin: '0 0 12px', fontSize: 22, color: '#1A1916' }}>{introTitle ?? 'Welcome'}</h2>
          <p style={{ fontSize: 14, color: '#6B6860', lineHeight: 1.6, marginBottom: 24 }}>{introBody}</p>
          <button onClick={next} style={primaryBtnStyle}>Start the Tour →</button>
        </div>
      </div>
    );
  }

  if (phase === 'outro') {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
          <h2 style={{ margin: '0 0 12px', fontSize: 22, color: '#1A1916' }}>{outroTitle ?? 'You\'re all set'}</h2>
          <p style={{ fontSize: 14, color: '#6B6860', lineHeight: 1.6, marginBottom: 24 }}>{outroBody}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={back} style={ghostBtnStyle}>← Back</button>
            <button onClick={next} style={primaryBtnStyle}>Enter The Hub</button>
          </div>
        </div>
      </div>
    );
  }

  if (!step || !rect) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...modalStyle, padding: 20 }}>
          <p style={{ fontSize: 13, color: '#6B6860' }}>Loading next step...</p>
        </div>
      </div>
    );
  }

  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;

  let tooltipTop = rect.bottom + TOOLTIP_OFFSET;
  let tooltipLeft = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  let arrowSide: 'top' | 'bottom' | 'left' | 'right' = 'top';

  if (tooltipTop + 220 > viewportH) {
    if (rect.top - 220 - TOOLTIP_OFFSET > 0) {
      tooltipTop = rect.top - TOOLTIP_OFFSET - 220;
      arrowSide = 'bottom';
    } else {
      tooltipTop = rect.top + rect.height / 2 - 100;
      tooltipLeft = rect.right + TOOLTIP_OFFSET;
      arrowSide = 'left';
    }
  }

  if (tooltipLeft < 10) tooltipLeft = 10;
  if (tooltipLeft + TOOLTIP_WIDTH > viewportW - 10) tooltipLeft = viewportW - TOOLTIP_WIDTH - 10;
  if (tooltipTop < 10) tooltipTop = 10;

  const spotlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
    borderRadius: 12,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
    pointerEvents: 'none',
    zIndex: 9998,
    transition: 'all 0.3s ease-in-out',
  };

  return (
    <>
      <div onClick={e => { e.stopPropagation(); e.preventDefault(); }}
        style={{ position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'auto' }} />
      <div style={spotlightStyle} />
      <div style={{
        position: 'fixed', top: tooltipTop, left: tooltipLeft, width: TOOLTIP_WIDTH,
        background: '#fff', borderRadius: 12, padding: '18px 20px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.25)', zIndex: 10000,
        transition: 'all 0.3s ease-in-out',
      }}>
        <div style={getArrowStyle(arrowSide, rect, tooltipTop, tooltipLeft)} />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3F6E', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
          Step {currentStep + 1} of {steps.length}
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#1A1916' }}>{step.title}</h3>
        <p style={{ fontSize: 13, color: '#6B6860', lineHeight: 1.55, marginBottom: 16 }}>{step.body}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === currentStep ? '#1B3F6E' : i < currentStep ? '#1B3F6E66' : '#E5E3DC',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          {currentStep > 0 && (
            <button onClick={back} style={{ ...ghostSmBtnStyle, flex: 1 }}>← Back</button>
          )}
          <button onClick={next} style={{ ...primarySmBtnStyle, flex: 1 }}>
            {currentStep === steps.length - 1 ? 'Almost done →' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};
const modalStyle: React.CSSProperties = {
  maxWidth: 480, background: '#fff', borderRadius: 14, padding: '36px 32px',
  textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
};
const primaryBtnStyle: React.CSSProperties = {
  padding: '12px 28px', borderRadius: 8, border: 'none', background: '#1B3F6E',
  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
const primarySmBtnStyle: React.CSSProperties = { ...primaryBtnStyle, padding: '7px 14px', fontSize: 13 };
const ghostBtnStyle: React.CSSProperties = {
  padding: '12px 24px', borderRadius: 8, border: '1px solid #E5E3DC',
  background: '#F8F7F4', color: '#1A1916', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
const ghostSmBtnStyle: React.CSSProperties = { ...ghostBtnStyle, padding: '7px 14px', fontSize: 13 };

function getArrowStyle(side: 'top' | 'bottom' | 'left' | 'right', rect: DOMRect, tooltipTop: number, tooltipLeft: number): React.CSSProperties {
  const sz = 12;
  const base: React.CSSProperties = { position: 'absolute', width: 0, height: 0, border: `${sz}px solid transparent` };
  if (side === 'top') return { ...base, top: -sz * 2, left: Math.min(Math.max(rect.left + rect.width / 2 - tooltipLeft - sz, 16), TOOLTIP_WIDTH - 32), borderBottomColor: '#fff', borderTopWidth: 0 };
  if (side === 'bottom') return { ...base, bottom: -sz * 2, left: Math.min(Math.max(rect.left + rect.width / 2 - tooltipLeft - sz, 16), TOOLTIP_WIDTH - 32), borderTopColor: '#fff', borderBottomWidth: 0 };
  if (side === 'left') return { ...base, left: -sz * 2, top: Math.min(Math.max(rect.top + rect.height / 2 - tooltipTop - sz, 16), 200 - 32), borderRightColor: '#fff', borderLeftWidth: 0 };
  return { ...base, right: -sz * 2, top: Math.min(Math.max(rect.top + rect.height / 2 - tooltipTop - sz, 16), 200 - 32), borderLeftColor: '#fff', borderRightWidth: 0 };
}