import { useEffect } from 'react';
import { ActivityLog } from '../../lib/database.types';

const DOT_COLORS = ['#2D9A60', '#17A39A', '#E8A93A', '#2563EB', '#DC2626'];

interface Props {
  items: ActivityLog[];
}

/**
 * Footer activity crawler ("Live · Activity"). Fed by the HR app's real
 * activity_log feed (which already live-updates via realtime). Pauses on
 * hover. Desktop HR app only — mobile keeps its bottom nav.
 */
export function ActivityTicker({ items }: Props) {
  useEffect(() => {
    document.body.classList.add('fx-has-ticker');
    return () => document.body.classList.remove('fx-has-ticker');
  }, []);

  const recent = items.slice(0, 12);
  if (recent.length === 0) return null;

  const renderItems = (keyPrefix: string) =>
    recent.map((a, i) => (
      <span key={`${keyPrefix}-${a.id}`} className="fx-ticker-item">
        <span className="fx-tdot" style={{ background: DOT_COLORS[i % DOT_COLORS.length] }} />
        {a.employee?.name && <b>{a.employee.name}</b>}
        <span>{a.action}</span>
      </span>
    ));

  return (
    <div id="fx-ticker" aria-hidden="true">
      <div className="fx-ticker-tag">Live · Activity</div>
      {/* Track content is doubled for a seamless marquee loop. */}
      <div className="fx-ticker-track">
        {renderItems('a')}
        {renderItems('b')}
      </div>
    </div>
  );
}
