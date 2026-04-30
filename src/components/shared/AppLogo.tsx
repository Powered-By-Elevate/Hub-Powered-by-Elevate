interface Props {
  /** 'dark' = on navy sidebar (wrap in white pill). 'light' = on white login card (plain). */
  variant?: 'dark' | 'light';
}

export function AppLogo({ variant = 'dark' }: Props) {
  if (variant === 'light') {
    return (
      <img
        src="/GetImage.png"
        alt="Hub powered by Elevate"
        style={{ height: 84, width: 'auto', display: 'block' }}
      />
    );
  }

  // On the dark navy sidebar: wrap in a white rounded pill so the logo reads cleanly
  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      padding: '6px 10px',
      display: 'inline-flex',
      alignItems: 'center',
    }}>
      <img
        src="/GetImage.png"
        alt="Hub powered by Elevate"
        style={{ height: 56, width: 'auto', display: 'block' }}
      />
    </div>
  );
}
