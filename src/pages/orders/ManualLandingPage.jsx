import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ClipboardList,
  Clock3,
  Monitor,
  PlusCircle,
  Power,
  RefreshCw,
  ShoppingCart,
  Smartphone,
  Users,
  WalletCards
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { disconnectScannerSession, listenToConnectedScannerSessions } from '../../firebase/scannerService';
import { formatDateTime } from '../../utils/formatters';
import { PERMISSIONS } from '../../utils/permissions';
import { ROLES } from '../../utils/roles';

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
  const { authenticatedRole, userRole } = useAuth();
  const visibleShortcuts = MANUAL_SHORTCUTS.filter((shortcut) => canAny(shortcut.permissions));
  const isMainUser = authenticatedRole === ROLES.SUPER_ADMIN && userRole === ROLES.SUPER_ADMIN;
  const [connectedSessions, setConnectedSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(null);
  const [subscriptionAttempt, setSubscriptionAttempt] = useState(0);
  const [disconnectingSessionId, setDisconnectingSessionId] = useState(null);
  const [disconnectError, setDisconnectError] = useState(null);

  useEffect(() => {
    let active = true;
    setSessionsLoading(true);
    setSessionsError(null);

    const unsubscribe = listenToConnectedScannerSessions(
      (sessions) => {
        if (!active) return;
        const currentSessions = sessions.filter((session) => {
          if (!session.expiresAt) return true;
          const expiresAt = session.expiresAt?.toDate
            ? session.expiresAt.toDate()
            : new Date(session.expiresAt);
          return Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() >= Date.now();
        });
        setConnectedSessions(currentSessions);
        setSessionsLoading(false);
        setSessionsError(null);
      },
      (error) => {
        if (!active) return;
        setSessionsError(error);
        setSessionsLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [subscriptionAttempt]);

  const sortedSessions = [...connectedSessions].sort((left, right) => {
    const getConnectedTime = (session) => {
      const value = session.connectedAt || session.lastActivityAt;
      if (!value) return 0;
      const date = value?.toDate ? value.toDate() : new Date(value);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };
    return getConnectedTime(right) - getConnectedTime(left);
  });

  const handleDisconnect = async (session) => {
    if (!isMainUser || !session?.sessionId || disconnectingSessionId) return;

    const deviceName = session.connectedDeviceName || 'this scanner';
    if (!window.confirm(`Disconnect ${deviceName} from ${session.counterId || 'this counter'}?`)) return;

    setDisconnectingSessionId(session.sessionId);
    setDisconnectError(null);
    try {
      await disconnectScannerSession(session.sessionId);
    } catch (error) {
      setDisconnectError(error.message || `Could not disconnect ${deviceName}. Please try again.`);
    } finally {
      setDisconnectingSessionId(null);
    }
  };

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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-subtle">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-slate-900">Linked Devices</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                  <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${sessionsLoading ? 'animate-pulse' : ''}`} />
                  Live sessions
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Cashier counters with a currently connected mobile barcode scanner.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-xs font-medium text-slate-500">
              {sessionsLoading ? 'Syncing…' : `${sortedSessions.length} connected`}
            </span>
            <button
              type="button"
              onClick={() => setSubscriptionAttempt((attempt) => attempt + 1)}
              disabled={sessionsLoading}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh linked devices"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${sessionsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {sessionsError && (
          <div className="flex flex-col gap-3 border-b border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-2.5 text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-bold">Unable to load linked devices</p>
                <p className="mt-0.5 text-xs text-rose-700">
                  {sessionsError.message || 'The live scanner session could not be reached. Please try again.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubscriptionAttempt((attempt) => attempt + 1)}
              className="self-start rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 sm:self-center"
            >
              Try again
            </button>
          </div>
        )}

        {disconnectError && (
          <div className="flex items-start gap-2.5 border-b border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 sm:px-5" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-xs font-bold">Could not disconnect scanner</p>
              <p className="mt-0.5 text-xs text-rose-700">{disconnectError}</p>
            </div>
          </div>
        )}

        {sessionsLoading ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 px-5 py-8 text-center" role="status">
            <RefreshCw className="h-5 w-5 animate-spin text-emerald-700" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Checking scanner connections</p>
              <p className="mt-1 text-xs text-slate-500">The latest cashier and device sessions will appear here.</p>
            </div>
          </div>
        ) : sortedSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-5 py-3">Cashier / User</th>
                  <th scope="col" className="px-5 py-3">Connected device</th>
                  <th scope="col" className="px-5 py-3">Counter</th>
                  <th scope="col" className="px-5 py-3">Connected since</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  {isMainUser && <th scope="col" className="px-5 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedSessions.map((session) => (
                  <tr key={session.id || session.sessionId} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-800">
                        {session.billingUserName || 'Cashier'}
                      </p>
                      <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-slate-500">
                        {session.billingUserId || session.billingUserEmail || 'User identity unavailable'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Monitor className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {session.connectedDeviceName || 'Mobile Scanner'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600">
                            Model: {session.connectedDeviceModel || 'Model unavailable'}
                          </p>
                          <p className="mt-0.5 max-w-[180px] truncate font-mono text-[10px] text-slate-500">
                            {session.connectedDeviceId || 'Device ID unavailable'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700">
                      {session.counterId || 'Counter not specified'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {formatDateTime(session.connectedAt || session.lastActivityAt)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                    </td>
                    {isMainUser && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDisconnect(session)}
                          disabled={Boolean(disconnectingSessionId)}
                          aria-label={`Disconnect ${session.connectedDeviceName || 'scanner'} from ${session.counterId || 'counter'}`}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Power className={`h-3.5 w-3.5 ${disconnectingSessionId === session.sessionId ? 'animate-pulse' : ''}`} />
                          {disconnectingSessionId === session.sessionId ? 'Disconnecting…' : 'Disconnect'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !sessionsError ? (
          <div className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Smartphone className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">No scanners connected</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              Connected cashier devices will show here as soon as a mobile scanner is paired.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
};
