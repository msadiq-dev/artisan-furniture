'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import type { Product, Category, ProductImage } from '@/types/database';

interface ProductSheetProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null; // null = Add, object = Edit
  categories: Category[];
  onSaved: (product: Product, isNew: boolean) => void;
}

export function ProductSheet({ isOpen, onClose, product, categories, onSaved }: ProductSheetProps) {
  const isEditing = Boolean(product);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<string | number>('');
  const [costPrice, setCostPrice] = useState<string | number>('');
  const [stockQty, setStockQty] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(5);
  const [widthCm, setWidthCm] = useState<string | number>('');
  const [depthCm, setDepthCm] = useState<string | number>('');
  const [heightCm, setHeightCm] = useState<string | number>('');
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Images state
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isSavingImageOrder, setIsSavingImageOrder] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset or populate form when product changes
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setSlug(product.slug || '');
      setIsSlugCustomized(true);
      setSku(product.sku || '');
      setCategoryId(product.category_id || '');
      setPrice(product.price ?? '');
      setCostPrice(product.cost_price ?? '');
      setStockQty(product.stock_qty ?? 0);
      setReorderLevel(product.reorder_level ?? 5);
      setWidthCm(product.width_cm ?? '');
      setDepthCm(product.depth_cm ?? '');
      setHeightCm(product.height_cm ?? '');
      setColor(product.color || '');
      setMaterial(product.material || '');
      setDescription(product.description || '');
      setIsFeatured(Boolean(product.is_featured));
      setIsActive(product.is_active !== false);

      const imgs = product.images ? [...product.images] : [];
      imgs.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setExistingImages(imgs);
    } else {
      setName('');
      setSlug('');
      setIsSlugCustomized(false);
      setSku('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setPrice('');
      setCostPrice('');
      setStockQty(0);
      setReorderLevel(5);
      setWidthCm('');
      setDepthCm('');
      setHeightCm('');
      setColor('');
      setMaterial('');
      setDescription('');
      setIsFeatured(false);
      setIsActive(true);
      setExistingImages([]);
    }
    setPendingFiles([]);
    setFieldErrors({});
  }, [product, isOpen, categories]);

  // Auto-generate slug from name if not manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugCustomized) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlug(val.toLowerCase());
    setIsSlugCustomized(true);
  };

  // Image management
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const validFiles: File[] = [];
    for (const f of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        toast.error(`"${f.name}" is not supported. Use JPG, PNG or WebP.`);
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 5 MB limit.`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    if (isEditing && product) {
      // Upload immediately for existing product
      uploadFilesForProduct(product.id, validFiles);
    } else {
      // Queue for upload upon product creation
      setPendingFiles((prev) => [...prev, ...validFiles]);
      toast.info(`${validFiles.length} image(s) queued for upload.`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFilesForProduct = async (productId: string, filesToUpload: File[]) => {
    setIsUploadingImages(true);
    try {
      const formData = new FormData();
      filesToUpload.forEach((f) => formData.append('files', f));

      const res = await fetch(`/api/dashboard/products/${productId}/images`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload images');
      }

      toast.success(`${filesToUpload.length} image(s) uploaded successfully`);
      if (data.images && Array.isArray(data.images)) {
        setExistingImages((prev) => [...prev, ...data.images]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!product) return;
    setDeletingImageId(imageId);
    try {
      const res = await fetch(`/api/dashboard/products/${product.id}/images/${imageId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete image');

      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success('Image removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete image');
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= existingImages.length) return;

    const updated = [...existingImages];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;

    // re-assign sort_orders
    const reordered = updated.map((img, i) => ({ ...img, sort_order: i }));
    setExistingImages(reordered);
  };

  const handleAltTextChange = (imageId: string, text: string) => {
    setExistingImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, alt_text: text } : img))
    );
  };

  const handleSaveImageOrderAndAlt = async () => {
    if (!product) return;
    setIsSavingImageOrder(true);
    try {
      const payload = {
        items: existingImages.map((img, i) => ({
          id: img.id,
          sort_order: i,
          alt_text: img.alt_text,
        })),
      };

      const res = await fetch(`/api/dashboard/products/${product.id}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update images');
      toast.success('Image ordering & alt texts updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update images');
    } finally {
      setIsSavingImageOrder(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Client-side quick check
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Product name is required';
    if (!slug.trim()) errors.slug = 'Slug is required';
    if (!sku.trim()) errors.sku = 'SKU is required';
    if (price === '' || isNaN(Number(price)) || Number(price) < 0) errors.price = 'Valid price is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the indicated form errors');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        sku: sku.trim().toUpperCase(),
        category_id: categoryId || null,
        price: Number(price),
        cost_price: costPrice !== '' ? Number(costPrice) : null,
        reorder_level: Number(reorderLevel) || 5,
        width_cm: widthCm !== '' ? Number(widthCm) : null,
        depth_cm: depthCm !== '' ? Number(depthCm) : null,
        height_cm: heightCm !== '' ? Number(heightCm) : null,
        color: color.trim() || null,
        material: material.trim() || null,
        description: description.trim() || null,
        is_featured: isFeatured,
        is_active: isActive,
      };

      if (!isEditing) {
        payload.stock_qty = Number(stockQty) || 0;
      }

      const endpoint = isEditing && product ? `/api/dashboard/products/${product.id}` : '/api/dashboard/products';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          const flat: Record<string, string> = {};
          Object.entries(data.fieldErrors).forEach(([k, v]) => {
            if (Array.isArray(v) && v[0]) flat[k] = v[0];
          });
          setFieldErrors(flat);
        }
        throw new Error(data.error || 'Failed to save product');
      }

      const savedProduct = data.product;

      // If creating and we had pending images queued, upload them now
      if (!isEditing && pendingFiles.length > 0 && savedProduct?.id) {
        toast.info('Product created! Uploading queued images...');
        await uploadFilesForProduct(savedProduct.id, pendingFiles);
      }

      toast.success(isEditing ? 'Product updated successfully' : 'Product created successfully');
      onSaved(savedProduct, !isEditing);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full sm:max-w-xl md:max-w-2xl bg-white h-[100dvh] max-h-[100dvh] shadow-2xl flex flex-col border-l border-[#DDD6C8] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#DDD6C8] bg-[#FAF8F5] flex items-center justify-between safe-top">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#6B6B3A]">
              {isEditing ? 'Edit Furniture Piece' : 'New Catalog Item'}
            </span>
            <h2 className="font-serif text-lg sm:text-xl font-medium text-[#26262B]">
              {isEditing ? product?.name : 'Add New Product'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center text-[#8C867D] hover:text-[#26262B] rounded-lg hover:bg-[#EFECE6] transition-colors"
            aria-label="Close product drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B665E] border-b border-[#EFECE6] pb-2">
              Identification & Core Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#26262B] mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Oslo Solid Oak Dining Table"
                  className={fieldErrors.name ? 'border-red-500' : ''}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <Input
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="oslo-solid-oak-table"
                  className={`font-mono text-xs ${fieldErrors.slug ? 'border-red-500' : ''}`}
                />
                <p className="text-[10px] text-[#8C867D] mt-1">Lowercase alphanumeric with hyphens</p>
                {fieldErrors.slug && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {fieldErrors.slug}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">
                  SKU (Unique Identifier) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g. TAB-001"
                  className={`font-mono text-xs uppercase ${fieldErrors.sku ? 'border-red-500' : ''}`}
                />
                {fieldErrors.sku && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {fieldErrors.sku}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#26262B] mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-md border border-[#DDD6C8] bg-white text-[#26262B] focus:outline-none focus:ring-2 focus:ring-[#6B6B3A]"
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B665E] border-b border-[#EFECE6] pb-2">
              Pricing & Inventory
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">
                  Selling Price (PKR) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 85000"
                  className={fieldErrors.price ? 'border-red-500' : ''}
                />
                {fieldErrors.price && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {fieldErrors.price}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">
                  Cost Price (PKR) <span className="text-[#8C867D] font-normal">(Internal only)</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="e.g. 52000"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">
                  {isEditing ? 'Current Stock' : 'Initial Stock Quantity'}
                </label>
                {isEditing ? (
                  <div className="h-10 px-3 py-2 rounded-md bg-[#FAF8F5] border border-[#DDD6C8] text-sm text-[#26262B] flex items-center justify-between">
                    <span className="font-semibold">{stockQty} units</span>
                    <span className="text-[11px] text-[#8C867D]">Locked (manage on Inventory page)</span>
                  </div>
                ) : (
                  <Input
                    type="number"
                    min="0"
                    value={stockQty}
                    onChange={(e) => setStockQty(parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">
                  Reorder Level (Low Stock Alert)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(parseInt(e.target.value, 10) || 0)}
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B665E] border-b border-[#EFECE6] pb-2">
              Dimensions & Specifications
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">Width (cm)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                  placeholder="180"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">Depth (cm)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={depthCm}
                  onChange={(e) => setDepthCm(e.target.value)}
                  placeholder="90"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">Height (cm)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="76"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">Colour / Finish</label>
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Natural Warm Walnut"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">Primary Material</label>
                <Input
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. Solid Sheesham Wood"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#26262B] mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe craftsmanship, wood grain, joints, and suitable home settings..."
                className="w-full p-3 text-sm rounded-md border border-[#DDD6C8] bg-white text-[#26262B] focus:outline-none focus:ring-2 focus:ring-[#6B6B3A]"
              />
            </div>
          </div>

          {/* Visibility & Flags */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B665E] border-b border-[#EFECE6] pb-2">
              Visibility & Catalog Status
            </h3>

            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[#FAF8F5] border border-[#DDD6C8]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-[#6B6B3A] focus:ring-[#6B6B3A]"
                />
                <div>
                  <div className="text-sm font-medium text-[#26262B]">Active in Storefront</div>
                  <div className="text-[11px] text-[#8C867D]">
                    Allow customers to browse and purchase this piece
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer sm:border-l sm:border-[#DDD6C8] sm:pl-4">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded text-[#6B6B3A] focus:ring-[#6B6B3A]"
                />
                <div>
                  <div className="text-sm font-medium text-[#26262B]">Featured Collection</div>
                  <div className="text-[11px] text-[#8C867D]">Showcase prominently on the homepage</div>
                </div>
              </label>
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFECE6] pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B665E]">
                  Product Imagery (Public Bucket)
                </h3>
                <p className="text-[11px] text-[#8C867D]">
                  JPG, PNG or WebP up to 5 MB. First image is used as primary thumbnail.
                </p>
              </div>

              {isEditing && existingImages.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveImageOrderAndAlt}
                  disabled={isSavingImageOrder}
                  className="text-xs gap-1 h-7"
                >
                  {isSavingImageOrder ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 text-emerald-600" />
                  )}
                  Save Image Order
                </Button>
              )}
            </div>

            {/* Existing Images Gallery */}
            {existingImages.length > 0 && (
              <div className="space-y-2">
                {existingImages.map((img, idx) => {
                  const imgUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${img.storage_path}`;
                  return (
                    <div
                      key={img.id}
                      className="flex items-center gap-3 p-2 rounded-lg border border-[#DDD6C8] bg-white"
                    >
                      {/* Image Thumbnail */}
                      <div className="h-14 w-14 shrink-0 rounded bg-[#FAF8F5] overflow-hidden border border-[#DDD6C8] flex items-center justify-center">
                        <img
                          src={imgUrl}
                          alt={img.alt_text || 'Product image'}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as any).style.display = 'none';
                          }}
                        />
                      </div>

                      {/* File Info & Alt Text */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[#8C867D] truncate">
                            {img.storage_path}
                          </span>
                          {idx === 0 && (
                            <Badge variant="olive" className="text-[9px] py-0 px-1 font-medium">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <input
                          type="text"
                          value={img.alt_text || ''}
                          onChange={(e) => handleAltTextChange(img.id, e.target.value)}
                          placeholder="Alt text / description"
                          className="w-full text-xs px-2 py-1 rounded border border-[#EFECE6] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6B6B3A]"
                        />
                      </div>

                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-[#8C867D] hover:text-[#26262B] disabled:opacity-20"
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'down')}
                          disabled={idx === existingImages.length - 1}
                          className="p-1 text-[#8C867D] hover:text-[#26262B] disabled:opacity-20"
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        disabled={deletingImageId === img.id}
                        className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                        title="Delete image"
                      >
                        {deletingImageId === img.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Queued Pending Files for Create Mode */}
            {!isEditing && pendingFiles.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-[#6B6B3A]">
                  Queued to upload on product creation ({pendingFiles.length}):
                </span>
                <div className="space-y-1">
                  {pendingFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs p-2 rounded bg-[#FAF8F5] border border-[#DDD6C8]"
                    >
                      <span className="font-mono truncate">{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                      <button
                        type="button"
                        onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Action */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                id="product-images-input"
              />
              <label
                htmlFor="product-images-input"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#DDD6C8] hover:border-[#6B6B3A] rounded-xl bg-[#FAF8F5] hover:bg-white cursor-pointer transition-colors"
              >
                {isUploadingImages ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-[#6B6B3A]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading image files...
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-[#8C867D] mb-2" />
                    <span className="text-xs font-semibold text-[#26262B]">
                      {isEditing ? 'Upload more images' : 'Select images for piece'}
                    </span>
                    <span className="text-[11px] text-[#8C867D] mt-0.5">
                      JPEG, PNG or WebP up to 5 MB
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Action Footer inside form */}
          <div className="pt-4 border-t border-[#DDD6C8] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sticky bottom-0 bg-white py-3 safe-bottom">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="min-h-[44px] w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[140px] min-h-[44px] w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Product'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
