import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserMsPhotoUrlByEmail } from '../../lib/graph';
import { ini } from './utils';

interface Props {
  /** Identifier for Graph photo lookup. Falls back to initials if blank. */
  email: string | null | undefined;
  /** Used to compute initials fallback and for the alt attribute. */
  name: string;
  /** Pixel size of the avatar. Defaults to 32. */
  size?: number;
  /** Optional className applied to the initials fallback only. */
  className?: string;
  /** Inline style passed to the wrapping element. */
  style?: React.CSSProperties;
}

/**
 * Avatar that prefers a fetched Microsoft 365 profile photo and falls back to
 * employee initials. The photo is fetched lazily on mount, cached at the
 * module level (via lib/graph.ts), and reused across renders so a busy list
 * doesn't re-fetch on every scroll / navigation.
 */
export function EmployeeAvatar({ email, name, size = 32, className, style }: Props) {
  const { session } = useAuth();
  const token = session?.provider_token ?? null;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !email) return;
    let cancelled = false;
    getUserMsPhotoUrlByEmail(token, email).then(url => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => { cancelled = true; };
  }, [token, email]);

  const initials = ini(name) || '?';
  const baseStyle: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    ...style,
  };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ ...baseStyle, objectFit: 'cover' }}
      />
    );
  }

  return (
    <div className={`avatar ${className ?? ''}`} style={{ ...baseStyle, fontSize: size <= 24 ? 10 : 12, fontWeight: 600 }}>
      {initials}
    </div>
  );
}
