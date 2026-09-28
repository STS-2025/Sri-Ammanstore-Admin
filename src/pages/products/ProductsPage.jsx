import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Copy,
  Edit,
  Trash2,
  DollarSign,
  Star,
  Flame,
  Sparkles,
  Tag,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/table/DataTable';
import { StockBadge } from '../../components/common/StockBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ProductFormModal } from '../../components/products/ProductFormModal';
import { ProductPriceChangeDialog } from '../../components/products/ProductPriceChangeDialog';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { PERMISSIONS } from '../../utils/permissions';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
  updateVariantPrice
} from '../../firebase/productService';
import { INITIAL_CATEGORIES } from '../../data/grocerySeedData';
import { formatCurrency, formatWeight } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

export const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusTab, setStatusTab] = useState('ALL'); // 'ALL' | 'active' | 'low_stock' | 'out_of_stock' | 'featured'

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [priceChangeOpen, setPriceChangeOpen] = useState(false);
  const [priceChangeTarget, setPriceChangeTarget] = useState({ product: null, variant: null });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const notify = useNotification();
  const { currentUser, userRole } = usePermissions();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (err) {
      notify.error('Failed to load products', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== 'ALL' && p.categoryId !== categoryFilter) return false;

    // Status Tab logic
    if (statusTab === 'active' && p.status !== 'active') return false;
    if (statusTab === 'featured' && !p.isFeatured) return false;
    if (statusTab === 'low_stock') {
      const isLow = (p.variants || []).some((v) => v.stock > 0 && v.stock <= (v.safetyStock || 15));
      if (!isLow) return false;
    }
    if (statusTab === 'out_of_stock') {
      const isOut = (p.variants || []).every((v) => v.stock <= 0);
      if (!isOut) return false;
    }

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchesName = p.name?.toLowerCase().includes(q);
    const matchesTamil = p.tamilName?.toLowerCase().includes(q);
    const matchesCategory = p.categoryName?.toLowerCase().includes(q);
    const matchesVariant = (p.variants || []).some(
      (v) => v.sku?.toLowerCase().includes(q) || v.barcode?.includes(q)
    );

    return matchesName || matchesTamil || matchesCategory || matchesVariant;
  });

  // Action handlers
  const handleSaveProduct = async (formData) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData, currentUser);
        notify.success('Product Updated', `${formData.name} specifications updated.`);
      } else {
        await createProduct(formData, currentUser);
        notify.success('Product Created', `${formData.name} added to grocery catalog.`);
      }
      setFormModalOpen(false);
      setEditingProduct(null);
      await loadData();
    } catch (err) {
      notify.error('Action Failed', err.message);
    }
  };

  const handleDuplicate = async (product) => {
    try {
      const cloned = await duplicateProduct(product.id, currentUser);
      notify.success('Product Cloned', `Created draft copy: ${cloned.name}`);
      await loadData();
    } catch (err) {
      notify.error('Duplicate Failed', err.message);
    }
  };

  const handleDeleteConfirm = async ({ reason }) => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id, reason, currentUser);
      notify.success('Product Deleted', `${productToDelete.name} removed from catalog.`);
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
      await loadData();
    } catch (err) {
      notify.error('Delete Failed', err.message);
    }
  };

  const handlePriceChangeConfirm = async (priceData) => {
    try {
      await updateVariantPrice(
        priceData.productId,
        priceData.variantId,
        {
          newSellingPrice: priceData.newSellingPrice,
          newMrp: priceData.newMrp,
          reason: priceData.reason
        },
        currentUser
      );
      notify.success('Price Updated', 'Revised price saved and recorded to audit trail.');
      setPriceChangeOpen(false);
      await loadData();
    } catch (err) {
      notify.error('Price Update Failed', err.message);
    }
  };

  const handleToggleBadge = async (product, badgeKey) => {
    try {
      const updatedValue = !product[badgeKey];
      await updateProduct(product.id, { [badgeKey]: updatedValue }, currentUser);
      notify.info('Badge Updated', `${badgeKey} set to ${updatedValue ? 'ON' : 'OFF'}`);
      await loadData();
    } catch (err) {
      notify.error('Update Failed', err.message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Grocery Item',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
            {row.imageUrl ? (
              <img src={row.imageUrl} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 line-clamp-1">{row.name}</div>
            {row.tamilName && (
              <div className="text-[11px] text-slate-500 font-sans line-clamp-1">
                {row.tamilName}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold mt-0.5">
              <span>{row.categoryName}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-normal">{row.brandName}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'variants',
      header: 'Pack Sizes & Stock',
      render: (row) => {
        const variants = row.variants || [];
        const totalStock = variants.reduce((acc, v) => acc + Number(v.stock || 0), 0);
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1">
              {variants.map((v) => (
                <span
                  key={v.id}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {v.name} ({v.stock})
                </span>
              ))}
            </div>
            <StockBadge quantity={totalStock} safetyStock={20} showCount={true} />
          </div>
        );
      }
    },
    {
      key: 'pricing',
      header: 'Price / MRP',
      align: 'right',
      render: (row) => {
        const primary = row.variants?.[0] || {};
        return (
          <div className="text-right">
            <div className="font-bold font-sans text-slate-900 text-xs">
              {formatCurrency(primary.sellingPrice || 0)}
            </div>
            {primary.mrp > primary.sellingPrice && (
              <div className="text-[10px] text-slate-400 line-through font-sans">
                {formatCurrency(primary.mrp || 0)}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'merchandising',
      header: 'Merchandising Tags',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleToggleBadge(row, 'isFeatured')}
            className={`p-1 rounded transition-colors ${
              row.isFeatured ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-slate-500'
            }`}
            title="Toggle Featured"
          >
            <Star className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            onClick={() => handleToggleBadge(row, 'isBestSeller')}
            className={`p-1 rounded transition-colors ${
              row.isBestSeller ? 'text-rose-500 bg-rose-50' : 'text-slate-300 hover:text-slate-500'
            }`}
            title="Toggle Best Seller"
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            onClick={() => handleToggleBadge(row, 'isOffer')}
            className={`p-1 rounded transition-colors ${
              row.isOffer ? 'text-emerald-600 bg-emerald-50' : 'text-slate-300 hover:text-slate-500'
            }`}
            title="Toggle Offer"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status || 'active'} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <PermissionGuard permission={PERMISSIONS.PRODUCTS_EDIT}>
            <button
              onClick={() => {
                setEditingProduct(row);
                setFormModalOpen(true);
              }}
              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Edit Product"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          </PermissionGuard>

          <PermissionGuard permission={PERMISSIONS.PRODUCTS_PRICE_CHANGE}>
            <button
              onClick={() => {
                setPriceChangeTarget({ product: row, variant: row.variants?.[0] });
                setPriceChangeOpen(true);
              }}
              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Change Price (High-Risk Audit)"
            >
              <DollarSign className="w-3.5 h-3.5" />
            </button>
          </PermissionGuard>

          <PermissionGuard permission={PERMISSIONS.PRODUCTS_EDIT}>
            <button
              onClick={() => handleDuplicate(row)}
              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Duplicate Product"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </PermissionGuard>

          <PermissionGuard permission={PERMISSIONS.PRODUCTS_DELETE}>
            <button
              onClick={() => {
                setProductToDelete(row);
                setDeleteConfirmOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Product"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </PermissionGuard>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grocery Product Catalog"
        subtitle="Manage Sri Amman Store grocery items, multi-pack variants, regional naming, and pricing."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/products/ranking')}
              className="btn-secondary text-xs"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Featured</span>
            </button>

            <PermissionGuard permission={PERMISSIONS.PRODUCTS_CREATE}>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setFormModalOpen(true);
                }}
                className="btn-primary text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Grocery Product</span>
              </button>
            </PermissionGuard>
          </div>
        }
      />

      {/* Filter and Status Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-subtle space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product name, Tamil title, SKU, or barcode..."
              className="input-text pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-text text-xs py-1.5"
            >
              <option value="ALL">All Categories</option>
              {INITIAL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'All Items' },
            { id: 'active', label: 'Active in Store' },
            { id: 'featured', label: 'Featured' },
            { id: 'low_stock', label: 'Low Stock' },
            { id: 'out_of_stock', label: 'Out of Stock' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusTab === tab.id
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Table */}
      <DataTable
        columns={columns}
        data={filteredProducts}
        loading={loading}
        emptyTitle="No products match your filter"
        emptyDescription="Try clearing filters or search keywords."
        exportFilename="sriammanstore-catalog.csv"
      />

      {/* Add / Edit Modal */}
      <ProductFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleSaveProduct}
        initialData={editingProduct}
      />

      {/* Price Revision Dialog */}
      <ProductPriceChangeDialog
        isOpen={priceChangeOpen}
        onClose={() => setPriceChangeOpen(false)}
        product={priceChangeTarget.product}
        variant={priceChangeTarget.variant}
        onConfirmPriceChange={handlePriceChangeConfirm}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Grocery Product"
        message={`Are you sure you want to permanently delete "${productToDelete?.name}"? All pack size variants will be removed from customer apps.`}
        confirmText="Confirm Product Deletion"
        variant="danger"
        isHighRisk={true}
        requireReason={true}
        reasonPlaceholder="Mandatory reason for removing product from active catalog..."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};
