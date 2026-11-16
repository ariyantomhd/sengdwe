// src/modules/products/product.services.ts
import type { ApiResponse } from '../../types/index';
import type { ProductStatus } from '../../types/enums';
import type { Product, ProductCategory, ProductQueryParams } from '../../types/product';
import { productRepository } from './product.repo';

interface ProductFormBody {
  title?: string;
  slug?: string;
  description?: string;
  regular_price?: string | number;
  extended_price?: string | number;
  discount_price?: string | number | null;
  category_id?: string | null;
  tags?: string | string[];
  tech_stack?: string | string[];
  current_version?: string;
  images_url?: string | null;
  file_source_url?: string;
  live_preview_url?: string | null;
  status?: ProductStatus;
  removed_gallery_ids?: string | string[];
}

type UploadedFileMap = Record<string, Express.Multer.File[]>;

function parseStringArray(
  value: string | string[] | undefined,
  fallback: string[] | null = [],
): string[] {
  const safeFallback = fallback ?? [];
  if (!value) return safeFallback;
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : safeFallback;
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export class ProductService {
  async getAllProducts(params?: ProductQueryParams): Promise<ApiResponse<Product[]>> {
    const result = await productRepository.findAll(params);
    return {
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total_rows: result.totalRows,
        total_pages: result.totalPages,
      },
    };
  }

  async getProductById(id: string): Promise<ApiResponse<Product>> {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new Error('Produk tidak ditemukan.');
    }
    return {
      success: true,
      data: product,
    };
  }

  async getCategories(): Promise<ApiResponse<ProductCategory[]>> {
    const categories = await productRepository.findCategories();
    return {
      success: true,
      data: categories,
    };
  }

  async createProduct(
    body: ProductFormBody,
    files: UploadedFileMap,
  ): Promise<ApiResponse<Product>> {
    const title: string = body.title?.trim() || 'Untitled Product';
    const slug: string =
      body.slug?.trim() ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    let images_url: string | null = body.images_url || null;
    let file_source_url: string = body.file_source_url || 'pending-upload.zip';
    const galleryUrls: string[] = [];

    if (files?.thumbnail?.[0]) {
      images_url = await productRepository.uploadPublicImage(slug, files.thumbnail[0], 'cover');
    }

    if (files?.file_source?.[0]) {
      file_source_url = await productRepository.uploadPrivateSourceFile(slug, files.file_source[0]);
    }

    if (files?.gallery && files.gallery.length > 0) {
      for (let i = 0; i < files.gallery.length; i++) {
        const gUrl = await productRepository.uploadPublicImage(
          slug,
          files.gallery[i],
          'gallery',
          i + 1,
        );
        galleryUrls.push(gUrl);
      }
    }

    const validCategoryId = await productRepository.resolveValidCategoryId(body.category_id);

    const newProductPayload: Partial<Product> = {
      title,
      slug,
      description: body.description?.trim() || null,
      regular_price: parseFloat(String(body.regular_price ?? '0')),
      extended_price: parseFloat(String(body.extended_price ?? '0')),
      discount_price:
        body.discount_price !== undefined && body.discount_price !== null && body.discount_price !== ''
          ? parseFloat(String(body.discount_price))
          : null,
      category_id: validCategoryId,
      tags: parseStringArray(body.tags, []),
      tech_stack: parseStringArray(body.tech_stack, []),
      current_version: body.current_version?.trim() || '1.0.0',
      images_url,
      file_source_url,
      live_preview_url: body.live_preview_url?.trim() || null,
      status: body.status || 'DRAFT',
    };

    const createdProduct = await productRepository.create(newProductPayload, galleryUrls);
    if (!createdProduct) {
      throw new Error('Gagal membuat produk di database.');
    }

    return {
      success: true,
      message: 'Produk berhasil dibuat dan file berhasil disimpan otomatis.',
      data: createdProduct,
    };
  }

  async updateProduct(
    id: string,
    body: ProductFormBody,
    files: UploadedFileMap,
  ): Promise<ApiResponse<Product>> {
    const existing = await productRepository.findById(id);
    if (!existing) throw new Error('Produk tidak ditemukan untuk diperbarui.');

    const slug: string = body.slug?.trim() || existing.slug;
    let images_url: string | null = body.images_url !== undefined ? body.images_url : existing.images_url;
    let file_source_url: string = body.file_source_url || existing.file_source_url;
    const newGalleryUrls: string[] = [];

    if (files?.thumbnail?.[0]) {
      images_url = await productRepository.uploadPublicImage(slug, files.thumbnail[0], 'cover');
    }

    if (files?.file_source?.[0]) {
      file_source_url = await productRepository.uploadPrivateSourceFile(slug, files.file_source[0]);
    }

    if (files?.gallery && files.gallery.length > 0) {
      for (let i = 0; i < files.gallery.length; i++) {
        const gUrl = await productRepository.uploadPublicImage(
          slug,
          files.gallery[i],
          'gallery',
          i + 1,
        );
        newGalleryUrls.push(gUrl);
      }
    }

    const validCategoryId =
      body.category_id !== undefined
        ? await productRepository.resolveValidCategoryId(body.category_id)
        : existing.category_id;

    const removedGalleryIds = parseStringArray(body.removed_gallery_ids, []);

    const updatePayload: Partial<Product> = {
      title: body.title?.trim() || existing.title,
      slug,
      description: body.description !== undefined ? body.description.trim() || null : existing.description,
      category_id: validCategoryId,
      regular_price:
        body.regular_price !== undefined && body.regular_price !== ''
          ? parseFloat(String(body.regular_price))
          : existing.regular_price,
      extended_price:
        body.extended_price !== undefined && body.extended_price !== ''
          ? parseFloat(String(body.extended_price))
          : existing.extended_price,
      discount_price:
        body.discount_price !== undefined
          ? body.discount_price === '' || body.discount_price === null
            ? null
            : parseFloat(String(body.discount_price))
          : existing.discount_price,
      current_version: body.current_version?.trim() || existing.current_version,
      live_preview_url:
        body.live_preview_url !== undefined
          ? body.live_preview_url?.trim() || null
          : existing.live_preview_url,
      status: body.status || existing.status,
      images_url,
      file_source_url,
      tags:
        body.tags !== undefined
          ? parseStringArray(body.tags, existing.tags ?? [])
          : existing.tags ?? [],
      tech_stack:
        body.tech_stack !== undefined
          ? parseStringArray(body.tech_stack, existing.tech_stack ?? [])
          : existing.tech_stack ?? [],
    };

    const updatedProduct = await productRepository.update(
      id,
      updatePayload,
      newGalleryUrls,
      removedGalleryIds,
    );
    if (!updatedProduct) {
      throw new Error('Gagal memperbarui produk.');
    }

    return {
      success: true,
      message: 'Produk berhasil diperbarui.',
      data: updatedProduct,
    };
  }

  async deleteProduct(id: string): Promise<ApiResponse<{ id: string }>> {
    const result = await productRepository.delete(id);
    return {
      success: true,
      message: 'Produk berhasil dihapus.',
      data: result,
    };
  }
}

export const productService = new ProductService();