import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface ServiceProfileBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export const ServiceProfileBadge: React.FC<ServiceProfileBadgeProps> = ({
  size = 'sm',
  className = '',
}) => {
  const sizeClasses =
    size === 'md'
      ? 'text-[11px] px-2 py-0.5 gap-1'
      : 'text-[9.5px] px-1.5 py-0.5 gap-0.5';

  return (
    <span
      className={`inline-flex items-center shrink-0 font-bold uppercase tracking-wide rounded-[2px] bg-[#eef3f8] text-[#2a5885] border border-[#c5d4e8] ${sizeClasses} ${className}`}
      title="Официальный служебный аккаунт платформы"
    >
      <ShieldCheck size={size === 'md' ? 12 : 10} className="shrink-0" />
      <span>Служебный</span>
    </span>
  );
};
