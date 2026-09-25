import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  change,
  changeType = 'positive', // 'positive' | 'negative' | 'neutral'
  period = 'vs yesterday',
  icon: Icon,
  variant = 'default', // 'default' | 'primary' | 'warning' | 'danger' | 'info'
  subtext,
  onClick
}) => {
  const variantStyles = {
    default: {
      cardBg: 'bg-white border-slate-200 hover:border-slate-300',
      iconBg: 'bg-slate-100 text-slate-700',
      valueColor: 'text-slate-900'
    },
    primary: {
      cardBg: 'bg-gradient-to-br from-white to-emerald-50/50 border-emerald-200 hover:border-emerald-300',
      iconBg: 'bg-emerald-100 text-emerald-800',
      valueColor: 'text-emerald-950'
    },
    warning: {
      cardBg: 'bg-gradient-to-br from-white to-amber-50/50 border-amber-200 hover:border-amber-300',
      iconBg: 'bg-amber-100 text-amber-800',
      valueColor: 'text-amber-950'
    },
    danger: {
      cardBg: 'bg-gradient-to-br from-white to-rose-50/50 border-rose-200 hover:border-rose-300',
      iconBg: 'bg-rose-100 text-rose-800',
      valueColor: 'text-rose-950'
    },
    info: {
      cardBg: 'bg-gradient-to-br from-white to-blue-50/50 border-blue-200 hover:border-blue-300',
      iconBg: 'bg-blue-100 text-blue-800',
      valueColor: 'text-blue-950'
    }
  }[variant] || variantStyles.default;

  const trendIcon = {
    positive: <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
    negative: <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
    neutral: <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
  }[changeType];

  const trendTextColor = {
    positive: 'text-emerald-700 font-semibold',
    negative: 'text-rose-700 font-semibold',
    neutral: 'text-slate-600 font-medium'
  }[changeType];

  return (
    <div
      onClick={onClick}
      className={`p-3.5 rounded-2xl border shadow-subtle hover:shadow-card transition-all duration-200 flex flex-col justify-between ${variantStyles.cardBg} ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate mb-0.5" title={title}>
            {title}
          </p>
          <h3 className={`text-lg sm:text-xl font-extrabold tracking-tight font-sans truncate ${variantStyles.valueColor}`} title={String(value)}>
            {value}
          </h3>
        </div>
        {Icon && (
          <div className={`p-2 rounded-xl shrink-0 ${variantStyles.iconBg}`}>
            <Icon className="w-4.5 h-4.5 text-current" />
          </div>
        )}
      </div>

      {(change !== undefined || subtext) && (
        <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs">
          {change !== undefined ? (
            <div className="flex items-center gap-1.5 truncate">
              {trendIcon}
              <span className={`truncate text-[11px] ${trendTextColor}`}>{change}</span>
              {period && <span className="text-slate-400 text-[10px] hidden sm:inline truncate">{period}</span>}
            </div>
          ) : (
            <span className="text-slate-500 text-[11px] truncate" title={subtext}>{subtext}</span>
          )}
        </div>
      )}
    </div>
  );
};
