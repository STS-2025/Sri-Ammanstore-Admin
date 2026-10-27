import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Image as ImageIcon,
  Barcode,
  IndianRupee,
  Boxes,
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  QrCode,
  Zap
} from 'lucide-react';
import { FormModal } from '../common/FormModal';
import { ImageUploader } from '../common/ImageUploader';
import { VideoUploader } from '../common/VideoUploader';
import { INITIAL_CATEGORIES, INITIAL_BRANDS } from '../../data/grocerySeedData';
import { getAllCategories } from '../../firebase/categoryService';
import { formatCurrency } from '../../utils/formatters';

const TABS = [
  { id: 'basic', label: '1. Basic Info', icon: Layers },
  { id: 'media', label: '2. Media & Images', icon: ImageIcon },
  { id: 'pricing', label: '3. Pricing & Tax', icon: IndianRupee },
  { id: 'variants', label: '4. Variants Matrix', icon: Boxes },
  { id: 'badges', label: '5. Merchandising', icon: Sparkles }
];

export const ProductFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [categories, setCategories] = useState([]);

  // Load live categories strictly from Firestore / LocalStorage
  useEffect(() => {
    let isMounted = true;
    const fetchCats = async () => {
      try {
        const liveCats = await getAllCategories();
        if (isMounted && Array.isArray(liveCats)) {
          setCategories(liveCats);
          if (!initialData && liveCats.length > 0) {
            setFormData((prev) => ({
              ...prev,
              categoryId: prev.categoryId && liveCats.some(c => c.id === prev.categoryId) ? prev.categoryId : liveCats[0].id,
              categoryName: prev.categoryName && liveCats.some(c => c.name === prev.categoryName) ? prev.categoryName : liveCats[0].name,
              subCategory: prev.subCategory || (liveCats[0].subcategories?.[0] || '')
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to load live categories:', err);
      }
    };
    if (isOpen) {
      fetchCats();
    }
    return () => { isMounted = false; };
  }, [isOpen, initialData]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    tamilName: '',
    nameTamil: '',
    categoryId: 'cat-spices',
    categoryName: 'Spices & Masala Powders',
    subCategory: 'Chilli & Coriander Powders',
    brandId: 'brand-aachi',
    brandName: 'Aachi Masala',
    description: '',
    benefits: '',
    ingredients: '',
    usage: '',
    tags: '',
    hsnCode: '09103030',
    gstRate: 5,
    fssaiLicense: '',
    fssaiNumber: '',
    rack: '',
    shelf: '',
    bin: '',
    status: 'active',
    isFeatured: false,
    isBestSeller: false,
    isNew: true,
    isOffer: false,
    rankingScore: 80,
    imageUrl: '',
    frontImageUrl: '',
    backImageUrl: '',
    videoUrl: '',
    variants: [
      {
        id: 'var-temp-1',
        name: '500g Pack',
        weight: 500,
        unit: 'g',
        sku: 'SKU-500G',
        barcode: '8901234567890',
        purchasePrice: 90,
        mrp: 130,
        sellingPrice: 115,
        stock: 40,
        safetyStock: 15,
        batchNumber: 'B-2026-01',
        expiryDate: '2027-12-31'
      }
    ]
  });

  useEffect(() => {
    if (initialData) {
      const img = initialData.frontImageUrl || initialData.imageUrl || initialData.image || (Array.isArray(initialData.imageUrls) ? initialData.imageUrls[0] : '') || '';
      const fssaiVal = initialData.fssaiLicense || initialData.fssaiNumber || '';

      const matchedCat = (categories || []).find(
        (c) => c && (c.id === initialData.categoryId || c.name === initialData.categoryName || c.name === initialData.category || c.id === initialData.category)
      );

      const rawList = Array.isArray(initialData.variants) && initialData.variants.length > 0
        ? initialData.variants
        : Array.isArray(initialData.options) && initialData.options.length > 0
        ? initialData.options
        : [initialData];

      const parsedVariants = rawList.map((v, idx) => {
        const item = typeof v === 'object' && v !== null ? v : {};
        const rawS = item.sellingPrice ?? item.price ?? item.offerPrice ?? initialData?.sellingPrice ?? initialData?.price ?? 0;
        const rawM = item.mrp ?? item.originalPrice ?? initialData?.mrp ?? initialData?.price ?? rawS;
        const sPrice = isNaN(Number(rawS)) ? 0 : Number(rawS);
        const mPrice = isNaN(Number(rawM)) ? sPrice : Number(rawM);
        const finalM = mPrice >= sPrice ? mPrice : sPrice;

        return {
          id: String(item.id || `var-${initialData?.id || Date.now()}-${idx}`),
          name: String(item.name || item.unit || item.unitSize || (item.weight ? `${item.weight}g Pack` : 'Standard Pack')),
          weight: isNaN(Number(item.weight)) ? 500 : Number(item.weight),
          unit: String(item.unit || 'g'),
          sku: String(item.sku || initialData?.sku || `SKU-${initialData?.id || '100'}-${idx}`),
          barcode: String(item.barcode || initialData?.barcode || ''),
          purchasePrice: isNaN(Number(item.purchasePrice)) ? 90 : Number(item.purchasePrice),
          mrp: finalM,
          sellingPrice: sPrice,
          stock: isNaN(Number(item.stock ?? initialData?.stock)) ? 10 : Number(item.stock ?? initialData?.stock),
          safetyStock: isNaN(Number(item.safetyStock)) ? 15 : Number(item.safetyStock),
          batchNumber: String(item.batchNumber || 'B-2026-01'),
          expiryDate: String(item.expiryDate || '2027-12-31')
        };
      });

      const tagsFormatted = Array.isArray(initialData.tags)
        ? initialData.tags.map(t => typeof t === 'string' ? t : String(t?.name || t?.label || '')).filter(Boolean).join(', ')
        : (typeof initialData.tags === 'string' ? initialData.tags : '');

      setFormData({
        id: initialData.id,
        name: String(initialData.name || initialData.productName || initialData.title || ''),
        tamilName: String(initialData.tamilName || initialData.nameTamil || ''),
        nameTamil: String(initialData.nameTamil || initialData.tamilName || ''),
        categoryId: String(matchedCat ? matchedCat.id : (initialData.categoryId || initialData.categoryName || initialData.category || categories[0]?.id || '')),
        categoryName: String(matchedCat ? matchedCat.name : (initialData.categoryName || initialData.category || categories[0]?.name || '')),
        subCategory: String(initialData.subCategory || initialData.subcategory || ''),
        brandId: String(initialData.brandId || 'brand-aachi'),
        brandName: String(initialData.brandName || 'Aachi Masala'),
        description: typeof initialData.description === 'string' ? initialData.description : '',
        benefits: typeof initialData.benefits === 'string' ? initialData.benefits : '',
        ingredients: typeof initialData.ingredients === 'string' ? initialData.ingredients : '',
        usage: typeof initialData.usage === 'string' ? initialData.usage : '',
        tags: tagsFormatted,
        hsnCode: String(initialData.hsnCode || '09103030'),
        gstRate: isNaN(Number(initialData.gstRate)) ? 5 : Number(initialData.gstRate),
        fssaiLicense: String(fssaiVal),
        fssaiNumber: String(fssaiVal),
        rack: String(initialData.rack || ''),
        shelf: String(initialData.shelf || ''),
        bin: String(initialData.bin || ''),
        status: String(initialData.status || 'active'),
        isFeatured: Boolean(initialData.isFeatured),
        isBestSeller: Boolean(initialData.isBestSeller),
        isNew: Boolean(initialData.isNew),
        isOffer: Boolean(initialData.isOffer),
        rankingScore: isNaN(Number(initialData.rankingScore)) ? 80 : Number(initialData.rankingScore),
        frontImageUrl: String(img),
        backImageUrl: String(initialData.backImageUrl || ''),
        videoUrl: String(initialData.videoUrl || ''),
        imageUrl: String(img),
        variants: parsedVariants
      });
    } else {
      setFormData({
        name: '',
        tamilName: '',
        nameTamil: '',
        categoryId: categories[0]?.id || 'cat-spices',
        categoryName: categories[0]?.name || 'Spices & Masala Powders',
        subCategory: categories[0]?.subcategories?.[0] || '',
        brandId: 'brand-aachi',
        brandName: 'Aachi Masala',
        description: '',
        benefits: '',
        ingredients: '',
        usage: '',
        tags: '',
        hsnCode: '09103030',
        gstRate: 5,
        fssaiLicense: '',
        fssaiNumber: '',
        rack: '',
        shelf: '',
        bin: '',
        status: 'active',
        isFeatured: false,
        isBestSeller: false,
        isNew: true,
        isOffer: false,
        rankingScore: 80,
        frontImageUrl: '',
        backImageUrl: '',
        videoUrl: '',
        imageUrl: '',
        variants: [
          {
            id: `var-${Date.now()}`,
            name: '500g Pack',
            weight: 500,
            unit: 'g',
            sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            purchasePrice: 90,
            mrp: 130,
            sellingPrice: 115,
            stock: 40,
            safetyStock: 15,
            batchNumber: 'B-2026-01',
            expiryDate: '2027-12-31'
          }
        ]
      });
    }
    setActiveTab('basic');
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const updatePrimaryVariant = (field, value) => {
    setFormData((prev) => {
      const variants = [...(prev.variants || [])];
      if (variants.length === 0) {
        variants.push({
          id: `var-${Date.now()}`,
          name: '500g Pack',
          weight: 500,
          unit: 'g',
          sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          purchasePrice: 90,
          mrp: 130,
          sellingPrice: 115,
          stock: 40,
          safetyStock: 15
        });
      }
      variants[0] = { ...variants[0], [field]: value };
      return { ...prev, variants };
    });
  };

  // Handle Category changes
  const handleCategoryChange = (catId) => {
    const found = categories.find((c) => c.id === catId || c.name === catId);
    let subs = found?.subcategories || [];
    if (typeof subs === 'string') {
      subs = subs.split(',').map((s) => s.trim()).filter(Boolean);
    }
    setFormData((prev) => ({
      ...prev,
      categoryId: found ? found.id : catId,
      categoryName: found ? found.name : catId,
      subCategory: Array.isArray(subs) && subs.length > 0 ? subs[0] : ''
    }));
  };

  // Handle Brand changes
  const handleBrandChange = (brandId) => {
    const found = INITIAL_BRANDS.find((b) => b.id === brandId);
    setFormData((prev) => ({
      ...prev,
      brandId,
      brandName: found ? found.name : prev.brandName
    }));
  };

  // Add a standard pack variant
  const handleAddPackVariant = (weight, unit) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newVariant = {
      id: `var-${Date.now()}-${randomSuffix}`,
      name: `${weight}${unit} Pack`,
      weight: Number(weight),
      unit,
      sku: `${(formData.brandName || 'PRD').slice(0, 3).toUpperCase()}-${weight}${unit}-${randomSuffix}`,
      barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      purchasePrice: 100,
      mrp: 140,
      sellingPrice: 125,
      stock: 25,
      safetyStock: 10,
      batchNumber: 'B-2026-BATCH',
      expiryDate: '2027-12-31'
    };

    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant]
    }));
  };

  // Update variant field
  const handleVariantChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.variants];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  // Remove variant
  const handleRemoveVariant = (index) => {
    if (formData.variants.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  // Form submission
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const primary = formData.variants?.[0] || {};
    const img = formData.frontImageUrl || formData.imageUrl || '';
    const finalData = {
      ...formData,
      tamilName: formData.tamilName || formData.nameTamil || '',
      nameTamil: formData.tamilName || formData.nameTamil || '',
      sellingPrice: Number(primary.sellingPrice ?? 115),
      price: Number(primary.sellingPrice ?? 115),
      mrp: Number(primary.mrp ?? 130),
      stock: Number(primary.stock ?? 40),
      imageUrl: img,
      frontImageUrl: img,
      tags: typeof formData.tags === 'string'
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : formData.tags
    };
    onSubmit(finalData);
  };

  const selectedCategory = (categories || []).find(
    (c) => c && (c.id === formData.categoryId || c.name === formData.categoryId || c.name === formData.categoryName || c.id === formData.categoryName)
  );

  const subcategoryOptions = useMemo(() => {
    if (!selectedCategory) return [];
    let subs = selectedCategory.subcategories;
    if (typeof subs === 'string') {
      subs = subs.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return Array.isArray(subs) ? subs : [];
  }, [selectedCategory]);

  // Pricing calculations for first variant
  const safeVariants = Array.isArray(formData?.variants) ? formData.variants : [];
  const primaryVar = safeVariants[0] || {};
  const discountAmount = Math.max(0, (primaryVar.mrp || 0) - (primaryVar.sellingPrice || 0));
  const discountPercent = primaryVar.mrp > 0 ? Math.round((discountAmount / primaryVar.mrp) * 100) : 0;
  const grossProfit = Math.max(0, (primaryVar.sellingPrice || 0) - (primaryVar.purchasePrice || 0));
  const profitMarginPercent = primaryVar.sellingPrice > 0 ? Math.round((grossProfit / primaryVar.sellingPrice) * 100) : 0;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Edit Product: ${initialData.name || initialData.productName || 'Grocery Product'}` : 'Create New Grocery Product'}
      subtitle="Complete catalog metadata, pack size variants, barcodes, and inventory rules."
      maxWidth="max-w-4xl"
      onSubmit={handleSubmit}
      submitLabel={initialData ? 'Save Product Changes' : 'Publish Product to Catalog'}
      isSubmitting={isSubmitting}
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-100 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Basic Info */}
        {activeTab === 'basic' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Quick Price & Image Card */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600 fill-emerald-500" />
                  Primary Variant Pricing & Main Image (Quick Setup)
                </span>
                <span className="text-[10px] uppercase font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                  Required Details
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="input-label font-bold text-emerald-900">
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={primaryVar.sellingPrice ?? ''}
                    onChange={(e) => updatePrimaryVariant('sellingPrice', Number(e.target.value))}
                    placeholder="e.g. 115"
                    className="input-text text-xs font-mono font-bold text-emerald-900 bg-white border-emerald-300 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="input-label font-semibold text-slate-800">
                    MRP Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={primaryVar.mrp ?? ''}
                    onChange={(e) => updatePrimaryVariant('mrp', Number(e.target.value))}
                    placeholder="e.g. 130"
                    className="input-text text-xs font-mono bg-white border-slate-300"
                  />
                </div>

                <div>
                  <label className="input-label font-semibold text-slate-800">Available Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={primaryVar.stock ?? ''}
                    onChange={(e) => updatePrimaryVariant('stock', Number(e.target.value))}
                    placeholder="e.g. 50"
                    className="input-text text-xs font-mono bg-white border-slate-300"
                  />
                </div>

                <div>
                  <label className="input-label font-semibold text-slate-800">Pack Size Label</label>
                  <input
                    type="text"
                    value={primaryVar.name ?? ''}
                    onChange={(e) => updatePrimaryVariant('name', e.target.value)}
                    placeholder="e.g. 500g Pack"
                    className="input-text text-xs bg-white border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <ImageUploader
                  label="Product Front Image (Photo)"
                  value={formData.frontImageUrl || formData.imageUrl}
                  onChange={({ previewUrl }) => setFormData((prev) => ({
                    ...prev,
                    frontImageUrl: previewUrl,
                    imageUrl: previewUrl
                  }))}
                  onRemove={() => setFormData((prev) => ({
                    ...prev,
                    frontImageUrl: '',
                    imageUrl: ''
                  }))}
                />
                <div>
                  <label className="input-label text-[11px] text-slate-700">Or Paste Front Image Direct URL</label>
                  <input
                    type="url"
                    value={formData.frontImageUrl || formData.imageUrl || ''}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      frontImageUrl: e.target.value,
                      imageUrl: e.target.value
                    }))}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="input-text text-xs font-mono bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">
                  Product Name (English) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Aachi Turmeric Powder"
                  className="input-text text-xs"
                />
              </div>

              <div>
                <label className="input-label">Regional Name (Tamil)</label>
                <input
                  type="text"
                  value={formData.tamilName}
                  onChange={(e) => setFormData({ ...formData, tamilName: e.target.value, nameTamil: e.target.value })}
                  placeholder="e.g. ஆச்சி மஞ்சள் தூள்"
                  className="input-text text-xs font-sans"
                />
              </div>

              <div>
                <label className="input-label">Master Category</label>
                <select
                  value={formData.categoryId || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="input-text text-xs"
                >
                  {categories.length === 0 && (
                    <option value={formData.categoryId || ''}>
                      {formData.categoryName || formData.categoryId || 'General'}
                    </option>
                  )}
                  {categories.map((cat) => (
                    <option key={cat.id || cat.name} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  {categories.length > 0 && formData.categoryId && !categories.some(c => c.id === formData.categoryId || c.name === formData.categoryId) && (
                    <option value={formData.categoryId}>
                      {formData.categoryName || formData.categoryId}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="input-label">Sub-Category</label>
                {subcategoryOptions.length > 0 ? (
                  <select
                    value={formData.subCategory || ''}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    className="input-text text-xs"
                  >
                    <option value="">-- Select Sub-Category --</option>
                    {subcategoryOptions.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.subCategory || ''}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    placeholder="e.g. Powders, Whole Spices, etc."
                    className="input-text text-xs bg-white border-slate-300"
                  />
                )}
              </div>

              <div>
                <label className="input-label">Brand / Manufacturer</label>
                <select
                  value={formData.brandId}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="input-text text-xs"
                >
                  {INITIAL_BRANDS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.origin})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Search Keywords / Tags</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="turmeric, aachi, masala, cooking powder"
                  className="input-text text-xs"
                />
                <span className="text-[10px] text-slate-400">Comma separated keywords for customer search</span>
              </div>
            </div>

            <div>
              <label className="input-label">Description & Heritage</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product origin, purity standards and authentic culinary notes..."
                className="input-text text-xs"
              />
            </div>

            <section className="p-4 space-y-3 border rounded-xl border-amber-200 bg-amber-50/60">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Storage Location</h4>
                <p className="mt-0.5 text-[11px] text-slate-500">Record where this product is kept in the store or warehouse.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="input-label">Rack</label>
                  <input
                    type="text"
                    value={formData.rack || ''}
                    onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                    placeholder="e.g. R-01"
                    className="input-text text-xs"
                  />
                </div>
                <div>
                  <label className="input-label">Shelf</label>
                  <input
                    type="text"
                    value={formData.shelf || ''}
                    onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
                    placeholder="e.g. S-02"
                    className="input-text text-xs"
                  />
                </div>
                <div>
                  <label className="input-label">Bin</label>
                  <input
                    type="text"
                    value={formData.bin || ''}
                    onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                    placeholder="e.g. B-03"
                    className="input-text text-xs"
                  />
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Ingredients & Composition</label>
                <input
                  type="text"
                  value={formData.ingredients}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                  placeholder="e.g. 100% Selected Turmeric Rhizomes"
                  className="input-text text-xs"
                />
              </div>

              <div>
                <label className="input-label">Usage / Cooking Instructions</label>
                <input
                  type="text"
                  value={formData.usage}
                  onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                  placeholder="e.g. Add 1/2 tsp to curries or sambar"
                  className="input-text text-xs"
                />
              </div>

              <div>
                <label className="input-label font-bold text-slate-800">FSSAI License Number</label>
                <input
                  type="text"
                  value={formData.fssaiLicense || formData.fssaiNumber || ''}
                  onChange={(e) => setFormData({ ...formData, fssaiLicense: e.target.value, fssaiNumber: e.target.value })}
                  placeholder="e.g. 12421023000456"
                  className="input-text text-xs font-mono bg-white border-slate-300"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">14-digit FSSAI food safety license</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Media & Images (Front Image, Back Image & Showcase Video) */}
        {activeTab === 'media' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold block text-xs">Rich Media Showcase Enabled (Images + MP4 Video)</span>
                <span className="text-[11px] text-emerald-800">
                  Upload Front view, Back view, and attractive 360° product video clip (MP4 format) to captivate shoppers.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. FRONT PACKAGING IMAGE */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    1. Front Packaging Image (Front View)
                  </span>
                  <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    Primary Display
                  </span>
                </div>

                <ImageUploader
                  label="Front Product Photo (1:1 Ratio)"
                  value={formData.frontImageUrl || formData.imageUrl}
                  onChange={({ previewUrl }) => setFormData({
                    ...formData,
                    frontImageUrl: previewUrl,
                    imageUrl: previewUrl
                  })}
                  onRemove={() => setFormData({
                    ...formData,
                    frontImageUrl: '',
                    imageUrl: ''
                  })}
                />

                <div>
                  <label className="input-label">Front Image Direct URL (Alternative / CDN)</label>
                  <input
                    type="url"
                    value={formData.frontImageUrl || formData.imageUrl || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      frontImageUrl: e.target.value,
                      imageUrl: e.target.value
                    })}
                    placeholder="https://images.unsplash.com/photo-front..."
                    className="input-text text-xs font-mono"
                  />
                </div>
              </div>

              {/* 2. BACK PACKAGING IMAGE */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    2. Back Packaging Image (Back View)
                  </span>
                  <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Ingredients & FSSAI
                  </span>
                </div>

                <ImageUploader
                  label="Back Product Photo (Ingredients / Barcode / Nutrition)"
                  value={formData.backImageUrl}
                  onChange={({ previewUrl }) => setFormData({ ...formData, backImageUrl: previewUrl })}
                  onRemove={() => setFormData({ ...formData, backImageUrl: '' })}
                />

                <div>
                  <label className="input-label">Back Image Direct URL (Alternative / CDN)</label>
                  <input
                    type="url"
                    value={formData.backImageUrl || ''}
                    onChange={(e) => setFormData({ ...formData, backImageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-back..."
                    className="input-text text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. PRODUCT SHOWCASE VIDEO */}
            <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  3. Product Showcase Video (MP4 Format)
                </span>
                <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                  Interactive Video
                </span>
              </div>

              <VideoUploader
                label="Product Video Clip (.mp4, .webm)"
                value={formData.videoUrl}
                onChange={({ previewUrl }) => setFormData({ ...formData, videoUrl: previewUrl })}
                onRemove={() => setFormData({ ...formData, videoUrl: '' })}
              />

              <div>
                <label className="input-label">Video Direct URL (Alternative MP4 / CDN Link)</label>
                <input
                  type="url"
                  value={formData.videoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://assets.mixkit.co/videos/preview/video-sample.mp4"
                  className="input-text text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Pricing & Tax */}
        {activeTab === 'pricing' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <span className="font-bold text-xs text-slate-900 block border-b border-slate-200 pb-2">
                Primary Variant Commercial Pricing & Stock
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="input-label font-bold text-emerald-800">
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={primaryVar.sellingPrice ?? ''}
                    onChange={(e) => updatePrimaryVariant('sellingPrice', Number(e.target.value))}
                    placeholder="e.g. 115"
                    className="input-text text-xs font-mono font-bold text-emerald-800 bg-white border-emerald-300"
                  />
                </div>

                <div>
                  <label className="input-label">MRP Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={primaryVar.mrp ?? ''}
                    onChange={(e) => updatePrimaryVariant('mrp', Number(e.target.value))}
                    placeholder="e.g. 130"
                    className="input-text text-xs font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="input-label">Cost / Purchase Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={primaryVar.purchasePrice ?? ''}
                    onChange={(e) => updatePrimaryVariant('purchasePrice', Number(e.target.value))}
                    placeholder="e.g. 90"
                    className="input-text text-xs font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="input-label">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={primaryVar.stock ?? ''}
                    onChange={(e) => updatePrimaryVariant('stock', Number(e.target.value))}
                    placeholder="e.g. 40"
                    className="input-text text-xs font-mono bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Primary Variant MRP:</span>
                <span className="font-bold text-slate-900 font-sans text-sm">
                  {formatCurrency(primaryVar.mrp || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Selling Price:</span>
                <span className="font-bold text-emerald-700 font-sans text-sm">
                  {formatCurrency(primaryVar.sellingPrice || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Customer Savings:</span>
                <span className="font-bold text-rose-600 font-sans text-sm">
                  {discountPercent}% OFF ({formatCurrency(discountAmount)})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Gross Margin:</span>
                <span className="font-bold text-blue-700 font-sans text-sm">
                  {profitMarginPercent}% ({formatCurrency(grossProfit)})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="input-label">HSN Commodity Code</label>
                <input
                  type="text"
                  value={formData.hsnCode}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                  placeholder="e.g. 09103030"
                  className="input-text text-xs font-mono"
                />
              </div>

              <div>
                <label className="input-label">GST Tax Bracket</label>
                <select
                  value={formData.gstRate}
                  onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                  className="input-text text-xs"
                >
                  <option value={0}>0% (Staple Grains & Raw Pulses)</option>
                  <option value={5}>5% (Packaged Powders, Edible Oils, Spices)</option>
                  <option value={12}>12% (Processed Grocery & Beverages)</option>
                  <option value={18}>18% (Cleaning & Detergents)</option>
                </select>
              </div>

              <div>
                <label className="input-label font-bold text-slate-800">FSSAI License Number</label>
                <input
                  type="text"
                  value={formData.fssaiLicense || formData.fssaiNumber || ''}
                  onChange={(e) => setFormData({ ...formData, fssaiLicense: e.target.value, fssaiNumber: e.target.value })}
                  placeholder="e.g. 12421023000456"
                  className="input-text text-xs font-mono bg-white border-slate-300"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">14-digit FSSAI License</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Variants Matrix */}
        {activeTab === 'variants' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Quick pack size buttons */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Pack Size Variants ({safeVariants.length})
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Quick Add:</span>
                {[
                  { w: 100, u: 'g' },
                  { w: 250, u: 'g' },
                  { w: 500, u: 'g' },
                  { w: 1, u: 'kg' },
                  { w: 5, u: 'kg' }
                ].map((pack) => (
                  <button
                    key={`${pack.w}${pack.u}`}
                    type="button"
                    onClick={() => handleAddPackVariant(pack.w, pack.u)}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                  >
                    +{pack.w}{pack.u}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {safeVariants.map((v, index) => (
                <div
                  key={v.id || index}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Variant #{index + 1}: {v.name}
                    </span>
                    {safeVariants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="Remove Variant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Pack Name</span>
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                        className="input-text text-xs py-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">SKU Code</span>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                        className="input-text text-xs py-1 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Barcode</span>
                      <input
                        type="text"
                        value={v.barcode}
                        onChange={(e) => handleVariantChange(index, 'barcode', e.target.value)}
                        className="input-text text-xs py-1 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Batch Code</span>
                      <input
                        type="text"
                        value={v.batchNumber || ''}
                        onChange={(e) => handleVariantChange(index, 'batchNumber', e.target.value)}
                        className="input-text text-xs py-1 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Expiry Date</span>
                      <input
                        type="date"
                        value={v.expiryDate || ''}
                        onChange={(e) => handleVariantChange(index, 'expiryDate', e.target.value)}
                        className="input-text text-xs py-1 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Purchase (₹)</span>
                      <input
                        type="number"
                        value={v.purchasePrice}
                        onChange={(e) => handleVariantChange(index, 'purchasePrice', Number(e.target.value))}
                        className="input-text text-xs py-1 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">MRP (₹)</span>
                      <input
                        type="number"
                        value={v.mrp}
                        onChange={(e) => handleVariantChange(index, 'mrp', Number(e.target.value))}
                        className="input-text text-xs py-1 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Selling (₹)</span>
                      <input
                        type="number"
                        value={v.sellingPrice}
                        onChange={(e) => handleVariantChange(index, 'sellingPrice', Number(e.target.value))}
                        className="input-text text-xs py-1 font-mono font-bold text-emerald-800"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Stock Qty</span>
                      <input
                        type="number"
                        value={v.stock}
                        onChange={(e) => handleVariantChange(index, 'stock', Number(e.target.value))}
                        className="input-text text-xs py-1 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Safety Level</span>
                      <input
                        type="number"
                        value={v.safetyStock}
                        onChange={(e) => handleVariantChange(index, 'safetyStock', Number(e.target.value))}
                        className="input-text text-xs py-1 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Merchandising & Status */}
        {activeTab === 'badges' && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <label className="input-label">Catalog Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-text text-xs"
              >
                <option value="active">Active (Visible to Shoppers)</option>
                <option value="inactive">Inactive (Hidden from Customer App)</option>
                <option value="draft">Draft (Work in Progress)</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="input-label mb-1">Visual Merchandising Tags</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                  />
                  <span>Featured Product</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isBestSeller}
                    onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                  />
                  <span>Best Seller</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isNew}
                    onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                  />
                  <span>New Arrival</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isOffer}
                    onChange={(e) => setFormData({ ...formData, isOffer: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                  />
                  <span>Special Offer</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </FormModal>
  );
};
