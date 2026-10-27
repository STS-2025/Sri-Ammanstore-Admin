import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, MapPin, RefreshCw, Search, WalletCards } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/table/DataTable';
import { CustomerLedgerModal } from '../../components/pos/CustomerLedgerModal';
import { getAllCustomers } from '../../firebase/customerService';
import { formatCurrency } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';

export const BalanceCreditManagementPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const notify = useNotification();

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const customerList = await getAllCustomers();
      setCustomers(customerList);
    } catch (error) {
      notify.error('Could not load customer balances', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const totalOutstanding = customers.reduce(
    (total, customer) => total + Math.max(0, Number(customer.currentBalance ?? customer.outstandingBalance ?? 0)),
    0
  );
  const totalAdvancedPayment = customers.reduce(
    (total, customer) => total + Math.max(0, Number(customer.advanceBalance || 0)),
    0
  );

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return customers.filter((customer) => {
      const balance = Number(customer.currentBalance ?? customer.outstandingBalance ?? 0);
      const advanceBalance = Number(customer.advanceBalance || 0);
      if (customerFilter === 'OUTSTANDING' && balance <= 0) return false;
      if (customerFilter === 'ADVANCED' && advanceBalance <= 0) return false;
      if (!query) return true;
      return [
        customer.name,
        customer.customerId,
        customer.id,
        customer.mobile,
        customer.phone,
        customer.address?.area,
        customer.area
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [customers, customerFilter, searchTerm]);

  const handleBalanceUpdated = (updatedCustomer) => {
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) =>
        customer.id === updatedCustomer.id || customer.customerId === updatedCustomer.customerId
          ? { ...customer, ...updatedCustomer }
          : customer
      )
    );
    setSelectedCustomer(updatedCustomer);
  };

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      className: '!px-2 !py-2',
      render: (customer) => (
        <button type="button" onClick={() => setSelectedCustomer(customer)} className="text-left">
          <div className="font-bold text-emerald-800 hover:text-emerald-600 hover:underline">{customer.name || 'Unnamed Customer'}</div>
          <div className="mt-0.5 text-[10px] font-mono text-slate-500">
            {customer.customerId || customer.id} · {customer.mobile || customer.phone || 'No mobile'}
          </div>
          <div
            className="mt-0.5 inline-flex max-w-40 items-center gap-1 truncate text-[10px] text-slate-500"
            title={customer.address?.area || customer.area || 'Area Not Set'}
          >
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{customer.address?.area || customer.area || 'Area Not Set'}</span>
          </div>
        </button>
      )
    },
    {
      key: 'currentBalance',
      header: 'Outstanding',
      sortable: true,
      className: '!px-2 !py-2',
      render: (customer) => {
        const balance = Number(customer.currentBalance ?? customer.outstandingBalance ?? 0);
        return (
          <span className={`font-mono font-bold ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {formatCurrency(balance)}
          </span>
        );
      }
    },
    {
      key: 'advanceBalance',
      header: 'Advance',
      sortable: true,
      className: '!px-2 !py-2',
      render: (customer) => (
        <span className="font-mono font-bold text-emerald-700">
          {formatCurrency(Number(customer.advanceBalance || 0))}
        </span>
      )
    },
    {
      key: 'creditLimit',
      header: 'Credit Limit',
      sortable: true,
      className: 'hidden md:table-cell !px-2 !py-2',
      render: (customer) => formatCurrency(Number(customer.creditLimit || 5000))
    },
    {
      key: 'availableCredit',
      header: 'Available Credit',
      className: 'hidden md:table-cell !px-2 !py-2',
      render: (customer) => {
        const balance = Number(customer.currentBalance ?? customer.outstandingBalance ?? 0);
        return formatCurrency(Math.max(0, Number(customer.creditLimit || 5000) - balance));
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      hideInExport: true,
      className: '!px-2 !py-2',
      render: (customer) => (
        <button
          type="button"
          onClick={() => setSelectedCustomer(customer)}
          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
        >
          Receive Payment
        </button>
      )
    }
  ];

  return (
    <div className="space-y-4 overflow-x-hidden">
      <PageHeader
        title="Balance & Credit Management"
        subtitle="Review customer credit balances, available limits, and record received payments."
        breadcrumbs={[
          { label: 'Manual', href: '/manual' },
          { label: 'Balance & Credit Management' }
        ]}
        actions={
          <button
            type="button"
            onClick={loadCustomers}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white border rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between p-4 border rounded-2xl border-amber-200 bg-amber-50">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Total Outstanding</p>
            <p className="mt-1 text-xl font-black text-amber-950">{formatCurrency(totalOutstanding)}</p>
          </div>
          <CircleDollarSign className="w-8 h-8 text-amber-700" />
        </div>
        <div className="flex items-center justify-between p-4 border rounded-2xl border-emerald-200 bg-emerald-50">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Total Advanced Payment</p>
            <p className="mt-1 text-xl font-black text-emerald-950">{formatCurrency(totalAdvancedPayment)}</p>
          </div>
          <WalletCards className="w-8 h-8 text-emerald-700" />
        </div>
      </div>

      <section className="p-3 space-y-3 bg-white border rounded-2xl border-slate-200 shadow-subtle">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Customer Credit Accounts</h2>
            <p className="mt-1 text-[11px] text-slate-500">Open a customer ledger to review transactions or record a payment.</p>
          </div>
          <select
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border rounded-xl border-slate-300 text-slate-700 focus:ring-2 focus:ring-emerald-500"
            aria-label="Filter customers by balance"
          >
            <option value="ALL">All Customer</option>
            <option value="OUTSTANDING">Outstanding Only</option>
            <option value="ADVANCED">Advanced Only</option>
          </select>
        </div>

        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search customer name, ID, or phone..."
            className="w-full py-2 pr-3 text-xs font-semibold border rounded-xl border-slate-300 bg-slate-50 pl-9 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredCustomers}
          loading={loading}
          emptyTitle={customerFilter === 'OUTSTANDING' ? 'No outstanding customer balances' : customerFilter === 'ADVANCED' ? 'No customers with advance payments' : 'No customers found'}
          emptyDescription={customerFilter === 'OUTSTANDING'
            ? 'Customers with an unpaid credit balance will appear here.'
            : customerFilter === 'ADVANCED'
              ? 'Customers with an advance payment will appear here.'
              : 'Try another search or refresh the customer list.'}
          exportFilename="customer-balance-credit.csv"
        />
      </section>

      <CustomerLedgerModal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
        onBalanceUpdated={handleBalanceUpdated}
      />
    </div>
  );
};
