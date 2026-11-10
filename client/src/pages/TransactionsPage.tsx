import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Transaction } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Plus, Search, Filter, ArrowRight, Eye, RefreshCw } from 'lucide-react';

import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register AG Grid Community modules if available or standard
try {
  ModuleRegistry.registerModules([AllCommunityModule]);
} catch (e) {
  // If modules already registered or using bundled distribution
}

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getTransactions({ status: statusFilter, search });
      setTransactions(data || []);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // AG Grid Column Definitions
  const colDefs = useMemo<ColDef<Transaction>[]>(() => [
    {
      field: 'customer_name',
      headerName: 'Customer',
      flex: 1.5,
      minWidth: 180,
      filter: 'agTextColumnFilter',
      sortable: true,
      cellRenderer: (params: any) => (
        <div className="py-1">
          <p className="font-semibold text-xs text-slate-900 leading-tight truncate">{params.data?.customer_name || 'N/A'}</p>
          <p className="text-[11px] text-slate-500 truncate">{params.data?.customer_email}</p>
        </div>
      ),
    },
    {
      field: 'title',
      headerName: 'Project',
      flex: 2,
      minWidth: 200,
      filter: 'agTextColumnFilter',
      sortable: true,
      cellRenderer: (params: any) => (
        <div className="py-1 cursor-pointer" onClick={() => params.data && navigate(`/transactions/${params.data.id}`)}>
          <p className="font-semibold text-xs text-blue-600 hover:underline leading-tight truncate">{params.data?.title}</p>
          <span className="font-mono text-[10px] text-slate-400">{params.data?.transaction_code}</span>
        </div>
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 130,
      filter: 'agNumberColumnFilter',
      sortable: true,
      cellRenderer: (params: any) => (
        <span className="font-tabular font-bold text-xs text-slate-900">
          ${params.data?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} {params.data?.currency}
        </span>
      ),
    },
    {
      headerName: 'Payment Status',
      width: 140,
      filter: 'agTextColumnFilter',
      sortable: true,
      valueGetter: (params: any) => {
        const tx = params.data;
        if (!tx) return 'UNPAID';
        if (tx.payments && tx.payments.some((p: any) => p.payment_status === 'CAPTURED')) return 'CAPTURED';
        if (tx.status === 'PAID' || tx.status === 'DELIVERED' || tx.status === 'COMPLETED') return 'PAID';
        return 'UNPAID';
      },
      cellRenderer: (params: any) => {
        const val = params.value;
        const isCaptured = val === 'CAPTURED' || val === 'PAID';
        return (
          <span className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
            isCaptured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isCaptured ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {isCaptured ? 'PayPal Captured' : 'Unpaid'}
          </span>
        );
      },
    },
    {
      headerName: 'Agreement Status',
      width: 150,
      filter: 'agTextColumnFilter',
      sortable: true,
      valueGetter: (params: any) => {
        const tx = params.data;
        if (!tx) return 'NONE';
        const ag = tx.agreements && tx.agreements.length > 0 ? tx.agreements[0] : null;
        return ag?.status || tx.status;
      },
      cellRenderer: (params: any) => {
        const status = params.value;
        const isApproved = status === 'APPROVED';
        return (
          <span className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
            isApproved ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-blue-500' : 'bg-amber-500'}`} />
            {isApproved ? 'Approved by Buyer' : 'Pending Approval'}
          </span>
        );
      },
    },
    {
      field: 'health_score',
      headerName: 'Health Score',
      width: 160,
      filter: 'agNumberColumnFilter',
      sortable: true,
      cellRenderer: (params: any) => {
        const score = params.data?.health_score ?? (params.data?.status === 'PAID' ? 88 : 45);
        const level = score >= 80 ? 'LOW' : score >= 50 ? 'MEDIUM' : 'HIGH';
        const badgeColor =
          level === 'LOW'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : level === 'MEDIUM'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-red-50 text-red-700 border-red-200';
        const dotColor =
          level === 'LOW' ? 'bg-emerald-500' : level === 'MEDIUM' ? 'bg-amber-500' : 'bg-red-500';

        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              <span>{score}/100 • {level === 'LOW' ? 'Dispute-Ready' : level === 'MEDIUM' ? 'At Risk' : 'High Risk'}</span>
            </span>
          </div>
        );
      },
    },
    {
      field: 'updated_at',
      headerName: 'Last Activity',
      width: 140,
      filter: 'agDateColumnFilter',
      sortable: true,
      valueFormatter: (params: any) => new Date(params.value || params.data?.created_at).toLocaleDateString(),
    },
    {
      headerName: 'Actions',
      width: 90,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => (
        <button
          onClick={() => navigate(`/transactions/${params.data?.id}`)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 p-1"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Open</span>
        </button>
      ),
    },
  ], [navigate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transactions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse, filter, and audit all promise-to-proof records with AG Grid Community.
          </p>
        </div>
        <button
          onClick={() => navigate('/transactions/new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Transaction</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, title, customer name, email..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="AGREEMENT_PENDING">Agreement Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="DELIVERED">Delivered</option>
            <option value="DISPUTED">Disputed</option>
          </select>
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {transactions.length > 0 ? (
          <div className="ag-theme-alpine w-full h-[520px]">
            <AgGridReact
              rowData={transactions}
              columnDefs={colDefs}
              pagination={true}
              paginationPageSize={10}
              rowHeight={56}
              headerHeight={44}
              animateRows={true}
            />
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No transactions match your criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your filters or create a new transaction.</p>
          </div>
        )}
      </div>
    </div>
  );
};

