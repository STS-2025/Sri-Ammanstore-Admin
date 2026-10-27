import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, PlusCircle, ShoppingCart, Users, WalletCards } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../utils/permissions';

const MANUAL_SHORTCUTS = [
  {
    label: 'Create Manual Order',
    description: 'Start a new counter sale and print the customer bill.',
    path: '/orders/create-manual-order',
    icon: PlusCircle,
    permissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.POS_VIEW, PERMISSIONS.MANUAL_ACCESS],
    color: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
  },
  {
    label: 'Manual Orders',
    description: 'View and manage orders created manually at the store.',
    path: '/manual-orders',
    icon: ShoppingCart,
    permissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.MANUAL_ACCESS],
    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
  },
  {
    label: 'Balance & Credit Management',
    description: 'Review customer outstanding balances and record credit payments.',
    path: '/manual-balance-credit',
    icon: WalletCards,
    permissions: [PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.MANUAL_ACCESS],
    color: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
  },
  {
    label: 'Manual Customers',
    description: 'Create and manage customer records for in-store billing.',
    path: '/manual-customers',
    icon: Users,
    permissions: [PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.MANUAL_ACCESS],
    color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
  }
];

export const ManualLandingPage = () => {
  const { canAny } = usePermissions();
  const visibleShortcuts = MANUAL_SHORTCUTS.filter((shortcut) => canAny(shortcut.permissions));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manual Retail Operations"
        subtitle="Quick access to manual billing, in-store orders, and customer management."
        breadcrumbs={[{ label: 'Manual' }]}
      />

      <section className="p-4 bg-white border rounded-2xl border-slate-200 shadow-subtle">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-700" />
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-600">
              Fast Operational Shortcuts
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Manual POS workspace</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visibleShortcuts.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Link
                key={shortcut.path}
                to={shortcut.path}
                className={`group flex min-h-32 flex-col items-center justify-center rounded-xl border p-4 text-center transition-all duration-150 ${shortcut.color}`}
              >
                <Icon className="w-6 h-6 mb-2 transition-transform group-hover:scale-110" />
                <span className="text-sm font-bold leading-tight">{shortcut.label}</span>
                <span className="mt-1.5 max-w-xs text-[11px] leading-relaxed opacity-75">{shortcut.description}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};
