import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download } from 'lucide-react';
import { TableSkeleton } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no active records matching your criteria.',
  emptyAction,
  selectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  bulkActions,
  onRowClick,
  stickyHeader = true,
  exportFilename = 'grocery-export.csv'
}) => {
  const [internalSortColumn, setInternalSortColumn] = useState(null);
  const [internalSortDir, setInternalSortDir] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (columnKey) => {
    if (internalSortColumn === columnKey) {
      if (internalSortDir === 'asc') {
        setInternalSortDir('desc');
      } else {
        setInternalSortColumn(null);
        setInternalSortDir('asc');
      }
    } else {
      setInternalSortColumn(columnKey);
      setInternalSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!internalSortColumn) return data;
    return [...data].sort((a, b) => {
      const valA = a[internalSortColumn];
      const valB = b[internalSortColumn];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const compare = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      return internalSortDir === 'asc' ? compare : -compare;
    });
  }, [data, internalSortColumn, internalSortDir]);

  const getRowId = (row, index) => {
    if (!row) return index;
    return row.id ?? row.orderNumber ?? row.sku ?? row.code ?? index;
  };

  const allSelected = useMemo(() => {
    if (!selectable || data.length === 0) return false;
    return data.every((row, idx) => selectedRows.includes(getRowId(row, idx)));
  }, [selectable, data, selectedRows]);

  const isIndeterminate = useMemo(() => {
    if (!selectable || data.length === 0 || allSelected) return false;
    return data.some((row, idx) => selectedRows.includes(getRowId(row, idx)));
  }, [selectable, data, selectedRows, allSelected]);

  const handleExportCSV = () => {
    if (data.length === 0) return;
    const exportableCols = columns.filter((c) => c.key && !c.hideInExport);
    const headers = exportableCols.map((c) => `"${c.header}"`).join(',');
    const rows = sortedData.map((row) =>
      exportableCols
        .map((c) => {
          const val = row[c.key];
          return `"${val !== undefined && val !== null ? String(val).replace(/"/g, '""') : ''}"`;
        })
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', exportFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-subtle overflow-hidden">
      {/* Bulk Action Header Banner if any rows selected */}
      {selectable && selectedRows.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 text-xs font-medium text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>
              <strong>{selectedRows.length}</strong> items selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions}
            <button
              onClick={() => onSelectAll && onSelectAll(false)}
              className="text-xs text-emerald-700 hover:text-emerald-800 underline font-semibold ml-2"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container with responsive horizontal scroll */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
            <tr className="bg-slate-50/90 backdrop-blur-sm border-b border-slate-200 text-slate-600 text-xs font-semibold tracking-wider uppercase">
              {selectable && (
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => el && (el.indeterminate = isIndeterminate)}
                    onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                    aria-label="Select all rows"
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSorted = internalSortColumn === col.key;
                return (
                  <th
                    key={col.key || col.header}
                    style={{ width: col.width }}
                    className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.sortable ? 'cursor-pointer select-none hover:bg-slate-100/70 transition-colors' : ''} ${col.className || ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            internalSortDir === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 text-slate-300" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  <TableSkeleton rows={6} columns={columns.length} />
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 px-4"
                >
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyAction?.label}
                    onAction={emptyAction?.onClick}
                    compact
                  />
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => {
                const rowId = getRowId(row, index);
                const isSelected = selectedRows.includes(rowId);
                return (
                  <tr
                    key={rowId}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isSelected ? 'bg-emerald-50/40' : index % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {selectable && (
                      <td
                        className="w-10 px-4 py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectRow && onSelectRow(rowId, e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                          aria-label={`Select row ${index + 1}`}
                        />
                      </td>
                    )}

                    {columns.map((col) => (
                      <td
                        key={col.key || col.header}
                        className={`px-4 py-3.5 ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {col.render ? col.render(row, index) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
