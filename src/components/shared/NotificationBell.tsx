import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, CheckCircle2, Calendar, FileText, ClipboardCheck, X } from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link_type: string | null;
  link_id: string | null;
  read_at: string | null;
  created_at: string;
}

interface Props {
  userId: string;
  onNavigate?: (linkType: string, linkId: string) => void;
}

function fmtRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function iconFor(type: string) {
  if (type === 'checkin_scheduled') return Calendar;
  if (type === 'review_scheduled') return ClipboardCheck;
  if (type === 'document_uploaded') return FileText;
  if (type === 'task_assigned') return CheckCircle2;
  return Bell;
}

function colorFor(type: string): string {
  if (type === 'checkin_scheduled') return '#1B3F6E';
  if (type === 'review_scheduled') return '#7C3AED';
  if (type === 'document_uploaded') return '#D97706';
  if (type === 'task_assigned') return '#2D9A60';
  return '#6B6860';
}

export function NotificationBell({ userId, onNavigate }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
  }, [userId]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription — new notifications appear instantly
  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel('notifications-rt')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 20));
      })
      .subscribe();
    channelRef.current = ch;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  async function markAllAsRead() {
    const ids = notifications.filter(n => !n.read_at).map(n => n.id);
    if (ids.length === 0) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  function handleClick(n: Notification) {
    if (!n.read_at) markAsRead(n.id);
    if (n.link_type && n.link_id && onNavigate) {
      onNavigate(n.link_type, n.link_id);
      setOpen(false);
    }
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        style={{
          width: 36, height: 36, borderRadius: 8, border: '1px solid #E5E3DC',
          background: open ? '#E8EFF8' : '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}
      >
        <Bell size={16} color={open ? '#1B3F6E' : '#6B6860'} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 8, background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff',
          }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 42, right: 0, width: 360, maxHeight: 480,
          background: '#fff', borderRadius: 10, border: '1px solid #E5E3DC',
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '12px 14px', borderBottom: '1px solid #F2F1ED',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1916' }}>Notifications</div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{ fontSize: 11, color: '#1B3F6E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >Mark all read</button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 14px', textAlign: 'center' }}>
                <Bell size={32} style={{ color: '#C5C3BB', margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontSize: 13, color: '#9B9890' }}>No notifications yet</div>
                <div style={{ fontSize: 11, color: '#C5C3BB', marginTop: 4 }}>You'll see updates here when things happen</div>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = iconFor(n.type);
                const iconColor = colorFor(n.type);
                const isUnread = !n.read_at;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      padding: '10px 14px', display: 'flex', gap: 10, cursor: 'pointer',
                      background: isUnread ? '#F0F9FF' : '#fff',
                      borderBottom: '1px solid #F2F1ED', alignItems: 'flex-start',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isUnread ? '#E0F2FE' : '#F8F7F4'}
                    onMouseLeave={e => e.currentTarget.style.background = isUnread ? '#F0F9FF' : '#fff'}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, background: iconColor + '15', color: iconColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isUnread ? 700 : 500, color: '#1A1916' }}>{n.title}</div>
                      {n.message && (
                        <div style={{ fontSize: 12, color: '#6B6860', marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                      )}
                      <div style={{ fontSize: 10, color: '#9B9890', marginTop: 4 }}>{fmtRelative(n.created_at)}</div>
                    </div>
                    {isUnread && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1B3F6E', flexShrink: 0, marginTop: 6 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div style={{
              padding: '8px 14px', borderTop: '1px solid #F2F1ED',
              fontSize: 11, color: '#9B9890', textAlign: 'center',
            }}>
              Showing {notifications.length} most recent
            </div>
          )}
        </div>
      )}
    </div>
  );
}