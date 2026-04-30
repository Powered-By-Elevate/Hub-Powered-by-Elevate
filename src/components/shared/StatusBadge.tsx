import { statusBadgeClass, statusLabel } from './utils';

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`badge ${statusBadgeClass(status)}`}>
      <span className="dot-sm" />
      {statusLabel(status)}
    </span>
  );
}
