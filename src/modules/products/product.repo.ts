// src/modules/products/product.repo.ts
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../config/supabase';
import type {
  Product,
  ProductCategory,
  ProductQueryParams,
} from '../../types/product';

export interface PaginatedProductsResult {
  items: Product[];
  totalRows: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProductRepository {
  async findAll(params?: ProductQueryParams): Promise<PaginatedProductsResult> {
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params?.limit) || 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from('products')
      .select('*, category:category_id(*), gallery:product_galleries(*)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params?.search) {
      query = query.or(`title.ilike.%${params.search}%,slug.ilike.%${params.search}%`);
    }
    if (params?.category || params?.category_id) {
      const catId = params.category_id || params.category;
      query = query.eq('category_id', catId);
    }
    if (params?.status && params.status !== 'ALL') {
      query = query.eq('status', params.status);
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    const totalRows = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalRows / limit));

    return {
      items: (data as Product[]) || [],
      totalRows,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string): Promise<Product | null> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, category:category_id(*), gallery:product_galleries(*)')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Product;
  }

  async findCategories(): Promise<ProductCategory[]> {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return [];
    }
    return (data as ProductCategory[]) || [];
  }

  async resolveValidCategoryId(categoryId?: string | null): Promise<string | null> {
    if (!categoryId || categoryId.trim() === '') return null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(categoryId)) return null;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .maybeSingle();

    if (error || !data) return null;
    return data.id;
  }

  async uploadPublicImage(
    slug: string,
    file: Express.Multer.File,
    type: 'cover' | 'gallery',
    index = 0,
  ): Promise<string> {
    const fileExt = file.originalname.split('.').pop() || 'png';
    const fileName =
      type === 'cover'
        ? `products/${slug}/cover-${Date.now()}.${fileExt}`
        : `products/${slug}/gallery-${index}-${Date.now()}.${fileExt}`;

    const { error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw new Error(`Gagal upload gambar ke Storage: ${error.message}`);

    const { data } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async uploadPrivateSourceFile(slug: string, file: Express.Multer.File): Promise<string> {
    const fileExt = file.originalname.split('.').pop() || 'zip';
    const filePath = `sources/${slug}/source-code-${Date.now()}.${fileExt}`;

    const { error } = await supabaseAdmin.storage
      .from('product-files')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw new Error(`Gagal upload file source code ke bucket privat: ${error.message}`);

    return filePath;
  }

  async create(productData: Partial<Product>, galleryUrls: string[] = []): Promise<Product | null> {
    const productId = productData.id || randomUUID();
    const now = new Date().toISOString();

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert([
        {
          ...productData,
          id: productId,
          created_at: productData.created_at || now,
          updated_at: productData.updated_at || now,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (galleryUrls.length > 0 && product) {
      const galleryInserts = galleryUrls.map((url, idx) => ({
        id: randomUUID(),
        product_id: product.id,
        image_url: url,
        sort_order: idx + 1,
      }));
      const { error: galleryError } = await supabaseAdmin
        .from('product_galleries')
        .insert(galleryInserts);
      if (galleryError) throw new Error(`Gagal menyimpan galeri produk: ${galleryError.message}`);
    }

    return product ? this.findById(product.id) : null;
  }

  async update(
    id: string,
    productData: Partial<Product>,
    newGalleryUrls: string[] = [],
    removedGalleryIds: string[] = [],
  ): Promise<Product | null> {
    const { error } = await supabaseAdmin
      .from('products')
      .update({
        ...productData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    if (removedGalleryIds.length > 0) {
      const { error: delGalErr } = await supabaseAdmin
        .from('product_galleries')
        .delete()
        .eq('product_id', id)
        .in('id', removedGalleryIds);
      if (delGalErr) throw new Error(`Gagal menghapus item galeri: ${delGalErr.message}`);
    }

    if (newGalleryUrls.length > 0) {
      const { count } = await supabaseAdmin
        .from('product_galleries')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', id);

      const startOrder = (count ?? 0) + 1;
      const galleryInserts = newGalleryUrls.map((url, idx) => ({
        id: randomUUID(),
        product_id: id,
        image_url: url,
        sort_order: startOrder + idx,
      }));
      const { error: insGalErr } = await supabaseAdmin
        .from('product_galleries')
        .insert(galleryInserts);
      if (insGalErr) throw new Error(`Gagal menambah item galeri baru: ${insGalErr.message}`);
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<{ id: string }> {
    await supabaseAdmin.from('product_galleries').delete().eq('product_id', id);

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { id };
  }
}

export const productRepository = new ProductRepository();