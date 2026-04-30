import { catColor } from './utils';

interface Props { cat: string }

export function CatPill({ cat }: Props) {
  const { bg, color, label } = catColor(cat);
  return (
    <span className="cat-pill" style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: bg, color }}>
      {label}
    </span>
  );
}
