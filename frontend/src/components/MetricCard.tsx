import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
}) => {
  const variantStyles = {
    default: {
      border: 'border-slate-800',
      iconBg: 'bg-slate-800/80 text-blue-400',
      glow: '',
    },
    danger: {
      border: 'border-red-900/60 bg-red-950/20',
      iconBg: 'bg-red-900/40 text-red-400',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]',
    },
    warning: {
      border: 'border-amber-900/60 bg-amber-950/20',
      iconBg: 'bg-amber-900/40 text-amber-400',
      glow: '',
    },
    success: {
      border: 'border-emerald-900/60 bg-emerald-950/20',
      iconBg: 'bg-emerald-900/40 text-emerald-400',
      glow: '',
    },
    info: {
      border: 'border-blue-900/60 bg-blue-950/20',
      iconBg: 'bg-blue-900/40 text-blue-400',
      glow: '',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-slate-900/90 p-5 shadow-sm transition-all hover:border-slate-700 ${style.border} ${style.glow}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
            {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
          </div>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          {trend && <p className="text-xs font-medium text-amber-400">{trend}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${style.iconBg}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};
