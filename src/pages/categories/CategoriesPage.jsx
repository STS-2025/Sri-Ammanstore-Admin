import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { FormModal } from '../../components/common/FormModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ImageUploader } from '../../components/common/ImageUploader';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { PERMISSIONS } from '../../utils/permissions';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../../firebase/categoryService';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

export const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Category form state
  const [formData, setFormData] = useState({
    name: '',
    tamilName: '',
    slug: '',
    description: '',
    displayOrder: 1,
    isActive: true,
    showOnHomepage: true,
    subcategories: '',
    seoTitle: '',
    seoDescription: '',
    imageUrl: '',
    bannerUrl: ''
  });

  const notify = useNotification();
  const { currentUser } = usePermissions();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllCategories();
      setCategories(data);
    } catch (err) {
      notify.error('Failed to load categories', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      tamilName: '',
      slug: '',
      description: '',
      displayOrder: categories.length + 1,
      isActive: true,
      showOnHomepage: true,
      subcategories: '',
      seoTitle: '',
      seoDescription: '',
      imageUrl: '',
      bannerUrl: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      ...cat,
      imageUrl: cat.imageUrl || cat.bannerUrl || '',
      bannerUrl: cat.bannerUrl || cat.imageUrl || '',
      subcategories: Array.isArray(cat.subcategories) ? cat.subcategories.join(', ') : cat.subcategories || ''
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      notify.error('Missing Name', 'Category name is required.');
      return;
    }

    const payload = {
      ...formData,
      slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      subcategories: typeof formData.subcategories === 'string'
        ? formData.subcategories.split(',').map((s) => s.trim()).filter(Boolean)
        : formData.subcategories || []
    };

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload, currentUser);
        notify.success('Category Updated', `${formData.name} updated successfully.`);
      } else {
        await createCategory(payload, currentUser);
        notify.success('Category Created', `${formData.name} added to catalog.`);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      notify.error('Operation Failed', err.message);
    }
  };

  const handleToggleHomepage = async (cat) => {
    try {
      const updatedValue = !cat.showOnHomepage;
      await updateCategory(cat.id, { showOnHomepage: updatedValue }, currentUser);
      notify.success(
        'Homepage Visibility Updated',
        `"${cat.name}" ${updatedValue ? 'will now appear on' : 'removed from'} app homepage.`
      );
      await loadData();
    } catch (err) {
      notify.error('Update Failed', err.message);
    }
  };

  const handleDeleteConfirm = async ({ reason }) => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id, reason, currentUser);
      notify.success('Category Deleted', `${categoryToDelete.name} has been removed.`);
      setIsDeleteOpen(false);
      setCategoryToDelete(null);
      await loadData();
    } catch (err) {
      notify.error('Delete Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Category Taxonomy"
        subtitle="Manage grocery product classification, sub-categories, regional naming, and homepage display ordering."
        actions={
          <PermissionGuard permission={PERMISSIONS.CATEGORIES_MANAGE}>
            <button
              onClick={handleOpenCreate}
              className="btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </PermissionGuard>
        }
      />

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card transition-all p-5 flex flex-col justify-between overflow-hidden"
          >
            <div>
              {/* Category Image Header (If Uploaded) */}
              {(category.imageUrl || category.bannerUrl) && (
                <div className="relative h-32 w-full bg-slate-100 rounded-xl overflow-hidden mb-3 border border-slate-100">
                  <img
                    src={category.imageUrl || category.bannerUrl}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Category Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm border border-emerald-100 shrink-0 overflow-hidden">
                    {(category.imageUrl || category.bannerUrl) ? (
                      <img src={category.imageUrl || category.bannerUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <FolderTree className="w-5 h-5 text-emerald-700" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{category.name}</h4>
                    {category.tamilName && (
                      <p className="text-xs text-slate-500 font-sans">{category.tamilName}</p>
                    )}
                  </div>
                </div>
                <StatusBadge status={category.isActive ? 'active' : 'inactive'} />
              </div>

              {category.description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                  {category.description}
                </p>
              )}

              {/* Subcategories list */}
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Sub-Categories ({category.subcategories?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1">
                  {(category.subcategories || []).map((sub, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 font-medium"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Meta & Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span>Rank #{category.displayOrder}</span>
                <button
                  type="button"
                  onClick={() => handleToggleHomepage(category)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                    category.showOnHomepage
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Click to toggle Homepage appearance"
                >
                  {category.showOnHomepage ? '★ On Homepage' : '+ Add to Homepage'}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <PermissionGuard permission={PERMISSIONS.CATEGORIES_MANAGE}>
                  <button
                    onClick={() => handleOpenEdit(category)}
                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit Category"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setCategoryToDelete(category);
                      setIsDeleteOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </PermissionGuard>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category Form Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? `Edit: ${editingCategory.name}` : 'Create Taxonomy Category'}
        subtitle="Manage grocery hierarchy, Tamil regional title, category image, banner, and SEO metadata."
        onSubmit={handleFormSubmit}
        submitLabel={editingCategory ? 'Update Category' : 'Create Category'}
      >
        <form className="space-y-4 text-xs">
          {/* Category Image / Banner Upload Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <ImageUploader
              label="Category Display Image / Banner"
              value={formData.imageUrl || formData.bannerUrl}
              onChange={({ previewUrl }) => setFormData({
                ...formData,
                imageUrl: previewUrl,
                bannerUrl: previewUrl
              })}
              onRemove={() => setFormData({
                ...formData,
                imageUrl: '',
                bannerUrl: ''
              })}
            />

            <div>
              <label className="input-label">Image Direct URL (Alternative / CDN Link)</label>
              <input
                type="url"
                value={formData.imageUrl || formData.bannerUrl || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  imageUrl: e.target.value,
                  bannerUrl: e.target.value
                })}
                placeholder="https://images.unsplash.com/photo-category..."
                className="input-text text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">
                Category Name (English) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Cooking Oils & Ghee"
                className="input-text text-xs"
              />
            </div>

            <div>
              <label className="input-label">Regional Name (Tamil)</label>
              <input
                type="text"
                value={formData.tamilName}
                onChange={(e) => setFormData({ ...formData, tamilName: e.target.value })}
                placeholder="e.g. சமையல் எண்ணெய் மற்றும் நெய்"
                className="input-text text-xs font-sans"
              />
            </div>

            <div>
              <label className="input-label">URL Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="cooking-oils-ghee"
                className="input-text text-xs font-mono"
              />
            </div>

            <div>
              <label className="input-label">Display Ordering Rank</label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                className="input-text text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="input-label">Sub-Categories (Comma Separated)</label>
            <input
              type="text"
              value={formData.subcategories}
              onChange={(e) => setFormData({ ...formData, subcategories: e.target.value })}
              placeholder="Gingelly Oil, Groundnut Oil, Sunflower Oil, Cow Ghee"
              className="input-text text-xs"
            />
          </div>

          <div>
            <label className="input-label">Description & Customer Notes</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Category overview..."
              className="input-text text-xs"
            />
          </div>

          {/* SEO Metadata (Title & Meta Description) - Optional */}
          <div className="p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
              <span className="font-bold text-slate-800 text-xs">SEO & Search Engine Metadata</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                Optional
              </span>
            </div>
            
            <div>
              <label className="input-label">
                SEO Meta Title <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.seoTitle || ''}
                onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                placeholder="e.g. Buy Pure Cooking Oils & Ghee Online | Sri Amman Store"
                className="input-text text-xs"
              />
            </div>

            <div>
              <label className="input-label">
                SEO Meta Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={formData.seoDescription || ''}
                onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                placeholder="e.g. Shop authentic cold pressed gingelly oil, groundnut oil, and pure cow ghee with fast doorstep delivery..."
                className="input-text text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600"
              />
              <span className="font-semibold text-slate-800">Category Active</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showOnHomepage}
                onChange={(e) => setFormData({ ...formData, showOnHomepage: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600"
              />
              <span className="font-semibold text-slate-800">Feature on App Homepage</span>
            </label>
          </div>
        </form>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete Grocery Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? Assigned products must be recategorized.`}
        confirmText="Confirm Deletion"
        variant="danger"
        isHighRisk={true}
        requireReason={true}
        reasonPlaceholder="Mandatory reason for removing category from catalog..."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
};
