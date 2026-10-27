import React, { useState, useEffect, useRef } from 'react';
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
  ArrowUpDown,
  Upload
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
import { getAllCategories } from '../../firebase/categoryService';
import { formatCurrency, formatWeight } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';
import { INITIAL_CATEGORIES, INITIAL_BRANDS } from '../../data/grocerySeedData';
import { groupProductImportRows, readProductImportRows } from '../../utils/productExcel';

class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('[Modal Error caught]:', error, info);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 space-y-3 text-center bg-white shadow-2xl rounded-2xl">
            <h3 className="text-base font-bold text-slate-900">Form Render Issue</h3>
            <p className="text-xs text-slate-500">Could not display product form for this item. Please try editing another product or refresh.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                if (this.props.onReset) this.props.onReset();
              }}
              className="px-4 py-2 font-sans text-xs font-bold text-white shadow bg-emerald-800 rounded-xl hover:bg-emerald-900"
            >
              Close & Reset
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
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
  const importFileRef = useRef(null);
  const importImagesRef = useRef(null);
  const importFolderRef = useRef(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importExcelFile, setImportExcelFile] = useState(null);
  const [importImageFiles, setImportImageFiles] = useState([]);
  const [importing, setImporting] = useState(false);

  const notify = useNotification();
  const { currentUser, userRole } = usePermissions();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, liveCats] = await Promise.all([
        getAllProducts(),
        getAllCategories()
      ]);
      setProducts(data);
      setCategories(liveCats || []);
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
    if (
      categoryFilter !== 'ALL' &&
      p.categoryId !== categoryFilter &&
      p.categoryName !== categoryFilter &&
      p.category !== categoryFilter
    ) return false;

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

  const compressImportImage = async (file) => {
    const image = await createImageBitmap(file);
    try {
      for (const maxDimension of [1200, 900, 700, 550, 400]) {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not prepare an uploaded product image.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.8, 0.65, 0.5, 0.35]) {
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
          // The data URL is repeated in imageUrl/frontImageUrl/imageUrls fields.
          // Keep each image small enough for Firestore's per-document size limit.
          if (blob && blob.size <= 85_000) return blob;
        }
      }
      throw new Error(`Could not compress ${file.name} enough to fit in the product database record.`);
    } finally {
      image.close();
    }
  };

  const fileToImportDataUrl = async (file) => {
    const blob = await compressImportImage(file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.readAsDataURL(blob);
    });
  };

  const handleImportProducts = async () => {
    if (!importExcelFile) {
      notify.error('Excel file required', 'Choose the product Excel file to continue.');
      return;
    }
    setImporting(true);
    try {
      const rows = readProductImportRows(await importExcelFile.text(), importExcelFile.name);
      const categoryOptions = categories.length ? categories : INITIAL_CATEGORIES;
      const productsToImport = groupProductImportRows(rows, categoryOptions, INITIAL_BRANDS);
      if (!productsToImport.length) throw new Error('The Excel file has no product rows to import.');
      const productIds = productsToImport.map((product) => String(product.__importProductId || '').trim().toLocaleLowerCase()).filter(Boolean);
      if (new Set(productIds).size !== productIds.length) throw new Error('Each distinct product must have a unique ProductID in the Excel file.');

      const imagePairs = new Map();
      importImageFiles.forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        const filename = file.name.split(/[\\/]/).pop();
        const match = filename.match(/^(.+)-(front|back)\.[^.]+$/i);
        if (!match) return;
        const productId = match[1].trim().toLocaleLowerCase();
        const side = match[2].toLocaleLowerCase();
        if (!imagePairs.has(productId)) imagePairs.set(productId, {});
        if (imagePairs.get(productId)[side]) {
          throw new Error(`More than one ${side} image was selected for ProductID "${match[1]}".`);
        }
        imagePairs.get(productId)[side] = file;
      });

      const matchedIds = new Set();
      for (const product of productsToImport) {
        const productId = String(product.__importProductId || '').trim();
        const pair = imagePairs.get(productId.toLocaleLowerCase());
        const productData = { ...product };
        delete productData.__importProductId;
        if (pair) {
          matchedIds.add(productId.toLocaleLowerCase());
          for (const side of ['front', 'back']) {
            const imageFile = pair[side];
            if (!imageFile) continue;
            const imageUrl = await fileToImportDataUrl(imageFile);
            if (side === 'front') {
              productData.frontImageUrl = imageUrl;
              productData.imageUrl = imageUrl;
            } else {
              productData.backImageUrl = imageUrl;
            }
          }
        }
        await createProduct(productData, currentUser, { requireRemote: true });
      }
      const unmatchedImages = [...imagePairs.keys()].filter((id) => !matchedIds.has(id)).length;
      notify.success('Excel Import Complete', `${productsToImport.length} product${productsToImport.length === 1 ? '' : 's'} imported${unmatchedImages ? `; ${unmatchedImages} image pair${unmatchedImages === 1 ? '' : 's'} did not match a ProductID` : ''}.`);
      setImportModalOpen(false);
      setImportExcelFile(null);
      setImportImageFiles([]);
      await loadData();
    } catch (err) {
      const message = err.message || 'Could not import products from this file.';
      notify.error('Excel Import Failed', message);
    } finally {
      setImporting(false);
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
          <div className="flex items-center justify-center w-12 h-12 overflow-hidden border rounded-xl bg-slate-100 border-slate-200 shrink-0">
            {row.imageUrl || row.frontImageUrl || (Array.isArray(row.imageUrls) ? row.imageUrls[0] : null) ? (
              <img
                src={row.imageUrl || row.frontImageUrl || row.imageUrls[0]}
                alt={row.name}
                className="object-cover w-full h-full"
              />
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
              <span className="font-normal text-slate-500">{row.brandName}</span>
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
        const sellingPrice = Number(primary.sellingPrice ?? primary.price ?? row.sellingPrice ?? row.price ?? 0);
        const mrp = Number(primary.mrp ?? primary.originalPrice ?? row.mrp ?? row.price ?? 0);
        return (
          <div className="text-right">
            <div className="font-sans text-xs font-bold text-slate-900">
              {formatCurrency(sellingPrice)}
            </div>
            {mrp > sellingPrice && (
              <div className="text-[10px] text-slate-400 line-through font-sans">
                {formatCurrency(mrp)}
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
            <PermissionGuard permission={PERMISSIONS.PRODUCTS_CREATE}>
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="text-xs btn-secondary"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
            </PermissionGuard>

            <button
              onClick={() => navigate('/products/ranking')}
              className="text-xs btn-secondary"
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
                className="text-xs btn-primary"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Grocery Product</span>
              </button>
            </PermissionGuard>
          </div>
        }
      />

      {/* Filter and Status Controls */}
      <div className="p-4 space-y-3 bg-white border rounded-xl border-slate-200 shadow-subtle">
        <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="relative w-full md:w-96">
            <Search className="absolute w-4 h-4 pointer-events-none text-slate-400 left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product name, Tamil title, SKU, or barcode..."
              className="text-xs input-text pl-9"
            />
          </div>

          <div className="flex items-center w-full gap-2 md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-text text-xs py-1.5"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
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
      <ModalErrorBoundary
        resetKey={editingProduct?.id || (formModalOpen ? 'open' : 'closed')}
        onReset={() => {
          setFormModalOpen(false);
          setEditingProduct(null);
        }}
      >
        <ProductFormModal
          isOpen={formModalOpen}
          onClose={() => {
            setFormModalOpen(false);
            setEditingProduct(null);
          }}
          onSubmit={handleSaveProduct}
          initialData={editingProduct}
        />
      </ModalErrorBoundary>

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-xl p-6 space-y-5 bg-white shadow-2xl rounded-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Import Products from Excel</h3>
              <p className="mt-1 text-xs text-slate-500">Upload the spreadsheet and product images. Image names must follow ProductID-front or ProductID-back. Images are compressed and saved in the product database record.</p>
            </div>
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-700">1. Product Excel file</span>
                <input ref={importFileRef} type="file" accept=".xls,.csv,application/vnd.ms-excel,text/csv" onChange={(event) => setImportExcelFile(event.target.files?.[0] || null)} className="block w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-800 file:font-bold" />
                <span className="block text-[11px] text-slate-500">{importExcelFile?.name || 'Select the Excel file downloaded from Settings.'}</span>
              </label>
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700">2. Product images</span>
                <input ref={importImagesRef} type="file" accept="image/*" multiple onChange={(event) => setImportImageFiles(Array.from(event.target.files || []))} className="block w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-800 file:font-bold" />
                <input ref={importFolderRef} type="file" accept="image/*" multiple directory="" webkitdirectory="" onChange={(event) => setImportImageFiles(Array.from(event.target.files || []))} className="hidden" />
                <button type="button" onClick={() => importFolderRef.current?.click()} className="text-xs font-semibold text-blue-700 underline">Choose a folder</button>
                <span className="block text-[11px] text-slate-500">{importImageFiles.length ? `${importImageFiles.length} image file${importImageFiles.length === 1 ? '' : 's'} selected` : 'Select multiple files or a folder containing files such as PROD001-front.jpg and PROD001-back.jpg.'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" disabled={importing} onClick={() => { setImportModalOpen(false); setImportExcelFile(null); setImportImageFiles([]); }} className="px-4 py-2 text-xs font-bold border rounded-lg border-slate-200 text-slate-600 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={importing || !importExcelFile} onClick={handleImportProducts} className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50">{importing ? 'Importing…' : 'Import Products'}</button>
            </div>
          </div>
        </div>
      )}

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
