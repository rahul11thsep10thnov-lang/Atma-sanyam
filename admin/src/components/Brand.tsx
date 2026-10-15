import { Shield } from 'lucide-react';

export function Brand({ subtitle = 'Admin console' }: { subtitle?: string }) {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden>
        <Shield size={17} />
      </span>
      <div>
        Police<b>Chayan</b>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}
