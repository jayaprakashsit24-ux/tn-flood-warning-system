import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  size = 'md',
  showIcon = true,
}) => {
  const normLevel = (level || 'Low').toLowerCase();

  let bgClass = 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60';
  let Icon = CheckCircle;
  let label = 'Low Risk';

  if (normLevel === 'critical') {
    bgClass = 'bg-red-950/90 text-red-400 border-red-700/80 animate-pulse';
    Icon = ShieldAlert;
    label = 'Critical';
  } else if (normLevel === 'high') {
    bgClass = 'bg-amber-950/80 text-amber-400 border-amber-600/70';
    Icon = AlertTriangle;
    label = 'High Risk';
  } else if (normLevel === 'moderate') {
    bgClass = 'bg-yellow-950/70 text-yellow-300 border-yellow-600/60';
    Icon = AlertCircle;
    label = 'Moderate';
  } else {
    bgClass = 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60';
    Icon = CheckCircle;
    label = 'Low Risk';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 space-x-1',
    md: 'text-xs px-2.5 py-1 space-x-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 space-x-2 font-semibold',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${bgClass} ${sizeClasses[size]}`}
      title={`Flood Risk Classification: ${label}`}
    >
      {showIcon && <Icon size={iconSizes[size]} className="shrink-0" />}
      <span>{label}</span>
    </span>
  );
};
