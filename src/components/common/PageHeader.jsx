import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  badge
}) => {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.label || idx}>
                  {crumb.href && !isLast ? (
                    <Link
                      to={crumb.href}
                      className="hover:text-emerald-700 transition-colors font-medium"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-slate-700 font-semibold' : ''}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="w-3 h-3 text-slate-300" />}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            {title}
          </h1>
          {badge && <div>{badge}</div>}
        </div>

        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
